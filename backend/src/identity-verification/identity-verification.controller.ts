import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../generated/prisma/client';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';
import { LicensingService } from '../licensing/licensing.service';
import { IdentityVerificationService } from './identity-verification.service';
import { VerifyIndividualDto } from './dto/verify-individual.dto';
import { VerifyBusinessDto } from './dto/verify-business.dto';
import { ScreenSanctionsDto } from './dto/screen-sanctions.dto';
import { RoutingDto } from './dto/routing.dto';
import { DecisionDto } from './dto/decision.dto';
import { AcceptTermsDto, ProposeTermsDto, SendLinkDto, SetupInvoicedDto } from './dto/terms.dto';

// Paid checks: a loop or a misbehaving client must not be able to run up a bill. The organisation's monthly cap is the
// money limit; this is the speed limit (per IP, per minute).
const PAID_REQUESTS = { short: { limit: 30, ttl: 60_000 } };

@ApiTags('Identity Verification')
@ApiBearerAuth('JWT')
@Controller('identity-verification')
export class IdentityVerificationController {
  constructor(
    private readonly service: IdentityVerificationService,
    private readonly licensing: LicensingService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireModule('aml', 1)
  list(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.service.listVerifications(user.organizationId, status);
  }

  /** Mode (manual / automated), add-on state, providers, commercial terms, this month's usage and spending cap. */
  @Get('providers')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireModule('aml', 1)
  providers(@CurrentUser() user: any) {
    return this.service.getProviderSettings(user.organizationId);
  }

  /** The customer's administrator accepts the commercial terms (set-up fee + pay-as-you-go) for automated checks. */
  @Post('terms/accept')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  acceptTerms(@Body() dto: AcceptTermsDto, @CurrentUser() user: any) {
    return this.service.acceptTerms(user.organizationId, user.userId, dto.version);
  }

  @Post('individual')
  @Throttle(PAID_REQUESTS)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireModule('aml', 2)
  verifyIndividual(@Body() dto: VerifyIndividualDto, @CurrentUser() user: any) {
    return this.service.verifyIndividual(user.organizationId, user.userId, dto);
  }

  @Post('business')
  @Throttle(PAID_REQUESTS)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireModule('aml', 2)
  verifyBusiness(@Body() dto: VerifyBusinessDto, @CurrentUser() user: any) {
    return this.service.verifyBusiness(user.organizationId, user.userId, dto);
  }

  @Post('sanctions-screening')
  @Throttle(PAID_REQUESTS)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireModule('aml', 2)
  screenSanctions(@Body() dto: ScreenSanctionsDto, @CurrentUser() user: any) {
    return this.service.screenSanctions(user.organizationId, user.userId, dto);
  }

  /** A person decides a verification (manual checks, or one the provider left in review). */
  @Patch(':id/decision')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireModule('aml', 2)
  decide(@Param('id') id: string, @Body() dto: DecisionDto, @CurrentUser() user: any) {
    return this.service.decide(user.organizationId, id, user.userId, dto);
  }

  /** "Atualizar estado": ask the provider for the current state (a lost webhook must not strand a verification). */
  @Post(':id/refresh')
  @HttpCode(200)
  @Throttle(PAID_REQUESTS)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireModule('aml', 2)
  refresh(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.refresh(user.organizationId, id);
  }

  /** Email the hosted verification link to the person being verified (a few sends per verification). */
  @Post(':id/send-link')
  @HttpCode(200)
  @Throttle({ short: { limit: 10, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireModule('aml', 2)
  sendLink(@Param('id') id: string, @Body() dto: SendLinkDto, @CurrentUser() user: any) {
    return this.service.sendLink(user.organizationId, id, dto.email);
  }

  // ── Platform operator (Contemporary Constellation super-admins) ───────────────

  /** Invoicing report: automated checks of a month per customer / provider / feature, and the set-up fees. */
  @Get('admin/usage')
  @UseGuards(JwtAuthGuard)
  async adminUsage(@Query('month') month: string | undefined, @Req() req: any) {
    await this.licensing.assertSuperAdmin(req.user.userId);
    return this.service.usageReport(month);
  }

  /** Does the platform reach this provider with the configured credentials? (never a billable call) */
  @Post('admin/providers/:providerId/check')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async adminCheckProvider(@Param('providerId') providerId: string, @Req() req: any) {
    await this.licensing.assertSuperAdmin(req.user.userId);
    return this.service.checkProvider(providerId);
  }

  /** Choose which provider serves each feature for every customer at once (switch the platform from one vendor to another). */
  @Put('admin/routing/all')
  @UseGuards(JwtAuthGuard)
  async setRoutingForAll(@Body() dto: RoutingDto, @Req() req: any) {
    await this.licensing.assertSuperAdmin(req.user.userId);
    return this.service.setRoutingForAll(dto);
  }

  @Get('admin/:orgId')
  @UseGuards(JwtAuthGuard)
  async adminSettings(@Param('orgId') orgId: string, @Req() req: any) {
    await this.licensing.assertSuperAdmin(req.user.userId);
    return this.service.getProviderSettings(orgId);
  }

  /** Choose which provider serves each feature for one customer (documents → Didit, sanctions → OpenSanctions…). */
  @Put('admin/:orgId/routing')
  @UseGuards(JwtAuthGuard)
  async setRouting(@Param('orgId') orgId: string, @Body() dto: RoutingDto, @Req() req: any) {
    await this.licensing.assertSuperAdmin(req.user.userId);
    return this.service.setRouting(orgId, dto);
  }

  @Put('admin/:orgId/terms')
  @UseGuards(JwtAuthGuard)
  async proposeTerms(@Param('orgId') orgId: string, @Body() dto: ProposeTermsDto, @Req() req: any) {
    await this.licensing.assertSuperAdmin(req.user.userId);
    return this.service.proposeTerms(orgId, req.user.userId, dto);
  }

  /** The one-off set-up fee of this customer was invoiced (or not). */
  @Put('admin/:orgId/setup-invoiced')
  @UseGuards(JwtAuthGuard)
  async setupInvoiced(@Param('orgId') orgId: string, @Body() dto: SetupInvoicedDto, @Req() req: any) {
    await this.licensing.assertSuperAdmin(req.user.userId);
    return this.service.setSetupInvoiced(orgId, dto.invoiced);
  }

  // @Public(): the platform's global login guard would otherwise answer 401. Provider webhooks are
  // trusted only if the provider's own signature check (done inside the provider, over the raw body) passes.
  @Public()
  @Post('webhook/:provider')
  @HttpCode(200)
  handleWebhook(@Param('provider') provider: string, @Body() payload: unknown, @Req() req: any) {
    return this.service.handleWebhook(provider, payload, { rawBody: req.rawBody, headers: req.headers });
  }
}
