import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  DoraService,
  CreateDoraIncidentDto,
  UpdateDoraIncidentDto,
  CreateDoraTestDto,
  UpdateDoraTestDto,
} from './dora.service';
import {
  DoraIncidentSeverity, DoraIncidentStatus, DoraIncidentCategory,
  DoraTestType, DoraTestStatus,
} from '@prisma/client';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@Controller('dora')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DoraController {
  constructor(private readonly doraService: DoraService) {}

  // ── Dashboard ──────────────────────────────────────────────────

  @Get('dashboard')
  @RequireModule('dora', 1)
  getDashboard(@Request() req: any) {
    return this.doraService.getDashboard(req.user.organizationId);
  }

  // ── Incidents ──────────────────────────────────────────────────

  @Get('incidents')
  @RequireModule('dora', 1)
  listIncidents(
    @Request() req: any,
    @Query('severity') severity?: DoraIncidentSeverity,
    @Query('status') status?: DoraIncidentStatus,
    @Query('category') category?: DoraIncidentCategory,
  ) {
    return this.doraService.listIncidents(req.user.organizationId, { severity, status, category });
  }

  @Get('incidents/:id')
  @RequireModule('dora', 1)
  getIncident(@Request() req: any, @Param('id') id: string) {
    return this.doraService.getIncident(req.user.organizationId, id);
  }

  @Post('incidents')
  @RequireModule('dora', 2)
  createIncident(@Request() req: any, @Body() dto: CreateDoraIncidentDto) {
    return this.doraService.createIncident(req.user.organizationId, req.user.id, dto);
  }

  @Patch('incidents/:id')
  @RequireModule('dora', 2)
  updateIncident(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateDoraIncidentDto,
  ) {
    return this.doraService.updateIncident(req.user.organizationId, id, dto);
  }

  @Delete('incidents/:id')
  @RequireModule('dora', 2)
  deleteIncident(@Request() req: any, @Param('id') id: string) {
    return this.doraService.deleteIncident(req.user.organizationId, id);
  }

  // ── Tests ──────────────────────────────────────────────────────

  @Get('tests')
  @RequireModule('dora', 1)
  listTests(
    @Request() req: any,
    @Query('testType') testType?: DoraTestType,
    @Query('status') status?: DoraTestStatus,
  ) {
    return this.doraService.listTests(req.user.organizationId, { testType, status });
  }

  @Get('tests/:id')
  @RequireModule('dora', 1)
  getTest(@Request() req: any, @Param('id') id: string) {
    return this.doraService.getTest(req.user.organizationId, id);
  }

  @Post('tests')
  @RequireModule('dora', 2)
  createTest(@Request() req: any, @Body() dto: CreateDoraTestDto) {
    return this.doraService.createTest(req.user.organizationId, req.user.id, dto);
  }

  @Patch('tests/:id')
  @RequireModule('dora', 2)
  updateTest(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateDoraTestDto,
  ) {
    return this.doraService.updateTest(req.user.organizationId, id, dto);
  }

  @Delete('tests/:id')
  @RequireModule('dora', 2)
  deleteTest(@Request() req: any, @Param('id') id: string) {
    return this.doraService.deleteTest(req.user.organizationId, id);
  }
}
