import { Module } from '@nestjs/common';
import { CapaService } from './capa.service';
import { CapaController } from './capa.controller';

@Module({
  providers: [CapaService],
  controllers: [CapaController],
  exports: [CapaService],
})
export class CapaModule {}
