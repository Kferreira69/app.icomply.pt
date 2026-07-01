import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { HrComplianceService } from './hr-compliance.service';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('hr-compliance')
export class HrComplianceController {
  constructor(private readonly svc: HrComplianceService) {}

  private orgId(req: any) { return req.user.organizationId; }

  // ── Dashboard ────────────────────────────────────────────────

  @Get('dashboard')
  @RequireModule('hrCompliance', 1)
  getDashboard(@Request() req: any) {
    return this.svc.getDashboard(this.orgId(req));
  }

  // ── Salary Bands ─────────────────────────────────────────────

  @Get('salary-bands')
  @RequireModule('hrCompliance', 1)
  listSalaryBands(@Request() req: any) {
    return this.svc.listSalaryBands(this.orgId(req));
  }

  @Post('salary-bands')
  @RequireModule('hrCompliance', 2)
  createSalaryBand(@Request() req: any, @Body() dto: any) {
    return this.svc.createSalaryBand(this.orgId(req), dto);
  }

  @Put('salary-bands/:id')
  @RequireModule('hrCompliance', 2)
  updateSalaryBand(@Param('id') id: string, @Request() req: any, @Body() dto: any) {
    return this.svc.updateSalaryBand(this.orgId(req), id, dto);
  }

  @Delete('salary-bands/:id')
  @RequireModule('hrCompliance', 2)
  deleteSalaryBand(@Param('id') id: string, @Request() req: any) {
    return this.svc.deleteSalaryBand(this.orgId(req), id);
  }

  @Put('salary-bands/:id/pay-gap')
  @RequireModule('hrCompliance', 2)
  upsertPayGap(@Param('id') id: string, @Request() req: any, @Body() dto: any) {
    return this.svc.upsertPayGap(this.orgId(req), id, dto);
  }

  // ── SHST ─────────────────────────────────────────────────────

  @Get('shst-incidents')
  @RequireModule('hrCompliance', 1)
  listShst(@Request() req: any, @Query() q: any) {
    return this.svc.listShstIncidents(this.orgId(req), q);
  }

  @Post('shst-incidents')
  @RequireModule('hrCompliance', 2)
  createShst(@Request() req: any, @Body() dto: any) {
    return this.svc.createShstIncident(this.orgId(req), dto);
  }

  @Put('shst-incidents/:id')
  @RequireModule('hrCompliance', 2)
  updateShst(@Param('id') id: string, @Request() req: any, @Body() dto: any) {
    return this.svc.updateShstIncident(this.orgId(req), id, dto);
  }

  // ── Training ─────────────────────────────────────────────────

  @Get('trainings')
  @RequireModule('hrCompliance', 1)
  listTrainings(@Request() req: any, @Query() q: any) {
    return this.svc.listTrainings(this.orgId(req), q);
  }

  @Post('trainings')
  @RequireModule('hrCompliance', 2)
  createTraining(@Request() req: any, @Body() dto: any) {
    return this.svc.createTraining(this.orgId(req), dto);
  }

  @Put('trainings/:id')
  @RequireModule('hrCompliance', 2)
  updateTraining(@Param('id') id: string, @Request() req: any, @Body() dto: any) {
    return this.svc.updateTraining(this.orgId(req), id, dto);
  }

  @Post('trainings/:id/enroll/:userId')
  @RequireModule('hrCompliance', 2)
  enroll(@Param('id') id: string, @Param('userId') userId: string, @Request() req: any) {
    return this.svc.enrollUser(this.orgId(req), id, userId);
  }

  @Put('enrollments/:enrollmentId/complete')
  @RequireModule('hrCompliance', 2)
  complete(@Param('enrollmentId') eid: string, @Request() req: any, @Body() dto: any) {
    return this.svc.completeEnrollment(this.orgId(req), eid, dto);
  }

  // ── Contracts ────────────────────────────────────────────────

  @Get('contracts')
  @RequireModule('hrCompliance', 1)
  listContracts(@Request() req: any, @Query() q: any) {
    return this.svc.listContracts(this.orgId(req), q);
  }

  @Post('contracts')
  @RequireModule('hrCompliance', 2)
  createContract(@Request() req: any, @Body() dto: any) {
    return this.svc.createContract(this.orgId(req), dto);
  }

  @Put('contracts/:id')
  @RequireModule('hrCompliance', 2)
  updateContract(@Param('id') id: string, @Request() req: any, @Body() dto: any) {
    return this.svc.updateContract(this.orgId(req), id, dto);
  }

  // ── Remote Workers ───────────────────────────────────────────

  @Get('remote-workers')
  @RequireModule('hrCompliance', 1)
  listRemoteWorkers(@Request() req: any) {
    return this.svc.listRemoteWorkers(this.orgId(req));
  }

  @Post('remote-workers')
  @RequireModule('hrCompliance', 2)
  createRemoteWorker(@Request() req: any, @Body() dto: any) {
    return this.svc.createRemoteWorker(this.orgId(req), dto);
  }

  @Put('remote-workers/:id')
  @RequireModule('hrCompliance', 2)
  updateRemoteWorker(@Param('id') id: string, @Request() req: any, @Body() dto: any) {
    return this.svc.updateRemoteWorker(this.orgId(req), id, dto);
  }
}
