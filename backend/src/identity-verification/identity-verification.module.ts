import { Module } from '@nestjs/common';
import { IdentityVerificationController } from './identity-verification.controller';
import { IdentityVerificationService } from './identity-verification.service';
import { KycProviderRegistry } from './providers/kyc-provider.registry';
import { LicensingModule } from '../licensing/licensing.module';

@Module({
  imports: [LicensingModule],
  controllers: [IdentityVerificationController],
  providers: [IdentityVerificationService, KycProviderRegistry],
  exports: [IdentityVerificationService],
})
export class IdentityVerificationModule {}
