import { Controller, Get, Put, Post, Delete, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SsoService } from './sso.service';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@ApiTags('SSO')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sso')
export class SsoController {
  constructor(private svc: SsoService) {}

  @Get()
  @RequireModule('settings', 1)
  @ApiOperation({ summary: 'Get SSO configuration for current org' })
  getConfig(@CurrentUser('organizationId') orgId: string) {
    return this.svc.getConfig(orgId);
  }

  @Put()
  @RequireModule('settings', 2)
  @ApiOperation({ summary: 'Create or update SSO configuration' })
  upsertConfig(@CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.svc.upsertConfig(orgId, dto);
  }

  @Post('test')
  @RequireModule('settings', 2)
  @ApiOperation({ summary: 'Test SSO connection' })
  testConnection(@CurrentUser('organizationId') orgId: string) {
    return this.svc.testConnection(orgId);
  }

  @Delete()
  @RequireModule('settings', 2)
  @ApiOperation({ summary: 'Disable SSO' })
  disable(@CurrentUser('organizationId') orgId: string) {
    return this.svc.disable(orgId);
  }
}
