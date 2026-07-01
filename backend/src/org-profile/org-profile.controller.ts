import { Controller, Get, Patch, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrgProfileService } from './org-profile.service';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@ApiTags('Org Profile')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('org-profile')
export class OrgProfileController {
  constructor(private svc: OrgProfileService) {}

  // ── Profile ───────────────────────────────────────────────────

  @Get()
  @RequireModule('settings', 1)
  getProfile(@CurrentUser('organizationId') orgId: string) {
    return this.svc.getProfile(orgId);
  }

  @Patch()
  @RequireModule('settings', 2)
  updateProfile(@CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.svc.updateProfile(orgId, dto);
  }

  // ── Addresses ─────────────────────────────────────────────────

  @Get('addresses')
  @RequireModule('settings', 1)
  listAddresses(@CurrentUser('organizationId') orgId: string) {
    return this.svc.listAddresses(orgId);
  }

  @Post('addresses')
  @RequireModule('settings', 2)
  upsertAddress(@CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.svc.upsertAddress(orgId, dto);
  }

  @Delete('addresses/:id')
  @RequireModule('settings', 2)
  removeAddress(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.svc.removeAddress(id, orgId);
  }

  // ── Contacts ──────────────────────────────────────────────────

  @Get('contacts')
  @RequireModule('settings', 1)
  listContacts(@CurrentUser('organizationId') orgId: string) {
    return this.svc.listContacts(orgId);
  }

  @Post('contacts')
  @RequireModule('settings', 2)
  upsertContact(@CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.svc.upsertContact(orgId, dto);
  }

  @Delete('contacts/:id')
  @RequireModule('settings', 2)
  removeContact(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.svc.removeContact(id, orgId);
  }
}
