import { Module } from '@nestjs/common';
import { FrameworksService } from './frameworks.service';
import { FrameworksController } from './frameworks.controller';
import { ControlsModule } from '../controls/controls.module';

@Module({
  imports: [ControlsModule],
  providers: [FrameworksService],
  controllers: [FrameworksController],
  exports: [FrameworksService],
})
export class FrameworksModule {}
