import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import * as path from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('APP_PORT', 3001);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isProd = nodeEnv === 'production';

  // ── Cookie parser (required for HttpOnly cookie JWT) ──────────
  app.use(cookieParser());

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
      hsts: isProd
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
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
    }),
  );

  // ── Global interceptors ───────────────────────────────────────
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
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
