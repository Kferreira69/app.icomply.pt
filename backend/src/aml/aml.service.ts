import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AmlService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(orgId: string) {
    const db = this.prisma as any;

    const [totalCases, openCases, highRiskCases, reportedToFiu, recentCases, screeningStats] =
      await Promise.all([
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
      ]);

    return {
      totalCases,
      openCases,
      highRiskCases,
      reportedToFiu,
      recentCases,
      screeningStats,
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
}
