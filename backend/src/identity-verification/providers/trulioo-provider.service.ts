import {
  BusinessVerificationInput,
  IndividualVerificationInput,
  KycProvider,
  NormalizedWebhookResult,
  SanctionsScreeningInput,
  VerificationResult,
} from './kyc-provider.interface';

// Trulioo GlobalGateway — Basic Auth with the API key as username, empty password.
// https://developer.trulioo.com/docs/globalgateway-overview
// Unlike Sumsub, individual/business verification calls are synchronous — the
// match/no-match result comes back in the same response, no webhook needed for
// the basic flow (handleWebhook is kept for parity with the KycProvider
// interface and any future async watchlist-monitoring subscription).
export class TruliooProviderService implements KycProvider {
  readonly name = 'TRULIOO' as const;
  private readonly baseUrl = 'https://api.trulioo.com/v1';

  constructor(private readonly apiKey: string) {}

  private authHeader(): string {
    return 'Basic ' + Buffer.from(`${this.apiKey}:`).toString('base64');
  }

  private async request(path: string, body: Record<string, unknown>) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Trulioo API error ${res.status}: ${JSON.stringify(data)}`);
    }
    return data;
  }

  async verifyIndividual(input: IndividualVerificationInput): Promise<VerificationResult> {
    const [firstName, ...rest] = input.fullName.split(' ');
    const data = await this.request('/verifications/v1/verify', {
      AcceptTruliooTermsAndConditions: true,
      CountryCode: input.country,
      DataFields: {
        PersonInfo: { FirstGivenName: firstName, FirstSurName: rest.join(' ') },
        Communication: input.email ? { EmailAddress: input.email } : undefined,
        DriverLicense: input.documentNumber ? { Number: input.documentNumber } : undefined,
      },
    });
    const record = (data as any)?.Record;
    const status = record?.RecordStatus === 'match' ? 'APPROVED' : record?.RecordStatus === 'nomatch' ? 'REJECTED' : 'REVIEW';
    return { status, providerRefId: record?.TransactionRecordID, rawResult: data as Record<string, unknown> };
  }

  async verifyBusiness(input: BusinessVerificationInput): Promise<VerificationResult> {
    const data = await this.request('/businessverifications/v1/verify', {
      AcceptTruliooTermsAndConditions: true,
      CountryCode: input.country,
      BusinessName: input.legalName,
      BusinessRegistrationNumber: input.registrationNumber,
      VatTaxIdentificationNumber: input.vatNumber,
    });
    const record = (data as any)?.Record;
    const status = record?.RecordStatus === 'match' ? 'APPROVED' : record?.RecordStatus === 'nomatch' ? 'REJECTED' : 'REVIEW';
    return { status, providerRefId: record?.TransactionRecordID, rawResult: data as Record<string, unknown> };
  }

  async screenSanctions(input: SanctionsScreeningInput): Promise<VerificationResult> {
    const data = await this.request('/watchlists/v1/search', {
      SearchArguments: { Name: input.name, Country: input.country },
    });
    const matches = (data as any)?.Matches ?? [];
    return { status: matches.length > 0 ? 'REVIEW' : 'APPROVED', rawResult: data as Record<string, unknown> };
  }

  handleWebhook(payload: any): NormalizedWebhookResult {
    return {
      providerRefId: payload?.TransactionRecordID ?? '',
      status: payload?.RecordStatus === 'match' ? 'APPROVED' : payload?.RecordStatus === 'nomatch' ? 'REJECTED' : 'REVIEW',
      rawResult: payload,
    };
  }
}
