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

@Controller('dora')
@UseGuards(JwtAuthGuard)
export class DoraController {
  constructor(private readonly doraService: DoraService) {}

  // ── Dashboard ──────────────────────────────────────────────────

  @Get('dashboard')
  getDashboard(@Request() req: any) {
    return this.doraService.getDashboard(req.user.organizationId);
  }

  // ── Incidents ──────────────────────────────────────────────────

  @Get('incidents')
  listIncidents(
    @Request() req: any,
    @Query('severity') severity?: DoraIncidentSeverity,
    @Query('status') status?: DoraIncidentStatus,
    @Query('category') category?: DoraIncidentCategory,
  ) {
    return this.doraService.listIncidents(req.user.organizationId, { severity, status, category });
  }

  @Get('incidents/:id')
  getIncident(@Request() req: any, @Param('id') id: string) {
    return this.doraService.getIncident(req.user.organizationId, id);
  }

  @Post('incidents')
  createIncident(@Request() req: any, @Body() dto: CreateDoraIncidentDto) {
    return this.doraService.createIncident(req.user.organizationId, req.user.id, dto);
  }

  @Patch('incidents/:id')
  updateIncident(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateDoraIncidentDto,
  ) {
    return this.doraService.updateIncident(req.user.organizationId, id, dto);
  }

  @Delete('incidents/:id')
  deleteIncident(@Request() req: any, @Param('id') id: string) {
    return this.doraService.deleteIncident(req.user.organizationId, id);
  }

  // ── Tests ──────────────────────────────────────────────────────

  @Get('tests')
  listTests(
    @Request() req: any,
    @Query('testType') testType?: DoraTestType,
    @Query('status') status?: DoraTestStatus,
  ) {
    return this.doraService.listTests(req.user.organizationId, { testType, status });
  }

  @Get('tests/:id')
  getTest(@Request() req: any, @Param('id') id: string) {
    return this.doraService.getTest(req.user.organizationId, id);
  }

  @Post('tests')
  createTest(@Request() req: any, @Body() dto: CreateDoraTestDto) {
    return this.doraService.createTest(req.user.organizationId, req.user.id, dto);
  }

  @Patch('tests/:id')
  updateTest(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateDoraTestDto,
  ) {
    return this.doraService.updateTest(req.user.organizationId, id, dto);
  }

  @Delete('tests/:id')
  deleteTest(@Request() req: any, @Param('id') id: string) {
    return this.doraService.deleteTest(req.user.organizationId, id);
  }
}
