import {
  BadGatewayException, BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { LicensingService } from '../licensing/licensing.service';
import { KycProviderRegistry } from './providers/kyc-provider.registry';
import {
  BusinessVerificationInput,
  IndividualVerificationInput,
  KycFeature,
  KycProvider,
  SanctionsScreeningInput,
  VerificationResult,
  WebhookContext,
} from './providers/kyc-provider.interface';
import { DecisionDto } from './dto/decision.dto';
import { ProposeTermsDto } from './dto/terms.dto';
import { RoutingDto } from './dto/routing.dto';

export const IDENTITY_VERIFICATION_ADDON_KEY = 'identity_verification';
export const MANUAL_PROVIDER_ID = 'MANUAL';

/** Accent/case-insensitive comparison of person names: every word of the shorter name must be in the longer one. */
export function namesMatch(requested: string, verified: string): boolean {
  const words = (n: string) => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 1);
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
  note?: string;
  proposedAt: string;
  proposedById: string;
}
export interface KycAcceptance {
  version: number;
  acceptedAt: string;
  acceptedById: string;
}
interface Commercial { terms?: KycTerms; acceptance?: KycAcceptance }

/**
 * Identity verification (KYC / KYB / sanctions screening) that does not depend on any vendor:
 *
 *  - MANUAL mode (always available once the add-on is active): the request is recorded and a person
 *    decides it. No external cost.
 *  - AUTOMATED mode: an external provider (Sumsub, Trulioo, …) runs the check. It is used only when
 *    a provider is configured on the platform AND the customer accepted the commercial terms
 *    (set-up fee + pay-as-you-go price per feature). Otherwise the request falls back to MANUAL.
 */
