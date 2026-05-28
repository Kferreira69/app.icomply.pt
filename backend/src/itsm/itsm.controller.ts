import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ItsmService } from './itsm.service';

@ApiTags('ITSM')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('itsm')
export class ItsmController {
  constructor(private readonly service: ItsmService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: any) {
    return this.service.getDashboard(user.organizationId);
  }

  // Change Management
  @Get('changes')
  listChanges(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('changeType') changeType?: string,
  ) {
    return this.service.listChanges(user.organizationId, status, changeType);
  }

  @Post('changes')
  createChange(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createChange(user.organizationId, dto, user.id);
  }

  @Patch('changes/:id')
  updateChange(@Param('id') id: string, @Body() data: any, @CurrentUser() user: any) {
    return this.service.updateChange(id, user.organizationId, data);
  }

  // Incident Management
  @Get('incidents')
  listIncidents(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
  ) {
    return this.service.listIncidents(user.organizationId, status, priority);
  }

  @Post('incidents')
  createIncident(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createIncident(user.organizationId, dto, user.id);
  }

  @Patch('incidents/:id')
  updateIncident(@Param('id') id: string, @Body() data: any, @CurrentUser() user: any) {
    return this.service.updateIncident(id, user.organizationId, data);
  }

  // Problem Management
  @Get('problems')
  listProblems(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.service.listProblems(user.organizationId, status);
  }

  @Post('problems')
  createProblem(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createProblem(user.organizationId, dto, user.id);
  }

  @Patch('problems/:id')
  updateProblem(@Param('id') id: string, @Body() data: any, @CurrentUser() user: any) {
    return this.service.updateProblem(id, user.organizationId, data);
  }
}
