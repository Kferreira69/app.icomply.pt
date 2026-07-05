import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActionPlanStatus, ActionTaskStatus } from '@prisma/client';

@Injectable()
export class ActionPlansService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, ownerId: string, dto: {
    title: string;
    description?: string;
    entityType?: string;
    entityId?: string;
    startDate?: string;
    endDate?: string;
    tasks?: Array<{ title: string; description?: string; assigneeId?: string; startDate?: string; dueDate?: string; sortOrder?: number }>;
  }) {
    return this.prisma.actionPlan.create({
      data: {
        organizationId,
        ownerId,
        title: dto.title,
        description: dto.description,
        entityType: dto.entityType,
        entityId: dto.entityId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        tasks: dto.tasks ? {
          create: dto.tasks.map((t, i) => ({
            title: t.title,
            description: t.description,
            assigneeId: t.assigneeId,
            startDate: t.startDate ? new Date(t.startDate) : undefined,
            dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
            sortOrder: t.sortOrder ?? i,
          })),
        } : undefined,
      },
      include: this.fullInclude(),
    });
  }

  async findAll(organizationId: string, status?: ActionPlanStatus) {
    return this.prisma.actionPlan.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        _count: { select: { tasks: true } },
        tasks: { select: { status: true, progress: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const plan = await this.prisma.actionPlan.findFirst({
      where: { id, organizationId },
      include: this.fullInclude(),
    });
    if (!plan) throw new NotFoundException('Action plan not found');
    return plan;
  }

  async update(id: string, organizationId: string, dto: {
    title?: string;
    description?: string;
    status?: ActionPlanStatus;
    startDate?: string | null;
    endDate?: string | null;
    ownerId?: string;
  }) {
    await this.findOne(id, organizationId);
    return this.prisma.actionPlan.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate === null ? null : dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate === null ? null : dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: this.fullInclude(),
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    await this.prisma.actionPlan.delete({ where: { id } });
    return { success: true };
  }

  async createTask(planId: string, organizationId: string, dto: {
    title: string;
    description?: string;
    assigneeId?: string;
    startDate?: string;
    dueDate?: string;
    sortOrder?: number;
  }) {
    await this.findOne(planId, organizationId);
    const count = await this.prisma.actionTask.count({ where: { actionPlanId: planId } });
    return this.prisma.actionTask.create({
      data: {
        actionPlanId: planId,
        title: dto.title,
        description: dto.description,
        assigneeId: dto.assigneeId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        sortOrder: dto.sortOrder ?? count,
      },
      include: { assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    });
  }

  async updateTask(taskId: string, organizationId: string, dto: {
    title?: string;
    description?: string;
    assigneeId?: string | null;
    status?: ActionTaskStatus;
    progress?: number;
    startDate?: string | null;
    dueDate?: string | null;
    sortOrder?: number;
  }) {
    const task = await this.prisma.actionTask.findFirst({
      where: { id: taskId, plan: { organizationId } },
    });
    if (!task) throw new NotFoundException('Task not found');

    const completedAt = dto.status === 'DONE' && task.status !== 'DONE' ? new Date() :
                        dto.status && dto.status !== 'DONE' ? null : undefined;

    return this.prisma.actionTask.update({
      where: { id: taskId },
      data: {
        ...dto,
        startDate: dto.startDate === null ? null : dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate === null ? null : dto.dueDate ? new Date(dto.dueDate) : undefined,
        ...(completedAt !== undefined ? { completedAt } : {}),
      },
      include: { assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    });
  }

  async removeTask(taskId: string, organizationId: string) {
    const task = await this.prisma.actionTask.findFirst({
      where: { id: taskId, plan: { organizationId } },
    });
    if (!task) throw new NotFoundException('Task not found');
    await this.prisma.actionTask.delete({ where: { id: taskId } });
    return { success: true };
  }

  async getSummary(organizationId: string) {
    const [total, byStatus, overdueTasks] = await Promise.all([
      this.prisma.actionPlan.count({ where: { organizationId } }),
      this.prisma.actionPlan.groupBy({ by: ['status'], where: { organizationId }, _count: { id: true } }),
      this.prisma.actionTask.count({
        where: {
          plan: { organizationId },
          status: { not: 'DONE' },
          dueDate: { lt: new Date() },
        },
      }),
    ]);
    return {
      total,
      byStatus: Object.fromEntries(byStatus.map(r => [r.status, r._count.id])),
      overdueTasks,
    };
  }

  private fullInclude() {
    return {
      owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      tasks: {
        include: { assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
        orderBy: { sortOrder: 'asc' as const },
      },
    };
  }
}
