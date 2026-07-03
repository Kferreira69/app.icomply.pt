import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  DoraIncidentSeverity,
  DoraIncidentStatus,
  DoraIncidentCategory,
  DoraTestType,
  DoraTestStatus,
} from '../generated/prisma/client';

// ── DTOs (inline) ─────────────────────────────────────────────

export interface CreateDoraIncidentDto {
  title: string;
  description: string;
  severity: DoraIncidentSeverity;
  category: DoraIncidentCategory;
  affectedSystems?: string[];
  detectedAt: string;
  impact?: string;
  estimatedLoss?: number;
}

export interface UpdateDoraIncidentDto {
  title?: string;
  description?: string;
  severity?: DoraIncidentSeverity;
  category?: DoraIncidentCategory;
  status?: DoraIncidentStatus;
  affectedSystems?: string[];
  resolvedAt?: string;
  rootCause?: string;
  impact?: string;
  estimatedLoss?: number;
  reportedToRegulator?: boolean;
  initialReportAt?: string;
  intermediaryReportAt?: string;
  finalReportAt?: string;
  regulatoryRef?: string;
}

export interface CreateDoraTestDto {
  title: string;
  testType: DoraTestType;
  scope?: string;
  provider?: string;
  plannedDate: string;
  findings?: string;
}

export interface UpdateDoraTestDto {
  title?: string;
  testType?: DoraTestType;
  status?: DoraTestStatus;
  scope?: string;
  provider?: string;
  plannedDate?: string;
  executedDate?: string;
  nextTestDate?: string;
  findings?: string;
  criticalFindings?: number;
  highFindings?: number;
  remediationDeadline?: string;
  remediationStatus?: string;
  conductedById?: string;
}

@Injectable()
export class DoraService {
  constructor(private prisma: PrismaService) {}

  // ── Dashboard ─────────────────────────────────────────────────

