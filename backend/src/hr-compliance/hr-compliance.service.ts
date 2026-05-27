import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class HrComplianceService {
  constructor(private prisma: PrismaService) {}

  // ── Dashboard ────────────────────────────────────────────────

  async getDashboard(orgId: string) {
    const [
      salaryBands,
      shstIncidents,
      contracts,
      remoteWorkers,
      trainings,
      enrollments,
    ] = await Promise.all([
      this.prisma.hrSalaryBand.count({ where: { organizationId: orgId, isActive: true } }),
      this.prisma.hrShstIncident.groupBy({
        by: ['status'],
        where: { organizationId: orgId },
        _count: { id: true },
      }),
      this.prisma.hrContract.groupBy({
        by: ['status'],
        where: { organizationId: orgId },
        _count: { id: true },
      }),
      this.prisma.hrRemoteWorker.count({ where: { organizationId: orgId } }),
      this.prisma.hrTraining.count({ where: { organizationId: orgId } }),
      this.prisma.hrTrainingEnrollment.count({
        where: { training: { organizationId: orgId }, status: 'COMPLETED' },
      }),
    ]);

    const openIncidents = shstIncidents.find(s => s.status === 'REPORTED')?._count.id ?? 0;
    const activeContracts = contracts.find(c => c.status === 'ACTIVE')?._count.id ?? 0;

    return {
      salaryBands,
      shstOpenIncidents: openIncidents,
      activeContracts,
      remoteWorkers,
      trainings,
      trainingCompletions: enrollments,
    };
  }

  // ── Salary Bands ─────────────────────────────────────────────

  async listSalaryBands(orgId: string) {
    return this.prisma.hrSalaryBand.findMany({
      where: { organizationId: orgId },
      include: { payGapAnalyses: { orderBy: { year: 'desc' }, take: 1 } },
      orderBy: [{ jobFamily: 'asc' }, { jobLevel: 'asc' }],
    });
  }

  async createSalaryBand(orgId: string, dto: any) {
    return this.prisma.hrSalaryBand.create({
      data: { organizationId: orgId, ...dto },
    });
  }

  async updateSalaryBand(orgId: string, id: string, dto: any) {
    await this.assertBelongsToOrg(orgId, 'hrSalaryBand', id);
    return this.prisma.hrSalaryBand.update({ where: { id }, data: dto });
  }

  async deleteSalaryBand(orgId: string, id: string) {
    await this.assertBelongsToOrg(orgId, 'hrSalaryBand', id);
    return this.prisma.hrSalaryBand.delete({ where: { id } });
  }

  async upsertPayGap(orgId: string, bandId: string, dto: any) {
    await this.assertBelongsToOrg(orgId, 'hrSalaryBand', bandId);
    const { year, maleCount, femaleCount, otherCount, maleAvgSalary, femaleAvgSalary, gapCause, actionPlan } = dto;
    const gapPercentage = maleAvgSalary && femaleAvgSalary
      ? ((Number(maleAvgSalary) - Number(femaleAvgSalary)) / Number(maleAvgSalary)) * 100
      : null;
    return this.prisma.hrPayGapAnalysis.upsert({
      where: { salaryBandId_year: { salaryBandId: bandId, year } },
      create: { salaryBandId: bandId, year, maleCount, femaleCount, otherCount, maleAvgSalary, femaleAvgSalary, gapPercentage, gapCause, actionPlan },
      update: { maleCount, femaleCount, otherCount, maleAvgSalary, femaleAvgSalary, gapPercentage, gapCause, actionPlan },
    });
  }

  // ── SHST Incidents ───────────────────────────────────────────

  async listShstIncidents(orgId: string, query: any = {}) {
    const { status, severity, page = 1, limit = 20 } = query;
    return this.prisma.hrShstIncident.findMany({
      where: {
        organizationId: orgId,
        ...(status ? { status } : {}),
        ...(severity ? { severity } : {}),
      },
      orderBy: { incidentDate: 'desc' },
      skip: (page - 1) * limit,
      take: Number(limit),
    });
  }

  async createShstIncident(orgId: string, dto: any) {
    return this.prisma.hrShstIncident.create({
      data: {
        organizationId: orgId,
        ...dto,
        incidentDate: new Date(dto.incidentDate),
      },
    });
  }

  async updateShstIncident(orgId: string, id: string, dto: any) {
    await this.assertBelongsToOrg(orgId, 'hrShstIncident', id);
    return this.prisma.hrShstIncident.update({ where: { id }, data: dto });
  }

  // ── HR Training ──────────────────────────────────────────────

  async listTrainings(orgId: string, query: any = {}) {
    const { category, page = 1, limit = 20 } = query;
    return this.prisma.hrTraining.findMany({
      where: {
        organizationId: orgId,
        ...(category ? { category } : {}),
      },
      include: {
        _count: { select: { enrollments: true } },
        enrollments: {
          where: { status: 'COMPLETED' },
          select: { id: true },
        },
      },
      orderBy: { trainingDate: 'desc' },
      skip: (page - 1) * limit,
      take: Number(limit),
    });
  }

  async createTraining(orgId: string, dto: any) {
    return this.prisma.hrTraining.create({
      data: { organizationId: orgId, ...dto, trainingDate: new Date(dto.trainingDate) },
    });
  }

  async updateTraining(orgId: string, id: string, dto: any) {
    await this.assertBelongsToOrg(orgId, 'hrTraining', id);
    return this.prisma.hrTraining.update({ where: { id }, data: dto });
  }

  async enrollUser(orgId: string, trainingId: string, userId: string) {
    await this.assertBelongsToOrg(orgId, 'hrTraining', trainingId);
    return this.prisma.hrTrainingEnrollment.upsert({
      where: { trainingId_userId: { trainingId, userId } },
      create: { trainingId, userId, status: 'ENROLLED' },
      update: { status: 'ENROLLED' },
    });
  }

  async completeEnrollment(orgId: string, enrollmentId: string, dto: any) {
    return this.prisma.hrTrainingEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        score: dto.score,
        certificateUrl: dto.certificateUrl,
        notes: dto.notes,
        expiresAt: dto.expiresAfterMonths
          ? new Date(Date.now() + dto.expiresAfterMonths * 30 * 24 * 60 * 60 * 1000)
          : undefined,
      },
    });
  }

  // ── Employment Contracts ──────────────────────────────────────

  async listContracts(orgId: string, query: any = {}) {
    const { status, contractType, page = 1, limit = 20 } = query;
    return this.prisma.hrContract.findMany({
      where: {
        organizationId: orgId,
        ...(status ? { status } : {}),
        ...(contractType ? { contractType } : {}),
      },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { startDate: 'desc' },
      skip: (page - 1) * limit,
      take: Number(limit),
    });
  }

  async createContract(orgId: string, dto: any) {
    return this.prisma.hrContract.create({
      data: {
        organizationId: orgId,
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        probationEndDate: dto.probationEndDate ? new Date(dto.probationEndDate) : undefined,
      },
    });
  }

  async updateContract(orgId: string, id: string, dto: any) {
    await this.assertBelongsToOrg(orgId, 'hrContract', id);
    return this.prisma.hrContract.update({ where: { id }, data: dto });
  }

  // ── Remote Workers ───────────────────────────────────────────

  async listRemoteWorkers(orgId: string) {
    return this.prisma.hrRemoteWorker.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { startDate: 'desc' },
    });
  }

  async createRemoteWorker(orgId: string, dto: any) {
    return this.prisma.hrRemoteWorker.create({
      data: {
        organizationId: orgId,
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async updateRemoteWorker(orgId: string, id: string, dto: any) {
    await this.assertBelongsToOrg(orgId, 'hrRemoteWorker', id);
    return this.prisma.hrRemoteWorker.update({ where: { id }, data: dto });
  }

  // ── Guard helper ─────────────────────────────────────────────

  private async assertBelongsToOrg(orgId: string, model: string, id: string) {
    const record = await (this.prisma as any)[model].findUnique({ where: { id } });
    if (!record || record.organizationId !== orgId) throw new NotFoundException();
  }
}
