import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';
import { IdentityVerificationService } from './identity-verification.service';
import { VerifyIndividualDto } from './dto/verify-individual.dto';
import { VerifyBusinessDto } from './dto/verify-business.dto';
import { ScreenSanctionsDto } from './dto/screen-sanctions.dto';

@ApiTags('Identity Verification')
@ApiBearerAuth('JWT')
@Controller('identity-verification')
export class IdentityVerificationController {
  constructor(private readonly service: IdentityVerificationService) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireModule('aml', 1)
  list(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.service.listVerifications(user.organizationId, status);
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

  // No JwtAuthGuard — provider webhooks arrive unauthenticated and are trusted
  // only via each provider's own signature scheme, verified inside the provider
  // implementation itself (Sumsub/Trulioo signing), not via our JWT layer.
  @Post('webhook/:provider')
  handleWebhook(@Param('provider') provider: string, @Body() payload: unknown) {
    return this.service.handleWebhook(provider, payload);
  }
}
