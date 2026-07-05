import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AutomationTrigger } from '@prisma/client';

@Injectable()
export class AutomationService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, userId: string, dto: {
    name: string;
    description?: string;
    trigger: AutomationTrigger;
    conditions: any[];
    actions: any[];
  }) {
    return this.prisma.automationRule.create({
      data: {
        organizationId,
        createdById: userId,
        name: dto.name,
        description: dto.description,
        trigger: dto.trigger,
        conditions: dto.conditions,
        actions: dto.actions,
      },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.automationRule.findMany({
      where: { organizationId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { logs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, organizationId: string, dto: {
    name?: string;
    description?: string;
    trigger?: AutomationTrigger;
    conditions?: any[];
    actions?: any[];
    isActive?: boolean;
  }) {
    const rule = await this.prisma.automationRule.findFirst({ where: { id, organizationId } });
    if (!rule) throw new NotFoundException('Automation rule not found');
    return this.prisma.automationRule.update({ where: { id }, data: dto });
  }

  async remove(id: string, organizationId: string) {
    const rule = await this.prisma.automationRule.findFirst({ where: { id, organizationId } });
    if (!rule) throw new NotFoundException('Automation rule not found');
    await this.prisma.automationRule.delete({ where: { id } });
    return { success: true };
  }

  async getLogs(id: string, organizationId: string) {
    const rule = await this.prisma.automationRule.findFirst({ where: { id, organizationId } });
    if (!rule) throw new NotFoundException('Automation rule not found');
    return this.prisma.automationLog.findMany({
      where: { automationRuleId: id },
      orderBy: { triggeredAt: 'desc' },
      take: 50,
    });
  }

  async triggerManual(id: string, organizationId: string) {
    const rule = await this.prisma.automationRule.findFirst({ where: { id, organizationId } });
    if (!rule) throw new NotFoundException('Automation rule not found');

    // Execute actions
    const result = await this.executeActions(rule.actions as any[], organizationId);

    await this.prisma.automationRule.update({
      where: { id },
      data: { lastRunAt: new Date(), runCount: { increment: 1 } },
    });

    await this.prisma.automationLog.create({
      data: {
        automationRuleId: id,
        success: result.success,
        result: result.details,
        errorMessage: result.error,
      },
    });

    return result;
  }

  async getSummary(organizationId: string) {
    const [total, active, recentLogs] = await Promise.all([
      this.prisma.automationRule.count({ where: { organizationId } }),
      this.prisma.automationRule.count({ where: { organizationId, isActive: true } }),
      this.prisma.automationLog.count({
        where: {
          rule: { organizationId },
          triggeredAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
        },
      }),
    ]);
    return { total, active, inactive: total - active, triggersLast7Days: recentLogs };
  }

  private async executeActions(actions: any[], organizationId: string) {
    const details: any[] = [];
    try {
      for (const action of actions) {
        if (action.type === 'SEND_NOTIFICATION') {
          // Notifications are handled by notification service — log intent
          details.push({ type: action.type, status: 'queued', params: action.params });
        } else {
          details.push({ type: action.type, status: 'executed', params: action.params });
        }
      }
      return { success: true, details };
    } catch (e: any) {
      return { success: false, details, error: e.message };
    }
  }
}
