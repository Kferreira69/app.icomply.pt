import { Module } from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { PoliciesController } from './policies.controller';
import { PolicyAttachmentsService } from './policy-attachments.service';

@Module({
  controllers: [PoliciesController],
  providers: [PoliciesService, PolicyAttachmentsService],
  exports: [PoliciesService],
})
export class PoliciesModule {}
