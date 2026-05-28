import { Module } from '@nestjs/common';
import { AmlController } from './aml.controller';
import { AmlService } from './aml.service';

@Module({
  controllers: [AmlController],
  providers:   [AmlService],
  exports:     [AmlService],
})
export class AmlModule {}
