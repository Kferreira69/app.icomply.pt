import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuditorPortalController } from './auditor-portal.controller';
import { AuditorPortalService } from './auditor-portal.service';

@Module({ imports: [PrismaModule], controllers: [AuditorPortalController], providers: [AuditorPortalService], exports: [AuditorPortalService] })
export class AuditorPortalModule {}
