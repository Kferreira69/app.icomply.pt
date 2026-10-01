import * as crypto from 'crypto';
import { ForbiddenException } from '@nestjs/common';
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
  VerificationStatus,
  WebhookContext,
} from './kyc-provider.interface';

// Sumsub request signing: X-App-Access-Sig = HMAC-SHA256(secretKey, ts + METHOD + path + body), hex.
// https://docs.sumsub.com/reference/authentication
//
// NOTE: written from Sumsub's public documentation and not yet exercised against a real
// (sandbox) account — verify applicant creation, the AML endpoint and the webhook digest
// before relying on it in production.
const SUMSUB_REVIEW_ANSWER_MAP: Record<string, VerificationStatus> = {
  GREEN: 'APPROVED',
  RED: 'REJECTED',
  YELLOW: 'REVIEW',
};

// Webhook authenticity: Sumsub sends X-Payload-Digest (hex HMAC of the raw body keyed with the
// webhook secret configured for the endpoint) and X-Payload-Digest-Alg naming the hash.
const WEBHOOK_ALGOS: Record<string, string> = {
  HMAC_SHA1_HEX: 'sha1',
  HMAC_SHA256_HEX: 'sha256',
  HMAC_SHA512_HEX: 'sha512',
};

export interface SumsubConfig {
  appToken: string;
  secretKey: string;
  webhookSecret?: string;
  levelIndividual?: string;
  levelBusiness?: string;
}

const header = (h: WebhookContext['headers'], name: string): string | undefined => {
  const v = h[name];
  return Array.isArray(v) ? v[0] : v;
};

export class SumsubProviderService implements KycProvider {
  readonly id = 'SUMSUB';
  readonly displayName = 'Sumsub';
  readonly capabilities: KycCapabilities = { individual: true, business: true, sanctions: true, webhooks: true };
  private readonly baseUrl = 'https://api.sumsub.com';
  private readonly levelIndividual: string;
  private readonly levelBusiness: string;

  constructor(private readonly cfg: SumsubConfig) {
    this.levelIndividual = cfg.levelIndividual || 'basic-kyc-level';
    this.levelBusiness = cfg.levelBusiness || 'basic-kyb-level';
  }

  private sign(method: string, path: string, body: string): { ts: string; sig: string } {
    const ts = Math.floor(Date.now() / 1000).toString();
    const sig = crypto
      .createHmac('sha256', this.cfg.secretKey)
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
        'X-App-Token': this.cfg.appToken,
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
    const data = await this.request('POST', `/resources/applicants?levelName=${this.levelIndividual}`, {
      externalUserId,
      info: { country: input.country },
      fixedInfo: { firstName: input.fullName.split(' ')[0], lastName: input.fullName.split(' ').slice(1).join(' ') },
      email: input.email,
    });
    return { status: 'PENDING', providerRefId: (data as any).id, rawResult: data as Record<string, unknown> };
  }

  async verifyBusiness(input: BusinessVerificationInput): Promise<VerificationResult> {
    const externalUserId = `icomply-kyb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const data = await this.request('POST', `/resources/applicants?levelName=${this.levelBusiness}`, {
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

  /** Fail closed: no secret, no digest, unknown algorithm or a mismatch → rejected. */
  private assertAuthentic(ctx: WebhookContext) {
    const secret = this.cfg.webhookSecret;
    if (!secret) throw new ForbiddenException('Webhook secret not configured');
    const digest = header(ctx.headers, 'x-payload-digest');
    const algo = WEBHOOK_ALGOS[(header(ctx.headers, 'x-payload-digest-alg') ?? 'HMAC_SHA1_HEX').toUpperCase()];
    if (!digest || !algo || !ctx.rawBody) throw new ForbiddenException('Invalid webhook signature');
    const expected = Buffer.from(crypto.createHmac(algo, secret).update(ctx.rawBody).digest('hex'));
    const received = Buffer.from(digest.toLowerCase());
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
      throw new ForbiddenException('Invalid webhook signature');
    }
  }

  handleWebhook(payload: any, ctx: WebhookContext): NormalizedWebhookResult {
    this.assertAuthentic(ctx);
    // https://docs.sumsub.com/reference/webhooks — applicantReviewed event carries reviewResult.reviewAnswer
    const reviewAnswer: string | undefined = payload?.reviewResult?.reviewAnswer;
    return {
      providerRefId: payload?.applicantId ?? payload?.externalUserId ?? '',
      status: (reviewAnswer && SUMSUB_REVIEW_ANSWER_MAP[reviewAnswer]) || 'REVIEW',
      rawResult: payload,
    };
  }
}

export const SUMSUB_DEFINITION: ProviderDefinition = {
  id: 'SUMSUB',
  displayName: 'Sumsub',
  capabilities: { individual: true, business: true, sanctions: true, webhooks: true },
  isConfigured: (c: ConfigService) => !!(c.get<string>('SUMSUB_APP_TOKEN') && c.get<string>('SUMSUB_SECRET_KEY')),
  create: (c: ConfigService) =>
    new SumsubProviderService({
      appToken: c.get<string>('SUMSUB_APP_TOKEN', ''),
      secretKey: c.get<string>('SUMSUB_SECRET_KEY', ''),
      webhookSecret: c.get<string>('SUMSUB_WEBHOOK_SECRET') || undefined,
      levelIndividual: c.get<string>('SUMSUB_LEVEL_INDIVIDUAL') || undefined,
      levelBusiness: c.get<string>('SUMSUB_LEVEL_BUSINESS') || undefined,
    }),
};
