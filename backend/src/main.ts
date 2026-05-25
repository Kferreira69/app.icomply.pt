import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as path from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('APP_PORT', 3001);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isProd = nodeEnv === 'production';

  // ── Security headers (Helmet) ─────────────────────────────
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
      crossOriginEmbedderPolicy: false, // allow Swagger UI to load
      hsts: isProd
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
    }),
  );

  // ── Global prefix ────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── CORS ─────────────────────────────────────────────────
  const corsOrigins = [
    'http://localhost:3000',
    // Production
    'https://app.icomply.pt',
    'https://icomply.pt',
    // Staging
    'https://staging.icomply.pt',
    // Dev on VPS
    'https://dev.icomply.pt',
  ];
  // Allow additional origins from env (comma-separated)
  const extraOrigins = configService.get<string>('CORS_ORIGINS', '');
  if (extraOrigins) {
    corsOrigins.push(...extraOrigins.split(',').map(o => o.trim()));
  }
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
  });

  // ── Global pipes ─────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global interceptors ──────────────────────────────────
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  // ── Swagger ───────────────────────────────────────────────
  if (configService.get<string>('ENABLE_SWAGGER') !== 'false') {
    const config = new DocumentBuilder()
      .setTitle('iComply API')
      .setDescription('iComply Compliance Operating System — REST API v1')
      .setVersion('1.0.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT',
      )
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

  // ── Local file uploads serving (fallback when S3 not configured) ─
  const uploadDir = configService.get<string>(
    'LOCAL_UPLOAD_DIR',
    path.join(process.cwd(), 'uploads'),
  );
  fs.mkdirSync(uploadDir, { recursive: true });
  // Use express static via the underlying http adapter (express is bundled with @nestjs/platform-express)
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
