import { Controller, Get, Inject, Optional } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma/prisma.service';
import { MailService } from '../common/mail/mail.service';
import { Public } from '../common/decorators/public.decorator';
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
  @ApiOperation({ summary: 'Health check — database, Redis and SMTP status' })
  async check() {
    const [dbResult, redisResult, smtpResult] = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      this.redis
        ? this.redis.ping().then(r => r === 'PONG').catch(() => false)
        : Promise.resolve(false),
      this.mail.testConnection(),
    ]);

    const db    = dbResult.status    === 'fulfilled' && dbResult.value    === true;
    const cache = redisResult.status === 'fulfilled' && redisResult.value === true;
    const smtp  = smtpResult.status  === 'fulfilled' && smtpResult.value  === true;

    // Only DB is required for "ok" — Redis/SMTP degraded shown separately
    const allOk = db;

    return {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: db    ? 'up' : 'down',
        redis:    cache ? 'up' : 'down',
        smtp:     smtp  ? 'up' : (process.env.SMTP_HOST ? 'down' : 'not_configured'),
      },
    };
  }
}
