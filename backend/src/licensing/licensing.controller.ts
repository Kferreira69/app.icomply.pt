import {
  Controller, Get, Post, Put, Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LicensingService } from './licensing.service';

@UseGuards(JwtAuthGuard)
@Controller('licensing')
export class LicensingController {
  constructor(private readonly svc: LicensingService) {}

  // ── Catalogue (any authenticated user) ──────────────────────

  @Get('catalogue')
  getCatalogue() {
    return this.svc.getCatalogue();
  }

  // ── Backoffice endpoints (SUPER_ADMIN of Contemporary Constellation only) ──

  @Get('stats')
  async getStats(@Request() req: any) {
    await this.svc.assertSuperAdmin(req.user.userId);
    return this.svc.getStats();
  }

  @Get('clients')
  async listAll(@Request() req: any) {
    await this.svc.assertSuperAdmin(req.user.userId);
    return this.svc.listAll();
  }

  @Get('clients/:orgId')
  async getByOrg(@Param('orgId') orgId: string, @Request() req: any) {
    await this.svc.assertSuperAdmin(req.user.userId);
    return this.svc.getByOrg(orgId);
  }

  @Put('clients/:orgId')
  async upsert(
    @Param('orgId') orgId: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    await this.svc.assertSuperAdmin(req.user.userId);
    return this.svc.upsert(orgId, dto);
  }

  @Post('clients/:orgId/invoices')
  async createInvoice(
    @Param('orgId') orgId: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    await this.svc.assertSuperAdmin(req.user.userId);
    return this.svc.createInvoice(orgId, dto);
  }

  @Put('invoices/:invoiceId/paid')
  async markPaid(@Param('invoiceId') id: string, @Request() req: any) {
    await this.svc.assertSuperAdmin(req.user.userId);
    return this.svc.markPaid(id);
  }
}
