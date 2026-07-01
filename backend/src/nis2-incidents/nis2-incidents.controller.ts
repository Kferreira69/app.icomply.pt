import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Nis2IncidentsService } from './nis2-incidents.service';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@ApiTags('NIS2 Incident Notifications')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('nis2-incidents')
export class Nis2IncidentsController {
  constructor(private svc: Nis2IncidentsService) {}

  @Get()       @RequireModule('nis2', 1) list(@CurrentUser('organizationId') orgId: string) { return this.svc.list(orgId); }
  @Get('nca')  @RequireModule('nis2', 1) getNca() { return this.svc.getNcaList(); }
  @Get(':id')  @RequireModule('nis2', 1) get(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) { return this.svc.get(id, orgId); }

  @Post()
  @RequireModule('nis2', 2)
  create(@CurrentUser('organizationId') orgId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.svc.create(orgId, userId, dto);
  }

  @Put(':id')
  @RequireModule('nis2', 2)
  update(@Param('id') id: string, @CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.svc.update(id, orgId, dto);
  }

  @Post(':id/submit/:type')
  @RequireModule('nis2', 2)
  @ApiOperation({ summary: 'Submit notification to NCA (EARLY_WARNING | INITIAL_REPORT | FINAL_REPORT)' })
  submit(@Param('id') id: string, @Param('type') type: any, @CurrentUser('organizationId') orgId: string) {
    return this.svc.submitNotification(id, orgId, type);
  }

  @Get(':id/report/:type')
  @RequireModule('nis2', 1)
  @ApiOperation({ summary: 'Generate report text for a notification type' })
  async generateReport(@Param('id') id: string, @Param('type') type: string, @CurrentUser('organizationId') orgId: string) {
    const text = await this.svc.generateReport(id, orgId, type);
    return { text };
  }
}
