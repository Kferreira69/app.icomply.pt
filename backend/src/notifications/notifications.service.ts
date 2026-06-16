import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { MailService } from '../common/mail/mail.service';
import { ComplianceMetricsService } from '../common/services/compliance-metrics.service';
import { NotificationType } from '@prisma/client';

interface CreateNotificationDto {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  sendEmail?: boolean;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private complianceMetrics: ComplianceMetricsService,
  ) {}

  // ── Create ────────────────────────────────────────────────

  async create(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        organizationId: dto.organizationId,
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        entityType: dto.entityType,
        entityId: dto.entityId,
      },
    });

    if (dto.sendEmail) {
      const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
      if (user) {
        await this.mail.sendNotification(user.email, dto.title, dto.message);
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { emailSent: true },
        });
      }
    }

    return notification;
  }

  // ── Read ──────────────────────────────────────────────────

  async findAll(userId: string, page = 1, limit = 20, unreadOnly = false) {
    const skip = (page - 1) * limit;
    const where: any = { userId };
    if (unreadOnly) where.read = false;

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, read: false } }),
    ]);

    return { items, total, unreadCount, page, limit };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  // ── Mark read ─────────────────────────────────────────────

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
  }

  // ── Delete ────────────────────────────────────────────────

  async remove(id: string, userId: string) {
    return this.prisma.notification.deleteMany({ where: { id, userId } });
  }

  // ── Preferences ───────────────────────────────────────────────

  async getPreferences(userId: string) {
    const prefs = await (this.prisma as any).notificationPreference.findMany({ where: { userId } });
    const defaultTypes = [
      'TASK_DUE_SOON', 'TASK_OVERDUE', 'RISK_HIGH', 'CAPA_DUE_SOON', 'CAPA_OVERDUE',
      'EVIDENCE_EXPIRING', 'POLICY_REVIEW', 'VENDOR_EXPIRY', 'RISK_NO_TREATMENT', 'AUDIT_FINDING',
    ];
    const prefMap = Object.fromEntries((prefs as any[]).map((p: any) => [p.type, p]));
    return defaultTypes.map(type => ({
      type,
      inApp: (prefMap as any)[type]?.inApp ?? true,
      email: (prefMap as any)[type]?.email ?? (type.includes('OVERDUE') || type.includes('HIGH')),
    }));
  }

  async updatePreferences(userId: string, prefs: Array<{ type: string; inApp: boolean; email: boolean }>) {
    for (const pref of prefs) {
      await (this.prisma as any).notificationPreference.upsert({
        where: { userId_type: { userId, type: pref.type } },
        create: { userId, type: pref.type, inApp: pref.inApp, email: pref.email },
        update: { inApp: pref.inApp, email: pref.email },
      });
    }
    return this.getPreferences(userId);
  }

  // ── Cron: weekly digest (Monday 7:30 AM) ────────────────────

  @Cron('30 7 * * 1') // Every Monday at 07:30
  async sendWeeklyDigest() {
    this.logger.log('Sending weekly compliance digest...');
    try {
      // Get all active organizations
      const orgs = await this.prisma.organization.findMany({
        where: { isActive: true },
        select: { id: true, name: true, users: { where: { role: 'ADMIN', status: 'ACTIVE' }, select: { email: true, firstName: true } } },
      });

      for (const org of orgs) {
        const [overdueTasks, highRisks, openCapas, expiringEvidence] = await Promise.all([
          this.prisma.task.count({ where: { project: { organizationId: org.id }, status: { notIn: ['DONE','CANCELLED'] }, dueDate: { lt: new Date() } } }),
          this.prisma.risk.count({ where: { organizationId: org.id, inherentScore: { gte: 12 }, status: { notIn: ['CLOSED','ACCEPTED'] } } }),
          this.prisma.capa.count({ where: { createdBy: { organizationId: org.id }, status: { notIn: ['CLOSED'] } } }),
          this.prisma.evidence.count({ where: { uploadedBy: { organizationId: org.id }, expiresAt: { lte: new Date(Date.now() + 30 * 86400000) } } }),
        ]);

        const hasIssues = overdueTasks > 0 || highRisks > 0 || openCapas > 0 || expiringEvidence > 0;
        if (!hasIssues) continue;

        for (const admin of org.users) {
          if (!admin.email) continue;
          await this.mail.sendWeeklyDigest(admin.email, admin.firstName, org.name, {
            overdueTasks, highRisks, openCapas, expiringEvidence,
          }).catch(e => this.logger.warn(`Weekly digest failed for ${admin.email}: ${e.message}`));
        }
      }
    } catch (err) {
      this.logger.error(`Weekly digest cron failed: ${err.message}`);
    }
    this.logger.log('Weekly digest cron complete.');
  }

  // ── Cron: deadline alerts (runs daily at 8:00 AM) ────────

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleDeadlineAlerts() {
    this.logger.log('Running deadline alerts cron...');
    try {
      await Promise.all([
        this.checkTasksDueSoon(),
        this.checkTasksOverdue(),
        this.checkCapaDueSoon(),
        this.checkCapaOverdue(),
        this.checkEvidenceExpiring(),
        this.checkPoliciesNeedingReview(),
        this.checkHighRisksNoTreatment(),
        this.checkVendorContractsExpiring(),
      ]);
    } catch (err) {
      this.logger.error('Deadline alerts cron failed', err);
    }
    this.logger.log('Deadline alerts cron complete.');
  }

  // ── Tasks due in 3 days ──────────────────────────────────

  private async checkTasksDueSoon() {
    const in3Days = new Date();
    in3Days.setDate(in3Days.getDate() + 3);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = await this.prisma.task.findMany({
      where: {
        dueDate: { gte: tomorrow, lte: in3Days },
        status: { notIn: ['DONE', 'CANCELLED'] },
        assigneeId: { not: null },
      },
      include: {
        assignee: { select: { id: true, organizationId: true } },
        project: { select: { id: true, name: true, organizationId: true } },
      },
    });

    for (const task of tasks) {
      if (!task.assigneeId || !task.project) continue;
      const orgId = task.project.organizationId;

      const existing = await this.prisma.notification.findFirst({
        where: {
          userId: task.assigneeId,
          entityId: task.id,
          type: NotificationType.TASK_DUE_SOON,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      });
      if (existing) continue;

      await this.create({
        organizationId: orgId,
        userId: task.assigneeId,
        type: NotificationType.TASK_DUE_SOON,
        title: 'Tarefa com prazo próximo',
        message: `A tarefa "${task.title}" do projecto "${task.project.name}" vence em 3 dias.`,
        entityType: 'Task',
        entityId: task.id,
        sendEmail: false,
      });
    }
  }

  // ── Tasks overdue ────────────────────────────────────────

  private async checkTasksOverdue() {
    const now = new Date();

    const tasks = await this.prisma.task.findMany({
      where: {
        dueDate: { lt: now },
        status: { notIn: ['DONE', 'CANCELLED'] },
        assigneeId: { not: null },
      },
      include: {
        assignee: { select: { id: true, organizationId: true } },
        project: { select: { id: true, name: true, organizationId: true } },
      },
    });

    for (const task of tasks) {
      if (!task.assigneeId || !task.project) continue;
      const orgId = task.project.organizationId;

      const existing = await this.prisma.notification.findFirst({
        where: {
          userId: task.assigneeId,
          entityId: task.id,
          type: NotificationType.TASK_OVERDUE,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      });
      if (existing) continue;

      await this.create({
        organizationId: orgId,
        userId: task.assigneeId,
        type: NotificationType.TASK_OVERDUE,
        title: 'Tarefa em atraso',
        message: `A tarefa "${task.title}" do projecto "${task.project.name}" está em atraso.`,
        entityType: 'Task',
        entityId: task.id,
        sendEmail: true,
      });
    }
  }

  // ── CAPA due soon ─────────────────────────────────────────

  private async checkCapaDueSoon() {
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const capas = await this.prisma.capa.findMany({
      where: {
        dueDate: { gte: tomorrow, lte: in7Days },   // field is dueDate, not targetDate
        status: { notIn: ['CLOSED'] },
        assigneeId: { not: null },
      },
      include: {
        assignee: { select: { id: true } },
        createdBy: { select: { organizationId: true } },
      },
    });

    for (const capa of capas) {
      if (!capa.assigneeId || !capa.createdBy) continue;
      const orgId = capa.createdBy.organizationId;

      const existing = await this.prisma.notification.findFirst({
        where: {
          userId: capa.assigneeId,
          entityId: capa.id,
          type: NotificationType.CAPA_DUE_SOON,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      });
      if (existing) continue;

      await this.create({
        organizationId: orgId,
        userId: capa.assigneeId,
        type: NotificationType.CAPA_DUE_SOON,
        title: 'CAPA com prazo próximo',
        message: `A acção correctiva "${capa.title}" vence em 7 dias.`,
        entityType: 'Capa',
        entityId: capa.id,
        sendEmail: false,
      });
    }
  }

  // ── CAPA overdue ─────────────────────────────────────────

  private async checkCapaOverdue() {
    const now = new Date();
    const capas = await this.prisma.capa.findMany({
      where: {
        dueDate: { lt: now },                        // field is dueDate, not targetDate
        status: { notIn: ['CLOSED'] },
        assigneeId: { not: null },
      },
      include: {
        assignee: { select: { id: true } },
        createdBy: { select: { organizationId: true } },
      },
    });

    for (const capa of capas) {
      if (!capa.assigneeId || !capa.createdBy) continue;
      const orgId = capa.createdBy.organizationId;

      const existing = await this.prisma.notification.findFirst({
        where: {
          userId: capa.assigneeId,
          entityId: capa.id,
          type: NotificationType.CAPA_OVERDUE,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      });
      if (existing) continue;

      await this.create({
        organizationId: orgId,
        userId: capa.assigneeId,
        type: NotificationType.CAPA_OVERDUE,
        title: 'CAPA em atraso',
        message: `A acção correctiva "${capa.title}" está em atraso e requer atenção imediata.`,
        entityType: 'Capa',
        entityId: capa.id,
        sendEmail: true,
      });
    }
  }

  // ── Evidence expiring in 30 days ─────────────────────────

  private async checkEvidenceExpiring() {
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const evidences = await this.prisma.evidence.findMany({
      where: {
        expiresAt: { gte: tomorrow, lte: in30Days },
        status: { not: 'REJECTED' },
      },
      include: {
        uploadedBy: { select: { id: true, organizationId: true } },
      },
    });

    for (const ev of evidences) {
      if (!ev.uploadedById) continue;
      const orgId = ev.uploadedBy.organizationId;

      const existing = await this.prisma.notification.findFirst({
        where: {
          userId: ev.uploadedById,
          entityId: ev.id,
          type: NotificationType.EVIDENCE_EXPIRING,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      });
      if (existing) continue;

      await this.create({
        organizationId: orgId,
        userId: ev.uploadedById,
        type: NotificationType.EVIDENCE_EXPIRING,
        title: 'Evidência a expirar',
        message: `A evidência "${ev.title}" expira em 30 dias. Renove para manter a conformidade.`,
        entityType: 'Evidence',
        entityId: ev.id,
        sendEmail: false,
      });
    }
  }

  // ── Policies needing review ───────────────────────────────────

  private async checkPoliciesNeedingReview() {
    const in14Days = new Date();
    in14Days.setDate(in14Days.getDate() + 14);
    const now = new Date();

    const policies = await this.prisma.policy.findMany({
      where: { reviewDate: { gte: now, lte: in14Days }, status: 'APPROVED' },
      include: { owner: { select: { id: true, organization: { select: { id: true } } } } },
    });

    for (const policy of policies) {
      if (!policy.ownerId || !policy.owner?.organization) continue;
      const existing = await this.prisma.notification.findFirst({
        where: { entityId: policy.id, type: NotificationType.POLICY_REVIEW, createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } },
      });
      if (existing) continue;
      await this.create({
        organizationId: policy.owner.organization.id,
        userId: policy.ownerId,
        type: NotificationType.POLICY_REVIEW,
        title: 'Política a necessitar de revisão',
        message: `A política "${policy.title}" requer revisão em 14 dias.`,
        entityType: 'Policy', entityId: policy.id, sendEmail: false,
      });
    }
  }

  // ── High risks without treatment plan (consolidated per org) ─

  private async checkHighRisksNoTreatment() {
    // Gather all orgs that have untreated high/critical risks
    const risksWithoutTreatment = await this.prisma.risk.findMany({
      where: {
        inherentScore: { gte: 12 },
        treatmentPlan: null,
        status: { notIn: ['CLOSED', 'ACCEPTED'] },
      } as any,
      include: { owner: { select: { id: true, organizationId: true } } },
    });

    // Group risks by organizationId to avoid per-risk alerts that contradict each other
    const byOrg = new Map<string, { ownerId: string; risks: typeof risksWithoutTreatment }>();
    for (const risk of risksWithoutTreatment) {
      if (!risk.ownerId || !risk.owner) continue;
      const orgId = risk.owner.organizationId;
      if (!byOrg.has(orgId)) byOrg.set(orgId, { ownerId: risk.ownerId, risks: [] });
      byOrg.get(orgId)!.risks.push(risk);
    }

    const sevenDaysAgo = new Date(new Date().setDate(new Date().getDate() - 7));

    for (const [orgId, { ownerId, risks }] of byOrg) {
      // Single consolidated notification per org per week (not per individual risk)
      const existing = await this.prisma.notification.findFirst({
        where: {
          organizationId: orgId,
          type: NotificationType.RISK_HIGH,
          entityType: 'RiskSummary',
          createdAt: { gte: sevenDaysAgo },
        },
      });
      if (existing) continue;

      // Use ComplianceMetricsService for accurate, consistent counts
      const riskCounts = await this.complianceMetrics.getRiskCounts(orgId);
      const parts: string[] = [];
      if (riskCounts.critical > 0) parts.push(`${riskCounts.critical} risco(s) CRÍTICO(S)`);
      if (riskCounts.high > 0)     parts.push(`${riskCounts.high} risco(s) ALTO(S)`);

      const summary = parts.join(' e ');
      const untreated = risks.length;

      await this.create({
        organizationId: orgId,
        userId: ownerId,
        type: NotificationType.RISK_HIGH,
        title: 'Riscos elevados sem plano de tratamento',
        message: `Existem ${summary} activos. ${untreated} risco(s) ainda não têm plano de tratamento definido. Aceda ao Registo de Riscos para tomar acção.`,
        entityType: 'RiskSummary',
        entityId: orgId,
        sendEmail: riskCounts.critical > 0,
      });
    }
  }

  // ── Vendor contracts expiring in 30 days ─────────────────────

  private async checkVendorContractsExpiring() {
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    const now = new Date();

    const vendors = await this.prisma.vendor.findMany({
      where: { contractEnd: { gte: now, lte: in30Days }, status: 'ACTIVE' },
      include: { organization: { select: { id: true, users: { where: { role: 'ADMIN' }, select: { id: true }, take: 1 } } } },
    });

    for (const vendor of vendors) {
      const adminUser = vendor.organization?.users?.[0];
      if (!adminUser) continue;
      const existing = await this.prisma.notification.findFirst({
        where: { entityId: vendor.id, type: NotificationType.VENDOR_EXPIRY, createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } },
      });
      if (existing) continue;
      await this.create({
        organizationId: vendor.organizationId,
        userId: adminUser.id,
        type: NotificationType.VENDOR_EXPIRY,
        title: 'Contrato de fornecedor a expirar',
        message: `O contrato com "${vendor.name}" expira em 30 dias. Renove ou termine a relação contratual.`,
        entityType: 'Vendor', entityId: vendor.id, sendEmail: false,
      });
    }
  }
}
