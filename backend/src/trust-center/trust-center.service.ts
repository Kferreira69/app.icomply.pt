import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class TrustCenterService {
  constructor(private prisma: PrismaService) {}

  // ── Public: get org profile by slug ──────────────────────────

  async getPublicProfile(slug: string) {
    const org = await this.prisma.organization.findUnique({
      where: { slug },
      include: {
        trustCenter: true,
        projects: {
          where: { status: { not: 'ARCHIVED' } },
          include: { framework: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!org) throw new NotFoundException('Organisation not found');
    if (!org.trustCenter?.isPublic) throw new NotFoundException('Trust Center not enabled');

    const tc = org.trustCenter;

    // Gather stats
    const [evidenceCount, auditCount, policyCount, vendorCount, lastAudit] = await Promise.all([
      this.prisma.evidence.count({
        where: {
          uploadedBy: { organizationId: org.id },
          status: 'APPROVED',
        },
      }),
      this.prisma.audit.count({ where: { organizationId: org.id } }),
      this.prisma.policy.count({
        where: { organizationId: org.id, status: 'APPROVED' },
      }),
      this.prisma.vendor.count({ where: { organizationId: org.id } }),
      this.prisma.audit.findFirst({
        where: { organizationId: org.id, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        select: { completedAt: true, title: true },
      }),
    ]);

    // Compute per-project compliance
    const projectStats = await Promise.all(
      org.projects.map(async (p) => {
        const [total, done] = await Promise.all([
          this.prisma.task.count({ where: { projectId: p.id } }),
          this.prisma.task.count({ where: { projectId: p.id, status: 'DONE' } }),
        ]);
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        return {
          id: p.id,
          name: p.name,
          framework: p.framework ? {
            id: p.framework.id,
            name: p.framework.name,
            code: p.framework.code,
            description: p.framework.description,
          } : null,
          complianceScore: pct,
          status: p.status,
          targetDate: p.targetDate,
        };
      }),
    );

    const overallScore = projectStats.length > 0
      ? Math.round(projectStats.reduce((a, b) => a + b.complianceScore, 0) / projectStats.length)
      : 0;

    return {
      organization: {
        name: org.name,
        slug: org.slug,
        industry: org.industry,
        country: org.country,
        website: org.website,
        logoUrl: tc.logoUrl || org.logoUrl,
      },
      settings: {
        customTitle: tc.customTitle,
        customMessage: tc.customMessage,
        contactEmail: tc.contactEmail,
        accentColor: tc.accentColor,
        showFrameworks: tc.showFrameworks,
        showEvidence: tc.showEvidence,
        showAudits: tc.showAudits,
        showPolicies: tc.showPolicies,
        showVendors: tc.showVendors,
        showRisks: tc.showRisks,
      },
      stats: {
        overallScore,
        evidence: evidenceCount,
        audits: auditCount,
        policies: policyCount,
        vendors: vendorCount,
        lastAudit,
      },
      projects: tc.showFrameworks ? projectStats : [],
      updatedAt: tc.updatedAt,
    };
  }

  // ── Protected: get settings ───────────────────────────────────

  async getSettings(organizationId: string) {
    const settings = await this.prisma.trustCenterSettings.findUnique({
      where: { organizationId },
    });

    if (!settings) {
      // Return defaults (not yet created)
      return {
        isPublic: false,
        showFrameworks: true,
        showEvidence: true,
        showAudits: true,
        showPolicies: true,
        showVendors: false,
        showRisks: false,
        customMessage: null,
        contactEmail: null,
        customTitle: null,
        logoUrl: null,
        accentColor: '#2563eb',
      };
    }

    return settings;
  }

  // ── Protected: update settings ────────────────────────────────

  async updateSettings(organizationId: string, dto: any) {
    return this.prisma.trustCenterSettings.upsert({
      where: { organizationId },
      create: { organizationId, ...dto },
      update: dto,
    });
  }
}
