import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

// ── CSRD seed metrics ────────────────────────────────────────────────────────

const CSRD_METRICS = [
  // Environmental — ESRS E1
  { standardCode: 'E1-1', title: 'Strategy relating to climate change',   pillar: 'ENVIRONMENTAL', framework: 'CSRD', unit: 'text'   },
  { standardCode: 'E1-4', title: 'Targets related to climate change',     pillar: 'ENVIRONMENTAL', framework: 'CSRD', unit: 'tCO2e'  },
  { standardCode: 'E1-5', title: 'Energy consumption and mix',            pillar: 'ENVIRONMENTAL', framework: 'CSRD', unit: 'MWh'    },
  { standardCode: 'E1-6', title: 'Scope 1 GHG emissions',                 pillar: 'ENVIRONMENTAL', framework: 'CSRD', unit: 'tCO2e'  },
  { standardCode: 'E1-7', title: 'Scope 2 GHG emissions',                 pillar: 'ENVIRONMENTAL', framework: 'CSRD', unit: 'tCO2e'  },
  { standardCode: 'E1-8', title: 'Scope 3 GHG emissions',                 pillar: 'ENVIRONMENTAL', framework: 'CSRD', unit: 'tCO2e'  },
  // Environmental — ESRS E2
  { standardCode: 'E2-1', title: 'Pollution of air',                      pillar: 'ENVIRONMENTAL', framework: 'CSRD', unit: 'kg'     },
  // Environmental — ESRS E3
  { standardCode: 'E3-1', title: 'Water consumption',                     pillar: 'ENVIRONMENTAL', framework: 'CSRD', unit: 'm³'     },
  // Environmental — ESRS E4
  { standardCode: 'E4-1', title: 'Biodiversity impacts',                  pillar: 'ENVIRONMENTAL', framework: 'CSRD', unit: 'ha'     },
  // Environmental — ESRS E5
  { standardCode: 'E5-1', title: 'Resource inflows',                      pillar: 'ENVIRONMENTAL', framework: 'CSRD', unit: 'tonnes' },
  { standardCode: 'E5-2', title: 'Resource outflows',                     pillar: 'ENVIRONMENTAL', framework: 'CSRD', unit: 'tonnes' },
  // Social — ESRS S1
  { standardCode: 'S1-1',  title: 'Policies related to own workforce',    pillar: 'SOCIAL', framework: 'CSRD', unit: 'text'          },
  { standardCode: 'S1-6',  title: 'Employment and working conditions',    pillar: 'SOCIAL', framework: 'CSRD', unit: 'FTE'           },
  { standardCode: 'S1-7',  title: 'Collective bargaining',                pillar: 'SOCIAL', framework: 'CSRD', unit: '%'             },
  { standardCode: 'S1-8',  title: 'Diversity and inclusion',              pillar: 'SOCIAL', framework: 'CSRD', unit: '%'             },
  { standardCode: 'S1-9',  title: 'Pay gap',                              pillar: 'SOCIAL', framework: 'CSRD', unit: '%'             },
  { standardCode: 'S1-10', title: 'Health and safety',                    pillar: 'SOCIAL', framework: 'CSRD', unit: 'TRIR'          },
  { standardCode: 'S1-11', title: 'Training and skills development',      pillar: 'SOCIAL', framework: 'CSRD', unit: 'hours'         },
  { standardCode: 'S1-13', title: 'Social protection',                    pillar: 'SOCIAL', framework: 'CSRD', unit: '%'             },
  // Social — ESRS S2 / S3 / S4
  { standardCode: 'S2-1',  title: 'Workers in value chain',               pillar: 'SOCIAL', framework: 'CSRD', unit: 'text'          },
  { standardCode: 'S3-1',  title: 'Affected communities',                 pillar: 'SOCIAL', framework: 'CSRD', unit: 'text'          },
  { standardCode: 'S4-1',  title: 'Consumer information policies',        pillar: 'SOCIAL', framework: 'CSRD', unit: 'text'          },
  // Governance — ESRS G1
  { standardCode: 'G1-1',  title: 'Business conduct policies',            pillar: 'GOVERNANCE', framework: 'CSRD', unit: 'text'      },
  { standardCode: 'G1-2',  title: 'Management of corruption/bribery',     pillar: 'GOVERNANCE', framework: 'CSRD', unit: 'text'      },
  { standardCode: 'G1-3',  title: 'Confirmed corruption incidents',       pillar: 'GOVERNANCE', framework: 'CSRD', unit: 'count'     },
  { standardCode: 'G1-4',  title: 'Fines for corruption',                 pillar: 'GOVERNANCE', framework: 'CSRD', unit: 'EUR'       },
  { standardCode: 'G1-5',  title: 'Political influence',                  pillar: 'GOVERNANCE', framework: 'CSRD', unit: 'EUR'       },
  { standardCode: 'G1-6',  title: 'Payment practices',                    pillar: 'GOVERNANCE', framework: 'CSRD', unit: 'days'      },
];

