import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ClientHubService {
  constructor(private prisma: PrismaService) {}

  async getHubDashboard(consultancyOrgId: string) {
    const memberships = await (this.prisma as any).clientHubMembership.findMany({
      where: { hubOrgId: consultancyOrgId, isActive: true },
      include: { clientOrg: { select: { id: true, name: true, slug: true, industry: true, plan: true, isActive: true } } },
    });
    // Fetch summary stats for each client
    const clients = await Promise.all(memberships.map(async (m: any) => {
      const orgId = m.clientOrgId;
      const [overdueTasks, highRisks, openCapas] = await Promise.all([
        this.prisma.task.count({ where: { project: { organizationId: orgId }, status: { notIn: ['DONE','CANCELLED'] }, dueDate: { lt: new Date() } } }),
        this.prisma.risk.count({ where: { organizationId: orgId, inherentScore: { gte: 15 }, status: { notIn: ['CLOSED','ACCEPTED'] } } }),
        this.prisma.capa.count({ where: { createdBy: { organizationId: orgId }, status: { notIn: ['CLOSED'] } } }),
      ]);
      const alertScore = overdueTasks * 2 + highRisks * 3 + openCapas;
      const health = alertScore === 0 ? 'GOOD' : alertScore < 5 ? 'ATTENTION' : 'CRITICAL';
      return { ...m.clientOrg, overdueTasks, highRisks, openCapas, health, role: m.role };
    }));
    return { clients, total: clients.length, critical: clients.filter(c => c.health === 'CRITICAL').length };
  }

  async addClient(consultancyOrgId: string, userId: string, dto: any) {
    // Find client org by slug or name
    const clientOrg = await this.prisma.organization.findFirst({
      where: { OR: [{ slug: dto.clientSlug }, { name: { contains: dto.clientName, mode: 'insensitive' } }] },
    });
    if (!clientOrg) throw new NotFoundException('Client organisation not found — check slug or name');
    if (clientOrg.id === consultancyOrgId) throw new ForbiddenException('Cannot add self as client');
    return (this.prisma as any).clientHubMembership.upsert({
      where: { hubOrgId_clientOrgId: { hubOrgId: consultancyOrgId, clientOrgId: clientOrg.id } },
      create: { hubOrgId: consultancyOrgId, clientOrgId: clientOrg.id, role: dto.role || 'MANAGER', addedById: userId },
      update: { isActive: true, role: dto.role || 'MANAGER' },
    });
  }

  async removeClient(consultancyOrgId: string, clientOrgId: string) {
    const m = await (this.prisma as any).clientHubMembership.findFirst({ where: { hubOrgId: consultancyOrgId, clientOrgId } });
    if (!m) throw new NotFoundException();
    return (this.prisma as any).clientHubMembership.update({ where: { id: m.id }, data: { isActive: false } });
  }
}
