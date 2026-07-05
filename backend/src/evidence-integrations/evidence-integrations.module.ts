import { Module } from '@nestjs/common';
import { EvidenceIntegrationsController } from './evidence-integrations.controller';
import { EvidenceIntegrationsService } from './evidence-integrations.service';
import { GcpAuditProvider } from './providers/gcp-audit.provider';

@Module({
  controllers: [EvidenceIntegrationsController],
  providers: [EvidenceIntegrationsService, GcpAuditProvider],
  exports: [EvidenceIntegrationsService],
})
export class EvidenceIntegrationsModule {}
