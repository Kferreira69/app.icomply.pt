import { Module } from '@nestjs/common';
import { AmlController } from './aml.controller';
import { AmlService } from './aml.service';
import { IdentityVerificationModule } from '../identity-verification/identity-verification.module';

@Module({
  imports:     [IdentityVerificationModule],
  controllers: [AmlController],
  providers:   [AmlService],
  exports:     [AmlService],
})
export class AmlModule {}
