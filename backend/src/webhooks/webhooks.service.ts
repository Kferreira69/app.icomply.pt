import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import * as crypto from 'crypto';

export const WEBHOOK_EVENTS = [
  'risk.created',
  'risk.high',
  'risk.treatment_updated',
  'task.overdue',
  'task.completed',
  'capa.overdue',
  'capa.completed',
  'evidence.expiring',
  'evidence.approved',
  'audit.started',
  'audit.completed',
  'finding.created',
  'vendor.assessment_completed',
  'policy.approved',
  'dsar.received',
  'breach.reported',
];

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private prisma: PrismaService) {}

  // ── CRUD ──────────────────────────────────────────────────────

  async list(organizationId: string) {
    return (this.prisma as any).webhook.findMany({
      where: { organizationId },
      include: {
        deliveries: { orderBy: { deliveredAt: 'desc' }, take: 5, select: { id: true, event: true, success: true, deliveredAt: true, statusCode: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(organizationId: string, userId: string, dto: any) {
    return (this.prisma as any).webhook.create({
      data: {
        organizationId,
        createdById: userId,
        name:    dto.name,
        url:     dto.url,
        secret:  dto.secret || crypto.randomBytes(16).toString('hex'),
        events:  dto.events || [],
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, organizationId: string, dto: any) {
    const w = await (this.prisma as any).webhook.findFirst({ where: { id, organizationId } });
    if (!w) throw new NotFoundException('Webhook not found');
    return (this.prisma as any).webhook.update({ where: { id }, data: dto });
  }

  async remove(id: string, organizationId: string) {
    const w = await (this.prisma as any).webhook.findFirst({ where: { id, organizationId } });
    if (!w) throw new NotFoundException('Webhook not found');
    return (this.prisma as any).webhook.delete({ where: { id } });
  }

  async getEventList() {
    return WEBHOOK_EVENTS;
  }

  // ── Delivery ──────────────────────────────────────────────────

  /** Fire an event to all active webhooks subscribed to it */
  async fire(organizationId: string, event: string, payload: Record<string, any>) {
    const webhooks = await (this.prisma as any).webhook.findMany({
      where: { organizationId, isActive: true, events: { has: event } },
    });

    for (const wh of webhooks) {
      this.deliver(wh, event, payload).catch(e => this.logger.warn(`Webhook ${wh.id} error: ${e.message}`));
    }
  }

  private async deliver(wh: any, event: string, payload: Record<string, any>) {
    const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });
    const signature = wh.secret
      ? `sha256=${crypto.createHmac('sha256', wh.secret).update(body).digest('hex')}`
      : undefined;

    let statusCode: number | null = null;
    let success = false;
    let errorMsg: string | undefined;

    try {
      const res = await fetch(wh.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-iComply-Event': event,
          'X-iComply-Signature': signature || '',
          'X-iComply-Timestamp': new Date().toISOString(),
          'User-Agent': 'iComply-Webhooks/1.0',
        },
        body,
        signal: AbortSignal.timeout(10000), // 10s timeout
      });
      statusCode = res.status;
      success = res.status >= 200 && res.status < 300;
    } catch (err: any) {
      errorMsg = err.message;
    }

    // Log delivery
    await (this.prisma as any).webhookDelivery.create({
      data: { webhookId: wh.id, event, payload, statusCode, success, errorMsg },
    });

    // Update failure count and lastTriggeredAt
    await (this.prisma as any).webhook.update({
      where: { id: wh.id },
      data: {
        lastTriggeredAt: new Date(),
        failureCount: success ? 0 : { increment: 1 },
        // Auto-disable after 10 consecutive failures
        ...((!success && wh.failureCount >= 9) && { isActive: false }),
      },
    });
  }
}
