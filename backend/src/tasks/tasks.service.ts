import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskStatus, TaskPriority, NotificationType } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async create(dto: CreateTaskDto, createdById: string, organizationId: string) {
    // Verify project belongs to organization
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, organizationId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const task = await this.prisma.task.create({
      data: { ...dto, createdById },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        project: { select: { id: true, name: true } },
      },
    });

    // Notify assignee (if different from creator)
    if (task.assigneeId && task.assigneeId !== createdById) {
      await this.notifications.create({
        organizationId,
        userId: task.assigneeId,
        type: NotificationType.TASK_ASSIGNED,
        title: 'Nova tarefa atribuída',
        message: `Foi-lhe atribuída a tarefa "${task.title}" no projecto "${task.project?.name}".`,
        entityType: 'Task',
        entityId: task.id,
        sendEmail: false,
      });
    }

    return task;
  }

  async findAll(
    organizationId: string,
    projectId?: string,
    assigneeId?: string,
    status?: TaskStatus,
    priority?: TaskPriority,
    overdue?: boolean,
    page = 1,
    limit = 50,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {
      project: { organizationId },
      ...(projectId && { projectId }),
      ...(assigneeId && { assigneeId }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(overdue && {
        dueDate: { lt: new Date() },
        status: { notIn: ['DONE', 'CANCELLED'] },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }, { sortOrder: 'asc' }],
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          project: { select: { id: true, name: true } },
          control: { select: { id: true, code: true, title: true } },
          _count: { select: { subtasks: true, evidences: true, comments: true } },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, organizationId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, project: { organizationId } },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true, frameworkId: true } },
        control: true,
        subtasks: { orderBy: { sortOrder: 'asc' } },
        evidences: { select: { id: true, title: true, status: true, fileName: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
        },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async update(id: string, organizationId: string, dto: UpdateTaskDto, userId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.task.update({
      where: { id },
      data: dto,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async addComment(taskId: string, organizationId: string, userId: string, content: string) {
    await this.findOne(taskId, organizationId);
    return this.prisma.taskComment.create({
      data: { taskId, userId, content },
      include: {
        user: { select: { firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }

  async bulkUpdateStatus(ids: string[], status: TaskStatus, organizationId: string) {
    return this.prisma.task.updateMany({
      where: {
        id: { in: ids },
        project: { organizationId },
      },
      data: { status },
    });
  }
}
