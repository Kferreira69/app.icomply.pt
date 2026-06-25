import { Module } from '@nestjs/common';
import { LicensingController } from './licensing.controller';
import { LicensingService } from './licensing.service';
import { MailModule } from '../common/mail/mail.module';

@Module({
  imports:     [MailModule],
  controllers: [LicensingController],
  providers:   [LicensingService],
  exports:     [LicensingService],
})
export class LicensingModule {}
