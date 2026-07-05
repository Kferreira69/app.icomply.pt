import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AmlService } from './aml.service';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@ApiTags('AML')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('aml')
export class AmlController {
  constructor(private readonly service: AmlService) {}

  @Get('dashboard')
  @RequireModule('aml', 1)
  getDashboard(@CurrentUser() user: any) {
    return this.service.getDashboard(user.organizationId);
  }

  @Get('cases')
  @RequireModule('aml', 1)
  listCases(
    @CurrentUser() user: any,
    @Query('status') s?: string,
    @Query('caseType') t?: string,
    @Query('riskLevel') r?: string,
  ) {
    return this.service.listCases(user.organizationId, s, t, r);
  }

  @Post('cases')
  @RequireModule('aml', 2)
  createCase(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createCase(user.organizationId, dto);
  }

  @Patch('cases/:id')
  @RequireModule('aml', 2)
  updateCase(
    @Param('id') id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.service.updateCase(id, user.organizationId, data);
  }

  @Get('screenings')
  @RequireModule('aml', 1)
  listScreenings(
    @CurrentUser() user: any,
    @Query('screeningType') t?: string,
  ) {
    return this.service.listScreenings(user.organizationId, t);
  }

  @Post('screenings')
  @RequireModule('aml', 2)
  createScreening(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createScreening(user.organizationId, dto, user.id);
  }

  @Get('policies')
  @RequireModule('aml', 1)
  listPolicies(@CurrentUser() user: any) {
    return this.service.listPolicies(user.organizationId);
  }

  @Post('policies')
  @RequireModule('aml', 2)
  createPolicy(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createPolicy(user.organizationId, dto);
  }

  @Patch('policies/:id')
  @RequireModule('aml', 2)
  updatePolicy(
    @Param('id') id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.service.updatePolicy(id, user.organizationId, data);
  }

  @Get('risk-assessments')
  @RequireModule('aml', 1)
  listRiskAssessments(
    @CurrentUser() user: any,
    @Query('entityType') t?: string,
  ) {
    return this.service.listRiskAssessments(user.organizationId, t);
  }

  @Post('risk-assessments')
  @RequireModule('aml', 2)
  createRiskAssessment(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createRiskAssessment(user.organizationId, dto);
  }

  @Patch('risk-assessments/:id')
  @RequireModule('aml', 2)
  updateRiskAssessment(
    @Param('id') id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.service.updateRiskAssessment(id, user.organizationId, data);
  }

  @Get('training')
  @RequireModule('aml', 1)
  listTraining(
    @CurrentUser() user: any,
    @Query('status') s?: string,
  ) {
    return this.service.listTraining(user.organizationId, s);
  }

  @Post('training')
  @RequireModule('aml', 2)
  createTraining(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createTraining(user.organizationId, dto);
  }

  @Patch('training/:id')
  @RequireModule('aml', 2)
  updateTraining(
    @Param('id') id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.service.updateTraining(id, user.organizationId, data);
  }

  @Get('regulatory-updates')
  @RequireModule('aml', 1)
  listRegulatoryUpdates(
    @CurrentUser() user: any,
    @Query('status') s?: string,
  ) {
    return this.service.listRegulatoryUpdates(user.organizationId, s);
  }

  @Post('regulatory-updates')
  @RequireModule('aml', 2)
  createRegulatoryUpdate(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createRegulatoryUpdate(user.organizationId, dto);
  }

  @Patch('regulatory-updates/:id')
  @RequireModule('aml', 2)
  updateRegulatoryUpdate(
    @Param('id') id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.service.updateRegulatoryUpdate(id, user.organizationId, data);
  }

  @Get('audit-items')
  @RequireModule('aml', 1)
  listAuditItems(
    @CurrentUser() user: any,
    @Query('category') c?: string,
  ) {
    return this.service.listAuditItems(user.organizationId, c);
  }

  @Post('audit-items')
  @RequireModule('aml', 2)
  createAuditItem(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createAuditItem(user.organizationId, dto);
  }

  @Patch('audit-items/:id')
  @RequireModule('aml', 2)
  updateAuditItem(
    @Param('id') id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.service.updateAuditItem(id, user.organizationId, data);
  }
}
