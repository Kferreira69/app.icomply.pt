import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
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
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        createdById,
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        project: { select: { id: true, name: true } },
      },
    });

    // Notify assignee (if different from creator)
    if (task.assigneeId && task.assigneeId !== createdById) {
      const taskWithProject = task as typeof task & { project?: { name: string } | null };
      await this.notifications.create({
        organizationId,
        userId: task.assigneeId,
        type: NotificationType.TASK_ASSIGNED,
        title: 'Nova tarefa atribuída',
        message: `Foi-lhe atribuída a tarefa "${task.title}" no projecto "${taskWithProject.project?.name}".`,
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
    search?: string,
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
      ...(search && {
        title: { contains: search, mode: 'insensitive' },
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

    const updateData: any = {
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    };

    if (dto.status === TaskStatus.DONE) {
      // Transition TO done — stamp completedAt if not already set
      updateData.completedAt = updateData.completedAt ?? new Date();
    } else if (dto.status !== undefined) {
      // Transition AWAY from done — clear completedAt
      updateData.completedAt = null;
    }

    return this.prisma.task.update({
      where: { id },
      data: updateData,
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
    const completedAt = status === TaskStatus.DONE ? new Date() : null;
    return this.prisma.task.updateMany({
      where: {
        id: { in: ids },
        project: { organizationId },
      },
      data: { status, completedAt },
    });
  }

  // ─── Dependencies ────────────────────────────────────────────

  async addDependency(
    dependentTaskId: string,
    blockingTaskId: string,
    organizationId: string,
  ) {
    if (dependentTaskId === blockingTaskId) {
      throw new BadRequestException('A task cannot depend on itself');
    }

    // Verify both tasks belong to the organization
    const [dependentTask, blockingTask] = await Promise.all([
      this.prisma.task.findFirst({ where: { id: dependentTaskId, project: { organizationId } } }),
      this.prisma.task.findFirst({ where: { id: blockingTaskId, project: { organizationId } } }),
    ]);
    if (!dependentTask) throw new NotFoundException(`Task ${dependentTaskId} not found`);
    if (!blockingTask) throw new NotFoundException(`Task ${blockingTaskId} not found`);

    // Circular dependency check: would adding dependentTask→blockingTask create a cycle?
    // i.e. check if blockingTask already (directly or transitively) depends on dependentTask
    const wouldCycle = await this.hasPath(blockingTaskId, dependentTaskId);
    if (wouldCycle) {
      throw new BadRequestException('Adding this dependency would create a circular dependency');
    }

    return this.prisma.taskDependency.create({
      data: { dependentTaskId, blockingTaskId },
      include: {
        dependentTask: { select: { id: true, title: true } },
        blockingTask: { select: { id: true, title: true } },
      },
    });
  }

  /** BFS/DFS: does a path exist from `fromId` to `toId` in the dependency graph? */
  private async hasPath(fromId: string, toId: string): Promise<boolean> {
    const visited = new Set<string>();
    const queue = [fromId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === toId) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      const deps = await this.prisma.taskDependency.findMany({
        where: { dependentTaskId: current },
        select: { blockingTaskId: true },
      });
      for (const d of deps) queue.push(d.blockingTaskId);
    }
    return false;
  }

  async removeDependency(
    dependentTaskId: string,
    blockingTaskId: string,
    organizationId: string,
  ) {
    // Verify the dependent task belongs to the org (implicitly validates access)
    const task = await this.prisma.task.findFirst({
      where: { id: dependentTaskId, project: { organizationId } },
    });
    if (!task) throw new NotFoundException(`Task ${dependentTaskId} not found`);

    const dep = await this.prisma.taskDependency.findUnique({
      where: { dependentTaskId_blockingTaskId: { dependentTaskId, blockingTaskId } },
    });
    if (!dep) throw new NotFoundException('Dependency not found');

    await this.prisma.taskDependency.delete({
      where: { dependentTaskId_blockingTaskId: { dependentTaskId, blockingTaskId } },
    });
    return { deleted: true };
  }

  async getWithDependencies(id: string, organizationId: string) {
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
        dependsOn: {
          include: {
            blockingTask: { select: { id: true, title: true, status: true, priority: true } },
          },
        },
        blockedFor: {
          include: {
            dependentTask: { select: { id: true, title: true, status: true, priority: true } },
          },
        },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }
}
