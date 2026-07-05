import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WhistleblowStatus, WhistleblowTimelineEvent } from '@prisma/client';
import { randomBytes } from 'crypto';

// ── Reference code generator ──────────────────────────────────
function generateReferenceCode(seq: number): string {
  const year = new Date().getFullYear();
  return `DEN-${year}-${String(seq).padStart(4, '0')}`;
}

function generateSecureToken(): string {
  return randomBytes(32).toString('hex');
}

@Injectable()
export class WhistleblowService {
  constructor(private prisma: PrismaService) {}

  // ── Public: Submit Report ────────────────────────────────────

  async submitReport(organizationId: string, dto: any) {
    // Count existing reports to generate sequential reference code
    const count = await this.prisma.whistleblowReport.count({
      where: { organizationId },
    });
    const referenceCode = generateReferenceCode(count + 1);
    const secureToken = generateSecureToken();

    const now = new Date();
    const ackDeadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);   // +7 days
    const resolutionDeadline = new Date(now.getTime() + 91 * 24 * 60 * 60 * 1000); // +3 months

    const report = await this.prisma.whistleblowReport.create({
      data: {
        organizationId,
        referenceCode,
        secureToken,
        isAnonymous: dto.isAnonymous ?? true,
        category: dto.category,
        subject: dto.subject,
        description: dto.description,
        incidentDate: dto.incidentDate ? new Date(dto.incidentDate) : undefined,
        incidentLocation: dto.incidentLocation,
        repeatOffense: dto.repeatOffense ?? false,
        witnesses: dto.witnesses,
        // Reporter info (only if not anonymous)
        reporterName: dto.isAnonymous ? null : dto.reporterName,
        reporterEmail: dto.isAnonymous ? null : dto.reporterEmail,
        reporterPhone: dto.isAnonymous ? null : dto.reporterPhone,
        reporterDept: dto.isAnonymous ? null : dto.reporterDept,
        reporterRelation: dto.reporterRelation,
        ackDeadline,
        resolutionDeadline,
      },
    });

    // Create initial timeline entry
    await this.prisma.whistleblowTimeline.create({
      data: {
        reportId: report.id,
        event: WhistleblowTimelineEvent.SUBMITTED,
        description: `Denúncia submetida. Referência: ${referenceCode}. Canal: ${dto.isAnonymous ? 'Anónimo' : 'Identificado'}.`,
        actorRole: 'REPORTER',
      },
    });

    // Add accused/witness persons if provided
    if (dto.persons?.length) {
      await this.prisma.whistleblowPerson.createMany({
        data: dto.persons.map((p: any) => ({
          reportId: report.id,
          role: p.role,
          name: p.name,
          jobTitle: p.jobTitle,
          department: p.department,
          notes: p.notes,
        })),
      });
    }

