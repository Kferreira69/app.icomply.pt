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
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private storage: StorageService,
  ) {}

  async create(dto: CreateUserDto, organizationId: string, creatorRole: UserRole) {
    // Role escalation protection
    const roleOrder: UserRole[] = ['VIEWER', 'CONSULTANT', 'COMPLIANCE_MANAGER', 'ADMIN', 'SUPER_ADMIN'];
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

  async update(id: string, organizationId: string, dto: UpdateUserDto) {
    await this.findOne(id, organizationId);
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: this.safeSelect(),
    });
  }

  async suspend(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.user.update({
      where: { id },
      data: { status: 'SUSPENDED' },
      select: this.safeSelect(),
    });
  }

  async reactivate(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
      select: this.safeSelect(),
    });
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

    return this.prisma.user.update({
      where: { id },
      data: { inviteToken, inviteExpiresAt, status: 'INVITED' },
      select: this.safeSelect(),
    });
  }

  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<{ avatarUrl: string }> {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) throw new BadRequestException('Formato inválido. Use JPEG, PNG ou WebP.');
    if (file.size > 2 * 1024 * 1024) throw new BadRequestException('Imagem demasiado grande (máx 2MB).');

    const { url } = await this.storage.uploadFile(file.buffer, file.originalname, file.mimetype, 'avatars');

    await this.prisma.user.update({ where: { id: userId }, data: { avatarUrl: url } });
    return { avatarUrl: url };
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
      createdAt: true,
      updatedAt: true,
    };
  }
}
