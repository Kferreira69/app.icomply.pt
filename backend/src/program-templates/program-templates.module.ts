import { Module } from '@nestjs/common';
import { ProgramTemplatesService } from './program-templates.service';
import { ProgramTemplatesController } from './program-templates.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProgramTemplatesController],
  providers: [ProgramTemplatesService],
})
export class ProgramTemplatesModule {}
