import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { RegulatoryChangeService } from './regulatory-change.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('regulatory-change')
export class RegulatoryChangeController {
  constructor(private readonly regulatoryChangeService: RegulatoryChangeService) {}

  @Get('dashboard')
  @RequireModule('regulatoryChange', 1)
  getDashboard(@Req() req: any) {
    return this.regulatoryChangeService.getDashboard(req.user.organizationId);
  }

  // Regulatory Changes
  @Get('changes')
  @RequireModule('regulatoryChange', 1)
  listChanges(@Req() req: any, @Query('status') status: string, @Query('impact') impact: string) {
    return this.regulatoryChangeService.listChanges(req.user.organizationId, status, impact);
  }

  @Post('changes')
  @RequireModule('regulatoryChange', 2)
  createChange(@Req() req: any, @Body() dto: any) {
    return this.regulatoryChangeService.createChange(req.user.organizationId, req.user.id, dto);
  }

  @Patch('changes/:id')
  @RequireModule('regulatoryChange', 2)
  updateChange(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.regulatoryChangeService.updateChange(req.user.organizationId, id, dto);
  }

  @Delete('changes/:id')
  @RequireModule('regulatoryChange', 2)
  removeChange(@Req() req: any, @Param('id') id: string) {
    return this.regulatoryChangeService.removeChange(req.user.organizationId, id);
  }

  // Compliance Calendar
  @Get('calendar')
  @RequireModule('regulatoryChange', 1)
  listCalendar(@Req() req: any, @Query('from') from: string, @Query('to') to: string) {
    return this.regulatoryChangeService.listCalendar(req.user.organizationId, from, to);
  }

  @Post('calendar')
  @RequireModule('regulatoryChange', 2)
  createCalendarItem(@Req() req: any, @Body() dto: any) {
    return this.regulatoryChangeService.createCalendarItem(req.user.organizationId, req.user.id, dto);
  }

  @Patch('calendar/:id')
  @RequireModule('regulatoryChange', 2)
  updateCalendarItem(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.regulatoryChangeService.updateCalendarItem(req.user.organizationId, id, dto);
  }

  @Delete('calendar/:id')
  @RequireModule('regulatoryChange', 2)
  removeCalendarItem(@Req() req: any, @Param('id') id: string) {
    return this.regulatoryChangeService.removeCalendarItem(req.user.organizationId, id);
  }
}
