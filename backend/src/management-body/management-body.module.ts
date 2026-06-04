import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { ManagementBodyController } from './management-body.controller';
import { ManagementBodyService } from './management-body.service';

@Module({ imports: [PrismaModule], controllers: [ManagementBodyController], providers: [ManagementBodyService], exports: [ManagementBodyService] })
export class ManagementBodyModule {}
