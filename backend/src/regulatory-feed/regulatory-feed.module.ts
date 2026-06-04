import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../common/prisma/prisma.module';
import { RegulatoryFeedController } from './regulatory-feed.controller';
import { RegulatoryFeedService } from './regulatory-feed.service';

@Module({ imports: [PrismaModule, ScheduleModule], controllers: [RegulatoryFeedController], providers: [RegulatoryFeedService], exports: [RegulatoryFeedService] })
export class RegulatoryFeedModule {}
