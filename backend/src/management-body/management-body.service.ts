import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ManagementBodyService {
  constructor(private prisma: PrismaService) {}

  async getMembers(organizationId: string) {
    return (this.prisma as any).managementBodyMember.findMany({
      where: { organizationId, isActive: true },
      include: { actions: { orderBy: { createdAt: 'desc' } } },
      orderBy: { name: 'asc' },
    });
  }

  async addMember(organizationId: string, dto: any) {
    return (this.prisma as any).managementBodyMember.create({ data: { ...dto, organizationId } });
  }

  async updateMember(id: string, organizationId: string, dto: any) {
    const m = await (this.prisma as any).managementBodyMember.findFirst({ where: { id, organizationId } });
    if (!m) throw new NotFoundException();
    return (this.prisma as any).managementBodyMember.update({ where: { id }, data: dto });
  }

  async removeMember(id: string, organizationId: string) {
    const m = await (this.prisma as any).managementBodyMember.findFirst({ where: { id, organizationId } });
    if (!m) throw new NotFoundException();
    return (this.prisma as any).managementBodyMember.update({ where: { id }, data: { isActive: false } });
  }

  async addAction(memberId: string, organizationId: string, dto: any) {
    const m = await (this.prisma as any).managementBodyMember.findFirst({ where: { id: memberId, organizationId } });
    if (!m) throw new NotFoundException();
    return (this.prisma as any).managementBodyAction.create({ data: { ...dto, memberId } });
  }

  async acknowledgeAction(actionId: string, organizationId: string) {
    const action = await (this.prisma as any).managementBodyAction.findFirst({
      where: { id: actionId, member: { organizationId } },
    });
    if (!action) throw new NotFoundException();
    return (this.prisma as any).managementBodyAction.update({ where: { id: actionId }, data: { acknowledgedAt: new Date() } });
  }

  async getLiabilitySummary(organizationId: string) {
    const members = await this.getMembers(organizationId);
    return members.map((m: any) => ({
      ...m,
      totalActions: m.actions.length,
      acknowledged: m.actions.filter((a: any) => a.acknowledgedAt).length,
      pending: m.actions.filter((a: any) => !a.acknowledgedAt).length,
      complianceRate: m.actions.length > 0
        ? Math.round((m.actions.filter((a: any) => a.acknowledgedAt).length / m.actions.length) * 100)
        : 0,
    }));
  }
}
