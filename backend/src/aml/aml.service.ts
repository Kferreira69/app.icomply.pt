import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AmlService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(orgId: string) {
    const db = this.prisma as any;

    const [
      totalCases, openCases, highRiskCases, reportedToFiu, recentCases, screeningStats,
      highRiskEntities, pendingTraining, newRegulatoryUpdates, nonCompliantAuditItems,
    ] = await Promise.all([
      db.amlCase.count({ where: { organizationId: orgId } }),
      db.amlCase.count({ where: { organizationId: orgId, status: 'OPEN' } }),
      db.amlCase.count({ where: { organizationId: orgId, riskLevel: 'HIGH' } }),
      db.amlCase.count({ where: { organizationId: orgId, reportedToFIU: true } }),
      db.amlCase.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      db.amlScreening.groupBy({
        by: ['result'],
        where: { organizationId: orgId },
        _count: { result: true },
      }),
      db.amlRiskAssessment.count({ where: { organizationId: orgId, overallRisk: { in: ['HIGH', 'VERY_HIGH'] } } }),
      db.amlTrainingRecord.count({ where: { organizationId: orgId, status: 'PENDING' } }),
      db.amlRegulatoryUpdate.count({ where: { organizationId: orgId, status: 'NEW' } }),
      db.amlAuditItem.count({ where: { organizationId: orgId, status: { in: ['NON_COMPLIANT', 'PARTIAL'] } } }),
    ]);

    return {
      totalCases,
      openCases,
      highRiskCases,
      reportedToFiu,
      recentCases,
      screeningStats,
      highRiskEntities,
      pendingTraining,
      newRegulatoryUpdates,
      nonCompliantAuditItems,
    };
  }

  async listCases(
    orgId: string,
    status?: string,
    caseType?: string,
    riskLevel?: string,
  ) {
    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    if (caseType) where.caseType = caseType;
    if (riskLevel) where.riskLevel = riskLevel;

    return (this.prisma as any).amlCase.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCase(orgId: string, dto: any) {
    const caseId = 'AML-' + Date.now().toString().slice(-6);

    return (this.prisma as any).amlCase.create({
      data: {
        ...dto,
        caseId,
        organizationId: orgId,
      },
    });
  }

  async updateCase(id: string, orgId: string, data: any) {
    const existing = await (this.prisma as any).amlCase.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      throw new Error(`AML case ${id} not found for this organization`);
    }

    const updateData: any = { ...data };

    if (data.status === 'CLOSED') {
      updateData.closedAt = new Date();
    }

    if (data.reportedToFIU === true) {
      updateData.reportedAt = new Date();
    }

    return (this.prisma as any).amlCase.update({
      where: { id },
      data: updateData,
    });
  }

  async listScreenings(orgId: string, screeningType?: string) {
    const where: any = { organizationId: orgId };
    if (screeningType) where.screeningType = screeningType;

    return (this.prisma as any).amlScreening.findMany({
      where,
      orderBy: { screenedAt: 'desc' },
    });
  }

  async createScreening(orgId: string, dto: any, screenedBy: string) {
    return (this.prisma as any).amlScreening.create({
      data: {
        ...dto,
        organizationId: orgId,
        screenedBy,
        screenedAt: new Date(),
      },
    });
  }

  async listPolicies(orgId: string) {
    return (this.prisma as any).amlPolicy.findMany({
      where: { organizationId: orgId },
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
    });
  }

  async createPolicy(orgId: string, dto: any) {
    return (this.prisma as any).amlPolicy.create({
      data: {
        ...dto,
        organizationId: orgId,
      },
    });
  }

  async updatePolicy(id: string, orgId: string, data: any) {
    const existing = await (this.prisma as any).amlPolicy.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      throw new Error(`AML policy ${id} not found for this organization`);
    }

    return (this.prisma as any).amlPolicy.update({
      where: { id },
      data,
    });
  }

  // ── Risk Assessments ──────────────────────────────────────────

  async listRiskAssessments(orgId: string, entityType?: string) {
    const where: any = { organizationId: orgId };
    if (entityType) where.entityType = entityType;
    return (this.prisma as any).amlRiskAssessment.findMany({
      where,
      orderBy: { assessedAt: 'desc' },
    });
  }

  async createRiskAssessment(orgId: string, dto: any) {
    return (this.prisma as any).amlRiskAssessment.create({
      data: { ...dto, organizationId: orgId },
    });
  }

  async updateRiskAssessment(id: string, orgId: string, data: any) {
    const existing = await (this.prisma as any).amlRiskAssessment.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new Error(`Risk assessment ${id} not found`);
    return (this.prisma as any).amlRiskAssessment.update({ where: { id }, data });
  }

  // ── Training Records ──────────────────────────────────────────

  async listTraining(orgId: string, status?: string) {
    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    return (this.prisma as any).amlTrainingRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTraining(orgId: string, dto: any) {
    return (this.prisma as any).amlTrainingRecord.create({
      data: { ...dto, organizationId: orgId },
    });
  }

  async updateTraining(id: string, orgId: string, data: any) {
    const existing = await (this.prisma as any).amlTrainingRecord.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new Error(`Training record ${id} not found`);
    return (this.prisma as any).amlTrainingRecord.update({ where: { id }, data });
  }

  // ── Regulatory Updates ────────────────────────────────────────

  async listRegulatoryUpdates(orgId: string, status?: string) {
    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    return (this.prisma as any).amlRegulatoryUpdate.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
    });
  }

  async createRegulatoryUpdate(orgId: string, dto: any) {
    return (this.prisma as any).amlRegulatoryUpdate.create({
      data: { ...dto, organizationId: orgId },
    });
  }

  async updateRegulatoryUpdate(id: string, orgId: string, data: any) {
    const existing = await (this.prisma as any).amlRegulatoryUpdate.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new Error(`Regulatory update ${id} not found`);
    return (this.prisma as any).amlRegulatoryUpdate.update({ where: { id }, data });
  }

  // ── Audit Items ───────────────────────────────────────────────

  async listAuditItems(orgId: string, category?: string) {
    const where: any = { organizationId: orgId };
    if (category) where.category = category;
    return (this.prisma as any).amlAuditItem.findMany({
      where,
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createAuditItem(orgId: string, dto: any) {
    return (this.prisma as any).amlAuditItem.create({
      data: { ...dto, organizationId: orgId },
    });
  }

  async updateAuditItem(id: string, orgId: string, data: any) {
    const existing = await (this.prisma as any).amlAuditItem.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new Error(`Audit item ${id} not found`);
    return (this.prisma as any).amlAuditItem.update({ where: { id }, data });
  }
}
