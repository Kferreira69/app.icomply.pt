import * as crypto from 'crypto';
import { ForbiddenException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  BusinessVerificationInput,
  IndividualVerificationInput,
  KycCapabilities,
  KycProvider,
  NormalizedWebhookResult,
  ProviderCheckResult,
  ProviderDefinition,
  SanctionsScreeningInput,
  VerificationResult,
  VerificationStatus,
  WebhookContext,
} from './kyc-provider.interface';

// Didit (https://docs.didit.me) — pay-as-you-go, no set-up fee.
//  - KYC / KYB: POST /v3/session/ with a workflow id (created in the Didit console) → hosted `url`
//    the person opens; the final decision arrives by webhook (and can be fetched with
//    GET /v3/session/{id}/decision/).
//  - Sanctions / PEP: POST /v3/aml/ (standalone, synchronous).
// Written from Didit's public documentation; exercise it against the Didit sandbox
// (business.didit.me) before enabling it for customers — see PROVIDERS.md.

/** Didit session statuses are exact, case-sensitive strings. */
const STATUS_MAP: Record<string, VerificationStatus> = {
  'Approved': 'APPROVED',
  'Declined': 'REJECTED',
  'In Review': 'REVIEW',
  'Not Started': 'PENDING',
  'In Progress': 'PENDING',
  'Resubmitted': 'PENDING',
  'Awaiting User': 'PENDING',
  'Expired': 'ERROR',
  'Abandoned': 'ERROR',
  'Kyc Expired': 'ERROR',
};
export const mapDiditStatus = (s: unknown): VerificationStatus =>
  (typeof s === 'string' && STATUS_MAP[s]) || 'REVIEW'; // unknown → a person looks at it

/**
 * Warning codes the provider attached to any check of the session (e.g. an expired document): what a person needs to
 * decide an "In Review" without opening the provider's console. Codes only — never document data or names.
 */
export function warningCodes(decision: any): string[] {
  const out = new Set<string>();
  const take = (w: unknown) => {
    const code = typeof w === 'string' ? w : (w as any)?.risk ?? (w as any)?.code ?? (w as any)?.short_description;
    if (typeof code === 'string' && code.trim()) out.add(code.trim().slice(0, 80));
  };
  if (decision && typeof decision === 'object') {
    for (const w of Array.isArray(decision.warnings) ? decision.warnings : []) take(w);
    for (const v of Object.values(decision)) {
      if (!Array.isArray(v)) continue;
      for (const item of v) for (const w of Array.isArray((item as any)?.warnings) ? (item as any).warnings : []) take(w);
    }
  }
  return [...out].slice(0, 20);
}

export interface DiditConfig {
  apiKey: string;
  webhookSecret?: string;
  workflowKyc?: string;
  workflowKyb?: string;
  callbackUrl?: string;
  baseUrl?: string;
}

const header = (h: WebhookContext['headers'], name: string): string | undefined => {
  const v = h[name];
  return Array.isArray(v) ? v[0] : v;
};

/** Recursively sort object keys — the canonical form Didit signs for X-Signature-V2. */
const sortKeys = (v: any): any => {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    return Object.keys(v).sort().reduce((o: any, k) => { o[k] = sortKeys(v[k]); return o; }, {});
  }
  return v;
};

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a.toLowerCase()), y = Buffer.from(b.toLowerCase());
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

export class DiditProviderService implements KycProvider {
  readonly id = 'DIDIT';
  readonly displayName = 'Didit';
  readonly capabilities: KycCapabilities;
  private readonly baseUrl: string;

  constructor(private readonly cfg: DiditConfig) {
    this.baseUrl = (cfg.baseUrl || 'https://verification.didit.me').replace(/\/$/, '');
    // what is offered follows what is configured: a session workflow per kind, and standalone AML always
    this.capabilities = {
      individual: !!cfg.workflowKyc,
      business: !!cfg.workflowKyb,
      sanctions: true,
      webhooks: true,
    };
  }

