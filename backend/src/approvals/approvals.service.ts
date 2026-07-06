import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ApprovalEntityType, ApprovalDecision, ApprovalStatus } from '../generated/prisma/client';

@Injectable()
export class ApprovalsService {
  constructor(private prisma: PrismaService) {}

  /** Create a new approval request with specified approvers */
  async create(
    organizationId: string,
    requestedById: string,
    data: {
      entityType: ApprovalEntityType;
      entityId: string;
      title: string;
      description?: string;
      approverIds: string[];
      threshold?: number;
      dueDate?: string;
    },
  ) {
    const { approverIds, threshold, ...rest } = data;
    if (!approverIds?.length) throw new BadRequestException('Pelo menos 1 aprovador é obrigatório');

    // Validate all approvers belong to org
    const users = await this.prisma.user.findMany({
      where: { id: { in: approverIds }, organizationId },
      select: { id: true },
    });
    if (users.length !== approverIds.length) throw new BadRequestException('Um ou mais aprovadores inválidos');

    return this.prisma.approvalRequest.create({
      data: {
        ...rest,
        organizationId,
        requestedById,
        threshold: threshold ?? 1,
        dueDate: rest.dueDate ? new Date(rest.dueDate) : undefined,
        votes: {
          create: approverIds.map(approverId => ({ approverId })),
        },
      },
      include: this.fullInclude(),
    });
  }

  /** Get all approval requests for an entity */
  async getForEntity(entityType: ApprovalEntityType, entityId: string, organizationId: string) {
    return this.prisma.approvalRequest.findMany({
      where: { entityType, entityId, organizationId },
      include: this.fullInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Get pending approvals for the current user */
  async getMyPending(userId: string, organizationId: string) {
    return this.prisma.approvalRequest.findMany({
      where: {
        organizationId,
        status: 'PENDING',
        votes: { some: { approverId: userId, decision: null } },
      },
      include: this.fullInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Get all approvals for the org (manager view) */
  async getAll(organizationId: string, status?: ApprovalStatus) {
    return this.prisma.approvalRequest.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      include: this.fullInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Cast a vote on an approval request */
  async vote(
    requestId: string,
    userId: string,
    organizationId: string,
    decision: ApprovalDecision,
    comment?: string,
  ) {
    const request = await this.prisma.approvalRequest.findFirst({
      where: { id: requestId, organizationId },
      include: { votes: true },
    });
    if (!request) throw new NotFoundException('Pedido de aprovação não encontrado');
    if (request.status !== 'PENDING') throw new BadRequestException('Este pedido já foi resolvido');

    const vote = request.votes.find(v => v.approverId === userId);
    if (!vote) throw new ForbiddenException('Não és aprovador deste pedido');
    if (vote.decision) throw new BadRequestException('Já votaste neste pedido');

    // Update the vote
    await this.prisma.approvalVote.update({
      where: { id: vote.id },
      data: { decision, comment, votedAt: new Date() },
    });

    // Recount to see if request is now resolved
    const updatedVotes = await this.prisma.approvalVote.findMany({ where: { approvalRequestId: requestId } });
    const approvedCount = updatedVotes.filter(v => v.decision === 'APPROVED').length;
    const rejectedCount = updatedVotes.filter(v => v.decision === 'REJECTED').length;
    const totalVoters = updatedVotes.length;

    let newStatus: ApprovalStatus | null = null;
    if (approvedCount >= request.threshold) newStatus = 'APPROVED';
    else if (rejectedCount > totalVoters - request.threshold) newStatus = 'REJECTED';

    if (newStatus) {
      await this.prisma.approvalRequest.update({
        where: { id: requestId },
        data: { status: newStatus, resolvedAt: new Date() },
      });
    }

    return this.prisma.approvalRequest.findUnique({
      where: { id: requestId },
      include: this.fullInclude(),
    });
  }

  /** Cancel an approval request (only requester or admin) */
  async cancel(requestId: string, userId: string, organizationId: string) {
    const request = await this.prisma.approvalRequest.findFirst({
      where: { id: requestId, organizationId },
    });
    if (!request) throw new NotFoundException('Pedido não encontrado');
    if (request.requestedById !== userId) throw new ForbiddenException('Apenas o criador pode cancelar');
    if (request.status !== 'PENDING') throw new BadRequestException('Pedido já resolvido');

    return this.prisma.approvalRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED', resolvedAt: new Date() },
      include: this.fullInclude(),
    });
  }

  /** Summary stats for dashboard */
  async getSummary(organizationId: string, userId: string) {
    const [pendingForMe, totalPending, totalResolved] = await Promise.all([
      this.prisma.approvalRequest.count({
        where: {
          organizationId, status: 'PENDING',
          votes: { some: { approverId: userId, decision: null } },
        },
      }),
      this.prisma.approvalRequest.count({ where: { organizationId, status: 'PENDING' } }),
      this.prisma.approvalRequest.count({ where: { organizationId, status: { in: ['APPROVED', 'REJECTED'] } } }),
    ]);
    return { pendingForMe, totalPending, totalResolved };
  }

  private fullInclude() {
    return {
      requestedBy: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
      votes: {
        include: {
          approver: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'asc' as const },
      },
    };
  }
}
