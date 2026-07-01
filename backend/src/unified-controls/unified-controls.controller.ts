import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';
import { UnifiedControlsService } from './unified-controls.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('unified-controls')
export class UnifiedControlsController {
  constructor(private readonly svc: UnifiedControlsService) {}

  private orgId(req: any) { return req.user.organizationId; }

  // ── Dashboard & Analytics ─────────────────────────────────────

  @Get('dashboard')
  @RequireModule('soa', 1)
  getDashboard(@Request() req: any) {
    return this.svc.getDashboard(this.orgId(req));
  }

  @Get('coverage-matrix')
  @RequireModule('soa', 1)
  getCoverageMatrix(@Request() req: any) {
    return this.svc.getCoverageMatrix(this.orgId(req));
  }

  @Get('gap-impact')
  @RequireModule('soa', 1)
  getGapImpact(@Request() req: any) {
    return this.svc.getGapImpact(this.orgId(req));
  }

  // ── Controls ──────────────────────────────────────────────────

  @Get()
  @RequireModule('soa', 1)
  list(@Request() req: any, @Query() q: any) {
    return this.svc.list(this.orgId(req), q);
  }

  @Post()
  @RequireModule('soa', 2)
  create(@Request() req: any, @Body() dto: any) {
    return this.svc.create(this.orgId(req), dto);
  }

  @Put(':id')
  @RequireModule('soa', 2)
  update(@Param('id') id: string, @Request() req: any, @Body() dto: any) {
    return this.svc.update(this.orgId(req), id, dto);
  }

  @Put('bulk/status')
  @RequireModule('soa', 2)
  bulkUpdate(@Request() req: any, @Body() dto: { updates: any[] }) {
    return this.svc.bulkUpdateStatus(this.orgId(req), dto.updates);
  }

  // ── Seed from catalogue ───────────────────────────────────────

  @Post('seed')
  @RequireModule('soa', 2)
  seed(@Request() req: any, @Body() dto: { domains: string[] }) {
    return this.svc.seedFromCatalogue(this.orgId(req), dto.domains);
  }

  // ── Evidence linking ─────────────────────────────────────────

  @Post(':id/evidence/:evidenceId')
  @RequireModule('soa', 2)
  linkEvidence(
    @Param('id') id: string,
    @Param('evidenceId') evidenceId: string,
    @Request() req: any,
    @Body() dto: any,
  ) {
    return this.svc.linkEvidence(this.orgId(req), id, evidenceId, dto.notes);
  }

  @Delete(':id/evidence/:evidenceId')
  @RequireModule('soa', 2)
  unlinkEvidence(
    @Param('id') id: string,
    @Param('evidenceId') evidenceId: string,
  ) {
    return this.svc.unlinkEvidence(id, evidenceId);
  }

  // ── Regulatory obligations ────────────────────────────────────

  @Get('obligations')
  @RequireModule('soa', 1)
  listObligations(@Request() req: any, @Query() q: any) {
    return this.svc.listObligations(this.orgId(req), q);
  }

  @Post('obligations')
  @RequireModule('soa', 2)
  createObligation(@Request() req: any, @Body() dto: any) {
    return this.svc.createObligation(this.orgId(req), dto);
  }

  @Put('obligations/:id')
  @RequireModule('soa', 2)
  updateObligation(@Param('id') id: string, @Request() req: any, @Body() dto: any) {
    return this.svc.updateObligation(this.orgId(req), id, dto);
  }
}
