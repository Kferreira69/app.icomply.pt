// src/auth/token-blacklist.service.ts
// Revogação de tokens JWT via Redis
// Necessário para logout seguro e rotação de refresh tokens

import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type { Redis } from 'ioredis';
import * as crypto from 'crypto';

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private readonly PREFIX = 'blacklist:';

  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Adiciona um token à blacklist até à sua expiração
   * Guardar apenas o hash (não o token em claro)
   */
  async add(token: string, expireAt: number): Promise<void> {
    const hash = this.hashToken(token);
    const now = Math.floor(Date.now() / 1000);
    const ttl = expireAt - now;

    if (ttl <= 0) {
      // Token já expirou — não precisa de blacklist
      return;
    }

    try {
      await this.redis.setex(`${this.PREFIX}${hash}`, ttl, '1');
      this.logger.debug(`Token adicionado à blacklist (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error('Erro ao adicionar token à blacklist', error);
      // Em caso de falha do Redis, falhar de forma segura
      // O token ficará inválido quando o Redis recuperar
      throw error;
    }
  }

  /**
   * Verifica se um token está na blacklist
   */
  async isBlacklisted(token: string): Promise<boolean> {
    const hash = this.hashToken(token);
    try {
      const result = await this.redis.exists(`${this.PREFIX}${hash}`);
      return result === 1;
    } catch (error) {
      this.logger.error('Erro ao verificar blacklist', error);
      // Em caso de falha do Redis, assumir que o token é inválido (fail-secure)
      return true;
    }
  }

  /**
   * Hash do token para não guardar tokens em claro no Redis
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

// ─────────────────────────────────────────────
// src/auth/jwt.strategy.ts — Verificar blacklist no guard
// ─────────────────────────────────────────────

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly blacklist: TokenBlacklistService,
    private readonly users: UsersService,
  ) {
    super({
      // Ler JWT do cookie HttpOnly (não do header Authorization)
      jwtFromRequest: (req: Request) => {
        return req.cookies?.access_token || null;
      },
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET'),
      passReqToCallback: true, // necessário para aceder ao token original
    });
  }

  async validate(req: Request, payload: any) {
    const token = req.cookies?.access_token;

    // Verificar se o token foi revogado (logout)
    if (token && await this.blacklist.isBlacklisted(token)) {
      throw new UnauthorizedException('Sessão terminada');
    }

    const user = await this.users.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Utilizador inativo');
    }

    return { id: user.id, email: user.email, role: user.role };
  }
}
