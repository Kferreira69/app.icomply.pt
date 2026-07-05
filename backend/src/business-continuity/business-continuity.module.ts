import { Module } from '@nestjs/common';
import { BusinessContinuityController } from './business-continuity.controller';
import { BusinessContinuityService } from './business-continuity.service';

@Module({
  controllers: [BusinessContinuityController],
  providers:   [BusinessContinuityService],
  exports:     [BusinessContinuityService],
})
export class BusinessContinuityModule {}
