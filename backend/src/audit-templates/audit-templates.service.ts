import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AuditTemplatesService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, framework?: string) {
    return this.prisma.auditTemplate.findMany({
      where: {
        OR: [{ organizationId: null }, { organizationId }],
        ...(framework && { framework }),
      },
      orderBy: [{ organizationId: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(organizationId: string, userId: string, dto: any) {
    return this.prisma.auditTemplate.create({
      data: {
        organizationId,
        createdById: userId,
        name:          dto.name,
        type:          dto.type,
        framework:     dto.framework,
        description:   dto.description,
        checklistItems: dto.checklistItems ?? [],
      },
    });
  }

  async update(id: string, organizationId: string, dto: any) {
    const t = await this.prisma.auditTemplate.findFirst({ where: { id, organizationId } });
    if (!t) throw new NotFoundException('Template not found');
    return this.prisma.auditTemplate.update({
      where: { id },
      data: {
        ...(dto.name          !== undefined && { name: dto.name }),
        ...(dto.type          !== undefined && { type: dto.type }),
        ...(dto.framework     !== undefined && { framework: dto.framework }),
        ...(dto.description   !== undefined && { description: dto.description }),
        ...(dto.checklistItems !== undefined && { checklistItems: dto.checklistItems }),
      },
    });
  }

  async remove(id: string, organizationId: string) {
    const t = await this.prisma.auditTemplate.findFirst({ where: { id, organizationId } });
    if (!t) throw new NotFoundException('Template not found');
    return this.prisma.auditTemplate.delete({ where: { id } });
  }
}
