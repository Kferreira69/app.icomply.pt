import { Module } from '@nestjs/common';
import { Nis2Service } from './nis2.service';
import { Nis2Controller } from './nis2.controller';

@Module({
  controllers: [Nis2Controller],
  providers: [Nis2Service],
  exports: [Nis2Service],
})
export class Nis2Module {}
