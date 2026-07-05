import {
  Controller, Get, Patch, Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { TrustCenterService } from './trust-center.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@Controller('trust-center')
export class TrustCenterController {
  constructor(private readonly trustCenterService: TrustCenterService) {}

  // ── Public ────────────────────────────────────────────────────

  @Get('public/:slug')
  getPublicProfile(@Param('slug') slug: string) {
    return this.trustCenterService.getPublicProfile(slug);
  }

  // ── Protected ─────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireModule('trustCenter', 1)
  @Get('settings')
  getSettings(@Request() req: any) {
    return this.trustCenterService.getSettings(req.user.organizationId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireModule('trustCenter', 2)
  @Patch('settings')
  updateSettings(@Request() req: any, @Body() dto: any) {
    return this.trustCenterService.updateSettings(req.user.organizationId, dto);
  }
}
