import {
  BadGatewayException, BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { MailService } from '../common/mail/mail.service';
import { LicensingService } from '../licensing/licensing.service';
import { KycProviderRegistry } from './providers/kyc-provider.registry';
import {
  BusinessVerificationInput,
  IndividualVerificationInput,
  KycFeature,
  KycProvider,
  NormalizedWebhookResult,
  SanctionsScreeningInput,
  VerificationResult,
  VerificationStatus,
  WebhookContext,
} from './providers/kyc-provider.interface';
import { DecisionDto } from './dto/decision.dto';
import { ProposeTermsDto } from './dto/terms.dto';
import { RoutingDto } from './dto/routing.dto';

export const IDENTITY_VERIFICATION_ADDON_KEY = 'identity_verification';
export const MANUAL_PROVIDER_ID = 'MANUAL';

/** How many times the verification link may be emailed to the person (protects against using the platform as a mail relay). */
export const LINK_SEND_LIMIT = 3;

/** What the AML screening list shows for each verification outcome (the AML UI knows exactly these values). */
export const AML_RESULT_OF_STATUS: Record<VerificationStatus, string> = {
  APPROVED: 'CLEAR',
  REJECTED: 'HIT',
  REVIEW: 'POTENTIAL_MATCH',
  PENDING: 'PENDING',
  ERROR: 'POTENTIAL_MATCH', // an expired / abandoned / failed check needs a person
};

const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/;

/** Accent/case-insensitive comparison of person names: every word of the shorter name must be in the longer one. */
export function namesMatch(requested: string, verified: string): boolean {
  const words = (n: string) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 1);
  const a = words(requested), b = words(verified);
  if (!a.length || !b.length) return false;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.every(w => long.includes(w));
}

type Feature = KycFeature;
const FEATURES: Feature[] = ['individual', 'business', 'sanctions'];

/** Commercial terms for automated checks, stored on the organisation's add-on record. */
export interface KycTerms {
  version: number;
  currency: string;
  setupFee: number;
  /** PAYG price per automated check; a feature without a price is not offered in automated mode. */
  prices: Partial<Record<Feature, number>>;
  /** Spending ceiling per calendar month (same currency). When it would be exceeded, new requests are handled manually. */
  monthlyCap?: number;
  note?: string;
  proposedAt: string;
  proposedById: string;
}
export interface KycAcceptance {
  version: number;
  acceptedAt: string;
  acceptedById: string;
}
interface Commercial { terms?: KycTerms; acceptance?: KycAcceptance; setupInvoicedAt?: string | null }

type Engine =
  | { mode: 'AUTOMATED'; provider: KycProvider; terms: KycTerms }
  | { mode: 'MANUAL'; reason?: 'CAP' };

const monthStart = (d = new Date()) => { const f = new Date(d); f.setUTCDate(1); f.setUTCHours(0, 0, 0, 0); return f; };

/**
 * Identity verification (KYC / KYB / sanctions screening) that does not depend on any vendor:
 *
 *  - MANUAL mode (always available once the add-on is active): the request is recorded and a person
 *    decides it. No external cost.
 *  - AUTOMATED mode: an external provider (Didit, Stripe Identity, OpenSanctions, Sumsub, …) runs the check. It is used
 *    only when a provider is configured on the platform AND the customer accepted the commercial terms
 *    (set-up fee + pay-as-you-go price per feature) AND the monthly spending cap, when there is one, is not exhausted.
 *    Otherwise the request falls back to MANUAL.
 */
@Injectable()
export class IdentityVerificationService {
  private readonly logger = new Logger(IdentityVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly licensing: LicensingService,
    private readonly registry: KycProviderRegistry,
    private readonly mail: MailService,
  ) {}

  private async assertAddonActive(organizationId: string) {
    const active = await this.licensing.hasActiveAddon(organizationId, IDENTITY_VERIFICATION_ADDON_KEY);
    if (!active) {
      throw new BadRequestException(
        'O addon de Verificação de Identidade (KYC/KYB/AML) não está ativo para esta organização.',
      );
    }
  }

