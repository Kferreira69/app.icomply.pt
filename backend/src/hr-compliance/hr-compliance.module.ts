import { Module } from '@nestjs/common';
import { HrComplianceController } from './hr-compliance.controller';
import { HrComplianceService } from './hr-compliance.service';

@Module({
  controllers: [HrComplianceController],
  providers:   [HrComplianceService],
  exports:     [HrComplianceService],
})
export class HrComplianceModule {}
