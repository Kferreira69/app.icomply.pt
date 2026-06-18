import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateAuditDto } from './dto/create-audit.dto';
import { CreateFindingDto } from './dto/create-finding.dto';
import { AuditStatus, FindingSeverity } from '@prisma/client';

@Injectable()
export class AuditsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAuditDto, organizationId: string) {
    // Optionally verify project belongs to org
    if (dto.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: dto.projectId, organizationId },
      });
      if (!project) throw new NotFoundException('Project not found');
    }

    return this.prisma.audit.create({
      data: {
        ...(dto.projectId && { projectId: dto.projectId }),
        title: dto.title,
        type: dto.type,
        scope: dto.scope,
        objectives: dto.objectives,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        leadAuditor: dto.leadAuditor,
        organizationId,
      },
      include: { project: { select: { id: true, name: true } } },
    });
  }

  async findAll(organizationId: string, projectId?: string, status?: AuditStatus) {
    return this.prisma.audit.findMany({
      where: {
        organizationId,
        ...(projectId && { projectId }),
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { id: true, name: true } },
        _count: { select: { findings: true, participants: true } },
      },
    });
  }

  async findOne(id: string, organizationId: string) {
    const audit = await this.prisma.audit.findFirst({
      where: { id, organizationId },
      include: {
        project: { select: { id: true, name: true } },
        participants: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        findings: {
          orderBy: [{ severity: 'desc' }, { createdAt: 'asc' }],
          include: { capas: { select: { id: true, status: true } } },
        },
      },
    });
    if (!audit) throw new NotFoundException('Audit not found');
    return audit;
  }

  async update(id: string, data: any, organizationId: string) {
    await this.findOne(id, organizationId);
    const { status, ...rest } = data;
    return this.prisma.audit.update({
      where: { id },
      data: {
        ...rest,
        ...(status && { status }),
      },
    });
  }

  async updateStatus(id: string, status: AuditStatus, organizationId: string, summary?: string, score?: number) {
    await this.findOne(id, organizationId);
    return this.prisma.audit.update({
      where: { id },
      data: {
        status,
        ...(summary && { summary }),
        ...(score !== undefined && { score }),
        ...(status === 'COMPLETED' && { completedAt: new Date() }),
      },
    });
  }

  async listFindings(organizationId: string, auditId?: string, status?: string) {
    return this.prisma.finding.findMany({
      where: {
        audit: { organizationId },
        ...(auditId && { auditId }),
        ...(status && { status: status as any }),
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'asc' }],
      include: {
        audit: { select: { id: true, title: true } },
      },
    });
  }

  async createFinding(auditId: string, dto: CreateFindingDto, organizationId: string, userId?: string) {
    await this.findOne(auditId, organizationId);
    const finding = await this.prisma.finding.create({
      data: { ...dto, auditId },
    });

    // Auto-create CAPA for HIGH and CRITICAL findings
    if (['HIGH', 'CRITICAL'].includes(dto.severity as string) && userId) {
      try {
        const capaId = `CAPA-${Date.now().toString().slice(-6)}`;
        await this.prisma.capa.create({
          data: {
            capaId,
            title:       `[Auto] ${finding.title || 'Finding ' + finding.id.slice(-6)}`,
            description: `CAPA criado automaticamente a partir de finding de auditoria.\n\nFinding: ${finding.description || ''}`,
            type:        'CORRECTIVE',
            status:      'OPEN',
            priority:    dto.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
            source:      'AUDIT',
            createdById: userId,
            findingId:   finding.id,
          } as any,
        });
      } catch { /* non-blocking — if CAPA creation fails, finding is still saved */ }
    }

    return finding;
  }

  async updateFinding(id: string, dto: Partial<CreateFindingDto>, organizationId: string) {
    const finding = await this.prisma.finding.findFirst({
      where: { id, audit: { project: { organizationId } } },
    });
    if (!finding) throw new NotFoundException('Finding not found');
    return this.prisma.finding.update({ where: { id }, data: dto });
  }
}
