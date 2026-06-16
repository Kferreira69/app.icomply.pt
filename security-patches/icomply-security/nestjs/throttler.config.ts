// src/app.module.ts — ThrottlerModule + configuração por rota
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// No AppModule imports:
ThrottlerModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    throttlers: [
      {
        name: 'short',
        ttl: 1000,    // 1 segundo
        limit: 10,    // máx 10 requests/segundo por IP
      },
      {
        name: 'medium',
        ttl: 60000,   // 1 minuto
        limit: 100,   // máx 100 requests/minuto por IP
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hora
        limit: 1000,  // máx 1000 requests/hora por IP
      },
    ],
    // Usar Redis em produção para partilhar estado entre instâncias
    storage: config.get('NODE_ENV') === 'production'
      ? new ThrottlerStorageRedisService(config.get('REDIS_URL'))
      : undefined,
  }),
}),

// Guard global — aplica a todos os endpoints
{
  provide: APP_GUARD,
  useClass: ThrottlerGuard,
}

// ─────────────────────────────────────────────
// auth.controller.ts — rate limit apertado em endpoints de autenticação
// ─────────────────────────────────────────────

import { Throttle, SkipThrottle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {

  // Login: máx 5 tentativas por minuto por IP
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto.email, dto.password, res);
  }

  // Registo: máx 3 registos por hora por IP
  @Throttle({ short: { limit: 3, ttl: 3600000 } })
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // Forgot password: máx 3 por hora (previne email flooding)
  @Throttle({ short: { limit: 3, ttl: 3600000 } })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    // IMPORTANTE: sempre retornar a mesma mensagem independente de o email existir
    // Evita user enumeration attacks
    await this.authService.sendPasswordReset(dto.email).catch(() => {});
    return { message: 'Se o email existir, receberá um link de recuperação.' };
  }

  // Refresh: máx 10 por minuto
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.refresh(req, res);
  }

  // Endpoints que não precisam de rate limiting
  @SkipThrottle()
  @Get('health')
  health() { return { status: 'ok' }; }
}