  // ── add-on record: provider choice + commercial terms ────────────────────────

  private async findAddon(organizationId: string) {
    const license = await this.prisma.license.findUnique({ where: { organizationId }, select: { id: true } });
    if (!license) return null;
    return (this.prisma as any).licenseAddon.findUnique({
      where: { licenseId_addonKey: { licenseId: license.id, addonKey: IDENTITY_VERIFICATION_ADDON_KEY } },
    });
  }

  private async saveMetadata(addon: { id: string; metadata?: unknown }, patch: Record<string, unknown>) {
    await (this.prisma as any).licenseAddon.update({
      where: { id: addon.id },
      data: { metadata: { ...((addon.metadata as object) ?? {}), ...patch } },
    });
  }

  private preferredFrom(addon: any, feature?: Feature): string | null {
    const own = feature ? addon?.metadata?.kycRouting?.[feature] : undefined;
    const id = typeof own === 'string' && own ? own : addon?.metadata?.kycProvider;
    return typeof id === 'string' && id ? id : null;
  }

  private commercialFrom(addon: any): Commercial {
    return (addon?.metadata?.kycCommercial as Commercial) ?? {};
  }

  private isAccepted(c: Commercial): boolean {
    return !!c.terms && c.acceptance?.version === c.terms.version;
  }

  /**
   * How a request is served: through the external provider (only when configured on the platform, the customer
   * accepted the terms for that feature and the monthly cap allows it) or manually.
   */
  private async pickEngine(organizationId: string, feature: Feature): Promise<Engine> {
    const addon = await this.findAddon(organizationId);
    const commercial = this.commercialFrom(addon);
    if (!this.isAccepted(commercial)) return { mode: 'MANUAL' };
    const terms = commercial.terms as KycTerms;
    const price = terms.prices[feature];
    if (price == null) return { mode: 'MANUAL' }; // feature not part of the accepted terms
    // the provider routed to this feature, else the default, else any configured one that can do it
    const provider = this.registry.resolveFor(feature, this.preferredFrom(addon, feature));
    if (!provider) return { mode: 'MANUAL' }; // nothing configured can serve it (yet)
    if (terms.monthlyCap != null) {
      // a soft ceiling: a burst of simultaneous requests can overshoot it by a few checks, never by much
      const { amount } = await this.usage(organizationId);
      if (amount + price > terms.monthlyCap) return { mode: 'MANUAL', reason: 'CAP' };
    }
    return { mode: 'AUTOMATED', provider, terms };
  }

  /** Providers available on the platform, the organisation's choice, terms and this month's usage. */
  async getProviderSettings(organizationId: string) {
    const addon = await this.findAddon(organizationId);
    const selected = this.preferredFrom(addon);
    const commercial = this.commercialFrom(addon);
    const accepted = this.isAccepted(commercial);
    let effective: string | null = null;
    try { effective = this.registry.resolve(selected).id; } catch { /* nothing configured */ }
    const providers = this.registry.list();
    // who serves each feature today (null = manual), and what was explicitly routed
    const routing = Object.fromEntries(FEATURES.map(f => [f, {
      chosen: (addon?.metadata?.kycRouting?.[f] as string | undefined) ?? null,
      effective: this.registry.resolveFor(f, this.preferredFrom(addon, f))?.id ?? null,
    }]));
    const anyAutomated = FEATURES.some(f => (routing as any)[f].effective);
    const usage = await this.usage(organizationId);
    const cap = commercial.terms?.monthlyCap ?? null;
    const prices = Object.values(commercial.terms?.prices ?? {}).filter((p): p is number => typeof p === 'number');
    return {
      // without the add-on nothing can be requested: the UI shows an activation notice instead of a form that fails
      addonActive: await this.licensing.hasActiveAddon(organizationId, IDENTITY_VERIFICATION_ADDON_KEY),
      providers, selected, effective, platformDefault: this.registry.defaultId(), routing,
      // MANUAL until a provider is configured AND the customer accepted the terms
      mode: accepted && anyAutomated ? 'AUTOMATED' : 'MANUAL',
      commercial: {
        terms: commercial.terms ?? null,
        acceptance: commercial.acceptance ?? null,
        accepted,
        awaitingAcceptance: !!commercial.terms && !accepted,
        providerReady: anyAutomated,
      },
      usage: {
        ...usage, cap,
        capReached: cap != null && prices.length > 0 && usage.amount + Math.min(...prices) > cap,
      },
    };
  }

