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
  WebhookContext,
} from './kyc-provider.interface';

// OpenSanctions (https://www.opensanctions.org/docs/api/matching/) — sanctions / PEP screening only,
// pay-as-you-go per query. Synchronous: POST /match/{dataset} answers with scored candidates.
// A candidate with `match: true` is a potential hit → REVIEW (a person decides; sanctions screening
// is never auto-rejected). No candidates → APPROVED. It does not do identity documents or companies'
// registries, so individual / business requests are routed to another provider (or handled manually).
// Written from the public documentation; try it with the API trial key before enabling it.

export interface OpenSanctionsConfig {
  apiKey: string;
  baseUrl?: string;
  dataset?: string;
}

export class OpenSanctionsProviderService implements KycProvider {
  readonly id = 'OPENSANCTIONS';
  readonly displayName = 'OpenSanctions';
  readonly capabilities: KycCapabilities = { individual: false, business: false, sanctions: true, webhooks: false };
  private readonly baseUrl: string;
  private readonly dataset: string;

  constructor(private readonly cfg: OpenSanctionsConfig) {
    this.baseUrl = (cfg.baseUrl || 'https://api.opensanctions.org').replace(/\/$/, '');
    this.dataset = cfg.dataset || 'default';
  }

  async verifyIndividual(_input: IndividualVerificationInput): Promise<VerificationResult> {
    throw new Error('OpenSanctions does not verify identity documents');
  }

  async verifyBusiness(_input: BusinessVerificationInput): Promise<VerificationResult> {
    throw new Error('OpenSanctions does not verify companies');
  }

  async screenSanctions(input: SanctionsScreeningInput): Promise<VerificationResult> {
    const properties: Record<string, string[]> = { name: [input.name] };
    if (input.dateOfBirth) properties.birthDate = [input.dateOfBirth];
    if (input.country) properties.country = [input.country.toLowerCase()];
    const res = await fetch(`${this.baseUrl}/match/${encodeURIComponent(this.dataset)}`, {
      method: 'POST',
      headers: { Authorization: `ApiKey ${this.cfg.apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ queries: { q1: { schema: 'Person', properties } } }),
      signal: AbortSignal.timeout(30000),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`OpenSanctions API error ${res.status}: ${JSON.stringify(data)}`);

    const results: any[] = data?.responses?.q1?.results;
    if (!Array.isArray(results)) throw new Error('OpenSanctions returned an unexpected response'); // never read a malformed answer as "clean"
    const matches = results.filter(r => r.match === true);
    const top = results.reduce((m, r) => Math.max(m, Number(r.score ?? 0)), 0);
    return {
      status: matches.length ? 'REVIEW' : 'APPROVED',
      riskScore: Math.min(100, Math.round(top * 100)),
      // keep only what a reviewer needs (no full entity dumps)
      rawResult: {
        provider: 'opensanctions',
        dataset: this.dataset,
        candidates: results.length,
        matches: matches.slice(0, 10).map(r => ({
          id: r.id, name: r.caption, score: r.score, topics: r.topics ?? [], datasets: (r.datasets ?? []).slice(0, 8),
        })),
      },
    };
  }

  handleWebhook(_payload: unknown, _ctx: WebhookContext): NormalizedWebhookResult {
    throw new Error('OpenSanctions does not send webhooks');
  }
}

export const OPENSANCTIONS_DEFINITION: ProviderDefinition = {
  id: 'OPENSANCTIONS',
  displayName: 'OpenSanctions',
  capabilities: { individual: false, business: false, sanctions: true, webhooks: false },
  isConfigured: (c: ConfigService) => !!c.get<string>('OPENSANCTIONS_API_KEY'),
  create: (c: ConfigService) =>
    new OpenSanctionsProviderService({
      apiKey: c.get<string>('OPENSANCTIONS_API_KEY', ''),
      baseUrl: c.get<string>('OPENSANCTIONS_BASE_URL') || undefined,
      dataset: c.get<string>('OPENSANCTIONS_DATASET') || undefined,
    }),
};
