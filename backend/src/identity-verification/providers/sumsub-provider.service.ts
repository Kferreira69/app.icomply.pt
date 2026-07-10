import * as crypto from 'crypto';
import {
  BusinessVerificationInput,
  IndividualVerificationInput,
  KycProvider,
  NormalizedWebhookResult,
  SanctionsScreeningInput,
  VerificationResult,
  VerificationStatus,
} from './kyc-provider.interface';

// Sumsub request signing: X-App-Access-Sig = HMAC-SHA256(secretKey, ts + METHOD + path + body), hex.
// https://docs.sumsub.com/reference/authentication
const SUMSUB_REVIEW_ANSWER_MAP: Record<string, VerificationStatus> = {
  GREEN: 'APPROVED',
  RED: 'REJECTED',
  YELLOW: 'REVIEW',
};

export class SumsubProviderService implements KycProvider {
  readonly name = 'SUMSUB' as const;
  private readonly baseUrl = 'https://api.sumsub.com';

  constructor(
    private readonly appToken: string,
    private readonly secretKey: string,
    private readonly levelNameIndividual = 'basic-kyc-level',
    private readonly levelNameBusiness = 'basic-kyb-level',
  ) {}

  private sign(method: string, path: string, body: string): { ts: string; sig: string } {
    const ts = Math.floor(Date.now() / 1000).toString();
    const sig = crypto
      .createHmac('sha256', this.secretKey)
      .update(ts + method.toUpperCase() + path + body)
      .digest('hex');
    return { ts, sig };
  }

  private async request(method: 'GET' | 'POST', path: string, body?: Record<string, unknown>) {
    const bodyStr = body ? JSON.stringify(body) : '';
    const { ts, sig } = this.sign(method, path, bodyStr);
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'X-App-Token': this.appToken,
        'X-App-Access-Sig': sig,
        'X-App-Access-Ts': ts,
        'Content-Type': 'application/json',
      },
      body: bodyStr || undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Sumsub API error ${res.status}: ${JSON.stringify(data)}`);
    }
    return data;
  }

  async verifyIndividual(input: IndividualVerificationInput): Promise<VerificationResult> {
    const externalUserId = `icomply-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const data = await this.request('POST', `/resources/applicants?levelName=${this.levelNameIndividual}`, {
      externalUserId,
      info: { country: input.country },
      fixedInfo: { firstName: input.fullName.split(' ')[0], lastName: input.fullName.split(' ').slice(1).join(' ') },
      email: input.email,
    });
    return { status: 'PENDING', providerRefId: (data as any).id, rawResult: data as Record<string, unknown> };
  }

  async verifyBusiness(input: BusinessVerificationInput): Promise<VerificationResult> {
    const externalUserId = `icomply-kyb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const data = await this.request('POST', `/resources/applicants?levelName=${this.levelNameBusiness}`, {
      externalUserId,
      type: 'company',
      info: { country: input.country, companyInfo: { companyName: input.legalName, registrationNumber: input.registrationNumber, taxId: input.vatNumber } },
    });
    return { status: 'PENDING', providerRefId: (data as any).id, rawResult: data as Record<string, unknown> };
  }

  async screenSanctions(input: SanctionsScreeningInput): Promise<VerificationResult> {
    // Sumsub exposes AML/sanctions screening via the applicant's AML check module —
    // for a standalone screen without a full applicant, this uses their AML API.
    const data = await this.request('POST', '/resources/checks/latest', {
      name: input.name,
      country: input.country,
      dob: input.dateOfBirth,
    });
    return { status: 'PENDING', rawResult: data as Record<string, unknown> };
  }

  handleWebhook(payload: any): NormalizedWebhookResult {
    // https://docs.sumsub.com/reference/webhooks — applicantReviewed event carries reviewResult.reviewAnswer
    const reviewAnswer: string | undefined = payload?.reviewResult?.reviewAnswer;
    return {
      providerRefId: payload?.applicantId ?? payload?.externalUserId ?? '',
      status: (reviewAnswer && SUMSUB_REVIEW_ANSWER_MAP[reviewAnswer]) || 'REVIEW',
      rawResult: payload,
    };
  }
}
