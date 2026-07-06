import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { PolicyStatus } from '../generated/prisma/client';

@Injectable()
export class PoliciesService {
  constructor(private prisma: PrismaService) {}

  // ── Create ────────────────────────────────────────────────────

  async create(dto: CreatePolicyDto, ownerId: string, organizationId: string) {
    const policy = await this.prisma.policy.create({
      data: {
        ...dto,
        ownerId,
        organizationId,
        version: '1.0',
        status: PolicyStatus.DRAFT,
      },
      include: this.defaultInclude(),
    });

    // Save first version snapshot
    await this.prisma.policyVersion.create({
      data: {
        policyId: policy.id,
        version: '1.0',
        content: dto.content,
        changedById: ownerId,
        changeNote: 'Versão inicial',
      },
    });

    return policy;
  }

  // ── Read ─────────────────────────────────────────────────────

  async findAll(organizationId: string, status?: PolicyStatus, category?: string) {
    return this.prisma.policy.findMany({
      where: {
        organizationId,
        ...(status && { status }),
        ...(category && { category: category as any }),
      },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        approver: { select: { id: true, firstName: true, lastName: true } },
        framework: { select: { id: true, name: true, code: true } },
        _count: { select: { acknowledgments: true, versions: true } },
      },
    });
  }

  async findOne(id: string, organizationId: string) {
    const policy = await this.prisma.policy.findFirst({
      where: { id, organizationId },
      include: {
        ...this.defaultInclude(),
        versions: { orderBy: { createdAt: 'desc' }, include: { changedBy: { select: { id: true, firstName: true, lastName: true } } } },
        acknowledgments: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });
    if (!policy) throw new NotFoundException('Policy not found');
    return policy;
  }

  // ── Update ────────────────────────────────────────────────────

  async update(id: string, organizationId: string, data: Partial<CreatePolicyDto> & { changeNote?: string }, userId: string) {
    const policy = await this.prisma.policy.findFirst({ where: { id, organizationId } });
    if (!policy) throw new NotFoundException('Policy not found');

    // If content changed, bump version and save snapshot
    let newVersion = policy.version;
    if (data.content && data.content !== policy.content) {
      const parts = policy.version.split('.');
      const minor = parseInt(parts[1] ?? '0') + 1;
      newVersion = `${parts[0]}.${minor}`;

      await this.prisma.policyVersion.create({
        data: {
          policyId: id,
          version: newVersion,
          content: data.content,
          changedById: userId,
          changeNote: data.changeNote || `Actualizado para v${newVersion}`,
        },
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { changeNote: _cn, ...policyData } = data;
    return this.prisma.policy.update({
      where: { id },
      data: { ...policyData, version: newVersion },
      include: this.defaultInclude(),
    });
  }

  // ── Workflow actions ──────────────────────────────────────────

  async submitForReview(id: string, organizationId: string) {
    return this.changeStatus(id, organizationId, PolicyStatus.IN_REVIEW);
  }

  async approve(id: string, organizationId: string, approverId: string) {
    const policy = await this.prisma.policy.findFirst({ where: { id, organizationId } });
    if (!policy) throw new NotFoundException('Policy not found');
    if (policy.status !== PolicyStatus.IN_REVIEW) {
      throw new ForbiddenException('Policy must be IN_REVIEW to approve');
    }
    if (policy.ownerId === approverId) {
      throw new ForbiddenException('O criador da política não pode aprovar a sua própria política (separação de funções)');
    }
    return this.prisma.policy.update({
      where: { id },
      data: { status: PolicyStatus.APPROVED, approverId, approvedAt: new Date() },
      include: this.defaultInclude(),
    });
  }

  async archive(id: string, organizationId: string) {
    return this.changeStatus(id, organizationId, PolicyStatus.ARCHIVED);
  }

  async revertToDraft(id: string, organizationId: string) {
    return this.changeStatus(id, organizationId, PolicyStatus.DRAFT);
  }

  private async changeStatus(id: string, organizationId: string, status: PolicyStatus) {
    const policy = await this.prisma.policy.findFirst({ where: { id, organizationId } });
    if (!policy) throw new NotFoundException('Policy not found');
    return this.prisma.policy.update({ where: { id }, data: { status }, include: this.defaultInclude() });
  }

  // ── Acknowledgment ────────────────────────────────────────────

  async acknowledge(policyId: string, organizationId: string, userId: string, ipAddress?: string) {
    const policy = await this.prisma.policy.findFirst({ where: { id: policyId, organizationId } });
    if (!policy) throw new NotFoundException('Policy not found');

    return this.prisma.policyAcknowledgment.upsert({
      where: { policyId_userId: { policyId, userId } },
      create: { policyId, userId, policyVersion: policy.version, ipAddress, acknowledgedAt: new Date() },
      update: { policyVersion: policy.version, ipAddress, acknowledgedAt: new Date() },
    });
  }

  async getAcknowledgmentStatus(policyId: string, organizationId: string) {
    const policy = await this.prisma.policy.findFirst({ where: { id: policyId, organizationId } });
    if (!policy) throw new NotFoundException('Policy not found');

    const [total, acknowledged] = await Promise.all([
      this.prisma.user.count({ where: { organizationId } }),
      this.prisma.policyAcknowledgment.count({ where: { policyId } }),
    ]);

    return { total, acknowledged, pending: total - acknowledged, rate: total > 0 ? Math.round((acknowledged / total) * 100) : 0 };
  }

  // ── Delete ────────────────────────────────────────────────────

  async remove(id: string, organizationId: string) {
    const policy = await this.prisma.policy.findFirst({ where: { id, organizationId } });
    if (!policy) throw new NotFoundException('Policy not found');
    return this.prisma.policy.delete({ where: { id } });
  }

  // ── Stats ─────────────────────────────────────────────────────

  async getStats(organizationId: string) {
    const [total, byStatus, expiringSoon] = await Promise.all([
      this.prisma.policy.count({ where: { organizationId } }),
      this.prisma.policy.groupBy({ by: ['status'], where: { organizationId }, _count: true }),
      this.prisma.policy.count({
        where: {
          organizationId,
          reviewDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
          status: PolicyStatus.APPROVED,
        },
      }),
    ]);
    return {
      total,
      byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s.status]: s._count }), {}),
      expiringSoon,
    };
  }

  private defaultInclude() {
    return {
      owner: { select: { id: true, firstName: true, lastName: true } },
      approver: { select: { id: true, firstName: true, lastName: true } },
      framework: { select: { id: true, name: true, code: true } },
      _count: { select: { acknowledgments: true, versions: true } },
    };
  }
}
