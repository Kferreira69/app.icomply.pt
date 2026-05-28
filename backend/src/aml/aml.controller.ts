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
}
