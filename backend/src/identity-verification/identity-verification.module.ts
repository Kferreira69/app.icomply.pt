import { Module } from '@nestjs/common';
import { IdentityVerificationController } from './identity-verification.controller';
import { IdentityVerificationService } from './identity-verification.service';
import { KycProviderFactory } from './providers/kyc-provider.factory';
import { LicensingModule } from '../licensing/licensing.module';

@Module({
  imports: [LicensingModule],
  controllers: [IdentityVerificationController],
  providers: [IdentityVerificationService, KycProviderFactory],
  exports: [IdentityVerificationService],
})
export class IdentityVerificationModule {}