  async getDashboard(organizationId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      incidentsBySeverity,
      incidentsByStatus,
      testsByStatus,
      recentIncidents,
      upcomingTests,
      overdueTests,
      totalIncidents,
      openIncidents,
      majorIncidents,
    ] = await Promise.all([
      this.prisma.doraIncident.groupBy({
        by: ['severity'],
        where: { organizationId },
        _count: true,
      }),
      this.prisma.doraIncident.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
      }),
      this.prisma.doraTest.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
      }),
      this.prisma.doraIncident.findMany({
        where: { organizationId, detectedAt: { gte: thirtyDaysAgo } },
        orderBy: { detectedAt: 'desc' },
        take: 5,
        include: { reportedBy: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.doraTest.findMany({
        where: {
          organizationId,
          status: { in: [DoraTestStatus.PLANNED, DoraTestStatus.IN_PROGRESS] },
          plannedDate: { lte: thirtyDaysAhead },
        },
        orderBy: { plannedDate: 'asc' },
        take: 5,
      }),
      this.prisma.doraTest.count({
        where: {
          organizationId,
          status: { in: [DoraTestStatus.PLANNED, DoraTestStatus.IN_PROGRESS] },
          plannedDate: { lt: now },
        },
      }),
      this.prisma.doraIncident.count({ where: { organizationId } }),
      this.prisma.doraIncident.count({
        where: { organizationId, status: { in: [DoraIncidentStatus.OPEN, DoraIncidentStatus.INVESTIGATING] } },
      }),
      this.prisma.doraIncident.count({
        where: { organizationId, severity: DoraIncidentSeverity.MAJOR },
      }),
    ]);

    // Simple DORA compliance score: penalise open majors, reward completed tests
    const completedTests = testsByStatus.find(s => s.status === 'COMPLETED')?._count ?? 0;
    const totalTests = testsByStatus.reduce((sum, s) => sum + s._count, 0);
    const testScore = totalTests === 0 ? 70 : (completedTests / totalTests) * 100;
    const penaltyPerMajor = 10;
    const complianceScore = Math.max(0, Math.min(100,
      Math.round(testScore - (majorIncidents * penaltyPerMajor)),
    ));

    return {
      complianceScore,
      totalIncidents,
      openIncidents,
      majorIncidents,
      upcomingTestsCount: upcomingTests.length,
      overdueTests,
      incidentsBySeverity: incidentsBySeverity.reduce((a, i) => ({ ...a, [i.severity]: i._count }), {}),
      incidentsByStatus: incidentsByStatus.reduce((a, i) => ({ ...a, [i.status]: i._count }), {}),
      testsByStatus: testsByStatus.reduce((a, t) => ({ ...a, [t.status]: t._count }), {}),
      recentIncidents,
      upcomingTests,
    };
  }

  // ── Incidents CRUD ────────────────────────────────────────────

  async listIncidents(
    organizationId: string,
    filters: { severity?: DoraIncidentSeverity; status?: DoraIncidentStatus; category?: DoraIncidentCategory },
  ) {
    return this.prisma.doraIncident.findMany({
      where: {
        organizationId,
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.status && { status: filters.status }),
        ...(filters.category && { category: filters.category }),
      },
      orderBy: { detectedAt: 'desc' },
      include: { reportedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async getIncident(organizationId: string, id: string) {
    const incident = await this.prisma.doraIncident.findFirst({
      where: { id, organizationId },
      include: { reportedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!incident) throw new NotFoundException('DORA incident not found');
    return incident;
  }

  async createIncident(organizationId: string, userId: string, data: CreateDoraIncidentDto) {
    return this.prisma.doraIncident.create({
      data: {
        organizationId,
        reportedById: userId,
        title: data.title,
        description: data.description,
        severity: data.severity,
        category: data.category,
        affectedSystems: data.affectedSystems ?? [],
        detectedAt: new Date(data.detectedAt),
        impact: data.impact,
        estimatedLoss: data.estimatedLoss,
      },
      include: { reportedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async updateIncident(organizationId: string, id: string, data: UpdateDoraIncidentDto) {
    await this.getIncident(organizationId, id);
    const { detectedAt: _det, resolvedAt, initialReportAt, intermediaryReportAt, finalReportAt, ...rest } = data as any;
    return this.prisma.doraIncident.update({
      where: { id },
      data: {
        ...rest,
        ...(resolvedAt && { resolvedAt: new Date(resolvedAt) }),
        ...(initialReportAt && { initialReportAt: new Date(initialReportAt) }),
        ...(intermediaryReportAt && { intermediaryReportAt: new Date(intermediaryReportAt) }),
        ...(finalReportAt && { finalReportAt: new Date(finalReportAt) }),
      },
      include: { reportedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async deleteIncident(organizationId: string, id: string) {
    await this.getIncident(organizationId, id);
    return this.prisma.doraIncident.delete({ where: { id } });
  }

  // ── Tests CRUD ────────────────────────────────────────────────

  async listTests(
    organizationId: string,
    filters: { testType?: DoraTestType; status?: DoraTestStatus },
  ) {
    return this.prisma.doraTest.findMany({
      where: {
        organizationId,
        ...(filters.testType && { testType: filters.testType }),
        ...(filters.status && { status: filters.status }),
      },
      orderBy: { plannedDate: 'asc' },
      include: { conductedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async getTest(organizationId: string, id: string) {
    const test = await this.prisma.doraTest.findFirst({
      where: { id, organizationId },
      include: { conductedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!test) throw new NotFoundException('DORA test not found');
    return test;
  }

  async createTest(organizationId: string, userId: string, data: CreateDoraTestDto) {
    return this.prisma.doraTest.create({
      data: {
        organizationId,
        conductedById: userId,
        title: data.title,
        testType: data.testType,
        scope: data.scope,
        provider: data.provider,
        plannedDate: new Date(data.plannedDate),
        findings: data.findings,
      },
      include: { conductedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async updateTest(organizationId: string, id: string, data: UpdateDoraTestDto) {
    await this.getTest(organizationId, id);
    const {
      plannedDate, executedDate, nextTestDate, remediationDeadline, ...rest
    } = data as any;
    return this.prisma.doraTest.update({
      where: { id },
      data: {
        ...rest,
        ...(plannedDate && { plannedDate: new Date(plannedDate) }),
        ...(executedDate && { executedDate: new Date(executedDate) }),
        ...(nextTestDate && { nextTestDate: new Date(nextTestDate) }),
        ...(remediationDeadline && { remediationDeadline: new Date(remediationDeadline) }),
      },
      include: { conductedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async deleteTest(organizationId: string, id: string) {
    await this.getTest(organizationId, id);
    return this.prisma.doraTest.delete({ where: { id } });
  }
}
