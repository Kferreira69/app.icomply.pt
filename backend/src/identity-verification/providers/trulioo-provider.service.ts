import type { ConfigService } from '@nestjs/config';
import {
  BusinessVerificationInput,
  IndividualVerificationInput,
  KycCapabilities,
  KycProvider,
  NormalizedWebhookResult,
  ProviderDefinition,
  SanctionsScreeningInput,
  VerificationResult,
} from './kyc-provider.interface';

// Trulioo GlobalGateway — Basic Auth with the API key as username, empty password.
// https://developer.trulioo.com/docs/globalgateway-overview
// Unlike Sumsub, individual/business verification calls are synchronous — the
// match/no-match result comes back in the same response, no webhook needed for
// the basic flow. No webhook is consumed, so `capabilities.webhooks` is false and the
// webhook route answers 404 for this provider.
export class TruliooProviderService implements KycProvider {
  readonly id = 'TRULIOO';
  readonly displayName = 'Trulioo';
  readonly capabilities: KycCapabilities = { individual: true, business: true, sanctions: true, webhooks: false };
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
      signal: AbortSignal.timeout(30000),
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
    const matches = (data as any)?.Matches;
    if (!Array.isArray(matches)) throw new Error('Trulioo returned an unexpected response'); // never read a malformed answer as "clean"
    return { status: matches.length > 0 ? 'REVIEW' : 'APPROVED', rawResult: data as Record<string, unknown> };
  }

  handleWebhook(): NormalizedWebhookResult {
    // Trulioo verification is synchronous: there is nothing to receive, and an unsigned call must never be trusted.
    throw new Error('Trulioo does not use webhooks');
  }
}

export const TRULIOO_DEFINITION: ProviderDefinition = {
  id: 'TRULIOO',
  displayName: 'Trulioo',
  capabilities: { individual: true, business: true, sanctions: true, webhooks: false },
  isConfigured: (c: ConfigService) => !!c.get<string>('TRULIOO_API_KEY'),
  create: (c: ConfigService) => new TruliooProviderService(c.get<string>('TRULIOO_API_KEY', '')),
};
