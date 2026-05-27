import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UnifiedControlsService } from './unified-controls.service';

@UseGuards(JwtAuthGuard)
@Controller('unified-controls')
export class UnifiedControlsController {
  constructor(private readonly svc: UnifiedControlsService) {}

  private orgId(req: any) { return req.user.organizationId; }

  // ── Dashboard & Analytics ─────────────────────────────────────

  @Get('dashboard')
  getDashboard(@Request() req: any) {
    return this.svc.getDashboard(this.orgId(req));
  }

  @Get('coverage-matrix')
  getCoverageMatrix(@Request() req: any) {
    return this.svc.getCoverageMatrix(this.orgId(req));
  }

  @Get('gap-impact')
  getGapImpact(@Request() req: any) {
    return this.svc.getGapImpact(this.orgId(req));
  }

  // ── Controls ──────────────────────────────────────────────────

  @Get()
  list(@Request() req: any, @Query() q: any) {
    return this.svc.list(this.orgId(req), q);
  }

  @Post()
  create(@Request() req: any, @Body() dto: any) {
    return this.svc.create(this.orgId(req), dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Request() req: any, @Body() dto: any) {
    return this.svc.update(this.orgId(req), id, dto);
  }

  @Put('bulk/status')
  bulkUpdate(@Request() req: any, @Body() dto: { updates: any[] }) {
    return this.svc.bulkUpdateStatus(this.orgId(req), dto.updates);
  }

  // ── Seed from catalogue ───────────────────────────────────────

  @Post('seed')
  seed(@Request() req: any, @Body() dto: { domains: string[] }) {
    return this.svc.seedFromCatalogue(this.orgId(req), dto.domains);
  }

  // ── Evidence linking ─────────────────────────────────────────

  @Post(':id/evidence/:evidenceId')
  linkEvidence(
    @Param('id') id: string,
    @Param('evidenceId') evidenceId: string,
    @Request() req: any,
    @Body() dto: any,
  ) {
    return this.svc.linkEvidence(this.orgId(req), id, evidenceId, dto.notes);
  }

  @Delete(':id/evidence/:evidenceId')
  unlinkEvidence(
    @Param('id') id: string,
    @Param('evidenceId') evidenceId: string,
  ) {
    return this.svc.unlinkEvidence(id, evidenceId);
  }

  // ── Regulatory obligations ────────────────────────────────────

  @Get('obligations')
  listObligations(@Request() req: any, @Query() q: any) {
    return this.svc.listObligations(this.orgId(req), q);
  }

  @Post('obligations')
  createObligation(@Request() req: any, @Body() dto: any) {
    return this.svc.createObligation(this.orgId(req), dto);
  }

  @Put('obligations/:id')
  updateObligation(@Param('id') id: string, @Request() req: any, @Body() dto: any) {
    return this.svc.updateObligation(this.orgId(req), id, dto);
  }
}
