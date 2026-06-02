import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GdprService } from './gdpr.service';
import { CreateProcessingActivityDto } from './dto/create-processing-activity.dto';

@ApiTags('GDPR')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('gdpr')
export class GdprController {
  constructor(private readonly service: GdprService) {}

  // ── Dashboard ─────────────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({ summary: 'GDPR compliance dashboard stats' })
  getDashboard(@CurrentUser() user: any) {
    return this.service.getDashboard(user.organizationId);
  }

  // ── ROPA / Processing Activities ──────────────────────────────

  @Post('activities')
  @ApiOperation({ summary: 'Create a processing activity (Article 30)' })
  createActivity(@Body() dto: CreateProcessingActivityDto, @CurrentUser() user: any) {
    return this.service.createActivity(dto, user.id, user.organizationId);
  }

  @Get('activities')
  @ApiOperation({ summary: 'List all processing activities (ROPA)' })
  findAllActivities(@CurrentUser() user: any, @Query('status') status?: any) {
    return this.service.findAllActivities(user.organizationId, status);
  }

  @Get('activities/ropa-report')
  @ApiOperation({ summary: 'Get Article 30 ROPA report data' })
  getRopaReport(@CurrentUser() user: any) {
    return this.service.getRopaReport(user.organizationId);
  }

  @Get('activities/:id')
  findOneActivity(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOneActivity(id, user.organizationId);
  }

  @Patch('activities/:id')
  updateActivity(@Param('id') id: string, @Body() data: any, @CurrentUser() user: any) {
    return this.service.updateActivity(id, user.organizationId, data);
  }

  @Delete('activities/:id')
  removeActivity(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.removeActivity(id, user.organizationId);
  }

  // ── DPIAs ─────────────────────────────────────────────────────

  @Post('dpias')
  @ApiOperation({ summary: 'Create a DPIA' })
  createDpia(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createDpia(dto, user.id, user.organizationId);
  }

  @Get('dpias')
  @ApiOperation({ summary: 'List all DPIAs' })
  findAllDpias(@CurrentUser() user: any, @Query('status') status?: any) {
    return this.service.findAllDpias(user.organizationId, status);
  }

  @Get('dpias/:id')
  findOneDpia(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOneDpia(id, user.organizationId);
  }

  @Patch('dpias/:id')
  updateDpia(@Param('id') id: string, @Body() data: any, @CurrentUser() user: any) {
    return this.service.updateDpia(id, user.organizationId, data);
  }

  @Delete('dpias/:id')
  removeDpia(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.removeDpia(id, user.organizationId);
  }

  // ── Breach Notifications ──────────────────────────────────────

  @Post('breaches')
  @ApiOperation({ summary: 'Register a data breach notification' })
  createBreach(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createBreach(dto, user.id, user.organizationId);
  }

  @Get('breaches')
  @ApiOperation({ summary: 'List all breach notifications' })
  findAllBreaches(@CurrentUser() user: any) {
    return this.service.findAllBreaches(user.organizationId);
  }

  @Get('breaches/:id')
  findOneBreach(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOneBreach(id, user.organizationId);
  }

  @Patch('breaches/:id')
  updateBreach(@Param('id') id: string, @Body() data: any, @CurrentUser() user: any) {
    return this.service.updateBreach(id, user.organizationId, data);
  }

  @Delete('breaches/:id')
  removeBreach(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.removeBreach(id, user.organizationId);
  }

  // ── DSAR ──────────────────────────────────────────────────────

  @Post('dsar')
  @ApiOperation({ summary: 'Register a Data Subject Access Request' })
  createDsar(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createDsar(dto, user.organizationId);
  }

  @Get('dsar')
  @ApiOperation({ summary: 'List all DSARs' })
  findAllDsars(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.service.findAllDsars(user.organizationId, status);
  }

  @Get('dsar/stats')
  getDsarStats(@CurrentUser() user: any) {
    return this.service.getDsarStats(user.organizationId);
  }

  @Get('dsar/:id')
  findOneDsar(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOneDsar(id, user.organizationId);
  }

  @Patch('dsar/:id')
  updateDsar(@Param('id') id: string, @Body() data: any, @CurrentUser() user: any) {
    return this.service.updateDsar(id, user.organizationId, data);
  }

  @Delete('dsar/:id')
  removeDsar(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.removeDsar(id, user.organizationId);
  }

  // ── Consent Records ───────────────────────────────────────────

  @Post('consent')
  @ApiOperation({ summary: 'Register a consent record' })
  createConsent(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createConsent(dto, user.organizationId);
  }

  @Get('consent')
  @ApiOperation({ summary: 'List all consent records' })
  findAllConsents(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.service.findAllConsents(user.organizationId, status);
  }

  @Get('consent/:id')
  findOneConsent(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOneConsent(id, user.organizationId);
  }

  @Patch('consent/:id')
  updateConsent(@Param('id') id: string, @Body() data: any, @CurrentUser() user: any) {
    return this.service.updateConsent(id, user.organizationId, data);
  }

  @Post('consent/:id/withdraw')
  withdrawConsent(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.withdrawConsent(id, user.organizationId);
  }

  @Delete('consent/:id')
  removeConsent(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.removeConsent(id, user.organizationId);
  }

  // ── Public DSAR portal (no auth required) ────────────────────

  @Public()
  @Get('dsar/public/:orgSlug')
  @ApiOperation({ summary: 'Get org info for public DSAR portal' })
  getPublicDsarInfo(@Param('orgSlug') orgSlug: string) {
    return this.service.getPublicDsarInfo(orgSlug);
  }

  @Public()
  @Post('dsar/public/:orgSlug/submit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a DSAR request publicly (no auth)' })
  submitPublicDsar(@Param('orgSlug') orgSlug: string, @Body() dto: any) {
    return this.service.submitPublicDsar(orgSlug, dto);
  }
}
