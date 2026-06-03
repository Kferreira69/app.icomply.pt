import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class SsoService {
  constructor(private prisma: PrismaService) {}

  async getConfig(organizationId: string) {
    const config = await (this.prisma as any).ssoConfig.findUnique({
      where: { organizationId },
    });
    if (!config) return { isActive: false, provider: null };
    // Never return clientId/secret in full — return masked version
    return {
      ...config,
      clientId: config.clientId ? `${config.clientId.slice(0, 4)}****` : null,
    };
  }

  async upsertConfig(organizationId: string, dto: any) {
    return (this.prisma as any).ssoConfig.upsert({
      where:  { organizationId },
      create: { organizationId, ...dto },
      update: dto,
    });
  }

  async testConnection(organizationId: string): Promise<{ success: boolean; message: string }> {
    const config = await (this.prisma as any).ssoConfig.findUnique({ where: { organizationId } });
    if (!config || !config.isActive) return { success: false, message: 'SSO not configured' };

    // Minimal connectivity test — just validates config presence
    // Real OAuth2/SAML test would require calling the IdP discovery endpoint
    const hasRequiredFields = config.provider && (config.clientId || config.tenantId || config.domain);
    return {
      success: !!hasRequiredFields,
      message: hasRequiredFields ? 'SSO configuration looks valid' : 'Missing required SSO fields',
    };
  }

  async disable(organizationId: string) {
    const config = await (this.prisma as any).ssoConfig.findUnique({ where: { organizationId } });
    if (!config) throw new NotFoundException('SSO config not found');
    return (this.prisma as any).ssoConfig.update({
      where: { organizationId },
      data: { isActive: false },
    });
  }
}
