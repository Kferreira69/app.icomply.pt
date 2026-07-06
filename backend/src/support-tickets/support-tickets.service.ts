import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StorageService } from '../common/storage/storage.service';
import { UserRole, TicketStatus } from '../generated/prisma/client';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

const USER_SELECT = { id: true, firstName: true, lastName: true, email: true };

@Injectable()
export class SupportTicketsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  private async nextTicketNumber(): Promise<string> {
    const count = await this.prisma.supportTicket.count();
    return '#' + String(count + 1).padStart(4, '0');
  }

  async create(userId: string, organizationId: string, dto: CreateTicketDto) {
    const ticketNumber = await this.nextTicketNumber();
    return this.prisma.supportTicket.create({
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
        replies: true,
        attachments: true,
      },
    });
  }

  async findAll(
    requesterId: string,
    requesterRole: UserRole,
    status?: TicketStatus,
    page = 1,
    limit = 20,
  ) {
    const isSupport = requesterRole === UserRole.SUPER_ADMIN;
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

  async findOne(id: string, requesterId: string, requesterRole: UserRole) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: { select: USER_SELECT },
        organization: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        attachments: true,
        replies: {
          where: requesterRole === UserRole.SUPER_ADMIN ? {} : { isInternal: false },
          include: {
            author: { select: { id: true, firstName: true, lastName: true, role: true } },
            attachments: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const isSupport = requesterRole === UserRole.SUPER_ADMIN;
    if (!isSupport && ticket.userId !== requesterId) throw new ForbiddenException();
    return ticket;
  }

  async addReply(ticketId: string, authorId: string, authorRole: UserRole, dto: CreateReplyDto) {
    await this.findOne(ticketId, authorId, authorRole);
    const isSupport = authorRole === UserRole.SUPER_ADMIN;
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
    return reply;
  }

  async update(id: string, requesterId: string, requesterRole: UserRole, dto: UpdateTicketDto) {
    if (requesterRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only support team can update tickets');
    }
    await this.findOne(id, requesterId, requesterRole);

    const data: any = { ...dto };
    if (dto.status === TicketStatus.RESOLVED) {
      data.resolvedAt = new Date();
    }

    return this.prisma.supportTicket.update({
      where: { id },
      data,
      include: {
        user: { select: USER_SELECT },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async getStats() {
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
  ) {
    if (!file) throw new BadRequestException('No file provided');

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

  async downloadAttachment(attachmentId: string, organizationId: string, res: any) {
    const attachment = await this.prisma.ticketAttachment.findFirst({
      where: { id: attachmentId, organizationId },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    const url = await this.storage.getPresignedUrl(attachment.s3Key);
    return res.redirect(url);
  }
}
