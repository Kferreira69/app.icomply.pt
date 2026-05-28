import { Controller, Get, Patch, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrgProfileService } from './org-profile.service';

@ApiTags('Org Profile')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('org-profile')
export class OrgProfileController {
  constructor(private svc: OrgProfileService) {}

  // ── Profile ───────────────────────────────────────────────────

  @Get()
  getProfile(@CurrentUser('organizationId') orgId: string) {
    return this.svc.getProfile(orgId);
  }

  @Patch()
  updateProfile(@CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.svc.updateProfile(orgId, dto);
  }

  // ── Addresses ─────────────────────────────────────────────────

  @Get('addresses')
  listAddresses(@CurrentUser('organizationId') orgId: string) {
    return this.svc.listAddresses(orgId);
  }

  @Post('addresses')
  upsertAddress(@CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.svc.upsertAddress(orgId, dto);
  }

  @Delete('addresses/:id')
  removeAddress(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.svc.removeAddress(id, orgId);
  }

  // ── Contacts ──────────────────────────────────────────────────

  @Get('contacts')
  listContacts(@CurrentUser('organizationId') orgId: string) {
    return this.svc.listContacts(orgId);
  }

  @Post('contacts')
  upsertContact(@CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.svc.upsertContact(orgId, dto);
  }

  @Delete('contacts/:id')
  removeContact(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.svc.removeContact(id, orgId);
  }
}
