import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { MailService } from '../common/mail/mail.service';
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
}
