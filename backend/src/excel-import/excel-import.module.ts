import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ExcelImportService } from './excel-import.service';
import { ExcelImportController } from './excel-import.controller';

@Module({
  imports: [
    MulterModule.register({ storage: memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }),
  ],
  providers: [ExcelImportService],
  controllers: [ExcelImportController],
  exports: [ExcelImportService],
})
export class ExcelImportModule {}
