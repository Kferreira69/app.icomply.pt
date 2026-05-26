import { Module } from '@nestjs/common';
import { DoraController } from './dora.controller';
import { DoraService } from './dora.service';

@Module({
  controllers: [DoraController],
  providers: [DoraService],
  exports: [DoraService],
})
export class DoraModule {}
