import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { SsoController } from './sso.controller';
import { SsoService } from './sso.service';

@Module({
  imports: [PrismaModule],
  controllers: [SsoController],
  providers: [SsoService],
})
export class SsoModule {}
