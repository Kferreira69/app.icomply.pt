import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BusinessContinuityService } from './business-continuity.service';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@ApiTags('Business Continuity')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('business-continuity')
export class BusinessContinuityController {
  constructor(private readonly service: BusinessContinuityService) {}

  @Get('dashboard')
  @RequireModule('bcp', 1)
  getDashboard(@CurrentUser() user: any) {
    return this.service.getDashboard(user.organizationId);
  }

  @Get('plans')
  @RequireModule('bcp', 1)
  listPlans(@CurrentUser() user: any) {
    return this.service.listPlans(user.organizationId);
  }

  @Get('tests')
  @RequireModule('bcp', 1)
  listTests(@CurrentUser() user: any) {
    return this.service.listTests(user.organizationId);
  }

  @Post('plans')
  @RequireModule('bcp', 2)
  createPlan(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createPlan(user.organizationId, dto, user.id);
  }

  @Get('plans/:id')
  @RequireModule('bcp', 1)
  getPlan(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.getPlan(id, user.organizationId);
  }

  @Patch('plans/:id')
  @RequireModule('bcp', 2)
  updatePlan(@Param('id') id: string, @Body() data: any, @CurrentUser() user: any) {
    return this.service.updatePlan(id, user.organizationId, data);
  }

  @Post('plans/:id/assets')
  @RequireModule('bcp', 2)
  addAsset(@Param('id') planId: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.service.addAsset(planId, user.organizationId, dto);
  }

  @Patch('plans/:planId/assets/:assetId')
  @RequireModule('bcp', 2)
  updateAsset(
    @Param('planId') planId: string,
    @Param('assetId') assetId: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.service.updateAsset(assetId, planId, user.organizationId, data);
  }

  @Delete('plans/:planId/assets/:assetId')
  @RequireModule('bcp', 2)
  removeAsset(
    @Param('planId') planId: string,
    @Param('assetId') assetId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.removeAsset(assetId, planId, user.organizationId);
  }

  @Post('plans/:id/tests')
  @RequireModule('bcp', 2)
  addTest(@Param('id') planId: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.service.addTest(planId, user.organizationId, dto, user.id);
  }

  @Patch('plans/:planId/tests/:testId')
  @RequireModule('bcp', 2)
  updateTest(
    @Param('planId') planId: string,
    @Param('testId') testId: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.service.updateTest(testId, planId, user.organizationId, data);
  }

  @Delete('plans/:planId/tests/:testId')
  @RequireModule('bcp', 2)
  removeTest(
    @Param('planId') planId: string,
    @Param('testId') testId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.removeTest(testId, planId, user.organizationId);
  }
}
