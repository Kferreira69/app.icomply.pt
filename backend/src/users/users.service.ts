import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { MailService } from '../common/mail/mail.service';
import { StorageService } from '../common/storage/storage.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma, UserRole } from '../generated/prisma/client';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private storage: StorageService,
  ) {}

  private roleOrder: UserRole[] = [
    'VIEWER', 'EXTERNAL_AUDITOR', 'INTERNAL_AUDITOR', 'CONSULTANT', 'TECNICO_IT', 'HEAD_RH',
    'LEGAL', 'COMPLIANCE_MANAGER', 'CISO', 'ADMIN', 'SUPER_ADMIN',
  ];

  async create(dto: CreateUserDto, organizationId: string, creatorRole: UserRole) {
    // Role escalation protection
    const roleOrder = this.roleOrder;
    const creatorIdx = roleOrder.indexOf(creatorRole);
    const newRoleIdx = roleOrder.indexOf(dto.role || 'VIEWER');
    if (newRoleIdx > creatorIdx) {
      throw new ForbiddenException('Cannot create a user with higher role than yourself');
    }

    const exists = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (exists) throw new ConflictException('Email already in use');

    const inviteToken = uuid();
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7 days

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role || UserRole.VIEWER,
        organizationId,
        inviteToken,
        inviteExpiresAt,
        status: 'INVITED',
      },
      include: { organization: true },
    });

    await this.mail.sendInvite(
      user.email,
      inviteToken,
      dto.firstName || user.email,
      user.organization.name,
    );

    const { organization, ...safeUser } = user as any;
    return safeUser;
  }

  async findAll(organizationId: string, page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {
      organizationId,
      status: { not: 'DELETED' },
    };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: this.safeSelect(),
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
      select: this.safeSelect(),
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, organizationId: string, dto: UpdateUserDto, requesterId: string, requesterRole: UserRole) {
    await this.findOne(id, organizationId);

    if (dto.role && id === requesterId) {
      throw new ForbiddenException('Não pode alterar a sua própria role. Peça a outro administrador.');
    }
    if (dto.role) {
      const requesterIdx = this.roleOrder.indexOf(requesterRole);
      const newRoleIdx = this.roleOrder.indexOf(dto.role);
      if (newRoleIdx > requesterIdx) {
        throw new ForbiddenException('Cannot assign a role higher than your own');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: this.safeSelect(),
    });
  }

  async setOrgRole(id: string, organizationId: string, orgRoleId: string | null) {
    await this.findOne(id, organizationId);

    if (orgRoleId) {
      const role = await this.prisma.orgRole.findFirst({ where: { id: orgRoleId, organizationId } });
      if (!role) throw new NotFoundException('Role personalizado não encontrado');
    }

    return this.prisma.user.update({
      where: { id },
      data: { orgRoleId },
      select: this.safeSelect(),
    });
  }

  async suspend(id: string, organizationId: string, requesterId: string) {
    if (id === requesterId) throw new ForbiddenException('Não pode suspender a sua própria conta');
    await this.findOne(id, organizationId);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: 'SUSPENDED' },
      select: this.safeSelect(),
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId: requesterId,
        action: 'USER_SUSPENDED',
        entity: 'User',
        entityId: id,
        metadata: { targetUserId: id, targetEmail: updated.email },
      },
    });

    return updated;
  }

  async reactivate(id: string, organizationId: string, requesterId?: string) {
    await this.findOne(id, organizationId);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
      select: this.safeSelect(),
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId: requesterId,
        action: 'USER_REACTIVATED',
        entity: 'User',
        entityId: id,
        metadata: { targetUserId: id, targetEmail: updated.email },
      },
    });

    return updated;
  }

  /**
   * Permanently delete a user, but only if they have no meaningful activity
   * (no assigned/created tasks, no owned risks, no evidence uploads, no CAPA
   * items, no owned policies). This avoids breaking FK referential integrity
   * or losing audit trail for users who've done real work — suspend should
   * be used instead in that case.
   */
  async remove(id: string, organizationId: string, requesterId: string) {
    if (id === requesterId) throw new ForbiddenException('Não pode eliminar a sua própria conta');
    const user = await this.findOne(id, organizationId);

    const [
      assignedTasks,
      createdTasks,
      risks,
      evidences,
      capaItems,
      createdCapas,
      ownedPolicies,
      taskComments,
      auditParticipations,
    ] = await Promise.all([
      this.prisma.task.count({ where: { assigneeId: id } }),
      this.prisma.task.count({ where: { createdById: id } }),
      this.prisma.risk.count({ where: { ownerId: id } }),
      this.prisma.evidence.count({ where: { uploadedById: id } }),
      this.prisma.capa.count({ where: { assigneeId: id } }),
      this.prisma.capa.count({ where: { createdById: id } }),
      this.prisma.policy.count({ where: { ownerId: id } }),
      this.prisma.taskComment.count({ where: { userId: id } }),
      this.prisma.auditParticipant.count({ where: { userId: id } }),
    ]);

    const activity: Array<[string, number]> = [
      ['tarefas atribuídas', assignedTasks],
      ['tarefas criadas', createdTasks],
      ['riscos', risks],
      ['evidências carregadas', evidences],
      ['itens CAPA atribuídos', capaItems],
      ['itens CAPA criados', createdCapas],
      ['políticas', ownedPolicies],
      ['comentários em tarefas', taskComments],
      ['participações em auditorias', auditParticipations],
    ];

    const blocking = activity.find(([, count]) => count > 0);
    if (blocking) {
      const [label, count] = blocking;
      throw new ConflictException(
        `Utilizador tem ${count} ${label} — não pode ser eliminado. Considere suspender.`,
      );
    }

    // AuditLog rows where this user was the actor are historical trail, not
    // "activity" that should block deletion — detach them (userId is nullable)
    // instead of losing the log entries, then delete the user in the same transaction.
    try {
      await this.prisma.$transaction([
        this.prisma.auditLog.updateMany({ where: { userId: id }, data: { userId: null } }),
        this.prisma.user.delete({ where: { id } }),
      ]);
    } catch (e) {
      // Any other FK reference we didn't explicitly count (e.g. policy
      // acknowledgments, whistleblowing records, HR training) also counts
      // as real activity — surface it as a conflict instead of a raw 500.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new ConflictException(
          'Utilizador tem registos associados noutras áreas da plataforma — não pode ser eliminado. Considere suspender.',
        );
      }
      throw e;
    }

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId: requesterId,
        action: 'USER_DELETED',
        entity: 'User',
        entityId: id,
        metadata: { targetUserId: id, targetEmail: user.email },
      },
    });

    return { success: true };
  }

  async adminSetPassword(id: string, organizationId: string, newPassword: string) {
    await this.findOne(id, organizationId);
    if (newPassword.length < 8) {
      throw new ForbiddenException('Password must be at least 8 characters');
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash: hashed },
      select: this.safeSelect(),
    });
  }

  async selfChangePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.passwordHash) {
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) throw new ForbiddenException('Current password is incorrect');
    }
    if (newPassword.length < 8) {
      throw new ForbiddenException('Password must be at least 8 characters');
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id }, data: { passwordHash: hashed } });
    return { success: true };
  }

  async resendInvite(id: string, organizationId: string) {
    const user = await this.findOne(id, organizationId);
    const inviteToken = uuid();
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { inviteToken, inviteExpiresAt, status: 'INVITED' },
      include: { organization: true },
    });

    await this.mail.sendInvite(
      updated.email,
      inviteToken,
      updated.firstName || updated.email,
      updated.organization.name,
    );

    const { organization, passwordHash, ...safe } = updated as any;
    return safe;
  }

  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<{ avatarUrl: string }> {
    if (!file) throw new BadRequestException('Nenhum ficheiro recebido.');
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) throw new BadRequestException('Formato inválido. Use JPEG, PNG ou WebP.');
    if (file.size > 2 * 1024 * 1024) throw new BadRequestException('Imagem demasiado grande (máx 2MB).');

    // Store as base64 data URL — avoids S3/local serving complexity and never expires
    const avatarUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    await this.prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
    return { avatarUrl };
  }

  private safeSelect() {
    return {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      avatarUrl: true,
      phone: true,
      lastLoginAt: true,
      organizationId: true,
      orgRoleId: true,
      orgRole: { select: { id: true, name: true } },
      createdAt: true,
      updatedAt: true,
    };
  }
}
