import { Module } from '@nestjs/common';
import { QualityDocumentsController } from './quality-documents.controller';
import { QualityDocumentsService } from './quality-documents.service';

@Module({
  controllers: [QualityDocumentsController],
  providers: [QualityDocumentsService],
  exports: [QualityDocumentsService],
})
export class QualityDocumentsModule {}