  private validateProvider(id: string): string {
    const info = this.registry.list().find(p => p.id === id.toUpperCase());
    if (!info) throw new BadRequestException(`Fornecedor desconhecido: ${id}`);
    if (!info.configured) throw new BadRequestException(`O fornecedor ${info.displayName} não está configurado nesta plataforma.`);
    return info.id;
  }

  /** The metadata patch for a routing change: `null` clears a choice, absent leaves it as it is. */
  private routingPatch(addon: any, input: RoutingDto): Record<string, unknown> {
    const routing: Record<string, string> = { ...((addon.metadata?.kycRouting as Record<string, string>) ?? {}) };
    const patch: Record<string, unknown> = {};
    for (const f of FEATURES) {
      const v = (input as any)[f];
      if (v === null) delete routing[f];
      else if (typeof v === 'string') routing[f] = this.validateProvider(v);
    }
    if (input.default === null) patch.kycProvider = null;
    else if (typeof input.default === 'string') patch.kycProvider = this.validateProvider(input.default);
    patch.kycRouting = routing;
    return patch;
  }

  /**
   * Platform operator: choose which provider serves each feature for ONE organisation
   * (e.g. documents → Didit, sanctions → OpenSanctions). Takes effect on the next request; switching
   * provider never changes what the customer pays (their terms are per feature, not per vendor).
   */
  async setRouting(organizationId: string, input: RoutingDto) {
    await this.assertAddonActive(organizationId);
    const addon = await this.findAddon(organizationId);
    if (!addon) throw new NotFoundException('Add-on não encontrado.');
    await this.saveMetadata(addon, this.routingPatch(addon, input));
    return this.getProviderSettings(organizationId);
  }

  /** Same, for EVERY organisation that has the add-on: switch the whole platform from one vendor to another in one step. */
  async setRoutingForAll(input: RoutingDto) {
    const addons: any[] = await (this.prisma as any).licenseAddon.findMany({
      where: { addonKey: IDENTITY_VERIFICATION_ADDON_KEY },
    });
    for (const addon of addons) await this.saveMetadata(addon, this.routingPatch(addon, input));
    return { updated: addons.length };
  }

  /** Operator: does the platform reach this provider with the configured credentials? (never a billable call) */
  async checkProvider(providerId: string) {
    const info = this.registry.list().find(p => p.id === providerId.toUpperCase());
    if (!info) throw new BadRequestException(`Fornecedor desconhecido: ${providerId}`);
    const base = { id: info.id, displayName: info.displayName };
    const provider = this.registry.get(info.id);
    if (!provider) {
      return { ...base, ok: false, detail: `${info.displayName} não está configurado neste ambiente: faltam as variáveis de ambiente no servidor (ver PROVIDERS.md).` };
    }
    if (!provider.check) return { ...base, ok: null, detail: 'Este fornecedor não tem um teste de ligação gratuito.' };
    try {
      return { ...base, ...(await provider.check()) };
    } catch (err) {
      this.logger.warn(`${info.id} check failed: ${String((err as Error).message).split(':')[0]}`);
      return { ...base, ok: false, detail: 'O teste falhou inesperadamente.' };
    }
  }

  // ── commercial terms: proposed by the operator, accepted by the customer ─────

