import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { DoraRegisterController } from './dora-register.controller';
import { DoraRegisterService } from './dora-register.service';

@Module({ imports: [PrismaModule], controllers: [DoraRegisterController], providers: [DoraRegisterService], exports: [DoraRegisterService] })
export class DoraRegisterModule {}
