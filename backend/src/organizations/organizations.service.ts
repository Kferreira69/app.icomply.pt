import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOrganizationDto) {
    const slug = this.generateSlug(dto.name);
    const exists = await this.prisma.organization.findUnique({ where: { slug } });
    if (exists) throw new ConflictException('Organization with this name already exists');

    return this.prisma.organization.create({
      data: { ...dto, slug },
    });
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.organization.findMany({
        where: { isActive: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { users: true, projects: true } } },
      }),
      this.prisma.organization.count({ where: { isActive: true } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, projects: true, risks: true } },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    await this.findOne(id);
    return this.prisma.organization.update({ where: { id }, data: dto });
  }

  async getDashboardStats(organizationId: string) {
    const [projects, tasks, risks, evidence] = await Promise.all([
      this.prisma.project.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
      }),
      this.prisma.task.findMany({
        where: {
          project: { organizationId },
          status: { notIn: ['DONE', 'CANCELLED'] },
          dueDate: { lt: new Date() },
        },
        select: { id: true },
      }),
      this.prisma.risk.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
      }),
      this.prisma.evidence.findMany({
        where: {
          project: { organizationId },
          status: 'PENDING',
        },
        select: { id: true },
      }),
    ]);

    const activeProjects = projects.find(p => p.status === 'ACTIVE')?._count || 0;
    const totalProjects = projects.reduce((s, p) => s + p._count, 0);
    const openRisks = risks
      .filter(r => r.status !== 'CLOSED')
      .reduce((s, r) => s + r._count, 0);
    const highRisks = await this.prisma.risk.count({
      where: {
        organizationId,
        inherentScore: { gte: 15 },
        status: { notIn: ['CLOSED', 'ACCEPTED'] },
      },
    });

    return {
      projects: { active: activeProjects, total: totalProjects, byStatus: projects },
      tasks: { overdue: tasks.length },
      risks: { open: openRisks, high: highRisks, byStatus: risks },
      evidence: { pending: evidence.length },
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
