import { Module } from '@nestjs/common';
import { Iso27701Controller } from './iso27701.controller';
import { Iso27701Service } from './iso27701.service';

@Module({
  controllers: [Iso27701Controller],
  providers:   [Iso27701Service],
  exports:     [Iso27701Service],
})
export class Iso27701Module {}
