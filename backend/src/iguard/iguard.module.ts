import { Module } from '@nestjs/common';
import { IGuardController } from './iguard.controller';
import { IGuardService } from './iguard.service';
import { DeviceTokenGuard } from './guards/device-token.guard';

@Module({
  controllers: [IGuardController],
  providers: [IGuardService, DeviceTokenGuard],
  exports: [IGuardService],
})
export class IGuardModule {}
