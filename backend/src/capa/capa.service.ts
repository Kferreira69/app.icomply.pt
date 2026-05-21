import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateCapaDto } from './dto/create-capa.dto';
import { CapaStatus } from '@prisma/client';

@Injectable()
export class CapaService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCapaDto, createdById: string) {
    return this.prisma.capa.create({
      data: { ...dto, createdById },
      include: {
        finding: { select: { id: true, title: true, severity: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findAll(organizationId: string, status?: CapaStatus, overdue?: boolean) {
    const now = new Date();
    return this.prisma.capa.findMany({
      where: {
        createdBy: { organizationId },
        ...(status && { status }),
        ...(overdue && {
          dueDate: { lt: now },
          status: { notIn: ['CLOSED'] },
        }),
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
      include: {
        finding: { select: { id: true, title: true, severity: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findOne(id: string, organizationId: string) {
    const capa = await this.prisma.capa.findFirst({
      where: { id, createdBy: { organizationId } },
      include: {
        finding: { include: { audit: { select: { id: true, title: true } } } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!capa) throw new NotFoundException('CAPA not found');
    return capa;
  }

  async update(id: string, organizationId: string, data: Partial<CreateCapaDto> & { status?: CapaStatus }) {
    await this.findOne(id, organizationId);
    const updateData: any = { ...data };
    if (data.status === 'CLOSED') updateData.closedAt = new Date();
    if (data.status === 'PENDING_VERIFICATION') updateData.verifiedAt = new Date();

    return this.prisma.capa.update({
      where: { id },
      data: updateData,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }
}
