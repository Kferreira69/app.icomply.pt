import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EsgService } from './esg.service';

@ApiTags('ESG')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('esg')
export class EsgController {
  constructor(private readonly service: EsgService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: any, @Query('year') year?: string) {
    const y = year ? parseInt(year) : new Date().getFullYear();
    return this.service.getDashboard(user.organizationId, y);
  }

  @Get('reports')
  listReports(@CurrentUser() user: any) {
    return this.service.listReports(user.organizationId);
  }

  @Post('reports')
  createReport(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createReport(user.organizationId, dto, user.id);
  }

  @Patch('reports/:id')
  updateReport(@Param('id') id: string, @Body() data: any, @CurrentUser() user: any) {
    return this.service.updateReport(id, user.organizationId, data);
  }

  @Get('metrics')
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
  upsertMetric(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.upsertMetric(user.organizationId, dto);
  }

  @Patch('metrics/:id')
  updateMetric(@Param('id') id: string, @Body() data: any, @CurrentUser() user: any) {
    return this.service.updateMetric(id, user.organizationId, data);
  }

  @Post('seed')
  @ApiOperation({ summary: 'Initialize CSRD/GRI metrics for a year' })
  seed(@Body() body: { year?: number }, @CurrentUser() user: any) {
    const y = body.year ?? new Date().getFullYear();
    return this.service.initOrganization(user.organizationId, y);
  }
}