  /** Platform operator: propose (or revise) the terms for one organisation. A new version needs a new acceptance. */
  async proposeTerms(organizationId: string, actorId: string, dto: ProposeTermsDto) {
    await this.assertAddonActive(organizationId);
    const addon = await this.findAddon(organizationId);
    if (!addon) throw new NotFoundException('Add-on não encontrado.');
    const prices: KycTerms['prices'] = {};
    if (dto.priceIndividual != null) prices.individual = dto.priceIndividual;
    if (dto.priceBusiness != null) prices.business = dto.priceBusiness;
    if (dto.priceSanctions != null) prices.sanctions = dto.priceSanctions;
    if (!Object.keys(prices).length) {
      throw new BadRequestException('Indique o preço de pelo menos uma funcionalidade.');
    }
    const previous = this.commercialFrom(addon);
    const terms: KycTerms = {
      version: (previous.terms?.version ?? 0) + 1,
      currency: dto.currency,
      setupFee: dto.setupFee,
      prices,
      ...(dto.monthlyCap != null ? { monthlyCap: dto.monthlyCap } : {}),
      note: dto.note,
      proposedAt: new Date().toISOString(),
      proposedById: actorId,
    };
    await this.saveMetadata(addon, { kycCommercial: { terms, acceptance: previous.acceptance } });
    return this.getProviderSettings(organizationId);
  }

  /** Customer admin: accept the terms they were shown. The acceptance is tied to that exact version. */
  async acceptTerms(organizationId: string, userId: string, version: number) {
    await this.assertAddonActive(organizationId);
    const addon = await this.findAddon(organizationId);
    const commercial = this.commercialFrom(addon);
    if (!addon || !commercial.terms) throw new BadRequestException('Não há condições comerciais propostas para esta organização.');
    if (commercial.terms.version !== version) {
      throw new BadRequestException('As condições foram atualizadas. Reveja a versão mais recente antes de aceitar.');
    }
    const acceptance: KycAcceptance = { version, acceptedAt: new Date().toISOString(), acceptedById: userId };
    await this.saveMetadata(addon, { kycCommercial: { ...commercial, terms: commercial.terms, acceptance } });
    return this.getProviderSettings(organizationId);
  }

  /** Operator: remember that the one-off set-up fee of this customer was invoiced (so it is not forgotten, or invoiced twice). */
  async setSetupInvoiced(organizationId: string, invoiced: boolean) {
    const addon = await this.findAddon(organizationId);
    const commercial = this.commercialFrom(addon);
    if (!addon || !this.isAccepted(commercial)) throw new BadRequestException('O cliente ainda não aceitou condições comerciais.');
    await this.saveMetadata(addon, { kycCommercial: { ...commercial, setupInvoicedAt: invoiced ? new Date().toISOString() : null } });
    return { setupInvoicedAt: invoiced ? 'now' : null };
  }

  /** Automated checks of the current month and what they cost (pay-as-you-go). */
  private async usage(organizationId: string) {
    const from = monthStart();
    const rows: any[] = await (this.prisma as any).identityVerification.findMany({
      where: { organizationId, automated: true, createdAt: { gte: from } },
      select: { unitPrice: true, currency: true },
    });
    const amount = rows.reduce((sum, r) => sum + Number(r.unitPrice ?? 0), 0);
    return { month: from.toISOString().slice(0, 7), automatedChecks: rows.length, amount: Math.round(amount * 100) / 100, currency: rows[0]?.currency ?? 'EUR' };
  }

