import { Module } from '@nestjs/common';
import { AntiBriberyService } from './anti-bribery.service';
import { AntiBriberyController } from './anti-bribery.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AntiBriberyController],
  providers: [AntiBriberyService],
  exports: [AntiBriberyService],
})
export class AntiBriberyModule {}
