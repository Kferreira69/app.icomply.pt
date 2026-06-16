// src/auth/auth.service.ts — JWT em cookies HttpOnly + Argon2 + Refresh Tokens
import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import * as argon2 from 'argon2';
import { TokenBlacklistService } from './token-blacklist.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly users: UsersService,
    private readonly blacklist: TokenBlacklistService,
  ) {}

  // ─────────────────────────────────────────────
  // HASH DE PASSWORDS — Argon2id (mais seguro que bcrypt)
  // ─────────────────────────────────────────────
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,    // 64MB
      timeCost: 3,
      parallelism: 4,
    });
  }

  async verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false; // hash inválido — não expõe erro
    }
  }

  // ─────────────────────────────────────────────
  // LOGIN — emite access + refresh token em cookies HttpOnly
  // ─────────────────────────────────────────────
  async login(
    email: string,
    password: string,
    response: Response,
  ): Promise<{ message: string }> {
    const user = await this.users.findByEmail(email);

    // Timing attack prevention: verificar mesmo se user não existe
    const dummyHash = '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy';
    const valid = user
      ? await this.verifyPassword(user.passwordHash, password)
      : await argon2.verify(dummyHash, password).catch(() => false);

    if (!user || !valid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Conta desativada');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };

    // Access token: curta duração
    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    // Refresh token: longa duração, armazenado na DB (permite revogação)
    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );

    // Guardar hash do refresh token na DB (nunca o token em claro)
    const refreshHash = await this.hashPassword(refreshToken);
    await this.users.saveRefreshToken(user.id, refreshHash);

    // CRÍTICO: tokens em cookies HttpOnly (não acessíveis via JavaScript)
    const isProd = this.config.get('NODE_ENV') === 'production';

    response.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,           // só HTTPS em produção
      sameSite: 'strict',       // previne CSRF
      maxAge: 15 * 60 * 1000,  // 15 minutos
      path: '/',
    });

    response.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
      path: '/api/v1/auth/refresh',     // só enviado para este endpoint
    });

    return { message: 'Login efetuado com sucesso' };
  }

  // ─────────────────────────────────────────────
  // REFRESH — rotação de tokens
  // ─────────────────────────────────────────────
  async refresh(request: Request, response: Response) {
    const token = request.cookies?.refresh_token;
    if (!token) throw new UnauthorizedException('Sem refresh token');

    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    // Verificar se está na blacklist
    if (await this.blacklist.isBlacklisted(token)) {
      throw new UnauthorizedException('Token revogado');
    }

    const user = await this.users.findById(payload.sub);
    if (!user?.refreshTokenHash) {
      throw new UnauthorizedException('Sessão inválida');
    }

    // Verificar contra o hash guardado na DB
    const valid = await this.verifyPassword(user.refreshTokenHash, token);
    if (!valid) throw new UnauthorizedException('Refresh token comprometido');

    // Invalidar o refresh token antigo (rotação)
    await this.blacklist.add(token, payload.exp);

    // Emitir novos tokens
    return this.login(user.email, '__REFRESH_BYPASS__', response);
  }

  // ─────────────────────────────────────────────
  // LOGOUT — limpar cookies e invalidar tokens
  // ─────────────────────────────────────────────
  async logout(request: Request, response: Response) {
    const refreshToken = request.cookies?.refresh_token;

    if (refreshToken) {
      try {
        const payload = this.jwtService.verify(refreshToken, {
          secret: this.config.get('JWT_REFRESH_SECRET'),
        });
        await this.blacklist.add(refreshToken, payload.exp);
        await this.users.clearRefreshToken(payload.sub);
      } catch {
        // Token já expirado — ignorar
      }
    }

    // Limpar cookies
    response.clearCookie('access_token', { path: '/' });
    response.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });

    return { message: 'Logout efetuado com sucesso' };
  }
}
