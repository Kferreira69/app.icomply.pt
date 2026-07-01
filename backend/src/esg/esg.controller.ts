import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EsgService } from './esg.service';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@ApiTags('ESG')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('esg')
export class EsgController {
  constructor(private readonly service: EsgService) {}

  @Get('dashboard')
  @RequireModule('esg', 1)
  getDashboard(@CurrentUser() user: any, @Query('year') year?: string) {
    const y = year ? parseInt(year) : new Date().getFullYear();
    return this.service.getDashboard(user.organizationId, y);
  }

  @Get('reports')
  @RequireModule('esg', 1)
  listReports(@CurrentUser() user: any) {
    return this.service.listReports(user.organizationId);
  }

  @Post('reports')
  @RequireModule('esg', 2)
  createReport(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createReport(user.organizationId, dto, user.id);
  }

  @Patch('reports/:id')
  @RequireModule('esg', 2)
  updateReport(@Param('id') id: string, @Body() data: any, @CurrentUser() user: any) {
    return this.service.updateReport(id, user.organizationId, data);
  }

  @Get('metrics')
  @RequireModule('esg', 1)
  listMetrics(
    @CurrentUser() user: any,
    @Query('year') year?: string,
    @Query('pillar') pillar?: string,
    @Query('framework') framework?: string,
  ) {
    const y = year ? parseInt(year) : new Date().getFullYear();
    return this.service.listMetrics(user.organizationId, y, pillar, framework);
  }

  @Post('metrics')
  @RequireModule('esg', 2)
  upsertMetric(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.upsertMetric(user.organizationId, dto);
  }

  @Patch('metrics/:id')
  @RequireModule('esg', 2)
  updateMetric(@Param('id') id: string, @Body() data: any, @CurrentUser() user: any) {
    return this.service.updateMetric(id, user.organizationId, data);
  }

  @Post('seed')
  @RequireModule('esg', 2)
  @ApiOperation({ summary: 'Initialize CSRD/GRI metrics for a year' })
  seed(@Body() body: { year?: number }, @CurrentUser() user: any) {
    const y = body.year ?? new Date().getFullYear();
    return this.service.initOrganization(user.organizationId, y);
  }
}
