import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.user.create({
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
      select: this.safeSelect(),
    });
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