@Injectable()
export class IdentityVerificationService {
  private readonly logger = new Logger(IdentityVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly licensing: LicensingService,
    private readonly registry: KycProviderRegistry,
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
   * How a request is served: through the external provider (only when configured on the platform
   * and the customer accepted the terms for that feature) or manually.
   */
  private async pickEngine(organizationId: string, feature: Feature):
    Promise<{ mode: 'AUTOMATED'; provider: KycProvider; terms: KycTerms } | { mode: 'MANUAL' }> {
    const addon = await this.findAddon(organizationId);
    const commercial = this.commercialFrom(addon);
    if (!this.isAccepted(commercial)) return { mode: 'MANUAL' };
    const terms = commercial.terms as KycTerms;
    if (terms.prices[feature] == null) return { mode: 'MANUAL' }; // feature not part of the accepted terms
    // the provider routed to this feature, else the default, else any configured one that can do it
    const provider = this.registry.resolveFor(feature, this.preferredFrom(addon, feature));
    if (!provider) return { mode: 'MANUAL' }; // nothing configured can serve it (yet)
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
    return {
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
      usage: await this.usage(organizationId),
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
    await this.saveMetadata(addon, { kycCommercial: { terms: commercial.terms, acceptance } });
    return this.getProviderSettings(organizationId);
  }

  /** Automated checks of the current month and what they cost (pay-as-you-go). */
  private async usage(organizationId: string) {
    const from = new Date(); from.setUTCDate(1); from.setUTCHours(0, 0, 0, 0);
    const rows: any[] = await (this.prisma as any).identityVerification.findMany({
      where: { organizationId, automated: true, createdAt: { gte: from } },
      select: { unitPrice: true, currency: true },
    });
    const amount = rows.reduce((sum, r) => sum + Number(r.unitPrice ?? 0), 0);
    return { month: from.toISOString().slice(0, 7), automatedChecks: rows.length, amount: Math.round(amount * 100) / 100, currency: rows[0]?.currency ?? 'EUR' };
  }

  // ── verifications ────────────────────────────────────────────────────────────

  async listVerifications(organizationId: string, status?: string) {
    const where: any = { organizationId };
    if (status) where.status = status;
    return (this.prisma as any).identityVerification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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
    organizationId: string, requestedById: string,
    engine: { mode: 'AUTOMATED'; provider: KycProvider; terms: KycTerms; feature: Feature } | { mode: 'MANUAL' },
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
        provider: automated ? engine.provider.id : MANUAL_PROVIDER_ID,
        providerRefId: result.providerRefId,
        actionUrl: result.actionUrl ?? null,
        status: result.status,
        riskScore: result.riskScore,
        rawResult: result.rawResult,
        automated,
        // the price in force when the check was run, so later changes of the terms never rewrite history
        unitPrice: automated ? engine.terms.prices[engine.feature] : null,
        currency: automated ? engine.terms.currency : null,
        termsVersion: automated ? engine.terms.version : null,
      },
    });
  }

  /** Manual mode keeps only what the person needs to decide; a document number is stored masked. */
  private manualResult(kind: string, input: Record<string, unknown>): VerificationResult {
    const doc = typeof input.documentNumber === 'string' ? input.documentNumber : '';
    const safe: Record<string, unknown> = { ...input };
    if (doc) safe.documentNumber = doc.length > 4 ? `${'•'.repeat(doc.length - 4)}${doc.slice(-4)}` : '••••';
    return { status: 'REVIEW', rawResult: { mode: 'manual', kind, input: safe } };
  }

  async verifyIndividual(organizationId: string, requestedById: string, input: IndividualVerificationInput) {
    await this.assertAddonActive(organizationId);
    const engine = await this.pickEngine(organizationId, 'individual');
    const subject = { subjectType: 'INDIVIDUAL' as const, subjectName: input.fullName, country: input.country };
    if (engine.mode === 'MANUAL') {
      return this.record(organizationId, requestedById, engine, subject, this.manualResult('individual', { ...input }));
    }
    const result = await this.callProvider(engine.provider, 'verifyIndividual', () => engine.provider.verifyIndividual(input));
    return this.record(organizationId, requestedById, { ...engine, feature: 'individual' }, subject, result);
  }

  async verifyBusiness(organizationId: string, requestedById: string, input: BusinessVerificationInput) {
    await this.assertAddonActive(organizationId);
    const engine = await this.pickEngine(organizationId, 'business');
    const subject = { subjectType: 'BUSINESS' as const, subjectName: input.legalName, country: input.country };
    if (engine.mode === 'MANUAL') {
      return this.record(organizationId, requestedById, engine, subject, this.manualResult('business', { ...input }));
    }
    const result = await this.callProvider(engine.provider, 'verifyBusiness', () => engine.provider.verifyBusiness(input));
    return this.record(organizationId, requestedById, { ...engine, feature: 'business' }, subject, result);
  }

  async screenSanctions(organizationId: string, requestedById: string, input: SanctionsScreeningInput) {
    await this.assertAddonActive(organizationId);
    const engine = await this.pickEngine(organizationId, 'sanctions');
    const subject = { subjectType: 'INDIVIDUAL' as const, subjectName: input.name, country: input.country };
    if (engine.mode === 'MANUAL') {
      return this.record(organizationId, requestedById, engine, subject, this.manualResult('sanctions', { ...input }));
    }
    const result = await this.callProvider(engine.provider, 'screenSanctions', () => engine.provider.screenSanctions(input));
    return this.record(organizationId, requestedById, { ...engine, feature: 'sanctions' }, subject, result);
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
    return (this.prisma as any).identityVerification.update({
      where: { id },
      data: {
        status: dto.decision,
        riskScore: dto.riskScore ?? v.riskScore,
        decisionNote: dto.note ?? null,
        decidedById: userId,
        decidedAt: new Date(),
      },
    });
  }

  // ── webhooks ─────────────────────────────────────────────────────────────────

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

    // A person's decision and any final outcome are never overwritten by a late, repeated or
    // out-of-order notification (the provider may retry, replay or send events out of order).
    if (existing.decidedAt || ['APPROVED', 'REJECTED'].includes(existing.status)) return { received: true };

    let status = normalized.status;
    let rawResult: Record<string, unknown> = normalized.rawResult;
    // An approval must be for the person we asked about: if the provider reports a different name, a person decides.
    if (status === 'APPROVED' && normalized.verifiedName && !namesMatch(existing.subjectName, normalized.verifiedName)) {
      status = 'REVIEW';
      rawResult = { ...rawResult, nameMismatch: true };
    }

    // guarded write: only while still open, so two concurrent notifications cannot both win
    await (this.prisma as any).identityVerification.updateMany({
      where: { id: existing.id, decidedAt: null, status: { in: ['PENDING', 'REVIEW', 'ERROR'] } },
      data: { status, riskScore: normalized.riskScore ?? existing.riskScore, rawResult },
    });
    return { received: true };
  }
}
