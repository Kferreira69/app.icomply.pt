import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EvidenceProvider, SyncStatus, EvidenceStatus } from '@prisma/client';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { fetchGitHubAuditLog, EvidenceItem } from './providers/github.provider';
import { fetchAwsCloudTrailEvents } from './providers/aws-cloudtrail.provider';
import { fetchAzureAdAuditLogs } from './providers/azure-ad.provider';
import { GcpAuditProvider } from './providers/gcp-audit.provider';

@Injectable()
export class EvidenceIntegrationsService {
  private readonly gcpProvider = new GcpAuditProvider();

  constructor(private readonly prisma: PrismaService) {}

  // ── CRUD ────────────────────────────────────────────────────────

  create(organizationId: string, dto: CreateIntegrationDto) {
    return this.prisma.evidenceIntegration.create({
      data: {
        organizationId,
        name: dto.name,
        provider: dto.provider,
        config: dto.config,
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
    });
  }

  findAll(organizationId: string) {
    return this.prisma.evidenceIntegration.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        syncLogs: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async findOne(id: string, organizationId: string) {
    const integration = await this.prisma.evidenceIntegration.findFirst({
      where: { id, organizationId },
      include: {
        syncLogs: {
          orderBy: { startedAt: 'desc' },
          take: 5,
        },
      },
    });
    if (!integration) throw new NotFoundException('Integration not found');
    return integration;
  }

  async update(id: string, organizationId: string, dto: UpdateIntegrationDto) {
    await this.findOne(id, organizationId);
    return this.prisma.evidenceIntegration.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.provider !== undefined && { provider: dto.provider }),
        ...(dto.config !== undefined && { config: dto.config }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.evidenceIntegration.delete({ where: { id } });
  }

  async toggleActive(id: string, organizationId: string) {
    const integration = await this.findOne(id, organizationId);
    return this.prisma.evidenceIntegration.update({
      where: { id },
      data: { isActive: !integration.isActive },
    });
  }

  // ── Sync ────────────────────────────────────────────────────────

  async runSync(id: string, organizationId: string) {
    const integration = await this.findOne(id, organizationId);

    // Create sync log with RUNNING status
    const syncLog = await this.prisma.integrationSyncLog.create({
      data: {
        integrationId: id,
        status: SyncStatus.RUNNING,
      },
    });

    let evidenceItems: EvidenceItem[] = [];
    let error: string | undefined;

    try {
      evidenceItems = await this.fetchFromProvider(
        integration.provider,
        integration.config as Record<string, any>,
      );
    } catch (err: any) {
      error = err?.message ?? 'Unknown error during provider fetch';
    }

    let evidencesAdded = 0;

    if (!error) {
      try {
        for (const item of evidenceItems) {
          // Use a system placeholder userId — the org's first admin user or a sentinel
          // We store evidence with uploadedById required, so we find or create a system user reference
          const orgUser = await this.prisma.user.findFirst({
            where: { organizationId, status: 'ACTIVE' },
            select: { id: true },
            orderBy: { createdAt: 'asc' },
          });

          if (!orgUser) continue;

          await this.prisma.evidence.create({
            data: {
              title: item.title.slice(0, 255),
              description: item.description,
              fileName: `auto-collected-${Date.now()}.json`,
              fileSize: Buffer.byteLength(JSON.stringify(item.metadata ?? {})),
              mimeType: 'application/json',
              s3Key: `auto/${organizationId}/${id}/${Date.now()}.json`,
              status: EvidenceStatus.PENDING,
              uploadedById: orgUser.id,
              tags: ['auto-collected', integration.provider.toLowerCase()],
              metadata: {
                source: item.source,
                collectedAt: item.collectedAt.toISOString(),
                integrationId: id,
                provider: integration.provider,
                ...item.metadata,
              },
            },
          });
          evidencesAdded++;
        }
      } catch (err: any) {
        error = err?.message ?? 'Error persisting evidence items';
      }
    }

    const status: SyncStatus = error
      ? SyncStatus.FAILED
      : evidencesAdded < evidenceItems.length
        ? SyncStatus.PARTIAL
        : SyncStatus.SUCCESS;

    // Update sync log
    const updatedLog = await this.prisma.integrationSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status,
        evidencesFound: evidenceItems.length,
        evidencesAdded,
        error: error ?? null,
        completedAt: new Date(),
      },
    });

    // Update lastSyncAt on integration
    await this.prisma.evidenceIntegration.update({
      where: { id },
      data: { lastSyncAt: new Date() },
    });

    return updatedLog;
  }

  async runAllActive(organizationId: string) {
    const integrations = await this.prisma.evidenceIntegration.findMany({
      where: { organizationId, isActive: true },
    });

    const results = await Promise.allSettled(
      integrations.map((integration) => this.runSync(integration.id, organizationId)),
    );

    return results.map((result, index) => ({
      integrationId: integrations[index].id,
      integrationName: integrations[index].name,
      result: result.status === 'fulfilled' ? result.value : { error: String((result as PromiseRejectedResult).reason) },
    }));
  }

  getSyncLogs(integrationId: string, organizationId: string) {
    // Verify ownership first
    return this.prisma.evidenceIntegration
      .findFirst({ where: { id: integrationId, organizationId } })
      .then((integration) => {
        if (!integration) throw new NotFoundException('Integration not found');
        return this.prisma.integrationSyncLog.findMany({
          where: { integrationId },
          orderBy: { startedAt: 'desc' },
          take: 20,
        });
      });
  }

  // ── Provider dispatch ───────────────────────────────────────────

  private async fetchFromProvider(
    provider: EvidenceProvider,
    config: Record<string, any>,
  ): Promise<EvidenceItem[]> {
    switch (provider) {
      case EvidenceProvider.GITHUB:
        return fetchGitHubAuditLog(config as any);

      case EvidenceProvider.AWS_CLOUDTRAIL:
        return fetchAwsCloudTrailEvents(config as any);

      case EvidenceProvider.AZURE_AD:
        return fetchAzureAdAuditLogs(config as any);

      case EvidenceProvider.GCP_AUDIT:
        return this.gcpProvider.collect(config as any);

      case EvidenceProvider.MANUAL_API:
        // Manual API — returns empty, evidence added manually
        return [];

      default:
        return [];
    }
  }
}
