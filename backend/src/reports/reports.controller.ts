import { Controller, Get, Post, Put, Delete, Body, Param, Query, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { StreamableFile } from '@nestjs/common';
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

  @Get(':id/download')
  @ApiOperation({ summary: 'Download a generated report file' })
  download(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile | void> {
    return this.service.downloadReport(id, orgId, res);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.findOne(id, orgId);
  }

  // ── Report schedules ──────────────────────────────────────────

  @Get('schedules/list')
  @ApiOperation({ summary: 'List report schedules' })
  listSchedules(@CurrentUser('organizationId') orgId: string) {
    return this.service.listSchedules(orgId);
  }

  @Post('schedules')
  @ApiOperation({ summary: 'Create a report schedule' })
  createSchedule(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.service.createSchedule(orgId, userId, dto);
  }

  @Put('schedules/:id')
  @ApiOperation({ summary: 'Update a report schedule' })
  updateSchedule(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: any,
  ) {
    return this.service.updateSchedule(id, orgId, dto);
  }

  @Delete('schedules/:id')
  @ApiOperation({ summary: 'Delete a report schedule' })
  removeSchedule(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.removeSchedule(id, orgId);
  }
}
