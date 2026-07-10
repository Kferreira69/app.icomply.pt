import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { LicensingService } from '../licensing/licensing.service';
import { KycProviderFactory } from './providers/kyc-provider.factory';
import {
  BusinessVerificationInput,
  IndividualVerificationInput,
  SanctionsScreeningInput,
} from './providers/kyc-provider.interface';

export const IDENTITY_VERIFICATION_ADDON_KEY = 'identity_verification';

@Injectable()
export class IdentityVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly licensing: LicensingService,
    private readonly providerFactory: KycProviderFactory,
  ) {}

  private async assertAddonActive(organizationId: string) {
    const active = await this.licensing.hasActiveAddon(organizationId, IDENTITY_VERIFICATION_ADDON_KEY);
    if (!active) {
      throw new BadRequestException(
        'O addon de Verificação de Identidade (KYC/KYB/AML) não está ativo para esta organização.',
      );
    }
  }

  async listVerifications(organizationId: string, status?: string) {
    const where: any = { organizationId };
    if (status) where.status = status;
    return (this.prisma as any).identityVerification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async verifyIndividual(organizationId: string, requestedById: string, input: IndividualVerificationInput) {
    await this.assertAddonActive(organizationId);
    const provider = this.providerFactory.getProvider();
    const result = await provider.verifyIndividual(input);
    return (this.prisma as any).identityVerification.create({
      data: {
        organizationId,
        requestedById,
        subjectType: 'INDIVIDUAL',
        subjectName: input.fullName,
        country: input.country,
        provider: provider.name,
        providerRefId: result.providerRefId,
        status: result.status,
        riskScore: result.riskScore,
        rawResult: result.rawResult,
      },
    });
  }

  async verifyBusiness(organizationId: string, requestedById: string, input: BusinessVerificationInput) {
    await this.assertAddonActive(organizationId);
    const provider = this.providerFactory.getProvider();
    const result = await provider.verifyBusiness(input);
    return (this.prisma as any).identityVerification.create({
      data: {
        organizationId,
        requestedById,
        subjectType: 'BUSINESS',
        subjectName: input.legalName,
        country: input.country,
        provider: provider.name,
        providerRefId: result.providerRefId,
        status: result.status,
        riskScore: result.riskScore,
        rawResult: result.rawResult,
      },
    });
  }

  async screenSanctions(organizationId: string, requestedById: string, input: SanctionsScreeningInput) {
    await this.assertAddonActive(organizationId);
    const provider = this.providerFactory.getProvider();
    const result = await provider.screenSanctions(input);
    return (this.prisma as any).identityVerification.create({
      data: {
        organizationId,
        requestedById,
        subjectType: 'INDIVIDUAL',
        subjectName: input.name,
        country: input.country,
        provider: provider.name,
        providerRefId: result.providerRefId,
        status: result.status,
        riskScore: result.riskScore,
        rawResult: result.rawResult,
      },
    });
  }

  async handleWebhook(providerName: string, payload: unknown) {
    const provider = this.providerFactory.getProvider();
    if (provider.name.toLowerCase() !== providerName.toLowerCase()) {
      // Not the active provider — ignore rather than error, in case a provider
      // was recently switched and stray webhooks arrive from the previous one.
      return { ignored: true };
    }
    const normalized = provider.handleWebhook(payload);
    const existing = await (this.prisma as any).identityVerification.findFirst({
      where: { providerRefId: normalized.providerRefId, provider: provider.name },
    });
    if (!existing) throw new NotFoundException('Verification record not found for webhook');
    return (this.prisma as any).identityVerification.update({
      where: { id: existing.id },
      data: {
        status: normalized.status,
        riskScore: normalized.riskScore ?? existing.riskScore,
        rawResult: normalized.rawResult,
      },
    });
  }
}
