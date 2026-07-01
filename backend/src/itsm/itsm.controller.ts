import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ItsmService } from './itsm.service';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@ApiTags('ITSM')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('itsm')
export class ItsmController {
  constructor(private readonly service: ItsmService) {}

  @Get('dashboard')
  @RequireModule('itsm', 1)
  getDashboard(@CurrentUser() user: any) {
    return this.service.getDashboard(user.organizationId);
  }

  // Change Management
  @Get('changes')
  @RequireModule('itsm', 1)
  listChanges(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('changeType') changeType?: string,
  ) {
    return this.service.listChanges(user.organizationId, status, changeType);
  }

  @Post('changes')
  @RequireModule('itsm', 2)
  createChange(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createChange(user.organizationId, dto, user.id);
  }

  @Patch('changes/:id')
  @RequireModule('itsm', 2)
  updateChange(@Param('id') id: string, @Body() data: any, @CurrentUser() user: any) {
    return this.service.updateChange(id, user.organizationId, data);
  }

  // Incident Management
  @Get('incidents')
  @RequireModule('itsm', 1)
  listIncidents(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
  ) {
    return this.service.listIncidents(user.organizationId, status, priority);
  }

  @Post('incidents')
  @RequireModule('itsm', 2)
  createIncident(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createIncident(user.organizationId, dto, user.id);
  }

  @Patch('incidents/:id')
  @RequireModule('itsm', 2)
  updateIncident(@Param('id') id: string, @Body() data: any, @CurrentUser() user: any) {
    return this.service.updateIncident(id, user.organizationId, data);
  }

  // Problem Management
  @Get('problems')
  @RequireModule('itsm', 1)
  listProblems(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.service.listProblems(user.organizationId, status);
  }

  @Post('problems')
  @RequireModule('itsm', 2)
  createProblem(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createProblem(user.organizationId, dto, user.id);
  }

  @Patch('problems/:id')
  @RequireModule('itsm', 2)
  updateProblem(@Param('id') id: string, @Body() data: any, @CurrentUser() user: any) {
    return this.service.updateProblem(id, user.organizationId, data);
  }

  @Post('incidents/:id/escalate-dora')
  @RequireModule('itsm', 2)
  escalateToDora(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.escalateToDora(id, user.organizationId, user.id);
  }
}
