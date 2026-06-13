import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StartTimerDto } from './dto/start-timer.dto';
import { CreateManualEntryDto } from './dto/create-manual-entry.dto';

@Injectable()
export class TimeTrackingService {
  constructor(private prisma: PrismaService) {}

  // ─── Start a running timer ────────────────────────────────────

  async startTimer(dto: StartTimerDto, userId: string, organizationId: string) {
    // Verify task belongs to org
    const task = await this.prisma.task.findFirst({
      where: { id: dto.taskId, project: { organizationId } },
      select: { id: true },
    });
    if (!task) throw new NotFoundException('Task not found');

    // Prevent duplicate running timers for the same user
    const running = await this.prisma.timeEntry.findFirst({
      where: { userId, organizationId, endedAt: null },
    });
    if (running) {
      throw new BadRequestException(
        `You already have a running timer (entry ${running.id}). Stop it before starting a new one.`,
      );
    }

    return this.prisma.timeEntry.create({
      data: {
        taskId: dto.taskId,
        userId,
        organizationId,
        description: dto.description,
        startedAt: new Date(),
      },
      include: {
        task: { select: { id: true, title: true } },
      },
    });
  }

  // ─── Stop a running timer ─────────────────────────────────────

  async stopTimer(entryId: string, userId: string, organizationId: string) {
    const entry = await this.prisma.timeEntry.findFirst({
      where: { id: entryId, userId, organizationId },
    });
    if (!entry) throw new NotFoundException('Time entry not found');
    if (entry.endedAt) {
      throw new BadRequestException('This timer has already been stopped');
    }

    const endedAt = new Date();
    const durationMinutes = Math.round(
      (endedAt.getTime() - entry.startedAt.getTime()) / 60000,
    );

    return this.prisma.timeEntry.update({
      where: { id: entryId },
      data: { endedAt, durationMinutes },
      include: {
        task: { select: { id: true, title: true } },
      },
    });
  }

  // ─── Get all entries for a task ───────────────────────────────

  async getTaskTimeEntries(taskId: string, organizationId: string) {
    // Verify task belongs to org
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, project: { organizationId } },
      select: { id: true },
    });
    if (!task) throw new NotFoundException('Task not found');

    const entries = await this.prisma.timeEntry.findMany({
      where: { taskId, organizationId },
      orderBy: { startedAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    const totalMinutes = entries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);
    return { entries, totalMinutes };
  }

  // ─── Get my time entries (paginated) ─────────────────────────

  async getMyTimeEntries(
    userId: string,
    organizationId: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const where = { userId, organizationId };

    const [data, total] = await Promise.all([
      this.prisma.timeEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: {
          task: { select: { id: true, title: true, status: true } },
        },
      }),
      this.prisma.timeEntry.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Project time report ──────────────────────────────────────

  async getProjectTimeReport(projectId: string, organizationId: string) {
    // Verify project belongs to org
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true, name: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    const entries = await this.prisma.timeEntry.findMany({
      where: {
        organizationId,
        task: { projectId },
        durationMinutes: { not: null },
      },
      include: {
        task: { select: { id: true, title: true, status: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Group by task
    const byTask = new Map<
      string,
      { task: { id: string; title: string; status: string }; totalMinutes: number; entryCount: number }
    >();

    for (const entry of entries) {
      const existing = byTask.get(entry.taskId);
      if (existing) {
        existing.totalMinutes += entry.durationMinutes ?? 0;
        existing.entryCount += 1;
      } else {
        byTask.set(entry.taskId, {
          task: entry.task as any,
          totalMinutes: entry.durationMinutes ?? 0,
          entryCount: 1,
        });
      }
    }

    const taskSummaries = Array.from(byTask.values()).sort(
      (a, b) => b.totalMinutes - a.totalMinutes,
    );

    const grandTotalMinutes = taskSummaries.reduce((s, t) => s + t.totalMinutes, 0);

    return {
      project,
      grandTotalMinutes,
      grandTotalHours: +(grandTotalMinutes / 60).toFixed(2),
      tasks: taskSummaries,
    };
  }

  // ─── Create a manual time entry ───────────────────────────────

  async createManualEntry(
    dto: CreateManualEntryDto,
    userId: string,
    organizationId: string,
  ) {
    const task = await this.prisma.task.findFirst({
      where: { id: dto.taskId, project: { organizationId } },
      select: { id: true },
    });
    if (!task) throw new NotFoundException('Task not found');

    const startedAt = new Date(dto.startedAt);
    const endedAt = new Date(dto.endedAt);

    if (endedAt <= startedAt) {
      throw new BadRequestException('endedAt must be after startedAt');
    }

    const durationMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);

    return this.prisma.timeEntry.create({
      data: {
        taskId: dto.taskId,
        userId,
        organizationId,
        description: dto.description,
        startedAt,
        endedAt,
        durationMinutes,
      },
      include: {
        task: { select: { id: true, title: true } },
      },
    });
  }

  // ─── Delete an entry (own entries only) ───────────────────────

  async deleteEntry(entryId: string, userId: string, organizationId: string) {
    const entry = await this.prisma.timeEntry.findFirst({
      where: { id: entryId, organizationId },
    });
    if (!entry) throw new NotFoundException('Time entry not found');
    if (entry.userId !== userId) {
      throw new ForbiddenException('You can only delete your own time entries');
    }

    await this.prisma.timeEntry.delete({ where: { id: entryId } });
    return { deleted: true };
  }
}
