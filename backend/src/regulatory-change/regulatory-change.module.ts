import { Module } from '@nestjs/common';
import { RegulatoryChangeService } from './regulatory-change.service';
import { RegulatoryChangeController } from './regulatory-change.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RegulatoryChangeController],
  providers: [RegulatoryChangeService],
  exports: [RegulatoryChangeService],
})
export class RegulatoryChangeModule {}
