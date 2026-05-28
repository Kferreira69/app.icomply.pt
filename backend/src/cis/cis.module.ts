import { Module } from '@nestjs/common';
import { CisService } from './cis.service';
import { CisController } from './cis.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CisController],
  providers: [CisService],
  exports: [CisService],
})
export class CisModule {}
