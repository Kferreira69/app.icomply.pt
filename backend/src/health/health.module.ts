import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { MailModule } from '../common/mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [HealthController],
})
export class HealthModule {}
