import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateProcessingActivityDto } from './dto/create-processing-activity.dto';
import { ProcessingActivityStatus, DpiaStatus, DpiaOutcome, BreachStatus, BreachSeverity } from '@prisma/client';

@Injectable()
export class GdprService {
  constructor(private prisma: PrismaService) {}

  // ── Dashboard stats ───────────────────────────────────────────

  async getDashboard(organizationId: string) {
    const [activities, dpias, breaches] = await Promise.all([
      this.prisma.dataProcessingActivity.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
      }),
      this.prisma.dpia.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
      }),
      this.prisma.breachNotification.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
      }),
    ]);

    const totalActivities = activities.reduce((s, a) => s + a._count, 0);
    const activeActivities = activities.find(a => a.status === 'ACTIVE')?._count ?? 0;

    return {
      activities: {
        total: totalActivities,
        active: activeActivities,
        byStatus: activities.reduce((acc, a) => ({ ...acc, [a.status]: a._count }), {}),
      },
      dpias: {
        total: dpias.reduce((s, d) => s + d._count, 0),
        byStatus: dpias.reduce((acc, d) => ({ ...acc, [d.status]: d._count }), {}),
      },
      breaches: {
        total: breaches.reduce((s, b) => s + b._count, 0),
        open: breaches.filter(b => b.status !== 'CLOSED').reduce((s, b) => s + b._count, 0),
        byStatus: breaches.reduce((acc, b) => ({ ...acc, [b.status]: b._count }), {}),
      },
    };
  }

  // ── Processing Activities (ROPA — Article 30) ─────────────────

  async createActivity(dto: CreateProcessingActivityDto, controllerId: string, organizationId: string) {
    return this.prisma.dataProcessingActivity.create({
      data: { ...dto, controllerId, organizationId },
      include: {
        controller: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { dpias: true } },
      },
    });
  }

  async findAllActivities(organizationId: string, status?: ProcessingActivityStatus) {
    return this.prisma.dataProcessingActivity.findMany({
      where: { organizationId, ...(status && { status }) },
      orderBy: { updatedAt: 'desc' },
      include: {
        controller: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { dpias: true } },
      },
    });
  }

  async findOneActivity(id: string, organizationId: string) {
    const activity = await this.prisma.dataProcessingActivity.findFirst({
      where: { id, organizationId },
      include: {
        controller: { select: { id: true, firstName: true, lastName: true } },
        dpias: { select: { id: true, title: true, status: true, outcome: true, createdAt: true } },
      },
    });
    if (!activity) throw new NotFoundException('Processing activity not found');
    return activity;
  }

  async updateActivity(id: string, organizationId: string, data: Partial<CreateProcessingActivityDto>) {
    const activity = await this.prisma.dataProcessingActivity.findFirst({ where: { id, organizationId } });
    if (!activity) throw new NotFoundException('Processing activity not found');
    return this.prisma.dataProcessingActivity.update({
      where: { id },
      data,
      include: { controller: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async removeActivity(id: string, organizationId: string) {
    const activity = await this.prisma.dataProcessingActivity.findFirst({ where: { id, organizationId } });
    if (!activity) throw new NotFoundException('Processing activity not found');
    return this.prisma.dataProcessingActivity.delete({ where: { id } });
  }

  // ── DPIAs ─────────────────────────────────────────────────────

  async createDpia(dto: any, ownerId: string, organizationId: string) {
    return this.prisma.dpia.create({
      data: { ...dto, ownerId, organizationId, status: DpiaStatus.DRAFT },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        activity: { select: { id: true, name: true } },
      },
    });
  }

  async findAllDpias(organizationId: string, status?: DpiaStatus) {
    return this.prisma.dpia.findMany({
      where: { organizationId, ...(status && { status }) },
      orderBy: { updatedAt: 'desc' },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        activity: { select: { id: true, name: true } },
      },
    });
  }

  async findOneDpia(id: string, organizationId: string) {
    const dpia = await this.prisma.dpia.findFirst({
      where: { id, organizationId },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        activity: { select: { id: true, name: true, purpose: true, legalBasis: true } },
      },
    });
    if (!dpia) throw new NotFoundException('DPIA not found');
    return dpia;
  }

  async updateDpia(id: string, organizationId: string, data: any) {
    const dpia = await this.prisma.dpia.findFirst({ where: { id, organizationId } });
    if (!dpia) throw new NotFoundException('DPIA not found');
    return this.prisma.dpia.update({
      where: { id },
      data,
      include: { owner: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async removeDpia(id: string, organizationId: string) {
    const dpia = await this.prisma.dpia.findFirst({ where: { id, organizationId } });
    if (!dpia) throw new NotFoundException('DPIA not found');
    return this.prisma.dpia.delete({ where: { id } });
  }

  // ── Breach Notifications ──────────────────────────────────────

  async createBreach(dto: any, ownerId: string, organizationId: string) {
    return this.prisma.breachNotification.create({
      data: { ...dto, ownerId, organizationId, status: BreachStatus.IDENTIFIED },
      include: { owner: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async findAllBreaches(organizationId: string) {
    return this.prisma.breachNotification.findMany({
      where: { organizationId },
      orderBy: { discoveredAt: 'desc' },
      include: { owner: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async findOneBreach(id: string, organizationId: string) {
    const breach = await this.prisma.breachNotification.findFirst({
      where: { id, organizationId },
      include: { owner: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!breach) throw new NotFoundException('Breach notification not found');
    return breach;
  }

  async updateBreach(id: string, organizationId: string, data: any) {
    const breach = await this.prisma.breachNotification.findFirst({ where: { id, organizationId } });
    if (!breach) throw new NotFoundException('Breach notification not found');
    return this.prisma.breachNotification.update({ where: { id }, data });
  }

  async removeBreach(id: string, organizationId: string) {
    const breach = await this.prisma.breachNotification.findFirst({ where: { id, organizationId } });
    if (!breach) throw new NotFoundException('Breach notification not found');
    return this.prisma.breachNotification.delete({ where: { id } });
  }

  // ── Article 30 ROPA report data ───────────────────────────────

  async getRopaReport(organizationId: string) {
    const activities = await this.prisma.dataProcessingActivity.findMany({
      where: { organizationId, status: 'ACTIVE' },
      orderBy: { name: 'asc' },
      include: { controller: { select: { firstName: true, lastName: true } } },
    });

    return {
      generatedAt: new Date(),
      organizationId,
      totalActivities: activities.length,
      activities: activities.map(a => ({
        ...a,
        controllerName: `${a.controller.firstName} ${a.controller.lastName}`,
      })),
    };
  }

  // ── DSAR (Data Subject Access Requests) ───────────────────────

  async createDsar(dto: any, organizationId: string) {
    // Default: 30 days (Art.12 GDPR), or 3 months if flagged
    const dueAt = dto.dueAt ? new Date(dto.dueAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return this.prisma.dataSubjectRequest.create({
      data: {
        ...dto,
        organizationId,
        dueAt,
        receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : new Date(),
      },
      include: { handler: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async findAllDsars(organizationId: string, status?: string) {
    return this.prisma.dataSubjectRequest.findMany({
      where: { organizationId, ...(status && { status: status as any }) },
      orderBy: { receivedAt: 'desc' },
      include: { handler: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async findOneDsar(id: string, organizationId: string) {
    const dsar = await this.prisma.dataSubjectRequest.findFirst({
      where: { id, organizationId },
      include: { handler: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!dsar) throw new NotFoundException('DSAR not found');
    return dsar;
  }

  async updateDsar(id: string, organizationId: string, data: any) {
    const dsar = await this.prisma.dataSubjectRequest.findFirst({ where: { id, organizationId } });
    if (!dsar) throw new NotFoundException('DSAR not found');
    return this.prisma.dataSubjectRequest.update({
      where: { id },
      data: {
        ...data,
        respondedAt: data.status === 'COMPLETED' && !dsar.respondedAt ? new Date() : data.respondedAt,
      },
      include: { handler: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async removeDsar(id: string, organizationId: string) {
    const dsar = await this.prisma.dataSubjectRequest.findFirst({ where: { id, organizationId } });
    if (!dsar) throw new NotFoundException('DSAR not found');
    return this.prisma.dataSubjectRequest.delete({ where: { id } });
  }

  async getDsarStats(organizationId: string) {
    const now = new Date();
    const [all, overdue] = await Promise.all([
      this.prisma.dataSubjectRequest.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
      }),
      this.prisma.dataSubjectRequest.count({
        where: {
          organizationId,
          dueAt: { lt: now },
          status: { notIn: ['COMPLETED', 'REJECTED'] },
        },
      }),
    ]);
    return {
      byStatus: all.reduce((acc: any, a) => ({ ...acc, [a.status]: a._count }), {}),
      total: all.reduce((s, a) => s + a._count, 0),
      overdue,
    };
  }

  // ── Consent Records ───────────────────────────────────────────

  async createConsent(dto: any, organizationId: string) {
    return this.prisma.consentRecord.create({
      data: {
        ...dto,
        organizationId,
        consentedAt: dto.consentedAt ? new Date(dto.consentedAt) : new Date(),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  async findAllConsents(organizationId: string, status?: string) {
    return this.prisma.consentRecord.findMany({
      where: { organizationId, ...(status && { status: status as any }) },
      orderBy: { consentedAt: 'desc' },
      include: { activity: { select: { id: true, name: true } } },
    });
  }

  async findOneConsent(id: string, organizationId: string) {
    const record = await this.prisma.consentRecord.findFirst({
      where: { id, organizationId },
      include: { activity: { select: { id: true, name: true, purpose: true } } },
    });
    if (!record) throw new NotFoundException('Consent record not found');
    return record;
  }

  async updateConsent(id: string, organizationId: string, data: any) {
    const record = await this.prisma.consentRecord.findFirst({ where: { id, organizationId } });
    if (!record) throw new NotFoundException('Consent record not found');
    return this.prisma.consentRecord.update({ where: { id }, data });
  }

  async withdrawConsent(id: string, organizationId: string) {
    const record = await this.prisma.consentRecord.findFirst({ where: { id, organizationId } });
    if (!record) throw new NotFoundException('Consent record not found');
    return this.prisma.consentRecord.update({
      where: { id },
      data: { status: 'WITHDRAWN', withdrawnAt: new Date() },
    });
  }

  async removeConsent(id: string, organizationId: string) {
    const record = await this.prisma.consentRecord.findFirst({ where: { id, organizationId } });
    if (!record) throw new NotFoundException('Consent record not found');
    return this.prisma.consentRecord.delete({ where: { id } });
  }
}