  /**
   * Operator report for invoicing: automated checks of a month per customer, provider and feature with the price
   * charged to the customer, plus the one-off set-up fees (accepted terms) and whether each was invoiced.
   */
  async usageReport(month?: string) {
    const m = /^\d{4}-(0[1-9]|1[0-2])$/.test(month ?? '') ? (month as string) : monthStart().toISOString().slice(0, 7);
    const from = new Date(`${m}-01T00:00:00.000Z`);
    const to = new Date(from); to.setUTCMonth(to.getUTCMonth() + 1);
    const checks: any[] = await (this.prisma as any).identityVerification.findMany({
      where: { automated: true, createdAt: { gte: from, lt: to } },
      select: { organizationId: true, provider: true, feature: true, subjectType: true, unitPrice: true, currency: true, organization: { select: { name: true } } },
    });
    const grouped = new Map<string, any>();
    for (const c of checks) {
      const feature = c.feature ?? (c.subjectType === 'BUSINESS' ? 'business' : 'individual'); // rows from before the column existed
      const key = `${c.organizationId}|${c.provider}|${feature}`;
      const g = grouped.get(key) ?? { organizationId: c.organizationId, organizationName: c.organization?.name ?? c.organizationId, provider: c.provider, feature, checks: 0, amount: 0, currency: c.currency ?? 'EUR' };
      g.checks += 1; g.amount += Number(c.unitPrice ?? 0);
      grouped.set(key, g);
    }
    const rows = [...grouped.values()]
      .map(g => ({ ...g, amount: Math.round(g.amount * 100) / 100 }))
      .sort((a, b) => a.organizationName.localeCompare(b.organizationName) || a.feature.localeCompare(b.feature));

    const addons: any[] = await (this.prisma as any).licenseAddon.findMany({
      where: { addonKey: IDENTITY_VERIFICATION_ADDON_KEY },
      include: { license: { select: { organization: { select: { id: true, name: true } } } } },
    });
    const setupFees = addons
      .map(a => ({ a, c: this.commercialFrom(a) }))
      .filter(({ c }) => this.isAccepted(c))
      .map(({ a, c }) => ({
        organizationId: a.license?.organization?.id, organizationName: a.license?.organization?.name ?? '—',
        amount: c.terms!.setupFee, currency: c.terms!.currency, version: c.terms!.version,
        acceptedAt: c.acceptance!.acceptedAt, invoicedAt: c.setupInvoicedAt ?? null,
      }))
      .sort((x, y) => x.organizationName.localeCompare(y.organizationName));

    return {
      month: m,
      rows,
      totals: { checks: rows.reduce((s, r) => s + r.checks, 0), amount: Math.round(rows.reduce((s, r) => s + r.amount, 0) * 100) / 100, currency: 'EUR' },
      setupFees,
      providers: this.registry.list(),
    };
  }

  // ── verifications ────────────────────────────────────────────────────────────

