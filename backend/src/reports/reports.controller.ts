import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportType, ReportFormat } from '@prisma/client';

@ApiTags('Reports')
@ApiBearerAuth('JWT')
@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate a compliance report' })
  generate(
    @CurrentUser('organizationId') orgId: string,
    @Body() body: { type: ReportType; format: ReportFormat; parameters?: Record<string, any> },
  ) {
    return this.service.generate(orgId, body.type, body.format, body.parameters);
  }

  @Get()
  findAll(@CurrentUser('organizationId') orgId: string) {
    return this.service.findAll(orgId);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get live compliance summary (no export)' })
  getSummary(
    @CurrentUser('organizationId') orgId: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.service.getComplianceSummary(orgId, projectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.findOne(id, orgId);
  }
}
