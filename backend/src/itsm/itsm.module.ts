import { Module } from '@nestjs/common';
import { ItsmController } from './itsm.controller';
import { ItsmService } from './itsm.service';

@Module({
  controllers: [ItsmController],
  providers:   [ItsmService],
  exports:     [ItsmService],
})
export class ItsmModule {}
