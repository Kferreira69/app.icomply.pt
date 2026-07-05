import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Iso27701Service } from './iso27701.service';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@ApiTags('ISO 27701')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('iso27701')
export class Iso27701Controller {
  constructor(private readonly service: Iso27701Service) {}

  @Get('dashboard')
  @RequireModule('iso27701', 1)
  getDashboard(@CurrentUser() user: any) {
    return this.service.getDashboard(user.organizationId);
  }

  @Patch('controls/:controlCode')
  @RequireModule('iso27701', 2)
  updateControl(
    @Param('controlCode') code: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.service.updateControl(user.organizationId, code, data);
  }

  @Patch('controls')
  @RequireModule('iso27701', 2)
  bulkUpdate(
    @Body() body: { updates: any[] },
    @CurrentUser() user: any,
  ) {
    return this.service.bulkUpdateStatus(user.organizationId, body.updates);
  }
}
