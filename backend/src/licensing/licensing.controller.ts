import {
  Controller, Get, Post, Put, Patch, Param, Body, UseGuards, Request, RawBodyRequest, Req, Headers,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LicensingService } from './licensing.service';

@UseGuards(JwtAuthGuard)
@Controller('licensing')
export class LicensingController {
  constructor(private readonly svc: LicensingService) {}

  // ── Catalogue ────────────────────────────────────────────────

  @Get('catalogue')
  getCatalogue() {
    return this.svc.getCatalogue();
  }

  // ── Self-service ─────────────────────────────────────────────

  @Get('my')
  getMyLicense(@CurrentUser('organizationId') orgId: string) {
    return this.svc.getByOrg(orgId);
  }

  @Get('my/addons')
  getMyAddons(@CurrentUser('organizationId') orgId: string) {
    return this.svc.listAddons(orgId);
  }

  @Get('my/events')
  getMyEvents(@CurrentUser('organizationId') orgId: string) {
    return this.svc.getEvents(orgId);
  }

  @Get('my/feature-flags')
  getMyFlags(@CurrentUser('organizationId') orgId: string) {
    return this.svc.getFeatureFlags(orgId);
  }

  // ── Stripe self-service ───────────────────────────────────────

  @Post('stripe/checkout')
  stripeCheckout(
    @CurrentUser('organizationId') orgId: string,
    @Body() body: { plan: string; billingCycle: string },
  ) {
    return this.svc.createStripeCheckoutSession(orgId, body.plan, body.billingCycle);
  }

  @Post('stripe/portal')
  stripePortal(@CurrentUser('organizationId') orgId: string) {
    return this.svc.getStripePortalUrl(orgId);
  }

  // ── Backoffice ────────────────────────────────────────────────

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
  async upsert(@Param('orgId') orgId: string, @Body() dto: any, @Request() req: any) {
    await this.svc.assertSuperAdmin(req.user.userId);
    return this.svc.upsert(orgId, dto, req.user.userId);
  }

  @Post('clients/:orgId/invoices')
  async createInvoice(@Param('orgId') orgId: string, @Body() dto: any, @Request() req: any) {
    await this.svc.assertSuperAdmin(req.user.userId);
    return this.svc.createInvoice(orgId, dto);
  }

  @Put('invoices/:invoiceId/paid')
  async markPaid(@Param('invoiceId') id: string, @Body() dto: any, @Request() req: any) {
    await this.svc.assertSuperAdmin(req.user.userId);
    return this.svc.markPaid(id, dto);
  }

  @Patch('clients/:orgId/addons/:addonKey')
  async toggleAddon(
    @Param('orgId') orgId: string,
    @Param('addonKey') addonKey: string,
    @Body() body: { enabled: boolean },
    @Request() req: any,
  ) {
    await this.svc.assertSuperAdmin(req.user.userId);
    return this.svc.toggleAddon(orgId, addonKey, body.enabled, req.user.userId);
  }

  @Patch('clients/:orgId/feature-flags/:key')
  async setFlag(
    @Param('orgId') orgId: string,
    @Param('key') key: string,
    @Body() body: { enabled: boolean; expiresAt?: string },
    @Request() req: any,
  ) {
    await this.svc.assertSuperAdmin(req.user.userId);
    return this.svc.setFeatureFlag(orgId, key, body.enabled, body.expiresAt ? new Date(body.expiresAt) : undefined);
  }

  // ── Stripe webhook (no auth guard needed) ─────────────────────
  // Note: webhook endpoint bypasses JwtAuthGuard — handled in main.ts raw body

  @Post('stripe/webhook')
  @UseGuards() // override global guard for this route
  async stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = (req as any).rawBody;
    return this.svc.handleStripeWebhook(rawBody, signature);
  }
}
