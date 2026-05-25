import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { UsersModule } from './users/users.module';
import { FrameworksModule } from './frameworks/frameworks.module';
import { DiagnosticsModule } from './diagnostics/diagnostics.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { RisksModule } from './risks/risks.module';
import { EvidenceModule } from './evidence/evidence.module';
import { ControlsModule } from './controls/controls.module';
import { AuditsModule } from './audits/audits.module';
import { CapaModule } from './capa/capa.module';
import { ReportsModule } from './reports/reports.module';
import { ExcelImportModule } from './excel-import/excel-import.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { StorageModule } from './common/storage/storage.module';
import { MailModule } from './common/mail/mail.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // ── Config ─────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // ── Rate limiting ───────────────────────────────────────
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 20 },
      { name: 'medium', ttl: 10000, limit: 100 },
      { name: 'long', ttl: 60000, limit: 500 },
    ]),

    // ── Infrastructure ──────────────────────────────────────
    PrismaModule,
    StorageModule,
    MailModule,
    AuditLogsModule,
    HealthModule,

    // ── Domain modules ──────────────────────────────────────
    AuthModule,
    OrganizationsModule,
    UsersModule,
    FrameworksModule,
    DiagnosticsModule,
    ProjectsModule,
    TasksModule,
    RisksModule,
    EvidenceModule,
    ControlsModule,
    AuditsModule,
    CapaModule,
    ReportsModule,
    ExcelImportModule,
  ],
})
export class AppModule {}
