import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Nis2IncidentsService } from './nis2-incidents.service';

@ApiTags('NIS2 Incident Notifications')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('nis2-incidents')
export class Nis2IncidentsController {
  constructor(private svc: Nis2IncidentsService) {}

  @Get()       list(@CurrentUser('organizationId') orgId: string) { return this.svc.list(orgId); }
  @Get('nca')  getNca() { return this.svc.getNcaList(); }
  @Get(':id')  get(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) { return this.svc.get(id, orgId); }

  @Post()
  create(@CurrentUser('organizationId') orgId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.svc.create(orgId, userId, dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.svc.update(id, orgId, dto);
  }

  @Post(':id/submit/:type')
  @ApiOperation({ summary: 'Submit notification to NCA (EARLY_WARNING | INITIAL_REPORT | FINAL_REPORT)' })
  submit(@Param('id') id: string, @Param('type') type: any, @CurrentUser('organizationId') orgId: string) {
    return this.svc.submitNotification(id, orgId, type);
  }

  @Get(':id/report/:type')
  @ApiOperation({ summary: 'Generate report text for a notification type' })
  async generateReport(@Param('id') id: string, @Param('type') type: string, @CurrentUser('organizationId') orgId: string) {
    const text = await this.svc.generateReport(id, orgId, type);
    return { text };
  }
}
