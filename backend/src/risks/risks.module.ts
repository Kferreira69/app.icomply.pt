import { Module } from '@nestjs/common';
import { RisksService } from './risks.service';
import { RisksController } from './risks.controller';

@Module({
  providers: [RisksService],
  controllers: [RisksController],
  exports: [RisksService],
})
export class RisksModule {}
