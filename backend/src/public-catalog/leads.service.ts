import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { MailService } from '../common/mail/mail.service';
import { CreateLeadDto, LEAD_STATUSES, LEAD_TYPES, UpdateLeadDto } from './leads.dto';

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: string) => s.replace(/[&<>"']/g, c => ESCAPES[c]);

const TYPE_LABEL: Record<string, string> = {
  DEMO: 'Pedido de demonstração',
  CONTACT: 'Contacto',
  FEATURE_REQUEST: 'Sugestão de funcionalidade',
  NEWSLETTER: 'Subscrição de novidades',
};

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Stores a lead from the website. The response is deliberately the same for a real submission and
   * for a honeypot hit, so bots learn nothing.
   */
  async create(dto: CreateLeadDto) {
    if (dto.consent !== true) {
      throw new BadRequestException('É necessário aceitar a política de privacidade para enviar o formulário.');
    }
    if (dto.website && dto.website.trim() !== '') {
      return { received: true }; // bot — drop silently
    }
    if (dto.type === 'FEATURE_REQUEST' && !dto.message) {
      throw new BadRequestException('Descreva a funcionalidade que gostaria de ver.');
    }

    const lead = await this.prisma.productLead.create({
      data: {
        type: dto.type,
        name: dto.name,
        email: dto.email.toLowerCase(),
        company: dto.company || null,
        role: dto.role || null,
        phone: dto.phone || null,
        domains: (dto.domains ?? []).map(d => d.trim()).filter(Boolean),
        message: dto.message || null,
        sourceUrl: dto.sourceUrl || null,
        locale: dto.locale || null,
        consentAt: new Date(),
      },
    });

    void this.notify(lead);
    return { received: true };
  }

  /** Best effort: a mail failure must never lose or reject the lead. */
  private async notify(lead: { type: string; name: string; email: string; company: string | null; domains: string[]; message: string | null }) {
    const to = this.config.get<string>('LEADS_NOTIFY_EMAIL');
    if (!to) return;
    try {
      const lines = [
        `<b>${esc(lead.name)}</b> &lt;${esc(lead.email)}&gt;${lead.company ? ` — ${esc(lead.company)}` : ''}`,
        lead.domains.length ? `Interesse: ${lead.domains.map(esc).join(', ')}` : '',
        lead.message ? esc(lead.message).replace(/\n/g, '<br>') : '',
      ].filter(Boolean).join('<br>');
      await this.mail.sendNotification(to, `Novo lead do site — ${TYPE_LABEL[lead.type] ?? lead.type}`, lines);
    } catch (e: any) {
      this.logger.warn(`Lead notification failed: ${e?.message ?? e}`);
    }
  }

  // ── Backoffice ──────────────────────────────────────────────

  async list(filter: { status?: string; type?: string }) {
    const where: Record<string, string> = {};
    if (filter.status && (LEAD_STATUSES as readonly string[]).includes(filter.status)) where.status = filter.status;
    if (filter.type && (LEAD_TYPES as readonly string[]).includes(filter.type)) where.type = filter.type;
    const [items, counts] = await Promise.all([
      this.prisma.productLead.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 }),
      this.prisma.productLead.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    return {
      items,
      counts: Object.fromEntries(counts.map(c => [c.status, c._count._all])),
    };
  }

  async update(id: string, dto: UpdateLeadDto) {
    const exists = await this.prisma.productLead.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Lead não encontrado');
    const data: Record<string, string> = {};
    if (dto.status) data.status = dto.status;
    if (dto.notes !== undefined) data.notes = dto.notes;
    return this.prisma.productLead.update({ where: { id }, data });
  }
}
