import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { RedisModule } from './common/redis/redis.module';
import { ScheduleModule } from '@nestjs/schedule';
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
import { NotificationsModule } from './notifications/notifications.module';
import { PoliciesModule } from './policies/policies.module';
import { GdprModule } from './gdpr/gdpr.module';
import { Nis2Module } from './nis2/nis2.module';
import { VendorsModule } from './vendors/vendors.module';
import { SoaModule } from './soa/soa.module';
import { DoraModule } from './dora/dora.module';
import { TranslationsModule } from './translations/translations.module';
import { WhistleblowModule } from './whistleblow/whistleblow.module';
import { TrustCenterModule } from './trust-center/trust-center.module';
import { AiAssistantModule } from './ai-assistant/ai-assistant.module';
import { PermissionsModule } from './permissions/permissions.module';
import { LicensingModule } from './licensing/licensing.module';
import { HrComplianceModule } from './hr-compliance/hr-compliance.module';
import { AiGovernanceModule } from './ai-governance/ai-governance.module';
import { UnifiedControlsModule } from './unified-controls/unified-controls.module';
import { EsgModule } from './esg/esg.module';
import { BusinessContinuityModule } from './business-continuity/business-continuity.module';
import { ItsmModule } from './itsm/itsm.module';
import { AmlModule } from './aml/aml.module';
import { Iso27701Module } from './iso27701/iso27701.module';
import { Soc2Module } from './soc2/soc2.module';
import { CisModule } from './cis/cis.module';
import { TisaxModule } from './tisax/tisax.module';
import { AntiBriberyModule } from './anti-bribery/anti-bribery.module';
import { WorkforceModule } from './workforce/workforce.module';
import { QualityModule } from './quality/quality.module';
import { RegulatoryChangeModule } from './regulatory-change/regulatory-change.module';
import { OrgProfileModule } from './org-profile/org-profile.module';
import { VendorQuestionnaireModule } from './vendor-questionnaire/vendor-questionnaire.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { MetricsModule } from './metrics/metrics.module';
import { SsoModule } from './sso/sso.module';
import { DoraRegisterModule } from './dora-register/dora-register.module';
import { Nis2IncidentsModule } from './nis2-incidents/nis2-incidents.module';
import { AuditorPortalModule } from './auditor-portal/auditor-portal.module';
import { AuditTemplatesModule } from './audit-templates/audit-templates.module';
import { ManagementBodyModule } from './management-body/management-body.module';
import { BoardReportsModule } from './board-reports/board-reports.module';
import { RegulatoryFeedModule } from './regulatory-feed/regulatory-feed.module';
import { ClientHubModule } from './client-hub/client-hub.module';
import { RaciModule } from './raci/raci.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { IntakeModule } from './intake/intake.module';
import { ActionPlansModule } from './action-plans/action-plans.module';
import { ProgramTemplatesModule } from './program-templates/program-templates.module';
import { AutomationModule } from './automation/automation.module';
import { TimeTrackingModule } from './time-tracking/time-tracking.module';
import { EvidenceIntegrationsModule } from './evidence-integrations/evidence-integrations.module';
import { IGuardModule } from './iguard/iguard.module';
import { IntegrationHubModule } from './integration-hub/integration-hub.module';
import { CommonServicesModule } from './common/services/common-services.module';

@Module({
  imports: [
    // ── Config ─────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // ── Rate limiting (global defaults) ────────────────────
    // Auth endpoints override via @Throttle() in auth.controller.ts
    ThrottlerModule.forRoot([
      { name: 'short',  ttl: 1000,    limit: 10  },  // 10 req/s  per IP
      { name: 'medium', ttl: 60000,   limit: 100 },  // 100 req/min per IP
      { name: 'long',   ttl: 3600000, limit: 1000 }, // 1000 req/h per IP
    ]),

    // ── Scheduler (cron jobs) ────────────────────────────────
    ScheduleModule.forRoot(),

    // ── Infrastructure ──────────────────────────────────────
    RedisModule,
    PrismaModule,
    CommonServicesModule,
    StorageModule,
    MailModule,
    AuditLogsModule,
    HealthModule,
    NotificationsModule,

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
    PoliciesModule,
    GdprModule,
    Nis2Module,
    VendorsModule,
    SoaModule,
    DoraModule,
    TranslationsModule,
    WhistleblowModule,
    TrustCenterModule,
    AiAssistantModule,
    PermissionsModule,
    LicensingModule,
    HrComplianceModule,
    AiGovernanceModule,
    UnifiedControlsModule,
    EsgModule,
    BusinessContinuityModule,
    ItsmModule,
    AmlModule,
    Iso27701Module,
    Soc2Module,
    CisModule,
    TisaxModule,
    AntiBriberyModule,
    WorkforceModule,
    QualityModule,
    RegulatoryChangeModule,
    OrgProfileModule,
    VendorQuestionnaireModule,
    WebhooksModule,
    MetricsModule,
    SsoModule,
    DoraRegisterModule,
    Nis2IncidentsModule,
    AuditorPortalModule,
    AuditTemplatesModule,
    ManagementBodyModule,
    BoardReportsModule,
    RegulatoryFeedModule,
    ClientHubModule,
    RaciModule,
    ApprovalsModule,
    IntakeModule,
    ActionPlansModule,
    ProgramTemplatesModule,
    AutomationModule,
    TimeTrackingModule,
    EvidenceIntegrationsModule,
    IGuardModule,
    IntegrationHubModule,
  ],
  providers: [
    // ── ThrottlerGuard global — enforces @Throttle() on all routes ──
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // ── Global audit interceptor — persists CRUD ops to AuditLog table ──
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
