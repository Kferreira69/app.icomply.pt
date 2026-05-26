import { Module } from '@nestjs/common';
import { SoaService } from './soa.service';
import { SoaController } from './soa.controller';

@Module({
  controllers: [SoaController],
  providers: [SoaService],
  exports: [SoaService],
})
export class SoaModule {}
