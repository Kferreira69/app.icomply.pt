import { Module } from '@nestjs/common';
import { IntakeService } from './intake.service';
import { IntakeController } from './intake.controller';
import { IntakePublicController } from './intake-public.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [IntakeController, IntakePublicController],
  providers: [IntakeService],
})
export class IntakeModule {}
