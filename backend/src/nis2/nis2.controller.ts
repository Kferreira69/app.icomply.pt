import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Nis2Service } from './nis2.service';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@ApiTags('NIS2')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('nis2')
export class Nis2Controller {
  constructor(private readonly service: Nis2Service) {}

  @Get('dashboard')
  @RequireModule('nis2', 1)
  @ApiOperation({ summary: 'NIS2 compliance dashboard with score and all measures' })
  getDashboard(@CurrentUser() user: any) {
    return this.service.getDashboard(user.organizationId);
  }

  @Patch('measures/:measureCode')
  @RequireModule('nis2', 2)
  @ApiOperation({ summary: 'Update a NIS2 measure status, evidence and notes' })
  updateMeasure(
    @Param('measureCode') measureCode: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.service.updateMeasure(user.organizationId, measureCode, body);
  }

  @Patch('measures')
  @RequireModule('nis2', 2)
  @ApiOperation({ summary: 'Bulk update NIS2 measure statuses' })
  bulkUpdate(@Body() body: { updates: Array<{ measureCode: string; status: any }> }, @CurrentUser() user: any) {
    return this.service.bulkUpdateStatus(user.organizationId, body.updates);
  }
}
