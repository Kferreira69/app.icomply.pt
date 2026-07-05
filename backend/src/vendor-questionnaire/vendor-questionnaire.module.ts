import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { MailModule } from '../common/mail/mail.module';
import { VendorQuestionnaireController } from './vendor-questionnaire.controller';
import { VendorQuestionnaireService } from './vendor-questionnaire.service';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [VendorQuestionnaireController],
  providers: [VendorQuestionnaireService],
  exports: [VendorQuestionnaireService],
})
export class VendorQuestionnaireModule {}
