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

// Stripe Identity (https://docs.stripe.com/identity) — document + selfie verification of people,
// pay-as-you-go per verification. No company verification and no sanctions screening (use another
// provider for those). The session is created with form-encoded params and Stripe returns a hosted
// `url`; the result arrives by webhook (identity.verification_session.*).
//
// It uses its OWN secret key and webhook endpoint (STRIPE_IDENTITY_*), independent of the Stripe
// billing integration. Webhook authenticity is checked here (Stripe-Signature: t=…,v1=… over
// `${t}.${rawBody}`), with a 5-minute tolerance.

export interface StripeIdentityConfig {
  secretKey: string;
  webhookSecret?: string;
  returnUrl?: string;
  baseUrl?: string;
}

const header = (h: WebhookContext['headers'], name: string): string | undefined => {
  const v = h[name];
  return Array.isArray(v) ? v[0] : v;
};

/** Session status (and event type) → our status. */
export function mapStripeIdentity(status: unknown, eventType?: string): VerificationStatus {
  if (eventType === 'identity.verification_session.verified' || status === 'verified') return 'APPROVED';
  if (eventType === 'identity.verification_session.requires_input') return 'REVIEW'; // a check failed: a person decides / asks to retry
  if (eventType === 'identity.verification_session.canceled' || status === 'canceled') return 'ERROR';
  return 'PENDING'; // created / processing
}

export class StripeIdentityProviderService implements KycProvider {
  readonly id = 'STRIPE_IDENTITY';
  readonly displayName = 'Stripe Identity';
  readonly capabilities: KycCapabilities = { individual: true, business: false, sanctions: false, webhooks: true };
  private readonly baseUrl: string;

  constructor(private readonly cfg: StripeIdentityConfig) {
    this.baseUrl = (cfg.baseUrl || 'https://api.stripe.com').replace(/\/$/, '');
  }

  async verifyIndividual(input: IndividualVerificationInput): Promise<VerificationResult> {
    const form = new URLSearchParams();
    form.set('type', 'document');
    form.set('options[document][require_matching_selfie]', 'true');
    form.set('metadata[source]', 'icomply');
    if (input.email) form.set('provided_details[email]', input.email);
    if (this.cfg.returnUrl) form.set('return_url', this.cfg.returnUrl);
    const res = await fetch(`${this.baseUrl}/v1/identity/verification_sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.cfg.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: form.toString(),
      signal: AbortSignal.timeout(30000),
    });
    const d: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Stripe Identity API error ${res.status}: ${JSON.stringify(d?.error ?? d)}`);
    return {
      status: mapStripeIdentity(d.status),
      providerRefId: d.id,
      actionUrl: d.url,
      rawResult: { sessionId: d.id, status: d.status, type: d.type, livemode: d.livemode },
    };
  }

  async verifyBusiness(_input: BusinessVerificationInput): Promise<VerificationResult> {
    throw new Error('Stripe Identity does not verify companies');
  }

  async screenSanctions(_input: SanctionsScreeningInput): Promise<VerificationResult> {
    throw new Error('Stripe Identity does not screen sanctions');
  }

  /** Fail closed: no secret, no/old timestamp, no matching v1 signature → rejected. */
  private assertAuthentic(ctx: WebhookContext) {
    const secret = this.cfg.webhookSecret;
    if (!secret) throw new ForbiddenException('Webhook secret not configured');
    const sig = header(ctx.headers, 'stripe-signature');
    if (!sig || !ctx.rawBody) throw new ForbiddenException('Invalid webhook signature');
    const parts = sig.split(',').map(p => p.split('=') as [string, string]);
    const t = parts.find(([k]) => k === 't')?.[1];
    const v1s = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
    const ts = parseInt(t ?? '', 10);
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300 || !v1s.length) {
      throw new ForbiddenException('Invalid webhook signature');
    }
    const expected = Buffer.from(crypto.createHmac('sha256', secret).update(`${t}.${ctx.rawBody.toString('utf8')}`).digest('hex'));
    const ok = v1s.some(v => { const b = Buffer.from(v); return b.length === expected.length && crypto.timingSafeEqual(b, expected); });
    if (!ok) throw new ForbiddenException('Invalid webhook signature');
  }

  /** The name printed on the verified document (never stored; only compared with the subject of the request). */
  private async verifiedName(sessionId: string): Promise<string | undefined> {
    const res = await fetch(`${this.baseUrl}/v1/identity/verification_sessions/${encodeURIComponent(sessionId)}?expand[]=verified_outputs`, {
      headers: { Authorization: `Bearer ${this.cfg.secretKey}` },
      signal: AbortSignal.timeout(30000),
    });
    const d: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Stripe Identity API error ${res.status}`);
    const o = d?.verified_outputs;
    return o ? [o.first_name, o.last_name].filter(Boolean).join(' ') || undefined : undefined;
  }

  async handleWebhook(payload: any, ctx: WebhookContext): Promise<NormalizedWebhookResult> {
    this.assertAuthentic(ctx);
    const obj = payload?.data?.object ?? {};
    const isSession = typeof payload?.type === 'string' && payload.type.startsWith('identity.verification_session.');
    const status = mapStripeIdentity(obj.status, payload?.type);
    let verifiedName: string | undefined;
    if (isSession && status === 'APPROVED') {
      // Stripe confirms the document is genuine and belongs to whoever took the selfie — not that it is the person we asked for.
      try { verifiedName = await this.verifiedName(obj.id); } catch { verifiedName = undefined; }
      if (!verifiedName) {
        return { providerRefId: obj.id, status: 'REVIEW', rawResult: { eventType: payload.type, sessionId: obj.id, status: obj.status, nameUnavailable: true } };
      }
    }
    return {
      providerRefId: isSession ? obj.id ?? '' : '',
      verifiedName,
      status,
      rawResult: {
        eventType: payload?.type, sessionId: obj.id, status: obj.status,
        lastError: obj.last_error ? { code: obj.last_error.code, reason: obj.last_error.reason } : null, // never PII
      },
    };
  }
}

export const STRIPE_IDENTITY_DEFINITION: ProviderDefinition = {
  id: 'STRIPE_IDENTITY',
  displayName: 'Stripe Identity',
  capabilities: { individual: true, business: false, sanctions: false, webhooks: true },
  isConfigured: (c: ConfigService) => !!c.get<string>('STRIPE_IDENTITY_SECRET_KEY'),
  create: (c: ConfigService) =>
    new StripeIdentityProviderService({
      secretKey: c.get<string>('STRIPE_IDENTITY_SECRET_KEY', ''),
      webhookSecret: c.get<string>('STRIPE_IDENTITY_WEBHOOK_SECRET') || undefined,
      returnUrl: c.get<string>('STRIPE_IDENTITY_RETURN_URL') || undefined,
      baseUrl: c.get<string>('STRIPE_IDENTITY_BASE_URL') || undefined,
    }),
};