  private async request(path: string, body?: Record<string, unknown>, timeoutMs = 30000) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'x-api-key': this.cfg.apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Didit API error ${res.status}: ${JSON.stringify(data)}`);
    return data as any;
  }

  private session(workflowId: string, extra: Record<string, unknown>): Promise<VerificationResult> {
    const body: Record<string, unknown> = {
      workflow_id: workflowId,
      // unique per request: Didit reuses an unfinished session with the same vendor_data
      vendor_data: crypto.randomUUID(),
      ...(this.cfg.callbackUrl ? { callback: this.cfg.callbackUrl } : {}),
      ...extra,
    };
    return this.request('/v3/session/', body).then(d => ({
      status: mapDiditStatus(d.status ?? 'Not Started'),
      providerRefId: d.session_id,
      actionUrl: d.url,
      rawResult: { sessionId: d.session_id, sessionNumber: d.session_number, status: d.status, workflowId: d.workflow_id },
    }));
  }

  async verifyIndividual(input: IndividualVerificationInput): Promise<VerificationResult> {
    if (!this.cfg.workflowKyc) throw new Error('Didit KYC workflow not configured');
    const [first, ...rest] = input.fullName.trim().split(/\s+/);
    return this.session(this.cfg.workflowKyc, {
      contact_details: input.email ? { email: input.email, send_notification_emails: false } : undefined,
      expected_details: { first_name: first, last_name: rest.join(' ') || undefined, id_country: input.country },
    });
  }

  async verifyBusiness(input: BusinessVerificationInput): Promise<VerificationResult> {
    if (!this.cfg.workflowKyb) throw new Error('Didit KYB workflow not configured');
    return this.session(this.cfg.workflowKyb, {
      expected_details: {
        company_name: input.legalName,
        registry_country: input.country,
        registration_number: input.registrationNumber || input.vatNumber,
      },
    });
  }

  /** Synchronous: the answer comes back in the same call. */
  async screenSanctions(input: SanctionsScreeningInput): Promise<VerificationResult> {
    const d = await this.request('/v3/aml/', {
      full_name: input.name,
      entity_type: 'person',
      date_of_birth: input.dateOfBirth || undefined,
      nationality: input.country || undefined,
      include_adverse_media: false,
    }, 45000);
    const aml = d.aml ?? {};
    const hits: any[] = Array.isArray(aml.hits) ? aml.hits : [];
    const top = hits.reduce((m, h) => Math.max(m, Number(h.risk_score ?? h.match_score ?? 0)), 0);
    // an "Approved" with hits is contradictory: a person looks at it
    const status = hits.length > 0 && mapDiditStatus(aml.status) === 'APPROVED' ? 'REVIEW' : mapDiditStatus(aml.status);
    if (typeof aml.status !== 'string') throw new Error('Didit AML response without a status');
    return {
      status,
      providerRefId: d.request_id ?? aml.screening_id,
      riskScore: hits.length ? Math.min(100, Math.round(top)) : 0,
      rawResult: { requestId: d.request_id, status: aml.status, hits: hits.length, warnings: aml.warnings ?? [] },
    };
  }

  /**
   * Fail closed. Didit sends three signatures; the recommended X-Signature-V2 is an HMAC-SHA256 of the
   * body re-serialised with sorted keys, X-Signature is over the raw bytes. A timestamp older than 5
   * minutes is rejected (replay).
   */
  private assertAuthentic(payload: any, ctx: WebhookContext) {
    const secret = this.cfg.webhookSecret;
    if (!secret) throw new ForbiddenException('Webhook secret not configured');
    const fresh = (t: number) => Number.isFinite(t) && Math.abs(Date.now() / 1000 - t) <= 300;
    // the header is not covered by the HMAC, so the timestamp INSIDE the signed body is checked as well (replay protection)
    const bodyTs = Number(payload?.timestamp);
    if (!fresh(parseInt(header(ctx.headers, 'x-timestamp') ?? '', 10)) || (payload?.timestamp !== undefined && !fresh(bodyTs))) {
      throw new ForbiddenException('Invalid webhook signature');
    }
    const hmac = (data: string | Buffer) => crypto.createHmac('sha256', secret).update(data).digest('hex');
    const v2 = header(ctx.headers, 'x-signature-v2');
    const raw = header(ctx.headers, 'x-signature');
    const ok =
      (!!v2 && safeEqual(hmac(JSON.stringify(sortKeys(payload))), v2)) ||
      (!!raw && !!ctx.rawBody && safeEqual(hmac(ctx.rawBody), raw));
    if (!ok) throw new ForbiddenException('Invalid webhook signature');
  }

  /** Webhook payloads carry the decision under `decision`; GET /decision/ returns it at the top level. */
  private normalize(payload: any): NormalizedWebhookResult {
    const decision = payload?.decision && typeof payload.decision === 'object' ? payload.decision : payload;
    const aml = Array.isArray(decision?.aml_screenings) ? decision.aml_screenings[0] : undefined;
    const warnings = warningCodes(decision);
    return {
      providerRefId: payload?.session_id ?? decision?.session_id ?? '',
      status: mapDiditStatus(payload?.status ?? decision?.status),
      riskScore: typeof aml?.score === 'number' ? Math.min(100, Math.round(aml.score)) : undefined,
      rawResult: {
        webhookType: payload?.webhook_type, status: payload?.status ?? decision?.status, sessionId: payload?.session_id ?? decision?.session_id,
        environment: payload?.environment, amlHits: aml?.total_hits,
        ...(warnings.length ? { warnings } : {}),
      },
    };
  }

  handleWebhook(payload: any, ctx: WebhookContext): NormalizedWebhookResult {
    this.assertAuthentic(payload, ctx);
    return this.normalize(payload);
  }

  async fetchStatus(providerRefId: string): Promise<NormalizedWebhookResult> {
    const d = await this.request(`/v3/session/${encodeURIComponent(providerRefId)}/decision/`);
    const out = this.normalize(d);
    return { ...out, providerRefId }; // the session we asked about, whatever the body echoes
  }

  /**
   * Proves the API key is accepted without creating anything: asking for a session that cannot exist is answered
   * 404 for a valid key and 401/403 for an invalid one.
   */
  async check(): Promise<ProviderCheckResult> {
    try {
      const res = await fetch(`${this.baseUrl}/v3/session/00000000-0000-0000-0000-000000000000/decision/`, {
        headers: { 'x-api-key': this.cfg.apiKey, Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 401 || res.status === 403) return { ok: false, detail: `A Didit recusou a chave (HTTP ${res.status}). Confirme a chave de API e se é a do ambiente certo.` };
      const parts = [
        'A Didit aceitou a chave.',
        this.cfg.workflowKyc ? 'Fluxo KYC configurado.' : 'Sem fluxo KYC (DIDIT_WORKFLOW_KYC): pessoas ficam em modo manual.',
        this.cfg.workflowKyb ? 'Fluxo KYB configurado.' : 'Sem fluxo KYB (DIDIT_WORKFLOW_KYB): empresas ficam em modo manual.',
        this.cfg.webhookSecret ? 'Segredo do webhook configurado.' : 'Sem segredo do webhook (DIDIT_WEBHOOK_SECRET): os resultados não chegam sozinhos (use "Atualizar estado").',
      ];
      return { ok: true, detail: parts.join(' ') };
    } catch {
      return { ok: false, detail: 'Não foi possível contactar a Didit (rede ou tempo esgotado).' };
    }
  }
}

export const DIDIT_DEFINITION: ProviderDefinition = {
  id: 'DIDIT',
  displayName: 'Didit',
  capabilities: { individual: true, business: true, sanctions: true, webhooks: true },
  // The API key alone is enough to be selectable (standalone sanctions screening needs no workflow);
  // KYC / KYB are offered once their workflow ids are set.
  isConfigured: (c: ConfigService) => !!c.get<string>('DIDIT_API_KEY'),
  create: (c: ConfigService) =>
    new DiditProviderService({
      apiKey: c.get<string>('DIDIT_API_KEY', ''),
      webhookSecret: c.get<string>('DIDIT_WEBHOOK_SECRET') || undefined,
      workflowKyc: c.get<string>('DIDIT_WORKFLOW_KYC') || undefined,
      workflowKyb: c.get<string>('DIDIT_WORKFLOW_KYB') || undefined,
      callbackUrl: c.get<string>('DIDIT_CALLBACK_URL') || undefined,
      baseUrl: c.get<string>('DIDIT_BASE_URL') || undefined,
    }),
};
