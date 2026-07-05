import { Controller, Get, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AntiBriberyService } from './anti-bribery.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('anti-bribery')
export class AntiBriberyController {
  constructor(private readonly antiBriberyService: AntiBriberyService) {}

  @Get('dashboard')
  @RequireModule('antiBribery', 1)
  getDashboard(@Req() req: any) {
    return this.antiBriberyService.getDashboard(req.user.organizationId);
  }

  @Patch(':id')
  @RequireModule('antiBribery', 2)
  updateControl(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.antiBriberyService.updateControl(req.user.organizationId, id, dto);
  }

  @Patch('bulk/update')
  @RequireModule('antiBribery', 2)
  bulkUpdate(@Req() req: any, @Body() body: { updates: any[] }) {
    return this.antiBriberyService.bulkUpdate(req.user.organizationId, body.updates);
  }
}
