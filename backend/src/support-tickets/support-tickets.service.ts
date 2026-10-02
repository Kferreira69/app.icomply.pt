import {
  Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { StorageService } from '../common/storage/storage.service';
import { MailService } from '../common/mail/mail.service';
import { UserRole, TicketStatus } from '../generated/prisma/client';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

const USER_SELECT = { id: true, firstName: true, lastName: true, email: true };
const PLATFORM_ORG = 'contemporary constellation';

const CATEGORY_LABEL: Record<string, string> = {
  ONBOARDING: 'Arranque', TECHNICAL_ISSUE: 'Problema técnico', BILLING: 'Faturação',
  FEATURE_REQUEST: 'Sugestão', BUG_REPORT: 'Erro', SECURITY: 'Segurança', OTHER: 'Outro',
};
const PRIORITY_LABEL: Record<string, string> = { LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', URGENT: 'Urgente' };
const label = (map: Record<string, string>, k: string) => map[k] ?? k;
const excerptOf = (s: string, n = 400) => (s.length > n ? `${s.slice(0, n)}…` : s);

/**
 * Support desk. The people who answer tickets ("support staff") are the platform operator's
 * SUPPORT agents and SUPER_ADMINs — and only when they belong to the platform operator's own
 * organisation, so a SUPER_ADMIN/SUPPORT user created inside a customer organisation can never see
 * other customers' tickets.
 */
@Injectable()
export class SupportTicketsService {
  private readonly logger = new Logger(SupportTicketsService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private mail: MailService,
    private config: ConfigService,
  ) {}

  // ── who is support staff ─────────────────────────────────────

  async isStaff(userId: string): Promise<boolean> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, status: true, organization: { select: { name: true } } },
    });
    return !!u
      && (u.role === UserRole.SUPER_ADMIN || u.role === UserRole.SUPPORT)
      && u.organization.name.toLowerCase().includes(PLATFORM_ORG);
  }

  /** Active support staff of the platform organisation (agents first; super-admins only as a fallback). */
  private async staffUsers() {
    const where = (role: UserRole) => ({
      role, status: 'ACTIVE' as const,
      organization: { name: { contains: PLATFORM_ORG, mode: 'insensitive' as const } },
    });
    const agents = await this.prisma.user.findMany({ where: where(UserRole.SUPPORT), select: USER_SELECT });
    if (agents.length) return agents;
    return this.prisma.user.findMany({ where: where(UserRole.SUPER_ADMIN), select: USER_SELECT });
  }

  /**
   * Who is told about a ticket: SUPPORT_NOTIFY_EMAIL (comma separated; e.g. the shared support
   * mailbox) if set, otherwise the support staff users. The assignee, when there is one, always is.
   */
  private async staffRecipients(assignedToId?: string | null): Promise<string[]> {
    const fromEnv = (this.config.get<string>('SUPPORT_NOTIFY_EMAIL', '') || '')
      .split(',').map(s => s.trim()).filter(Boolean);
    const list = fromEnv.length ? fromEnv : (await this.staffUsers()).map(u => u.email);
    if (assignedToId) {
      const a = await this.prisma.user.findUnique({ where: { id: assignedToId }, select: { email: true } });
      if (a?.email) list.push(a.email);
    }
    return [...new Set(list.map(e => e.toLowerCase()))];
  }

  /** Best effort: a mail problem must never fail the ticket operation. */
  private async tell(recipients: string[], subject: string, mail: Parameters<MailService['sendTicketEmail']>[2]) {
    await Promise.all(recipients.map(async to => {
      try { await this.mail.sendTicketEmail(to, subject, mail); }
      catch (e: any) { this.logger.warn(`Ticket email to ${to} failed: ${e?.message ?? e}`); }
    }));
  }

  private async notifyStaffNewTicket(t: any, orgName: string) {
    const to = await this.staffRecipients(t.assignedToId);
    await this.tell(to, `[Suporte] Novo ticket ${t.ticketNumber} — ${t.subject}`, {
      heading: `Novo ticket de suporte ${t.ticketNumber}`,
      facts: [
        ['Assunto', t.subject],
        ['Organização', orgName],
        ['Autor', `${t.user.firstName} ${t.user.lastName} <${t.user.email}>`],
        ['Categoria', label(CATEGORY_LABEL, t.category)],
        ['Prioridade', label(PRIORITY_LABEL, t.priority)],
      ],
      excerpt: excerptOf(t.description),
      url: this.mail.appLink(`/admin/support?ticket=${t.id}`),
      cta: 'Abrir e responder',
    });
  }

  private async notifyStaffCustomerReply(t: any, authorName: string, body: string) {
    const to = await this.staffRecipients(t.assignedToId);
    await this.tell(to, `[Suporte] Nova resposta no ticket ${t.ticketNumber} — ${t.subject}`, {
      heading: `Resposta do cliente em ${t.ticketNumber}`,
      facts: [['Assunto', t.subject], ['Organização', t.organization?.name ?? ''], ['De', authorName]],
      excerpt: excerptOf(body),
      url: this.mail.appLink(`/admin/support?ticket=${t.id}`),
      cta: 'Abrir e responder',
    });
  }

  private async notifyAuthor(t: any, heading: string, excerpt?: string) {
    await this.tell([t.user.email], `[iComply] ${heading} — ${t.ticketNumber}`, {
      heading,
      facts: [['Ticket', t.ticketNumber], ['Assunto', t.subject]],
      excerpt,
      url: this.mail.appLink(`/help?ticket=${t.id}`),
      cta: 'Ver o ticket',
    });
  }

  // ── tickets ──────────────────────────────────────────────────

  private async nextTicketNumber(): Promise<string> {
    const count = await this.prisma.supportTicket.count();
    return '#' + String(count + 1).padStart(4, '0');
  }

  async create(userId: string, organizationId: string, dto: CreateTicketDto) {
    const ticketNumber = await this.nextTicketNumber();
    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketNumber,
        organizationId,
        userId,
        category: dto.category ?? 'OTHER',
        priority: dto.priority ?? 'MEDIUM',
        subject: dto.subject,
        description: dto.description,
      },
      include: {
        user: { select: USER_SELECT },
        organization: { select: { name: true } },
        replies: true,
        attachments: true,
      },
    });
    void this.notifyStaffNewTicket(ticket, ticket.organization.name)
      .catch(e => this.logger.warn(`New-ticket notification failed: ${e?.message ?? e}`));
    const { organization, ...result } = ticket;
    return result;
  }

  async findAll(
    requesterId: string,
    _requesterRole: UserRole,
    status?: TicketStatus,
    page = 1,
    limit = 20,
  ) {
    const isSupport = await this.isStaff(requesterId);
    const where: any = {
      ...(isSupport ? {} : { userId: requesterId }),
      ...(status ? { status } : {}),
    };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: USER_SELECT },
          organization: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { replies: true } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, requesterId: string, _requesterRole?: UserRole) {
    const isSupport = await this.isStaff(requesterId);
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: { select: USER_SELECT },
        organization: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        attachments: true,
        replies: {
          where: isSupport ? {} : { isInternal: false },
          include: {
            author: { select: { id: true, firstName: true, lastName: true, role: true } },
            attachments: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (!isSupport && ticket.userId !== requesterId) throw new ForbiddenException();
    return ticket;
  }

  async addReply(ticketId: string, authorId: string, _authorRole: UserRole, dto: CreateReplyDto) {
    const ticket = await this.findOne(ticketId, authorId);
    const isSupport = await this.isStaff(authorId);
    const isInternal = Boolean(dto.isInternal) && isSupport;

    const [reply] = await this.prisma.$transaction([
      this.prisma.ticketReply.create({
        data: { ticketId, authorId, body: dto.body, isInternal },
        include: {
          author: { select: { id: true, firstName: true, lastName: true, role: true } },
          attachments: true,
        },
      }),
      this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: isSupport ? TicketStatus.WAITING_USER : TicketStatus.IN_PROGRESS },
      }),
    ]);

    if (isSupport && !isInternal) {
      void this.notifyAuthor(ticket, 'O suporte respondeu ao seu pedido', dto.body)
        .catch(e => this.logger.warn(`Reply notification failed: ${e?.message ?? e}`));
    } else if (!isSupport) {
      const name = `${reply.author.firstName} ${reply.author.lastName}`;
      void this.notifyStaffCustomerReply(ticket, name, dto.body)
        .catch(e => this.logger.warn(`Reply notification failed: ${e?.message ?? e}`));
    } // internal notes are never emailed to the customer
    return reply;
  }

  async update(id: string, requesterId: string, _requesterRole: UserRole, dto: UpdateTicketDto) {
    if (!(await this.isStaff(requesterId))) {
      throw new ForbiddenException('Only support team can update tickets');
    }
    const before = await this.findOne(id, requesterId);

    // A ticket can only be assigned to support staff, never to an arbitrary user id.
    if (dto.assignedToId && !(await this.isStaff(dto.assignedToId))) {
      throw new BadRequestException('O ticket só pode ser atribuído a um membro da equipa de suporte');
    }

    const data: any = { ...dto };
    if (dto.status === TicketStatus.RESOLVED) {
      data.resolvedAt = new Date();
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data,
      include: {
        user: { select: USER_SELECT },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (dto.status === TicketStatus.RESOLVED && before.status !== TicketStatus.RESOLVED) {
      void this.notifyAuthor(updated, 'O seu pedido de suporte foi resolvido')
        .catch(e => this.logger.warn(`Resolved notification failed: ${e?.message ?? e}`));
    }
    return updated;
  }

  async getStats(requesterId: string) {
    if (!(await this.isStaff(requesterId))) {
      return { open: 0, inProgress: 0, waitingUser: 0, resolved: 0, total: 0 };
    }
    const [open, inProgress, waitingUser, resolved, total] = await Promise.all([
      this.prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      this.prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.supportTicket.count({ where: { status: 'WAITING_USER' } }),
      this.prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
      this.prisma.supportTicket.count(),
    ]);
    return { open, inProgress, waitingUser, resolved, total };
  }

  async uploadAttachment(
    ticketId: string,
    organizationId: string,
    file: Express.Multer.File,
    replyId?: string,
    userId?: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    // only someone who can see the ticket may attach to it (the author or support staff)
    if (userId) await this.findOne(ticketId, userId);

    const { key } = await this.storage.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      `tickets/${ticketId}`,
    );

    return this.prisma.ticketAttachment.create({
      data: {
        ticketId,
        replyId: replyId || null,
        organizationId,
        s3Key: key,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
    });
  }

  async downloadAttachment(attachmentId: string, userId: string, res: any) {
    const attachment = await this.prisma.ticketAttachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: { select: { userId: true } }, reply: { select: { isInternal: true } } },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');
    // same visibility as the ticket: its author or support staff; internal notes' files are staff-only
    const staff = await this.isStaff(userId);
    const isAuthor = attachment.ticket?.userId === userId;
    if (!staff && (!isAuthor || attachment.reply?.isInternal)) throw new NotFoundException('Attachment not found');

    const url = await this.storage.getPresignedUrl(attachment.s3Key);
    return res.redirect(url);
  }
}
