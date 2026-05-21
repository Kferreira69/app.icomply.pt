import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class FrameworksService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.framework.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { requirements: true, controls: true, templates: true } },
      },
    });
  }

  async findOne(id: string) {
    const fw = await this.prisma.framework.findUnique({
      where: { id },
      include: {
        requirements: {
          where: { parentId: null },
          orderBy: { sortOrder: 'asc' },
          include: {
            children: { orderBy: { sortOrder: 'asc' } },
          },
        },
        _count: { select: { controls: true, templates: true } },
      },
    });
    if (!fw) throw new NotFoundException('Framework not found');
    return fw;
  }

  async getControls(frameworkId: string) {
    await this.findOne(frameworkId);
    return this.prisma.control.findMany({
      where: { frameworkId },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      include: { requirement: true },
    });
  }

  async getTemplates(frameworkId: string) {
    return this.prisma.template.findMany({
      where: { frameworkId, isPublic: true },
      orderBy: { name: 'asc' },
    });
  }
}
