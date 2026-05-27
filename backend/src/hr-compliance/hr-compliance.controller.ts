import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HrComplianceService } from './hr-compliance.service';

@UseGuards(JwtAuthGuard)
@Controller('hr-compliance')
export class HrComplianceController {
  constructor(private readonly svc: HrComplianceService) {}

  private orgId(req: any) { return req.user.organizationId; }

  // ── Dashboard ────────────────────────────────────────────────

  @Get('dashboard')
  getDashboard(@Request() req: any) {
    return this.svc.getDashboard(this.orgId(req));
  }

  // ── Salary Bands ─────────────────────────────────────────────

  @Get('salary-bands')
  listSalaryBands(@Request() req: any) {
    return this.svc.listSalaryBands(this.orgId(req));
  }

  @Post('salary-bands')
  createSalaryBand(@Request() req: any, @Body() dto: any) {
    return this.svc.createSalaryBand(this.orgId(req), dto);
  }

  @Put('salary-bands/:id')
  updateSalaryBand(@Param('id') id: string, @Request() req: any, @Body() dto: any) {
    return this.svc.updateSalaryBand(this.orgId(req), id, dto);
  }

  @Delete('salary-bands/:id')
  deleteSalaryBand(@Param('id') id: string, @Request() req: any) {
    return this.svc.deleteSalaryBand(this.orgId(req), id);
  }

  @Put('salary-bands/:id/pay-gap')
  upsertPayGap(@Param('id') id: string, @Request() req: any, @Body() dto: any) {
    return this.svc.upsertPayGap(this.orgId(req), id, dto);
  }

  // ── SHST ─────────────────────────────────────────────────────

  @Get('shst-incidents')
  listShst(@Request() req: any, @Query() q: any) {
    return this.svc.listShstIncidents(this.orgId(req), q);
  }

  @Post('shst-incidents')
  createShst(@Request() req: any, @Body() dto: any) {
    return this.svc.createShstIncident(this.orgId(req), dto);
  }

  @Put('shst-incidents/:id')
  updateShst(@Param('id') id: string, @Request() req: any, @Body() dto: any) {
    return this.svc.updateShstIncident(this.orgId(req), id, dto);
  }

  // ── Training ─────────────────────────────────────────────────

  @Get('trainings')
  listTrainings(@Request() req: any, @Query() q: any) {
    return this.svc.listTrainings(this.orgId(req), q);
  }

  @Post('trainings')
  createTraining(@Request() req: any, @Body() dto: any) {
    return this.svc.createTraining(this.orgId(req), dto);
  }

  @Put('trainings/:id')
  updateTraining(@Param('id') id: string, @Request() req: any, @Body() dto: any) {
    return this.svc.updateTraining(this.orgId(req), id, dto);
  }

  @Post('trainings/:id/enroll/:userId')
  enroll(@Param('id') id: string, @Param('userId') userId: string, @Request() req: any) {
    return this.svc.enrollUser(this.orgId(req), id, userId);
  }

  @Put('enrollments/:enrollmentId/complete')
  complete(@Param('enrollmentId') eid: string, @Request() req: any, @Body() dto: any) {
    return this.svc.completeEnrollment(this.orgId(req), eid, dto);
  }

  // ── Contracts ────────────────────────────────────────────────

  @Get('contracts')
  listContracts(@Request() req: any, @Query() q: any) {
    return this.svc.listContracts(this.orgId(req), q);
  }

  @Post('contracts')
  createContract(@Request() req: any, @Body() dto: any) {
    return this.svc.createContract(this.orgId(req), dto);
  }

  @Put('contracts/:id')
  updateContract(@Param('id') id: string, @Request() req: any, @Body() dto: any) {
    return this.svc.updateContract(this.orgId(req), id, dto);
  }

  // ── Remote Workers ───────────────────────────────────────────

  @Get('remote-workers')
  listRemoteWorkers(@Request() req: any) {
    return this.svc.listRemoteWorkers(this.orgId(req));
  }

  @Post('remote-workers')
  createRemoteWorker(@Request() req: any, @Body() dto: any) {
    return this.svc.createRemoteWorker(this.orgId(req), dto);
  }

  @Put('remote-workers/:id')
  updateRemoteWorker(@Param('id') id: string, @Request() req: any, @Body() dto: any) {
    return this.svc.updateRemoteWorker(this.orgId(req), id, dto);
  }
}
