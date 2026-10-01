import { Module } from '@nestjs/common';
import { MailModule } from '../common/mail/mail.module';
import { LicensingModule } from '../licensing/licensing.module';
import { PublicCatalogController, LeadsAdminController } from './public-catalog.controller';
import { PublicCatalogService } from './public-catalog.service';
import { LeadsService } from './leads.service';

@Module({
  imports: [MailModule, LicensingModule],
  controllers: [PublicCatalogController, LeadsAdminController],
  providers: [PublicCatalogService, LeadsService],
})
export class PublicCatalogModule {}
