import { Module } from '@nestjs/common';
import { Soc2Controller } from './soc2.controller';
import { Soc2Service } from './soc2.service';

@Module({
  controllers: [Soc2Controller],
  providers:   [Soc2Service],
  exports:     [Soc2Service],
})
export class Soc2Module {}