const GRI_METRICS = [
  // Environmental
  { standardCode: 'GRI-302-1', title: 'Energy consumption within organization',        pillar: 'ENVIRONMENTAL', framework: 'GRI', unit: 'GJ'            },
  { standardCode: 'GRI-305-1', title: 'Direct (Scope 1) GHG emissions',               pillar: 'ENVIRONMENTAL', framework: 'GRI', unit: 'tCO2e'         },
  { standardCode: 'GRI-305-2', title: 'Energy indirect (Scope 2) GHG emissions',      pillar: 'ENVIRONMENTAL', framework: 'GRI', unit: 'tCO2e'         },
  { standardCode: 'GRI-305-3', title: 'Other indirect (Scope 3) GHG emissions',       pillar: 'ENVIRONMENTAL', framework: 'GRI', unit: 'tCO2e'         },
  { standardCode: 'GRI-303-1', title: 'Interactions with water',                       pillar: 'ENVIRONMENTAL', framework: 'GRI', unit: 'm³'            },
  // Social
  { standardCode: 'GRI-401-1', title: 'New employee hires',                            pillar: 'SOCIAL',        framework: 'GRI', unit: 'count'         },
  { standardCode: 'GRI-403-9', title: 'Work-related injuries',                         pillar: 'SOCIAL',        framework: 'GRI', unit: 'TRIR'          },
  { standardCode: 'GRI-404-1', title: 'Average hours of training',                     pillar: 'SOCIAL',        framework: 'GRI', unit: 'hours/employee' },
  // Governance
  { standardCode: 'GRI-405-1', title: 'Diversity of governance bodies',                pillar: 'GOVERNANCE',    framework: 'GRI', unit: '%'             },
  { standardCode: 'GRI-206-1', title: 'Anti-competitive behavior cases',               pillar: 'GOVERNANCE',    framework: 'GRI', unit: 'count'         },
];

const ALL_SEED_METRICS = [...CSRD_METRICS, ...GRI_METRICS];

@Injectable()
export class EsgService {
  constructor(private prisma: PrismaService) {}

  // ── Bootstrap: seed all CSRD + GRI metrics for an org/year ──────────────────

  async initOrganization(organizationId: string, year: number) {
    const existing = await (this.prisma as any).esgMetric.findMany({
      where: { organizationId, year },
      select: { standardCode: true, framework: true },
    });

    const existingKeys = new Set(
      existing.map((e: any) => `${e.framework}::${e.standardCode}`),
    );

    const toCreate = ALL_SEED_METRICS.filter(
      m => !existingKeys.has(`${m.framework}::${m.standardCode}`),
    );

    if (toCreate.length > 0) {
      await (this.prisma as any).esgMetric.createMany({
        data: toCreate.map(m => ({
          ...m,
          organizationId,
          year,
          status: 'NOT_REPORTED',
        })),
      });
    }

    return { seeded: toCreate.length, alreadyExisted: existing.length };
  }

  // ── Dashboard ────────────────────────────────────────────────────────────────

  async getDashboard(organizationId: string, year: number) {
    await this.initOrganization(organizationId, year);

    const metrics = await (this.prisma as any).esgMetric.findMany({
      where: { organizationId, year },
      orderBy: [{ framework: 'asc' }, { standardCode: 'asc' }],
    });

    const pillars = ['ENVIRONMENTAL', 'SOCIAL', 'GOVERNANCE'];
    const byPillar: Record<string, { total: number; reported: number; score: number }> = {};

    for (const pillar of pillars) {
      const group = metrics.filter((m: any) => m.pillar === pillar);
      const reported = group.filter((m: any) =>
        m.status === 'REPORTED' || m.status === 'VERIFIED',
      ).length;
      byPillar[pillar] = {
        total: group.length,
        reported,
        score: group.length > 0 ? Math.round((reported / group.length) * 100) : 0,
      };
    }

    const statusCounts: Record<string, number> = {
      NOT_REPORTED: 0,
      COLLECTING: 0,
      REPORTED: 0,
      VERIFIED: 0,
    };
    for (const m of metrics as any[]) {
      if (statusCounts[m.status] !== undefined) statusCounts[m.status]++;
    }

    const totalReported = (statusCounts['REPORTED'] ?? 0) + (statusCounts['VERIFIED'] ?? 0);
    const overallScore =
      metrics.length > 0 ? Math.round((totalReported / metrics.length) * 100) : 0;

    const csrdMetrics = metrics.filter((m: any) => m.framework === 'CSRD');
    const griMetrics  = metrics.filter((m: any) => m.framework === 'GRI');

    return {
      year,
      totalMetrics: metrics.length,
      byPillar,
      byStatus: statusCounts,
      overallScore,
      csrdMetrics,
      griMetrics,
    };
  }

  // ── Reports ──────────────────────────────────────────────────────────────────

  async listReports(organizationId: string) {
    return (this.prisma as any).esgReport.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createReport(organizationId: string, dto: any, ownerId: string) {
    return (this.prisma as any).esgReport.create({
      data: {
        ...dto,
        organizationId,
        ownerId,
      },
    });
  }

  async updateReport(id: string, organizationId: string, data: any) {
    return (this.prisma as any).esgReport.update({
      where: { id, organizationId },
      data,
    });
  }

  // ── Metrics ──────────────────────────────────────────────────────────────────

  async listMetrics(
    organizationId: string,
    year: number,
    pillar?: string,
    framework?: string,
  ) {
    const where: any = { organizationId, year };
    if (pillar)    where.pillar    = pillar;
    if (framework) where.framework = framework;

    return (this.prisma as any).esgMetric.findMany({
      where,
      orderBy: [{ framework: 'asc' }, { standardCode: 'asc' }],
    });
  }

  async upsertMetric(organizationId: string, dto: any) {
    const { standardCode, framework, year, ...rest } = dto;

    return (this.prisma as any).esgMetric.upsert({
      where: {
        organizationId_standardCode_year_framework: {
          organizationId,
          standardCode,
          framework,
          year,
        },
      },
      create: {
        ...rest,
        organizationId,
        standardCode,
        framework,
        year,
        status: rest.status ?? 'NOT_REPORTED',
      },
      update: { ...rest },
    });
  }

  async updateMetric(id: string, organizationId: string, data: any) {
    return (this.prisma as any).esgMetric.update({
      where: { id, organizationId },
      data,
    });
  }
}
