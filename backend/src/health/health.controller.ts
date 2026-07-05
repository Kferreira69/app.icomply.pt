import { Controller, Get, Post, Body, Inject, Optional } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma/prisma.service';
import { MailService } from '../common/mail/mail.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../common/redis/redis.module';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check — database, Redis and SMTP/SendGrid status' })
  async check() {
    const [dbResult, redisResult, mailResult] = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      this.redis
        ? this.redis.ping().then(r => r === 'PONG').catch(() => false)
        : Promise.resolve(false),
      this.mail.testConnection(),
    ]);

    const db    = dbResult.status    === 'fulfilled' && dbResult.value    === true;
    const cache = redisResult.status === 'fulfilled' && redisResult.value === true;
    const mailStatus = mailResult.status === 'fulfilled' ? mailResult.value : { ok: false, mode: 'error' };

    return {
      status: db ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: db    ? 'up' : 'down',
        redis:    cache ? 'up' : 'down',
        mail: {
          status: mailStatus.ok ? 'up' : (mailStatus.mode === 'stub' ? 'not_configured' : 'down'),
          mode: mailStatus.mode,
          ...(mailStatus.error ? { error: mailStatus.error } : {}),
        },
      },
    };
  }

  @Public()
  @Get('version')
  @ApiOperation({ summary: 'Application version info' })
  getVersion() {
    return {
      version: process.env.APP_VERSION || '1.0.0',
      name: 'iComply OS',
      buildDate: process.env.BUILD_DATE || new Date().toISOString().split('T')[0],
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Post('test-email')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Send a test email to the current admin user' })
  async sendTestEmail(
    @CurrentUser('email') email: string,
    @Body('to') to?: string,
  ) {
    const recipient = to || email;
    const result = await this.mail.sendTestEmail(recipient);
    return {
      ...result,
      recipient,
      message: result.ok
        ? `Email de teste enviado para ${recipient} via ${result.mode.toUpperCase()}`
        : `Falha ao enviar: ${result.error}`,
    };
  }
}
