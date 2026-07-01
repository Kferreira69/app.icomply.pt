import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { VendorQuestionnaireService } from './vendor-questionnaire.service';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@ApiTags('Vendor Questionnaires')
@Controller('vendor-questionnaires')
export class VendorQuestionnaireController {
  constructor(private svc: VendorQuestionnaireService) {}

  // ── Authenticated endpoints ───────────────────────────────────

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireModule('vendors', 2)
  @Post('vendors/:vendorId')
  @ApiOperation({ summary: 'Create a questionnaire for a vendor' })
  create(
    @Param('vendorId') vendorId: string,
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.svc.create(vendorId, orgId, userId, dto);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireModule('vendors', 1)
  @Get('vendors/:vendorId')
  @ApiOperation({ summary: 'List questionnaires for a vendor' })
  list(
    @Param('vendorId') vendorId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.svc.list(vendorId, orgId);
  }

  // ── Public endpoints (no auth required) ──────────────────────

  @Public()
  @Get('public/:token')
  @ApiOperation({ summary: 'Get public questionnaire form by token' })
  getPublicForm(@Param('token') token: string) {
    return this.svc.getPublicForm(token);
  }

  @Public()
  @Post('public/:token/submit')
  @ApiOperation({ summary: 'Submit questionnaire responses' })
  submit(@Param('token') token: string, @Body() dto: any) {
    return this.svc.submit(token, dto);
  }
}
