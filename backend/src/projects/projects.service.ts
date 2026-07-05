import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectStatus } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProjectDto, organizationId: string) {
    // Optionally auto-generate tasks from template
    const project = await this.prisma.project.create({
      data: { ...dto, organizationId },
      include: { framework: true, template: true },
    });

    // If a template is specified, generate tasks from it
    if (dto.templateId) {
      await this.generateTasksFromTemplate(project.id, dto.templateId, organizationId);
    }

    return project;
  }

  async findAll(organizationId: string, page = 1, limit = 20, status?: ProjectStatus) {
    const skip = (page - 1) * limit;
    const where: any = { organizationId, ...(status && { status }) };

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          framework: { select: { name: true, code: true } },
          _count: { select: { tasks: true, risks: true, evidences: true, audits: true } },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId },
      include: {
        framework: true,
        template: true,
        _count: { select: { tasks: true, risks: true, evidences: true, audits: true } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');

    // Calculate compliance score
    const [totalTasks, doneTasks] = await Promise.all([
      this.prisma.task.count({ where: { projectId: id } }),
      this.prisma.task.count({ where: { projectId: id, status: 'DONE' } }),
    ]);
    const complianceScore = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    return { ...project, complianceScore };
  }

  async update(id: string, organizationId: string, dto: UpdateProjectDto) {
    await this.findOne(id, organizationId);
    return this.prisma.project.update({
      where: { id },
      data: dto,
      include: { framework: true },
    });
  }

  async getStats(id: string, organizationId: string) {
    await this.findOne(id, organizationId);

    const [tasks, risks, evidence, audits, recentActivity] = await Promise.all([
      this.prisma.task.groupBy({
        by: ['status'],
        where: { projectId: id },
        _count: true,
      }),
      this.prisma.risk.groupBy({
        by: ['status'],
        where: { projectId: id },
        _count: true,
      }),
      this.prisma.evidence.groupBy({
        by: ['status'],
        where: { projectId: id },
        _count: true,
      }),
      this.prisma.audit.count({ where: { projectId: id } }),
      this.prisma.auditLog.findMany({
        where: { metadata: { path: ['projectId'], equals: id } },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { tasks, risks, evidence, audits, recentActivity };
  }

  async findForGantt(organizationId: string) {
    const projects = await this.prisma.project.findMany({
      where: { organizationId },
      include: {
        framework: { select: { name: true, code: true } },
        tasks: {
          where: { parentId: null },
          select: {
            id: true,
            title: true,
            startDate: true,
            dueDate: true,
            status: true,
            priority: true,
            completedAt: true,
            createdAt: true,
            assignee: { select: { firstName: true, lastName: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Attach complianceScore to each project
    return Promise.all(
      projects.map(async (p) => {
        const [total, done] = await Promise.all([
          this.prisma.task.count({ where: { projectId: p.id } }),
          this.prisma.task.count({ where: { projectId: p.id, status: 'DONE' } }),
        ]);
        return { ...p, complianceScore: total > 0 ? Math.round((done / total) * 100) : 0 };
      }),
    );
  }

  private async generateTasksFromTemplate(
    projectId: string,
    templateId: string,
    organizationId: string,
  ) {
    const template = await this.prisma.template.findUnique({ where: { id: templateId } });
    if (!template || !template.content) return;

    const content = template.content as any;
    if (!content.tasks || !Array.isArray(content.tasks)) return;

    // Get a default admin user for creator
    const admin = await this.prisma.user.findFirst({
      where: { organizationId, role: { in: ['ADMIN', 'COMPLIANCE_MANAGER'] } },
    });

    if (!admin) return;

    await this.prisma.task.createMany({
      data: content.tasks.map((t: any, idx: number) => ({
        projectId,
        title: t.title,
        description: t.description,
        priority: t.priority || 'MEDIUM',
        dueDate: t.dueDaysFromNow
          ? new Date(Date.now() + t.dueDaysFromNow * 24 * 3600 * 1000)
          : null,
        sortOrder: idx,
        createdById: admin.id,
        tags: t.tags || [],
      })),
    });
  }
}
