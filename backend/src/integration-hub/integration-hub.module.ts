import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { IntegrationHubController } from './integration-hub.controller';
import { IntegrationHubService } from './integration-hub.service';

@Module({
  imports: [PrismaModule],
  controllers: [IntegrationHubController],
  providers: [IntegrationHubService],
  exports: [IntegrationHubService],
})
export class IntegrationHubModule {}
