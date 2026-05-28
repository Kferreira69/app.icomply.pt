import { Module } from '@nestjs/common';
import { QualityService } from './quality.service';
import { QualityController } from './quality.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [QualityController],
  providers: [QualityService],
  exports: [QualityService],
})
export class QualityModule {}
