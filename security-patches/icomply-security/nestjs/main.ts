// src/main.ts — NestJS bootstrap hardened
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Nunca logar o body dos requests (pode conter passwords/PII)
    logger: process.env.NODE_ENV === 'production'
      ? ['error', 'warn']
      : ['log', 'debug', 'error', 'warn'],
  });

  const isProd = process.env.NODE_ENV === 'production';

  // ─────────────────────────────────────────────
  // 1. HELMET — headers de segurança HTTP
  // ─────────────────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 63072000,       // 2 anos
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-site' },
    permittedCrossDomainPolicies: false,
    // Remove headers que expõem o stack
    hidePoweredBy: true,
  }));

  // ─────────────────────────────────────────────
  // 2. CORS — restrito por ambiente
  // ─────────────────────────────────────────────
  const allowedOrigins: Record<string, string[]> = {
    production: [
      'https://app.icomply.pt',
      'https://icomply.pt',
    ],
    staging: [
      'https://staging.icomply.pt',
    ],
    development: [
      'http://localhost:3000',
      'http://localhost:3001',
    ],
  };

  app.enableCors({
    origin: (origin, callback) => {
      const env = process.env.NODE_ENV || 'development';
      const allowed = allowedOrigins[env] || allowedOrigins.development;

      // Permitir requests sem origin (ex: Postman em dev, mas não em prod)
      if (!origin && !isProd) return callback(null, true);
      if (!origin && isProd) return callback(new Error('Origin não permitida'), false);

      if (allowed.includes(origin!)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin não permitida: ${origin}`), false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
    credentials: true,          // necessário para cookies
    maxAge: 86400,              // preflight cache 24h
  });

  // ─────────────────────────────────────────────
  // 3. COOKIE PARSER — para JWT em HttpOnly cookies
  // ─────────────────────────────────────────────
  app.use(cookieParser(process.env.COOKIE_SECRET));

  // ─────────────────────────────────────────────
  // 4. BODY SIZE LIMIT — previne DoS por payloads gigantes
  // ─────────────────────────────────────────────
  app.use(require('express').json({ limit: '1mb' }));
  app.use(require('express').urlencoded({ extended: true, limit: '1mb' }));

  // ─────────────────────────────────────────────
  // 5. VALIDAÇÃO GLOBAL — rejeita qualquer campo não declarado no DTO
  // ─────────────────────────────────────────────
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,            // remove campos não declarados no DTO
    forbidNonWhitelisted: true, // erro se enviarem campos extras
    transform: true,            // transforma tipos automaticamente
    transformOptions: {
      enableImplicitConversion: true,
    },
    disableErrorMessages: isProd, // não expõe detalhes de validação em produção
  }));

  // ─────────────────────────────────────────────
  // 6. EXCEPTION FILTER — sem stack traces em produção
  // ─────────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter(isProd));

  // ─────────────────────────────────────────────
  // 7. AUDIT INTERCEPTOR — log de todas as operações
  // ─────────────────────────────────────────────
  app.useGlobalInterceptors(new AuditInterceptor());

  // ─────────────────────────────────────────────
  // 8. PREFIXO E VERSIONAMENTO
  // ─────────────────────────────────────────────
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // ─────────────────────────────────────────────
  // 9. TRUST PROXY — necessário atrás do Traefik
  // ─────────────────────────────────────────────
  app.set('trust proxy', 1);

  // ─────────────────────────────────────────────
  // 10. SHUTDOWN GRACIOSO
  // ─────────────────────────────────────────────
  app.enableShutdownHooks();

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');

  console.log(`🔒 API segura a correr na porta ${port} [${process.env.NODE_ENV}]`);
}

bootstrap();
