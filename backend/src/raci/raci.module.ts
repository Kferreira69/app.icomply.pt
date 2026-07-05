import { Module } from '@nestjs/common';
import { RaciService } from './raci.service';
import { RaciController } from './raci.controller';

@Module({
  controllers: [RaciController],
  providers: [RaciService],
  exports: [RaciService],
})
export class RaciModule {}