  async listVerifications(organizationId: string, status?: string) {
    const where: any = { organizationId };
    if (status) where.status = status;
    return (this.prisma as any).identityVerification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  /** A provider failing must not surface its raw error (it can contain request data). */
  private async callProvider(provider: KycProvider, what: string, run: () => Promise<VerificationResult>) {
    try {
      return await run();
    } catch (err) {
      // provider error bodies can echo names/emails: log only the part before the first colon (e.g. "Didit API error 401")
      this.logger.error(`${provider.id} ${what} failed: ${String((err as Error).message).split(':')[0]}`);
      throw new BadGatewayException(`O fornecedor ${provider.displayName} não conseguiu concluir o pedido.`);
    }
  }

  private async record(
    organizationId: string, requestedById: string, engine: Engine, feature: Feature,
    subject: { subjectType: 'INDIVIDUAL' | 'BUSINESS'; subjectName: string; country?: string },
    result: VerificationResult,
  ) {
    const automated = engine.mode === 'AUTOMATED';
    return (this.prisma as any).identityVerification.create({
      data: {
        organizationId,
        requestedById,
        subjectType: subject.subjectType,
        subjectName: subject.subjectName,
        country: subject.country,
        provider: engine.mode === 'AUTOMATED' ? engine.provider.id : MANUAL_PROVIDER_ID,
        providerRefId: result.providerRefId,
        actionUrl: result.actionUrl ?? null,
        status: result.status,
        riskScore: result.riskScore,
        rawResult: result.rawResult,
        automated,
        feature,
        // the price in force when the check was run, so later changes of the terms never rewrite history
        unitPrice: engine.mode === 'AUTOMATED' ? engine.terms.prices[feature] : null,
        currency: engine.mode === 'AUTOMATED' ? engine.terms.currency : null,
        termsVersion: engine.mode === 'AUTOMATED' ? engine.terms.version : null,
      },
    });
  }

  /** Manual mode keeps only what the person needs to decide; a document number is stored masked. */
  private manualResult(kind: string, input: Record<string, unknown>, engine: Engine): VerificationResult {
    const doc = typeof input.documentNumber === 'string' ? input.documentNumber : '';
    const safe: Record<string, unknown> = { ...input };
    if (doc) safe.documentNumber = doc.length > 4 ? `${'•'.repeat(doc.length - 4)}${doc.slice(-4)}` : '••••';
    const capReached = engine.mode === 'MANUAL' && engine.reason === 'CAP';
    return { status: 'REVIEW', rawResult: { mode: 'manual', kind, input: safe, ...(capReached ? { capReached: true } : {}) } };
  }

  async verifyIndividual(organizationId: string, requestedById: string, input: IndividualVerificationInput) {
    await this.assertAddonActive(organizationId);
    const engine = await this.pickEngine(organizationId, 'individual');
    const subject = { subjectType: 'INDIVIDUAL' as const, subjectName: input.fullName, country: input.country };
    if (engine.mode === 'MANUAL') {
      return this.record(organizationId, requestedById, engine, 'individual', subject, this.manualResult('individual', { ...input }, engine));
    }
    const result = await this.callProvider(engine.provider, 'verifyIndividual', () => engine.provider.verifyIndividual(input));
    return this.record(organizationId, requestedById, engine, 'individual', subject, result);
  }

  async verifyBusiness(organizationId: string, requestedById: string, input: BusinessVerificationInput) {
    await this.assertAddonActive(organizationId);
    const engine = await this.pickEngine(organizationId, 'business');
    const subject = { subjectType: 'BUSINESS' as const, subjectName: input.legalName, country: input.country };
    if (engine.mode === 'MANUAL') {
      return this.record(organizationId, requestedById, engine, 'business', subject, this.manualResult('business', { ...input }, engine));
    }
    const result = await this.callProvider(engine.provider, 'verifyBusiness', () => engine.provider.verifyBusiness(input));
    return this.record(organizationId, requestedById, engine, 'business', subject, result);
  }

  async screenSanctions(organizationId: string, requestedById: string, input: SanctionsScreeningInput) {
    await this.assertAddonActive(organizationId);
    const engine = await this.pickEngine(organizationId, 'sanctions');
    const subject = { subjectType: 'INDIVIDUAL' as const, subjectName: input.name, country: input.country };
    if (engine.mode === 'MANUAL') {
      return this.record(organizationId, requestedById, engine, 'sanctions', subject, this.manualResult('sanctions', { ...input }, engine));
    }
    const result = await this.callProvider(engine.provider, 'screenSanctions', () => engine.provider.screenSanctions(input));
    return this.record(organizationId, requestedById, engine, 'sanctions', subject, result);
  }

  // ── AML screening records follow the verification they came from ─────────────

  /** Links an AML screening (created from the AML page) to the verification that serves it. */
  async linkAmlScreening(organizationId: string, verificationId: string, amlScreeningId: string) {
    await (this.prisma as any).identityVerification.updateMany({
      where: { id: verificationId, organizationId },
      data: { amlScreeningId },
    });
  }

  /** The AML screening shows the verification's outcome (best effort: it never blocks the verification itself). */
  private async syncAml(v: { organizationId: string; amlScreeningId?: string | null }, status: VerificationStatus) {
    if (!v.amlScreeningId) return;
    try {
      await (this.prisma as any).amlScreening.updateMany({
        where: { id: v.amlScreeningId, organizationId: v.organizationId },
        data: { result: AML_RESULT_OF_STATUS[status] ?? 'PENDING' },
      });
    } catch (err) {
      this.logger.warn(`AML screening sync failed: ${String((err as Error).message).split(':')[0]}`);
    }
  }

  /** A person decides a verification: manual checks, or an automated one the provider left in review. */
  async decide(organizationId: string, id: string, userId: string, dto: DecisionDto) {
    await this.assertAddonActive(organizationId);
    const v = await (this.prisma as any).identityVerification.findFirst({ where: { id, organizationId } });
    if (!v) throw new NotFoundException('Verificação não encontrada.');
    // Open states can be decided; an automatic REJECTED (e.g. a false sanctions match) can be overturned once by a person.
    // A decision taken by a person is final.
    const open = ['REVIEW', 'PENDING', 'ERROR'].includes(v.status) || (v.status === 'REJECTED' && !v.decidedAt);
    if (!open || v.decidedAt) {
      throw new BadRequestException('Esta verificação já tem uma decisão.');
    }
    if (v.automated && v.status === 'PENDING') {
      throw new ForbiddenException('O fornecedor ainda está a processar este pedido; aguarde o resultado.');
    }
    const updated = await (this.prisma as any).identityVerification.update({
      where: { id },
      data: {
        status: dto.decision,
        riskScore: dto.riskScore ?? v.riskScore,
        decisionNote: dto.note ?? null,
        decidedById: userId,
        decidedAt: new Date(),
      },
    });
    await this.syncAml(v, dto.decision);
    return updated;
  }

  // ── outcomes from the provider: webhook, refresh button, reconciliation ──────

  /**
   * Applies what the provider reports to an open verification. A person's decision and any final outcome are never
   * overwritten by a late, repeated or out-of-order notification. Returns true when the status changed.
   */
  private async applyOutcome(existing: any, normalized: NormalizedWebhookResult): Promise<boolean> {
    if (existing.decidedAt || ['APPROVED', 'REJECTED'].includes(existing.status)) return false;

    let status = normalized.status;
    let rawResult: Record<string, unknown> = normalized.rawResult;
    // An approval must be for the person we asked about: if the provider reports a different name, a person decides.
    if (status === 'APPROVED' && normalized.verifiedName && !namesMatch(existing.subjectName, normalized.verifiedName)) {
      status = 'REVIEW';
      rawResult = { ...rawResult, nameMismatch: true };
    }

    // guarded write: only while still open, so two concurrent notifications cannot both win
    const written = await (this.prisma as any).identityVerification.updateMany({
      where: { id: existing.id, decidedAt: null, status: { in: ['PENDING', 'REVIEW', 'ERROR'] } },
      data: { status, riskScore: normalized.riskScore ?? existing.riskScore, rawResult },
    });
    const changed = (written?.count ?? 0) > 0 && status !== existing.status;
    if (changed) await this.syncAml(existing, status);
    return changed;
  }

  /**
   * Any configured provider can receive webhooks at the same time (a provider switch must not
   * drop in-flight results). The provider authenticates the call itself — a bad signature throws.
   * The response never echoes stored data back to the (unauthenticated) caller.
   */
  async handleWebhook(providerId: string, payload: unknown, ctx: WebhookContext) {
    const provider = this.registry.get(providerId);
    if (!provider || !provider.capabilities.webhooks) throw new NotFoundException();

    const normalized = await provider.handleWebhook(payload, ctx);
    if (!normalized.providerRefId) return { ignored: true };

    const existing = await (this.prisma as any).identityVerification.findFirst({
      where: { providerRefId: normalized.providerRefId, provider: provider.id },
    });
    if (!existing) return { ignored: true }; // unknown reference: acknowledge so the provider stops retrying

    await this.applyOutcome(existing, normalized);
    return { received: true };
  }

  /** "Atualizar estado": asks the provider for the current state of one verification (a lost webhook must not strand it). */
  async refresh(organizationId: string, id: string) {
    await this.assertAddonActive(organizationId);
    const v = await (this.prisma as any).identityVerification.findFirst({ where: { id, organizationId } });
    if (!v) throw new NotFoundException('Verificação não encontrada.');
    if (!v.automated || v.provider === MANUAL_PROVIDER_ID || !v.providerRefId) {
      throw new BadRequestException('Só as verificações automáticas têm um estado no fornecedor.');
    }
    const provider = this.registry.get(v.provider);
    if (!provider) throw new BadRequestException(`O fornecedor ${v.provider} já não está configurado nesta plataforma.`);
    if (!provider.fetchStatus) throw new BadRequestException(`O fornecedor ${provider.displayName} não permite consultar o estado.`);
    let outcome: NormalizedWebhookResult;
    try {
      outcome = await provider.fetchStatus(v.providerRefId);
    } catch (err) {
      this.logger.warn(`${provider.id} refresh failed: ${String((err as Error).message).split(':')[0]}`);
      throw new BadGatewayException(`O fornecedor ${provider.displayName} não respondeu.`);
    }
    await this.applyOutcome(v, outcome);
    return (this.prisma as any).identityVerification.findFirst({ where: { id, organizationId } });
  }

  /**
   * Safety net for lost webhooks: every 20 minutes, automated checks still PENDING after 10 minutes (and younger than
   * 30 days) are asked for their current state. Returns how many changed.
   */
  @Cron('*/20 * * * *')
  async reconcilePending(now: Date = new Date()): Promise<number> {
    const rows: any[] = await (this.prisma as any).identityVerification.findMany({
      where: {
        automated: true, status: 'PENDING', providerRefId: { not: null },
        createdAt: { gt: new Date(now.getTime() - 30 * 86_400_000) },
        updatedAt: { lt: new Date(now.getTime() - 10 * 60_000) },
      },
      orderBy: { updatedAt: 'asc' },
      take: 50,
    });
    let changed = 0;
    for (const v of rows) {
      const provider = this.registry.get(v.provider);
      if (!provider?.fetchStatus) continue;
      try {
        if (await this.applyOutcome(v, await provider.fetchStatus(v.providerRefId))) changed++;
      } catch (err) {
        this.logger.warn(`${v.provider} reconcile failed: ${String((err as Error).message).split(':')[0]}`);
      }
    }
    if (changed) this.logger.log(`Reconciled ${changed} pending identity verification(s)`);
    return changed;
  }

  // ── send the verification link to the person ─────────────────────────────────

  /**
   * Emails the hosted verification link to the person being verified. Limited to a few sends per verification so the
   * feature cannot be used as a mail relay; the link itself comes from the provider and is only sent over https.
   */
  async sendLink(organizationId: string, id: string, email: string) {
    await this.assertAddonActive(organizationId);
    const to = String(email ?? '').trim();
    if (!EMAIL_RE.test(to) || to.length > 200) throw new BadRequestException('Indique um email válido.');
    const v = await (this.prisma as any).identityVerification.findFirst({ where: { id, organizationId } });
    if (!v) throw new NotFoundException('Verificação não encontrada.');
    if (!v.automated || v.status !== 'PENDING' || !v.actionUrl || !/^https:\/\//i.test(v.actionUrl)) {
      throw new BadRequestException('Só é possível enviar o link de uma verificação automática ainda por concluir.');
    }
    if ((v.linkSentCount ?? 0) >= LINK_SEND_LIMIT) {
      throw new BadRequestException(`O link já foi enviado ${LINK_SEND_LIMIT} vezes. Copie-o e envie-o pelo seu meio habitual.`);
    }
    const org = await (this.prisma as any).organization.findUnique({ where: { id: organizationId }, select: { name: true } });
    const orgName = org?.name ?? 'Uma organização';
    try {
      await this.mail.sendTicketEmail(to, `${orgName} pede-lhe que confirme a sua identidade`, {
        heading: 'Confirmação de identidade',
        facts: [['Pedido por', orgName]],
        excerpt: 'Para concluir, abra o link e siga os passos (fotografar o documento e fazer uma selfie). Demora cerca de dois minutos. Se não estava à espera deste pedido, ignore este email.',
        url: v.actionUrl,
        cta: 'Confirmar a minha identidade',
        footer: `Enviado através do iComply em nome de ${orgName}`,
      });
    } catch (err) {
      this.logger.warn(`Verification link email failed: ${String((err as Error).message).split(':')[0]}`);
      throw new BadGatewayException('Não foi possível enviar o email. Copie o link e envie-o pelo seu meio habitual.');
    }
    const count = (v.linkSentCount ?? 0) + 1;
    await (this.prisma as any).identityVerification.update({ where: { id }, data: { linkSentCount: count, linkSentAt: new Date() } });
    return { sent: true, remaining: LINK_SEND_LIMIT - count };
  }
}
