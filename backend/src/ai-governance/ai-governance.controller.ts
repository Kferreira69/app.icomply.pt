import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AiGovernanceService } from './ai-governance.service';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ai-governance')
export class AiGovernanceController {
  constructor(private readonly svc: AiGovernanceService) {}

  private orgId(req: any) { return req.user.organizationId; }
  private userId(req: any) { return req.user.userId; }

  // ── Dashboard ────────────────────────────────────────────────

  @Get('dashboard')
  @RequireModule('aiGovernance', 1)
  getDashboard(@Request() req: any) {
    return this.svc.getDashboard(this.orgId(req));
  }

  // ── AI System Inventory ──────────────────────────────────────

  @Get('systems')
  @RequireModule('aiGovernance', 1)
  listSystems(@Request() req: any, @Query() q: any) {
    return this.svc.listSystems(this.orgId(req), q);
  }

  @Post('systems')
  @RequireModule('aiGovernance', 2)
  createSystem(@Request() req: any, @Body() dto: any) {
    return this.svc.createSystem(this.orgId(req), dto);
  }

  @Put('systems/:id')
  @RequireModule('aiGovernance', 2)
  updateSystem(@Param('id') id: string, @Request() req: any, @Body() dto: any) {
    return this.svc.updateSystem(this.orgId(req), id, dto);
  }

  @Delete('systems/:id')
  @RequireModule('aiGovernance', 2)
  deleteSystem(@Param('id') id: string, @Request() req: any) {
    return this.svc.deleteSystem(this.orgId(req), id);
  }

  // ── AI Risks ────────────────────────────────────────────────

  @Get('risks')
  @RequireModule('aiGovernance', 1)
  listRisks(@Request() req: any, @Query() q: any) {
    return this.svc.listRisks(this.orgId(req), q);
  }

  @Post('risks')
  @RequireModule('aiGovernance', 2)
  createRisk(@Request() req: any, @Body() dto: any) {
    return this.svc.createRisk(this.orgId(req), dto);
  }

  @Put('risks/:id')
  @RequireModule('aiGovernance', 2)
  updateRisk(@Param('id') id: string, @Request() req: any, @Body() dto: any) {
    return this.svc.updateRisk(this.orgId(req), id, dto);
  }

  // ── Impact Assessments ───────────────────────────────────────

  @Get('assessments')
  @RequireModule('aiGovernance', 1)
  listAssessments(@Request() req: any) {
    return this.svc.listAssessments(this.orgId(req));
  }

  @Post('assessments')
  @RequireModule('aiGovernance', 2)
  createAssessment(@Request() req: any, @Body() dto: any) {
    return this.svc.createAssessment(this.orgId(req), dto, this.userId(req));
  }

  @Put('assessments/:id')
  @RequireModule('aiGovernance', 2)
  updateAssessment(@Param('id') id: string, @Request() req: any, @Body() dto: any) {
    return this.svc.updateAssessment(this.orgId(req), id, dto);
  }

  // ── ISO 42001 Controls ───────────────────────────────────────

  @Get('iso42001')
  @RequireModule('aiGovernance', 1)
  getControls(@Request() req: any) {
    return this.svc.getControls(this.orgId(req));
  }

  @Put('iso42001/:id')
  @RequireModule('aiGovernance', 2)
  updateControl(@Param('id') id: string, @Request() req: any, @Body() dto: any) {
    return this.svc.updateControl(this.orgId(req), id, dto);
  }

  @Put('iso42001/bulk')
  @RequireModule('aiGovernance', 2)
  bulkUpdate(@Request() req: any, @Body() dto: { updates: any[] }) {
    return this.svc.bulkUpdateControls(this.orgId(req), dto.updates);
  }
}
