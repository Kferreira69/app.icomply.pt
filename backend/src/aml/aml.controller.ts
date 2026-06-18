import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AmlService } from './aml.service';

@ApiTags('AML')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('aml')
export class AmlController {
  constructor(private readonly service: AmlService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: any) {
    return this.service.getDashboard(user.organizationId);
  }

  @Get('cases')
  listCases(
    @CurrentUser() user: any,
    @Query('status') s?: string,
    @Query('caseType') t?: string,
    @Query('riskLevel') r?: string,
  ) {
    return this.service.listCases(user.organizationId, s, t, r);
  }

  @Post('cases')
  createCase(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createCase(user.organizationId, dto);
  }

  @Patch('cases/:id')
  updateCase(
    @Param('id') id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.service.updateCase(id, user.organizationId, data);
  }

  @Get('screenings')
  listScreenings(
    @CurrentUser() user: any,
    @Query('screeningType') t?: string,
  ) {
    return this.service.listScreenings(user.organizationId, t);
  }

  @Post('screenings')
  createScreening(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createScreening(user.organizationId, dto, user.id);
  }

  @Get('policies')
  listPolicies(@CurrentUser() user: any) {
    return this.service.listPolicies(user.organizationId);
  }

  @Post('policies')
  createPolicy(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createPolicy(user.organizationId, dto);
  }

  @Patch('policies/:id')
  updatePolicy(
    @Param('id') id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.service.updatePolicy(id, user.organizationId, data);
  }

  @Get('risk-assessments')
  listRiskAssessments(
    @CurrentUser() user: any,
    @Query('entityType') t?: string,
  ) {
    return this.service.listRiskAssessments(user.organizationId, t);
  }

  @Post('risk-assessments')
  createRiskAssessment(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createRiskAssessment(user.organizationId, dto);
  }

  @Patch('risk-assessments/:id')
  updateRiskAssessment(
    @Param('id') id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.service.updateRiskAssessment(id, user.organizationId, data);
  }

  @Get('training')
  listTraining(
    @CurrentUser() user: any,
    @Query('status') s?: string,
  ) {
    return this.service.listTraining(user.organizationId, s);
  }

  @Post('training')
  createTraining(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createTraining(user.organizationId, dto);
  }

  @Patch('training/:id')
  updateTraining(
    @Param('id') id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.service.updateTraining(id, user.organizationId, data);
  }

  @Get('regulatory-updates')
  listRegulatoryUpdates(
    @CurrentUser() user: any,
    @Query('status') s?: string,
  ) {
    return this.service.listRegulatoryUpdates(user.organizationId, s);
  }

  @Post('regulatory-updates')
  createRegulatoryUpdate(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createRegulatoryUpdate(user.organizationId, dto);
  }

  @Patch('regulatory-updates/:id')
  updateRegulatoryUpdate(
    @Param('id') id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.service.updateRegulatoryUpdate(id, user.organizationId, data);
  }

  @Get('audit-items')
  listAuditItems(
    @CurrentUser() user: any,
    @Query('category') c?: string,
  ) {
    return this.service.listAuditItems(user.organizationId, c);
  }

  @Post('audit-items')
  createAuditItem(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createAuditItem(user.organizationId, dto);
  }

  @Patch('audit-items/:id')
  updateAuditItem(
    @Param('id') id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.service.updateAuditItem(id, user.organizationId, data);
  }
}
