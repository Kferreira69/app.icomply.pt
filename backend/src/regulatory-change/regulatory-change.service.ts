import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class RegulatoryChangeService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(organizationId: string) {
    const [changes, calendarItems] = await Promise.all([
      (this.prisma as any).regulatoryChange.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      (this.prisma as any).complianceCalendarItem.findMany({
        where: { organizationId },
        orderBy: { eventDate: 'asc' },
      }),
    ]);

    const now = new Date();
    const upcoming30 = calendarItems.filter((i: any) => {
      const d = new Date(i.eventDate);
      return d >= now && d <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    });

    const overdue = calendarItems.filter((i: any) =>
      new Date(i.eventDate) < now && i.status !== 'COMPLETED' && i.status !== 'CANCELLED'
    );

    const byStatus = changes.reduce((acc: any, c: any) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});

    const critical = changes.filter((c: any) => c.impact === 'CRITICAL' || c.impact === 'HIGH');

    return {
      summary: {
        totalChanges: changes.length,
        openChanges: changes.filter((c: any) => !['IMPLEMENTED', 'VERIFIED', 'NOT_APPLICABLE'].includes(c.status)).length,
        upcomingDeadlines: upcoming30.length,
        overdueItems: overdue.length,
        criticalChanges: critical.length,
      },
      byStatus,
      recentChanges: changes.slice(0, 10),
      upcomingCalendar: upcoming30.slice(0, 10),
      overdueCalendar: overdue.slice(0, 5),
    };
  }

  // Regulatory Changes
  async listChanges(organizationId: string, status?: string, impact?: string) {
    const where: any = { organizationId };
    if (status) where.status = status;
    if (impact) where.impact = impact;
    return (this.prisma as any).regulatoryChange.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async createChange(organizationId: string, userId: string, dto: any) {
    const referenceId = 'REG-' + Date.now().toString().slice(-6);
    return (this.prisma as any).regulatoryChange.create({
      data: { organizationId, referenceId, responsibleId: userId, ...dto },
    });
  }

  async updateChange(organizationId: string, id: string, dto: any) {
    const change = await (this.prisma as any).regulatoryChange.findFirst({ where: { id, organizationId } });
    if (!change) throw new NotFoundException('Regulatory change not found');
    const data: any = { ...dto };
    if (dto.status === 'IMPLEMENTED' && !change.implementedAt) data.implementedAt = new Date();
    if (dto.status === 'VERIFIED' && !change.verifiedAt) data.verifiedAt = new Date();
    return (this.prisma as any).regulatoryChange.update({ where: { id }, data });
  }

  async removeChange(organizationId: string, id: string) {
    const change = await (this.prisma as any).regulatoryChange.findFirst({ where: { id, organizationId } });
    if (!change) throw new NotFoundException('Regulatory change not found');
    return (this.prisma as any).regulatoryChange.delete({ where: { id } });
  }

  // Compliance Calendar
  async listCalendar(organizationId: string, from?: string, to?: string) {
    const where: any = { organizationId };
    if (from || to) {
      where.eventDate = {};
      if (from) where.eventDate.gte = new Date(from);
      if (to) where.eventDate.lte = new Date(to);
    }
    return (this.prisma as any).complianceCalendarItem.findMany({ where, orderBy: { eventDate: 'asc' } });
  }

  async createCalendarItem(organizationId: string, userId: string, dto: any) {
    return (this.prisma as any).complianceCalendarItem.create({
      data: { organizationId, responsibleId: userId, ...dto },
    });
  }

  async updateCalendarItem(organizationId: string, id: string, dto: any) {
    const item = await (this.prisma as any).complianceCalendarItem.findFirst({ where: { id, organizationId } });
    if (!item) throw new NotFoundException('Calendar item not found');
    const data: any = { ...dto };
    if (dto.status === 'COMPLETED' && !item.completedAt) data.completedAt = new Date();
    return (this.prisma as any).complianceCalendarItem.update({ where: { id }, data });
  }

  async removeCalendarItem(organizationId: string, id: string) {
    const item = await (this.prisma as any).complianceCalendarItem.findFirst({ where: { id, organizationId } });
    if (!item) throw new NotFoundException('Calendar item not found');
    return (this.prisma as any).complianceCalendarItem.delete({ where: { id } });
  }
}
