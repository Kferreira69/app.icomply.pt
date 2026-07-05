import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { ClientHubController } from './client-hub.controller';
import { ClientHubService } from './client-hub.service';

@Module({ imports: [PrismaModule], controllers: [ClientHubController], providers: [ClientHubService], exports: [ClientHubService] })
export class ClientHubModule {}
