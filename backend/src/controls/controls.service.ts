import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ControlStatus } from '../generated/prisma/client';

@Injectable()
export class ControlsService {
  constructor(private prisma: PrismaService) {}

  async findAll(frameworkId?: string, status?: ControlStatus) {
    return this.prisma.control.findMany({
      where: {
        ...(frameworkId && { frameworkId }),
        ...(status && { status }),
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      include: {
        framework: { select: { name: true, code: true } },
        requirement: { select: { code: true, title: true } },
        _count: { select: { tasks: true, evidences: true } },
      },
    });
  }

  async findOne(id: string) {
    const ctrl = await this.prisma.control.findUnique({
      where: { id },
      include: {
        framework: true,
        requirement: true,
        tasks: { select: { id: true, title: true, status: true } },
        evidences: { select: { id: true, title: true, status: true } },
      },
    });
    if (!ctrl) throw new NotFoundException('Control not found');
    return ctrl;
  }

  async updateStatus(id: string, status: ControlStatus) {
    await this.findOne(id);
    return this.prisma.control.update({ where: { id }, data: { status } });
  }
}
