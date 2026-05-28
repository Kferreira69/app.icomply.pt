import { Module } from '@nestjs/common';
import { WorkforceService } from './workforce.service';
import { WorkforceController } from './workforce.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WorkforceController],
  providers: [WorkforceService],
  exports: [WorkforceService],
})
export class WorkforceModule {}