    return {
      referenceCode,
      secureToken,
      ackDeadline,
      message:
        'A sua denúncia foi recebida. Guarde o código de referência e o token para acompanhar o estado.',
    };
  }

  // ── Public: Check Status by Token ────────────────────────────

  async getStatusByToken(token: string) {
    const report = await this.prisma.whistleblowReport.findUnique({
      where: { secureToken: token },
      select: {
        referenceCode: true,
        status: true,
        category: true,
        subject: true,
        createdAt: true,
        ackDeadline: true,
        resolutionDeadline: true,
        acknowledgedAt: true,
        concludedAt: true,
        conclusionSummary: true,
        conclusionType: true,
      },
    });
    if (!report) throw new NotFoundException('Denúncia não encontrada.');
    return report;
  }

  // ── Management: List Reports ──────────────────────────────────

  async listReports(organizationId: string, filters?: any) {
    const where: any = { organizationId };
    if (filters?.status) where.status = filters.status;
    if (filters?.category) where.category = filters.category;

    const [reports, total] = await Promise.all([
      this.prisma.whistleblowReport.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { evidences: true, persons: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.whistleblowReport.count({ where }),
    ]);

    const now = new Date();
    return {
      reports: reports.map(r => ({
        ...r,
        ackOverdue: r.status === 'RECEIVED' && r.ackDeadline < now,
        resolutionOverdue:
          !['CONCLUDED', 'UNFOUNDED', 'ARCHIVED'].includes(r.status) &&
          r.resolutionDeadline < now,
      })),
      total,
    };
  }

  // ── Management: Get Single Report ────────────────────────────

  async getReport(organizationId: string, id: string) {
    const report = await this.prisma.whistleblowReport.findFirst({
      where: { id, organizationId },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        persons: true,
        evidences: true,
        timeline: {
          include: {
            actor: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!report) throw new NotFoundException('Denúncia não encontrada.');
    return report;
  }

  // ── Management: Update Report Status ─────────────────────────

  async updateReport(organizationId: string, id: string, dto: any, userId: string) {
    const report = await this.prisma.whistleblowReport.findFirst({
      where: { id, organizationId },
    });
    if (!report) throw new NotFoundException('Denúncia não encontrada.');

    const data: any = {};
    const timelineEntries: any[] = [];

    if (dto.status && dto.status !== report.status) {
      data.status = dto.status;
      timelineEntries.push({
        event: WhistleblowTimelineEvent.STATUS_CHANGED,
        description: `Estado alterado: ${report.status} → ${dto.status}`,
        actorId: userId,
        actorRole: 'MANAGER',
      });

      if (dto.status === WhistleblowStatus.ACKNOWLEDGED && !report.acknowledgedAt) {
        data.acknowledgedAt = new Date();
        timelineEntries[timelineEntries.length - 1].event =
          WhistleblowTimelineEvent.ACKNOWLEDGED;
      }
      if (dto.status === WhistleblowStatus.CONCLUDED) {
        data.concludedAt = new Date();
        timelineEntries[timelineEntries.length - 1].event =
          WhistleblowTimelineEvent.CONCLUDED;
      }
    }

    if (dto.assignedToId !== undefined) {
      data.assignedToId = dto.assignedToId;
      data.assignedAt = new Date();
      timelineEntries.push({
        event: WhistleblowTimelineEvent.ASSIGNED,
        description: `Denúncia atribuída a responsável.`,
        actorId: userId,
        actorRole: 'MANAGER',
      });
    }

    if (dto.internalNotes !== undefined) data.internalNotes = dto.internalNotes;
    if (dto.conclusionSummary !== undefined) data.conclusionSummary = dto.conclusionSummary;
    if (dto.conclusionType !== undefined) data.conclusionType = dto.conclusionType;
    if (dto.actionsTaken !== undefined) data.actionsTaken = dto.actionsTaken;
    if (dto.regulatoryNotified !== undefined) {
      data.regulatoryNotified = dto.regulatoryNotified;
      if (dto.regulatoryNotified && !report.regulatoryNotified) {
        data.regulatoryNotifiedAt = new Date();
        timelineEntries.push({
          event: WhistleblowTimelineEvent.REGULATORY_NOTIFIED,
          description: 'Entidade reguladora notificada.',
          actorId: userId,
          actorRole: 'MANAGER',
        });
      }
    }
    if (dto.deadlineExtended !== undefined) {
      data.deadlineExtended = dto.deadlineExtended;
      if (dto.extendedUntil) data.extendedUntil = new Date(dto.extendedUntil);
      if (dto.extensionReason) data.extensionReason = dto.extensionReason;
    }

    const updated = await this.prisma.whistleblowReport.update({
      where: { id },
      data,
    });

    // Add timeline entries (immutable)
    if (timelineEntries.length) {
      await this.prisma.whistleblowTimeline.createMany({
        data: timelineEntries.map(e => ({ ...e, reportId: id })),
      });
    }

    return updated;
  }

  // ── Management: Add Internal Note ────────────────────────────

  async addNote(organizationId: string, reportId: string, note: string, userId: string) {
    await this.prisma.whistleblowReport.findFirst({
      where: { id: reportId, organizationId },
    });
    return this.prisma.whistleblowTimeline.create({
      data: {
        reportId,
        event: WhistleblowTimelineEvent.NOTE_ADDED,
        description: note,
        actorId: userId,
        actorRole: 'MANAGER',
      },
    });
  }

  // ── Dashboard ─────────────────────────────────────────────────

  async getDashboard(organizationId: string) {
    const now = new Date();
    const [
      total,
      byStatus,
      byCategory,
      ackOverdue,
      resolutionOverdue,
      recentReports,
      upcomingDeadlines,
    ] = await Promise.all([
      this.prisma.whistleblowReport.count({ where: { organizationId } }),
      this.prisma.whistleblowReport.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { _all: true },
      }),
      this.prisma.whistleblowReport.groupBy({
        by: ['category'],
        where: { organizationId },
        _count: { _all: true },
      }),
      this.prisma.whistleblowReport.count({
        where: {
          organizationId,
          status: 'RECEIVED',
          ackDeadline: { lt: now },
        },
      }),
      this.prisma.whistleblowReport.count({
        where: {
          organizationId,
          status: { notIn: ['CONCLUDED', 'UNFOUNDED', 'ARCHIVED'] },
          resolutionDeadline: { lt: now },
        },
      }),
      this.prisma.whistleblowReport.findMany({
        where: { organizationId },
        select: {
          id: true,
          referenceCode: true,
          category: true,
          status: true,
          isAnonymous: true,
          createdAt: true,
          ackDeadline: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.whistleblowReport.findMany({
        where: {
          organizationId,
          status: { notIn: ['CONCLUDED', 'UNFOUNDED', 'ARCHIVED'] },
          resolutionDeadline: {
            gte: now,
            lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
        },
        select: {
          id: true,
          referenceCode: true,
          status: true,
          resolutionDeadline: true,
          deadlineExtended: true,
        },
        orderBy: { resolutionDeadline: 'asc' },
        take: 5,
      }),
    ]);

    const open = byStatus
      .filter(s => !['CONCLUDED', 'UNFOUNDED', 'ARCHIVED'].includes(s.status))
      .reduce((sum, s) => sum + s._count._all, 0);

    return {
      total,
      open,
      ackOverdue,
      resolutionOverdue,
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count._all })),
      byCategory: byCategory.map(c => ({ category: c.category, count: c._count._all })),
      recentReports,
      upcomingDeadlines,
      complianceHealth: this.calcComplianceScore(ackOverdue, resolutionOverdue, total),
    };
  }

  private calcComplianceScore(ackOverdue: number, resOverdue: number, total: number): number {
    if (total === 0) return 100;
    const penalty = (ackOverdue * 20 + resOverdue * 10) / total;
    return Math.max(0, Math.round(100 - penalty));
  }

  // ── MENAC Annual Report ───────────────────────────────────────

  async getMenacReport(organizationId: string, year: number) {
    const start = new Date(`${year}-01-01T00:00:00Z`);
    const end = new Date(`${year + 1}-01-01T00:00:00Z`);

    const [reports, byStatus, byCategory, byMonth, trainings] = await Promise.all([
      this.prisma.whistleblowReport.count({
        where: { organizationId, createdAt: { gte: start, lt: end } },
      }),
      this.prisma.whistleblowReport.groupBy({
        by: ['status'],
        where: { organizationId, createdAt: { gte: start, lt: end } },
        _count: { _all: true },
      }),
      this.prisma.whistleblowReport.groupBy({
        by: ['category'],
        where: { organizationId, createdAt: { gte: start, lt: end } },
        _count: { _all: true },
      }),
      this.prisma.$queryRaw<{ month: number; count: bigint }[]>`
        SELECT EXTRACT(MONTH FROM "created_at") AS month, COUNT(*) AS count
        FROM whistleblow_reports
        WHERE organization_id = ${organizationId}
          AND created_at >= ${start}
          AND created_at < ${end}
        GROUP BY month
        ORDER BY month
      `,
      this.prisma.whistleblowTraining.findMany({
        where: {
          organizationId,
          trainingDate: { gte: start, lt: end },
        },
        include: {
          _count: { select: { attendees: true } },
        },
      }),
    ]);

    const concluded = byStatus.find(s => s.status === 'CONCLUDED')?._count._all ?? 0;
    const unfounded = byStatus.find(s => s.status === 'UNFOUNDED')?._count._all ?? 0;
    const open = byStatus
      .filter(s => !['CONCLUDED', 'UNFOUNDED', 'ARCHIVED'].includes(s.status))
      .reduce((sum, s) => sum + s._count._all, 0);

    return {
      year,
      reportingPeriod: `${year}-01-01 a ${year}-12-31`,
      totalReports: reports,
      concluded,
      unfounded,
      open,
      byCategory: byCategory.map(c => ({
        category: c.category,
        count: c._count._all,
      })),
      byMonth: byMonth.map(m => ({
        month: Number(m.month),
        count: Number(m.count),
      })),
      trainings: trainings.map(t => ({
        id: t.id,
        title: t.title,
        date: t.trainingDate,
        attendees: t._count.attendees,
        mandatory: t.mandatory,
      })),
      totalTrainingAttendees: trainings.reduce(
        (sum, t) => sum + t._count.attendees,
        0,
      ),
    };
  }

  // ── Code of Conduct ───────────────────────────────────────────

  async listCodesOfConduct(organizationId: string) {
    return this.prisma.codeOfConduct.findMany({
      where: { organizationId },
      include: {
        _count: { select: { acknowledgments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCodeOfConduct(organizationId: string, id: string) {
    const doc = await this.prisma.codeOfConduct.findFirst({
      where: { id, organizationId },
      include: {
        acknowledgments: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
          orderBy: { acknowledgedAt: 'desc' },
        },
      },
    });
    if (!doc) throw new NotFoundException('Código de conduta não encontrado.');
    return doc;
  }

  async upsertCodeOfConduct(organizationId: string, dto: any, id?: string) {
    if (id) {
      const existing = await this.prisma.codeOfConduct.findFirst({
        where: { id, organizationId },
      });
      if (!existing) throw new NotFoundException('Código de conduta não encontrado.');
      return this.prisma.codeOfConduct.update({
        where: { id },
        data: {
          title: dto.title,
          content: dto.content,
          version: dto.version,
          requiresAck: dto.requiresAck,
          reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : undefined,
          publishedAt: dto.publish ? new Date() : undefined,
          isActive: dto.isActive,
        },
      });
    }
    // Deactivate previous active versions
    if (dto.isActive) {
      await this.prisma.codeOfConduct.updateMany({
        where: { organizationId, isActive: true },
        data: { isActive: false },
      });
    }
    return this.prisma.codeOfConduct.create({
      data: {
        organizationId,
        title: dto.title,
        content: dto.content,
        version: dto.version ?? '1.0',
        requiresAck: dto.requiresAck ?? true,
        isActive: dto.isActive ?? true,
        reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : undefined,
        publishedAt: dto.publish ? new Date() : undefined,
      },
    });
  }

  async acknowledgeCodeOfConduct(conductId: string, userId: string, ipAddress?: string) {
    return this.prisma.codeOfConductAck.upsert({
      where: { conductId_userId: { conductId, userId } },
      create: { conductId, userId, ipAddress },
      update: { acknowledgedAt: new Date(), ipAddress },
    });
  }

  // ── Training Plans ────────────────────────────────────────────

  async listTrainings(organizationId: string) {
    return this.prisma.whistleblowTraining.findMany({
      where: { organizationId },
      include: {
        _count: { select: { attendees: true } },
        attendees: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { trainingDate: 'desc' },
    });
  }

  async createTraining(organizationId: string, dto: any) {
    const training = await this.prisma.whistleblowTraining.create({
      data: {
        organizationId,
        title: dto.title,
        description: dto.description,
        trainingDate: new Date(dto.trainingDate),
        durationMinutes: dto.durationMinutes ?? 60,
        instructor: dto.instructor,
        location: dto.location,
        mandatory: dto.mandatory ?? true,
        materialUrl: dto.materialUrl,
      },
    });

    // Auto-enroll all org users if attendeeIds provided
    if (dto.attendeeIds?.length) {
      await this.prisma.whistleblowTrainingAttendee.createMany({
        data: dto.attendeeIds.map((uid: string) => ({
          trainingId: training.id,
          userId: uid,
        })),
        skipDuplicates: true,
      });
    }

    return training;
  }

  async updateTraining(organizationId: string, id: string, dto: any) {
    await this.prisma.whistleblowTraining.findFirst({
      where: { id, organizationId },
    });
    return this.prisma.whistleblowTraining.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        trainingDate: dto.trainingDate ? new Date(dto.trainingDate) : undefined,
        durationMinutes: dto.durationMinutes,
        instructor: dto.instructor,
        location: dto.location,
        mandatory: dto.mandatory,
        materialUrl: dto.materialUrl,
      },
    });
  }

  async markAttendance(
    trainingId: string,
    userId: string,
    attended: boolean,
    score?: number,
    certificateUrl?: string,
  ) {
    return this.prisma.whistleblowTrainingAttendee.upsert({
      where: { trainingId_userId: { trainingId, userId } },
      create: {
        trainingId,
        userId,
        attended,
        completedAt: attended ? new Date() : undefined,
        score,
        certificateUrl,
      },
      update: {
        attended,
        completedAt: attended ? new Date() : undefined,
        score,
        certificateUrl,
      },
    });
  }
}
