import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { UpsertIntegrationDto } from './dto/upsert-integration.dto';

@Injectable()
export class IntegrationHubService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  findAll(orgId: string) {
    return this.prisma.platformIntegration.findMany({
      where: { orgId },
      orderBy: [{ isConnected: 'desc' }, { displayName: 'asc' }],
    });
  }

  async upsert(orgId: string, dto: UpsertIntegrationDto) {
    return this.prisma.platformIntegration.upsert({
      where: { orgId_key: { orgId, key: dto.key } },
      create: {
        orgId,
        key:         dto.key,
        displayName: dto.displayName,
        category:    dto.category,
        isConnected: dto.isConnected,
        credentials: dto.credentials as any,
        settings:    dto.settings    as any,
      },
      update: {
        displayName: dto.displayName,
        category:    dto.category,
        isConnected: dto.isConnected,
        credentials: dto.credentials as any,
        settings:    dto.settings    as any,
      },
    });
  }

  async connect(orgId: string, key: string) {
    const integration = await this.prisma.platformIntegration.findUnique({
      where: { orgId_key: { orgId, key } },
    });
    if (!integration) throw new NotFoundException('Integration not found');
    return this.prisma.platformIntegration.update({
      where: { orgId_key: { orgId, key } },
      data: { isConnected: true, lastTestedAt: new Date() },
    });
  }

  async disconnect(orgId: string, key: string) {
    const integration = await this.prisma.platformIntegration.findUnique({
      where: { orgId_key: { orgId, key } },
    });
    if (!integration) throw new NotFoundException('Integration not found');
    return this.prisma.platformIntegration.update({
      where: { orgId_key: { orgId, key } },
      data: { isConnected: false, credentials: undefined },
    });
  }

  async remove(orgId: string, key: string) {
    return this.prisma.platformIntegration.deleteMany({
      where: { orgId, key },
    });
  }

  getTrutoKey(orgId: string) {
    const globalKey = this.config.get<string>('TRUTO_API_KEY', '');
    return { apiKey: globalKey ? '***configured***' : '', configured: !!globalKey };
  }

  async saveTrutoKey(orgId: string, apiKey: string) {
    return this.prisma.platformIntegration.upsert({
      where: { orgId_key: { orgId, key: '__truto_config__' } },
      create: {
        orgId,
        key:         '__truto_config__',
        displayName: 'Truto API Configuration',
        category:    'config',
        credentials: { apiKey } as any,
      },
      update: { credentials: { apiKey } as any },
    });
  }
}
