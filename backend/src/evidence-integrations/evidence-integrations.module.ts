import { Module } from '@nestjs/common';
import { EvidenceIntegrationsController } from './evidence-integrations.controller';
import { EvidenceIntegrationsService } from './evidence-integrations.service';

@Module({
  controllers: [EvidenceIntegrationsController],
  providers: [EvidenceIntegrationsService],
  exports: [EvidenceIntegrationsService],
})
export class EvidenceIntegrationsModule {}
