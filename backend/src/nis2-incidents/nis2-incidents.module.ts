import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { Nis2IncidentsController } from './nis2-incidents.controller';
import { Nis2IncidentsService } from './nis2-incidents.service';

@Module({ imports: [PrismaModule], controllers: [Nis2IncidentsController], providers: [Nis2IncidentsService], exports: [Nis2IncidentsService] })
export class Nis2IncidentsModule {}
