import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { OrgRolesService } from './org-roles.service';
import { CreateOrgRoleDto } from './dto/create-org-role.dto';
import { UpdateOrgRoleDto } from './dto/update-org-role.dto';

@ApiTags('Org Roles')
@ApiBearerAuth('JWT')
@Controller('org-roles')
export class OrgRolesController {
  constructor(private svc: OrgRolesService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List custom roles for current organization' })
  list(@CurrentUser('organizationId') orgId: string) {
    return this.svc.list(orgId);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a custom role' })
  create(
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: CreateOrgRoleDto,
  ) {
    return this.svc.create(orgId, dto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a custom role' })
  update(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: UpdateOrgRoleDto,
  ) {
    return this.svc.update(id, orgId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a custom role' })
  remove(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.svc.remove(id, orgId);
  }
}
