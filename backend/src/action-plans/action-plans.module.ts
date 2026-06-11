import { Module } from '@nestjs/common';
import { ActionPlansService } from './action-plans.service';
import { ActionPlansController } from './action-plans.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ActionPlansController],
  providers: [ActionPlansService],
  exports: [ActionPlansService],
})
export class ActionPlansModule {}
