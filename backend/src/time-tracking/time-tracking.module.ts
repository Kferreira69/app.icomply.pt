import { Module } from '@nestjs/common';
import { TimeTrackingService } from './time-tracking.service';
import { TimeTrackingController } from './time-tracking.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [TimeTrackingService],
  controllers: [TimeTrackingController],
  exports: [TimeTrackingService],
})
export class TimeTrackingModule {}
