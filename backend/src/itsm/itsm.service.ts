import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ItsmService {
  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------------

  async getDashboard(organizationId: string) {
    const prisma = this.prisma as any;

    const [
      totalChanges,
      openChanges,
      approvedChanges,
      implementingChanges,
      closedChanges,
      totalIncidents,
      openIncidents,
      p1Incidents,
      p2Incidents,
      slaBreachedIncidents,
      totalProblems,
      openProblems,
      knownErrors,
      resolvedProblems,
      recentIncidents,
      recentChanges,
    ] = await Promise.all([
      prisma.itsmChangeRequest.count({ where: { organizationId } }),
      prisma.itsmChangeRequest.count({ where: { organizationId, status: 'OPEN' } }),
      prisma.itsmChangeRequest.count({ where: { organizationId, status: 'CAB_APPROVED' } }),
      prisma.itsmChangeRequest.count({ where: { organizationId, status: 'IMPLEMENTING' } }),
      prisma.itsmChangeRequest.count({ where: { organizationId, status: 'COMPLETED' } }),

      prisma.itsmIncident.count({ where: { organizationId } }),
      prisma.itsmIncident.count({ where: { organizationId, status: 'OPEN' } }),
      prisma.itsmIncident.count({ where: { organizationId, priority: 'P1' } }),
      prisma.itsmIncident.count({ where: { organizationId, priority: 'P2' } }),
      prisma.itsmIncident.count({ where: { organizationId, slaBreached: true } }),

      prisma.itsmProblem.count({ where: { organizationId } }),
      prisma.itsmProblem.count({ where: { organizationId, status: 'OPEN' } }),
      prisma.itsmProblem.count({ where: { organizationId, status: 'KNOWN_ERROR' } }),
      prisma.itsmProblem.count({ where: { organizationId, status: 'RESOLVED' } }),

      prisma.itsmIncident.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.itsmChangeRequest.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      changes: {
        total: totalChanges,
        open: openChanges,
        approved: approvedChanges,
        implementing: implementingChanges,
        closed: closedChanges,
      },
      incidents: {
        total: totalIncidents,
        open: openIncidents,
        p1: p1Incidents,
        p2: p2Incidents,
        slaBreached: slaBreachedIncidents,
      },
      problems: {
        total: totalProblems,
        open: openProblems,
        knownErrors,
        resolved: resolvedProblems,
      },
      recentIncidents,
      recentChanges,
    };
  }

  // ---------------------------------------------------------------------------
  // Change Management
  // ---------------------------------------------------------------------------

  async listChanges(organizationId: string, status?: string, changeType?: string) {
    return (this.prisma as any).itsmChangeRequest.findMany({
      where: {
        organizationId,
        ...(status && { status }),
        ...(changeType && { changeType }),
      },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true } },
        approver:  { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createChange(organizationId: string, dto: any, requesterId: string) {
    const changeId = 'CHG-' + Date.now().toString().slice(-6);
    return (this.prisma as any).itsmChangeRequest.create({
      data: {
        changeId,
        requesterId,
        organizationId,
        ...dto,
      },
    });
  }

  async updateChange(id: string, organizationId: string, data: any) {
    const existing = await (this.prisma as any).itsmChangeRequest.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new NotFoundException(`Change request ${id} not found`);
    }

    const extraFields: Record<string, any> = {};
    if (data.status === 'CAB_APPROVED') {
      extraFields.approvedAt = new Date();
    } else if (data.status === 'COMPLETED') {
      extraFields.implementedAt = new Date();
    } else if (data.status === 'CANCELLED' || data.status === 'REJECTED') {
      extraFields.closedAt = new Date();
    }

    return (this.prisma as any).itsmChangeRequest.update({
      where: { id },
      data: { ...data, ...extraFields },
    });
  }

  // ---------------------------------------------------------------------------
  // Incident Management
  // ---------------------------------------------------------------------------

  async listIncidents(organizationId: string, status?: string, priority?: string) {
    return (this.prisma as any).itsmIncident.findMany({
      where: {
        organizationId,
        ...(status && { status }),
        ...(priority && { priority }),
      },
      include: {
        reporter: { select: { id: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createIncident(organizationId: string, dto: any, reporterId: string) {
    const incidentId = 'INC-' + Date.now().toString().slice(-6);
    return (this.prisma as any).itsmIncident.create({
      data: {
        incidentId,
        reporterId,
        organizationId,
        ...dto,
      },
    });
  }

  async updateIncident(id: string, organizationId: string, data: any) {
    const existing = await (this.prisma as any).itsmIncident.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new NotFoundException(`Incident ${id} not found`);
    }

    const extraFields: Record<string, any> = {};
    if (data.status === 'RESOLVED') {
      extraFields.resolvedAt = new Date();
    } else if (data.status === 'CLOSED') {
      extraFields.closedAt = new Date();
    }

    return (this.prisma as any).itsmIncident.update({
      where: { id },
      data: { ...data, ...extraFields },
    });
  }

  // ---------------------------------------------------------------------------
  // Problem Management
  // ---------------------------------------------------------------------------

  async listProblems(organizationId: string, status?: string) {
    return (this.prisma as any).itsmProblem.findMany({
      where: {
        organizationId,
        ...(status && { status }),
      },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createProblem(organizationId: string, dto: any, ownerId: string) {
    const problemId = 'PRB-' + Date.now().toString().slice(-6);
    return (this.prisma as any).itsmProblem.create({
      data: {
        problemId,
        ownerId,
        organizationId,
        ...dto,
      },
    });
  }

  async updateProblem(id: string, organizationId: string, data: any) {
    const existing = await (this.prisma as any).itsmProblem.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new NotFoundException(`Problem ${id} not found`);
    }

    const extraFields: Record<string, any> = {};
    if (data.status === 'RESOLVED') {
      extraFields.resolvedAt = new Date();
    } else if (data.status === 'CLOSED') {
      extraFields.closedAt = new Date();
    }

    return (this.prisma as any).itsmProblem.update({
      where: { id },
      data: { ...data, ...extraFields },
    });
  }
}
