import { Module } from '@nestjs/common';
import { OrgRolesController } from './org-roles.controller';
import { OrgRolesService } from './org-roles.service';

@Module({
  controllers: [OrgRolesController],
  providers: [OrgRolesService],
  exports: [OrgRolesService],
})
export class OrgRolesModule {}
