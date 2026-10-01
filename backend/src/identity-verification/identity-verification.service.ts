import {
  BadGatewayException, BadRequestException, Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { LicensingService } from '../licensing/licensing.service';
import { KycProviderRegistry } from './providers/kyc-provider.registry';
import {
  BusinessVerificationInput,
  IndividualVerificationInput,
  KycProvider,
  SanctionsScreeningInput,
  VerificationResult,
  WebhookContext,
} from './providers/kyc-provider.interface';

export const IDENTITY_VERIFICATION_ADDON_KEY = 'identity_verification';

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

  // ── provider choice (per organisation, stored on the add-on record) ──────────

  private async findAddon(organizationId: string) {
    const license = await this.prisma.license.findUnique({ where: { organizationId }, select: { id: true } });
    if (!license) return null;
    return (this.prisma as any).licenseAddon.findUnique({
      where: { licenseId_addonKey: { licenseId: license.id, addonKey: IDENTITY_VERIFICATION_ADDON_KEY } },
    });
  }

  private async preferredProviderId(organizationId: string): Promise<string | null> {
    const id = (await this.findAddon(organizationId))?.metadata?.kycProvider;
    return typeof id === 'string' && id ? id : null;
  }

  /** The provider this organisation uses: its own choice, else the platform default. */
  private async resolveProvider(organizationId: string): Promise<KycProvider> {
    return this.registry.resolve(await this.preferredProviderId(organizationId));
  }

  /** Providers available on the platform + the organisation's choice, for the settings screen. */
  async getProviderSettings(organizationId: string) {
    const selected = await this.preferredProviderId(organizationId);
    let effective: string | null = null;
    try { effective = this.registry.resolve(selected).id; } catch { /* nothing configured */ }
    return { providers: this.registry.list(), selected, effective, platformDefault: this.registry.defaultId() };
  }

  /** `null` clears the choice (the platform default is used). */
  async setProvider(organizationId: string, providerId: string | null) {
    await this.assertAddonActive(organizationId);
    if (providerId) {
      const info = this.registry.list().find(p => p.id === providerId.toUpperCase());
      if (!info) throw new BadRequestException('Fornecedor desconhecido.');
      if (!info.configured) throw new BadRequestException(`O fornecedor ${info.displayName} não está configurado nesta plataforma.`);
      providerId = info.id;
    }
    const addon = await this.findAddon(organizationId);
    if (!addon) throw new NotFoundException('Add-on não encontrado.');
    await (this.prisma as any).licenseAddon.update({
      where: { id: addon.id },
      data: { metadata: { ...((addon.metadata as object) ?? {}), kycProvider: providerId } },
    });
    return this.getProviderSettings(organizationId);
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
      this.logger.error(`${provider.id} ${what} failed: ${(err as Error).message}`);
      throw new BadGatewayException(`O fornecedor ${provider.displayName} não conseguiu concluir o pedido.`);
    }
  }

  private async record(
    organizationId: string, requestedById: string, provider: KycProvider,
    subject: { subjectType: 'INDIVIDUAL' | 'BUSINESS'; subjectName: string; country?: string },
    result: VerificationResult,
  ) {
    return (this.prisma as any).identityVerification.create({
      data: {
        organizationId,
        requestedById,
        subjectType: subject.subjectType,
        subjectName: subject.subjectName,
        country: subject.country,
        provider: provider.id,
        providerRefId: result.providerRefId,
        status: result.status,
        riskScore: result.riskScore,
        rawResult: result.rawResult,
      },
    });
  }

  private requireCapability(provider: KycProvider, cap: 'individual' | 'business' | 'sanctions', label: string) {
    if (!provider.capabilities[cap]) {
      throw new BadRequestException(`O fornecedor ${provider.displayName} não suporta ${label}.`);
    }
  }

  async verifyIndividual(organizationId: string, requestedById: string, input: IndividualVerificationInput) {
    await this.assertAddonActive(organizationId);
    const provider = await this.resolveProvider(organizationId);
    this.requireCapability(provider, 'individual', 'a verificação de pessoas');
    const result = await this.callProvider(provider, 'verifyIndividual', () => provider.verifyIndividual(input));
    return this.record(organizationId, requestedById, provider,
      { subjectType: 'INDIVIDUAL', subjectName: input.fullName, country: input.country }, result);
  }

  async verifyBusiness(organizationId: string, requestedById: string, input: BusinessVerificationInput) {
    await this.assertAddonActive(organizationId);
    const provider = await this.resolveProvider(organizationId);
    this.requireCapability(provider, 'business', 'a verificação de empresas');
    const result = await this.callProvider(provider, 'verifyBusiness', () => provider.verifyBusiness(input));
    return this.record(organizationId, requestedById, provider,
      { subjectType: 'BUSINESS', subjectName: input.legalName, country: input.country }, result);
  }

  async screenSanctions(organizationId: string, requestedById: string, input: SanctionsScreeningInput) {
    await this.assertAddonActive(organizationId);
    const provider = await this.resolveProvider(organizationId);
    this.requireCapability(provider, 'sanctions', 'o rastreio de sanções');
    const result = await this.callProvider(provider, 'screenSanctions', () => provider.screenSanctions(input));
    return this.record(organizationId, requestedById, provider,
      { subjectType: 'INDIVIDUAL', subjectName: input.name, country: input.country }, result);
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

    const normalized = provider.handleWebhook(payload, ctx);
    if (!normalized.providerRefId) return { ignored: true };

    const existing = await (this.prisma as any).identityVerification.findFirst({
      where: { providerRefId: normalized.providerRefId, provider: provider.id },
    });
    if (!existing) return { ignored: true }; // unknown reference: acknowledge so the provider stops retrying

    await (this.prisma as any).identityVerification.update({
      where: { id: existing.id },
      data: {
        status: normalized.status,
        riskScore: normalized.riskScore ?? existing.riskScore,
        rawResult: normalized.rawResult,
      },
    });
    return { received: true };
  }
}
