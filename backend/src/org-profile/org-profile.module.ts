import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { OrgProfileController } from './org-profile.controller';
import { OrgProfileService } from './org-profile.service';

@Module({
  imports: [PrismaModule],
  controllers: [OrgProfileController],
  providers: [OrgProfileService],
  exports: [OrgProfileService],
})
export class OrgProfileModule {}
