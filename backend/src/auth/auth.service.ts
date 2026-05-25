import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { MailService } from '../common/mail/mail.service';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mail: MailService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { organization: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'SUSPENDED' || user.status === 'DELETED') {
      throw new UnauthorizedException('Account is not active');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), status: 'ACTIVE' },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        metadata: { email: user.email },
      },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    const { passwordHash, inviteToken, passwordResetToken, ...safeUser } = user;

    return {
      accessToken,
      refreshToken,
      user: safeUser,
    };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwt.verify(token, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      };

      return {
        accessToken: this.jwt.sign(newPayload),
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    // Always return success (security: don't reveal if email exists)
    if (!user) return { message: 'If the email exists, a reset link was sent' };

    const token = uuid();
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpiresAt: expiresAt },
    });

    await this.mail.sendPasswordReset(user.email, token);

    return { message: 'If the email exists, a reset link was sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: dto.token,
        passwordResetExpiresAt: { gt: new Date() },
      },
    });

    if (!user) throw new BadRequestException('Invalid or expired reset token');

    const hash = await bcrypt.hash(dto.password, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        status: 'ACTIVE',
      },
    });

    return { message: 'Password reset successful' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const hash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash },
    });

    return { message: 'Password changed successfully' };
  }

  async acceptInvite(token: string, password: string, firstName: string, lastName: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        inviteToken: token,
        inviteExpiresAt: { gt: new Date() },
      },
    });

    if (!user) throw new BadRequestException('Invalid or expired invite token');

    const hash = await bcrypt.hash(password, 12);

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hash,
        firstName,
        lastName,
        inviteToken: null,
        inviteExpiresAt: null,
        status: 'ACTIVE',
      },
    });

    return this.login({ email: updated.email, password });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash, inviteToken, passwordResetToken, ...safe } = user;
    return safe;
  }
}
