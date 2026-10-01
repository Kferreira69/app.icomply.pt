import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';
import { EnvironmentService } from './environment.service';

@ApiTags('Environment (ISO 14001)')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('environment')
export class EnvironmentController {
  constructor(private readonly service: EnvironmentService) {}

  @Get('dashboard')
  @RequireModule('environment', 1)
  dashboard(@CurrentUser('organizationId') orgId: string) {
    return this.service.dashboard(orgId);
  }

  @Patch('requirements/:id')
  @RequireModule('environment', 2)
  updateRequirement(@Param('id') id: string, @Body() dto: any, @CurrentUser('organizationId') orgId: string) {
    return this.service.updateRequirement(orgId, id, dto);
  }

  // ── aspects & impacts ──
  @Get('aspects')
  @RequireModule('environment', 1)
  listAspects(@CurrentUser('organizationId') orgId: string) {
    return this.service.listAspects(orgId);
  }

  @Post('aspects')
  @RequireModule('environment', 2)
  createAspect(@Body() dto: any, @CurrentUser('organizationId') orgId: string) {
    return this.service.createAspect(orgId, dto);
  }

  @Patch('aspects/:id')
  @RequireModule('environment', 2)
  updateAspect(@Param('id') id: string, @Body() dto: any, @CurrentUser('organizationId') orgId: string) {
    return this.service.updateAspect(orgId, id, dto);
  }

  @Delete('aspects/:id')
  @RequireModule('environment', 2)
  removeAspect(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.removeAspect(orgId, id);
  }

  // ── objectives & targets ──
  @Get('esg-metrics')
  @RequireModule('environment', 1)
  listEsgMetrics(@CurrentUser() user: any) {
    return this.service.listEsgMetrics(user.organizationId, user.userId);
  }

  @Get('objectives')
  @RequireModule('environment', 1)
  listObjectives(@CurrentUser() user: any) {
    return this.service.listObjectives(user.organizationId, user.userId);
  }

  @Post('objectives')
  @RequireModule('environment', 2)
  createObjective(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createObjective(user.organizationId, user.userId, dto);
  }

  @Patch('objectives/:id')
  @RequireModule('environment', 2)
  updateObjective(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.service.updateObjective(user.organizationId, user.userId, id, dto);
  }

  @Delete('objectives/:id')
  @RequireModule('environment', 2)
  removeObjective(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.removeObjective(orgId, id);
  }

  // ── legal & other requirements ──
  @Get('obligations')
  @RequireModule('environment', 1)
  listObligations(@CurrentUser('organizationId') orgId: string) {
    return this.service.listObligations(orgId);
  }

  @Post('obligations')
  @RequireModule('environment', 2)
  createObligation(@Body() dto: any, @CurrentUser('organizationId') orgId: string) {
    return this.service.createObligation(orgId, dto);
  }

  @Patch('obligations/:id')
  @RequireModule('environment', 2)
  updateObligation(@Param('id') id: string, @Body() dto: any, @CurrentUser('organizationId') orgId: string) {
    return this.service.updateObligation(orgId, id, dto);
  }

  @Delete('obligations/:id')
  @RequireModule('environment', 2)
  removeObligation(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.removeObligation(orgId, id);
  }
}
