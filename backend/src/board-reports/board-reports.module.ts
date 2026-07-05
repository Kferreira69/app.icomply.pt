import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { BoardReportsController } from './board-reports.controller';
import { BoardReportsService } from './board-reports.service';

@Module({ imports: [PrismaModule], controllers: [BoardReportsController], providers: [BoardReportsService], exports: [BoardReportsService] })
export class BoardReportsModule {}
