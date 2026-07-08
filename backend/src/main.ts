import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import * as path from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

// ── Sentry (initialise before anything else if DSN is set) ────
if (process.env.SENTRY_DSN) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/node');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.1,
      release: process.env.APP_VERSION || 'unknown',
    });
    console.log('[Sentry] Initialised successfully');
  } catch {
    console.warn('[Sentry] Could not initialise — @sentry/node may not be installed yet');
  }
}

async function bootstrap() {
  const isProdBuild = process.env.NODE_ENV === 'production';
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // In production: only errors/warnings; in dev: full verbose
    logger: isProdBuild ? ['error', 'warn'] : ['error', 'warn', 'log', 'debug', 'verbose'],
    // Structured JSON logs in production via built-in logger
    bufferLogs: false,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('APP_PORT', 3001);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isProd = nodeEnv === 'production';

  // ── Trust proxy — required behind Traefik/nginx ───────────────
  app.set('trust proxy', 1);

  // ── Preserve Express 4's nested/bracket query parsing ─────────
  // Express 5 (bundled by @nestjs/platform-express v11) defaults to the
  // 'simple' query parser; several controllers type @Query() as `any` and
  // may expect the old 'extended' (qs-based) nested-object parsing.
  app.set('query parser', 'extended');

  // ── Graceful shutdown ─────────────────────────────────────────
  app.enableShutdownHooks();

  // ── Cookie parser (required for HttpOnly cookie JWT) ──────────
  app.use(cookieParser());

  // ── Body size limit — prevent DoS via huge payloads ──────────
  app.use(require('express').json({ limit: '1mb' }));
  app.use(require('express').urlencoded({ extended: true, limit: '1mb' }));

  // ── Security headers (Helmet) ─────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false, // allow Swagger UI
      hidePoweredBy: true,              // remove X-Powered-By: Express
      hsts: isProd
        ? { maxAge: 63072000, includeSubDomains: true, preload: true } // 2 years
        : false,
    }),
  );

  // ── Global prefix ─────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── CORS ──────────────────────────────────────────────────────
  const corsOrigins = [
    'http://localhost:3000',
    'https://app.icomply.pt',
    'https://icomply.pt',
    'https://staging.icomply.pt',
    'https://dev.icomply.pt',
  ];
  const extraOrigins = configService.get<string>('CORS_ORIGINS', '');
  if (extraOrigins) {
    corsOrigins.push(...extraOrigins.split(',').map(o => o.trim()));
  }
  app.enableCors({
    origin: corsOrigins,
    credentials: true, // required for cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
  });

  // ── Global exception filter (no stack traces in prod) ─────────
  app.useGlobalFilters(new AllExceptionsFilter());

  // ── Global pipes ──────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      // Never expose validation details to the client in production
      disableErrorMessages: isProd,
    }),
  );

  // ── Global interceptors ───────────────────────────────────────
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new AuditLogInterceptor(),
  );

  // ── Swagger ───────────────────────────────────────────────────
  if (configService.get<string>('ENABLE_SWAGGER') !== 'false') {
    const config = new DocumentBuilder()
      .setTitle('iComply API')
      .setDescription('iComply Compliance Operating System — REST API v1')
      .setVersion('1.0.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT',
      )
      .addCookieAuth('access_token')
      .addTag('Auth', 'Authentication & authorization')
      .addTag('Organizations', 'Tenant management')
      .addTag('Users', 'User management')
      .addTag('Frameworks', 'Compliance frameworks')
      .addTag('Diagnostics', 'Compliance diagnostic engine')
      .addTag('Projects', 'Compliance projects')
      .addTag('Tasks', 'Task management')
      .addTag('Risks', 'Risk register')
      .addTag('Evidence', 'Evidence management')
      .addTag('Controls', 'Controls library')
      .addTag('Audits', 'Audit management')
      .addTag('CAPA', 'Corrective & preventive actions')
      .addTag('Reports', 'Reporting & exports')
      .addTag('Excel Import', 'Excel import engine')
      .addTag('Audit Logs', 'System audit trail')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // ── Static uploads ────────────────────────────────────────────
  const uploadDir = configService.get<string>(
    'LOCAL_UPLOAD_DIR',
    path.join(process.cwd(), 'uploads'),
  );
  fs.mkdirSync(uploadDir, { recursive: true });
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  app.use('/api/v1/uploads', require('express').static(uploadDir));

  await app.listen(port);

  console.log(`
╔══════════════════════════════════════════════════════╗
║         iComply Compliance Operating System          ║
║         API running on http://localhost:${port}        ║
║         Swagger: http://localhost:${port}/api/docs     ║
║         Environment: ${nodeEnv.padEnd(30)}║
╚══════════════════════════════════════════════════════╝
  `);
}

bootstrap();
