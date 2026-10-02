import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
import { SetProviderDto } from './dto/set-provider.dto';
import { DecisionDto } from './dto/decision.dto';
import { AcceptTermsDto, ProposeTermsDto } from './dto/terms.dto';

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

  /** Mode (manual / automated), providers, commercial terms and this month's usage. */
  @Get('providers')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireModule('aml', 1)
  providers(@CurrentUser() user: any) {
    return this.service.getProviderSettings(user.organizationId);
  }

  @Put('provider')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireModule('aml', 2)
  setProvider(@Body() dto: SetProviderDto, @CurrentUser() user: any) {
    return this.service.setProvider(user.organizationId, dto.provider ?? null);
  }

  /** The customer's administrator accepts the commercial terms (set-up fee + pay-as-you-go) for automated checks. */
  @Post('terms/accept')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  acceptTerms(@Body() dto: AcceptTermsDto, @CurrentUser() user: any) {
    return this.service.acceptTerms(user.organizationId, user.userId, dto.version);
  }

  @Post('individual')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireModule('aml', 2)
  verifyIndividual(@Body() dto: VerifyIndividualDto, @CurrentUser() user: any) {
    return this.service.verifyIndividual(user.organizationId, user.userId, dto);
  }

  @Post('business')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireModule('aml', 2)
  verifyBusiness(@Body() dto: VerifyBusinessDto, @CurrentUser() user: any) {
    return this.service.verifyBusiness(user.organizationId, user.userId, dto);
  }

  @Post('sanctions-screening')
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

  // ── Platform operator (Contemporary Constellation super-admins) ───────────────

  @Get('admin/:orgId')
  @UseGuards(JwtAuthGuard)
  async adminSettings(@Param('orgId') orgId: string, @Req() req: any) {
    await this.licensing.assertSuperAdmin(req.user.userId);
    return this.service.getProviderSettings(orgId);
  }

  @Put('admin/:orgId/terms')
  @UseGuards(JwtAuthGuard)
  async proposeTerms(@Param('orgId') orgId: string, @Body() dto: ProposeTermsDto, @Req() req: any) {
    await this.licensing.assertSuperAdmin(req.user.userId);
    return this.service.proposeTerms(orgId, req.user.userId, dto);
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
