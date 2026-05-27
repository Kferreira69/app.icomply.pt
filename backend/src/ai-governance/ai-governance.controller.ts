import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiGovernanceService } from './ai-governance.service';

@UseGuards(JwtAuthGuard)
@Controller('ai-governance')
export class AiGovernanceController {
  constructor(private readonly svc: AiGovernanceService) {}

  private orgId(req: any) { return req.user.organizationId; }
  private userId(req: any) { return req.user.userId; }

  // ── Dashboard ────────────────────────────────────────────────

  @Get('dashboard')
  getDashboard(@Request() req: any) {
    return this.svc.getDashboard(this.orgId(req));
  }

  // ── AI System Inventory ──────────────────────────────────────

  @Get('systems')
  listSystems(@Request() req: any, @Query() q: any) {
    return this.svc.listSystems(this.orgId(req), q);
  }

  @Post('systems')
  createSystem(@Request() req: any, @Body() dto: any) {
    return this.svc.createSystem(this.orgId(req), dto);
  }

  @Put('systems/:id')
  updateSystem(@Param('id') id: string, @Request() req: any, @Body() dto: any) {
    return this.svc.updateSystem(this.orgId(req), id, dto);
  }

  @Delete('systems/:id')
  deleteSystem(@Param('id') id: string, @Request() req: any) {
    return this.svc.deleteSystem(this.orgId(req), id);
  }

  // ── AI Risks ────────────────────────────────────────────────

  @Get('risks')
  listRisks(@Request() req: any, @Query() q: any) {
    return this.svc.listRisks(this.orgId(req), q);
  }

  @Post('risks')
  createRisk(@Request() req: any, @Body() dto: any) {
    return this.svc.createRisk(this.orgId(req), dto);
  }

  @Put('risks/:id')
  updateRisk(@Param('id') id: string, @Request() req: any, @Body() dto: any) {
    return this.svc.updateRisk(this.orgId(req), id, dto);
  }

  // ── Impact Assessments ───────────────────────────────────────

  @Get('assessments')
  listAssessments(@Request() req: any) {
    return this.svc.listAssessments(this.orgId(req));
  }

  @Post('assessments')
  createAssessment(@Request() req: any, @Body() dto: any) {
    return this.svc.createAssessment(this.orgId(req), dto, this.userId(req));
  }

  @Put('assessments/:id')
  updateAssessment(@Param('id') id: string, @Request() req: any, @Body() dto: any) {
    return this.svc.updateAssessment(this.orgId(req), id, dto);
  }

  // ── ISO 42001 Controls ───────────────────────────────────────

  @Get('iso42001')
  getControls(@Request() req: any) {
    return this.svc.getControls(this.orgId(req));
  }

  @Put('iso42001/:id')
  updateControl(@Param('id') id: string, @Request() req: any, @Body() dto: any) {
    return this.svc.updateControl(this.orgId(req), id, dto);
  }

  @Put('iso42001/bulk')
  bulkUpdate(@Request() req: any, @Body() dto: { updates: any[] }) {
    return this.svc.bulkUpdateControls(this.orgId(req), dto.updates);
  }
}
