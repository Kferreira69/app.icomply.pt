import { Module } from '@nestjs/common';
import { UnifiedControlsController } from './unified-controls.controller';
import { UnifiedControlsService } from './unified-controls.service';

@Module({
  controllers: [UnifiedControlsController],
  providers:   [UnifiedControlsService],
  exports:     [UnifiedControlsService],
})
export class UnifiedControlsModule {}
