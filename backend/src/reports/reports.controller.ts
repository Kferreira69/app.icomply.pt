import { Controller, Get, Post, Put, Delete, Body, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { StreamableFile } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ComplianceMetricsService } from '../common/services/compliance-metrics.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportType, ReportFormat } from '../generated/prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@ApiTags('Reports')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private service: ReportsService,
    private complianceMetrics: ComplianceMetricsService,
  ) {}

  @Post('generate')
  @RequireModule('reports', 2)
  @ApiOperation({ summary: 'Generate a compliance report' })
  generate(
    @CurrentUser('organizationId') orgId: string,
    @Body() body: { type: ReportType; format: ReportFormat; parameters?: Record<string, any> },
  ) {
    return this.service.generate(orgId, body.type, body.format, body.parameters);
  }

  @Get()
  @RequireModule('reports', 1)
  findAll(@CurrentUser('organizationId') orgId: string) {
    return this.service.findAll(orgId);
  }

  @Get('summary')
  @RequireModule('reports', 1)
  @ApiOperation({ summary: 'Get live compliance summary (no export)' })
  getSummary(
    @CurrentUser('organizationId') orgId: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.service.getComplianceSummary(orgId, projectId);
  }

  @Get('kpis')
  @RequireModule('reports', 1)
  @ApiOperation({ summary: 'Get unified KPI snapshot — single source of truth for dashboard, board reports, and trust center' })
  getKpis(@CurrentUser('organizationId') orgId: string) {
    return this.complianceMetrics.getKpiSnapshot(orgId);
  }

  @Get(':id/download')
  @RequireModule('reports', 1)
  @ApiOperation({ summary: 'Download a generated report file (proxied — no raw S3 URLs exposed)' })
  async download(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile | void> {
    // Try presigned URL redirect first (S3/MinIO path)
    const presignedUrl = await this.service.getPresignedDownloadUrl(id, orgId);
    if (presignedUrl) {
      res.redirect(302, presignedUrl);
      return;
    }

    // Fallback: stream through the backend (local storage or S3 buffer read)
    return this.service.downloadReport(id, orgId, res);
  }

  @Get(':id')
  @RequireModule('reports', 1)
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.findOne(id, orgId);
  }

  // ── Report schedules ──────────────────────────────────────────

  @Get('schedules/list')
  @RequireModule('reports', 1)
  @ApiOperation({ summary: 'List report schedules' })
  listSchedules(@CurrentUser('organizationId') orgId: string) {
    return this.service.listSchedules(orgId);
  }

  @Post('schedules')
  @RequireModule('reports', 2)
  @ApiOperation({ summary: 'Create a report schedule' })
  createSchedule(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.service.createSchedule(orgId, userId, dto);
  }

  @Put('schedules/:id')
  @RequireModule('reports', 2)
  @ApiOperation({ summary: 'Update a report schedule' })
  updateSchedule(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: any,
  ) {
    return this.service.updateSchedule(id, orgId, dto);
  }

  @Delete('schedules/:id')
  @RequireModule('reports', 2)
  @ApiOperation({ summary: 'Delete a report schedule' })
  removeSchedule(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.removeSchedule(id, orgId);
  }
}
