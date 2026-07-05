import { Controller, Get, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { WorkforceService } from './workforce.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('workforce')
export class WorkforceController {
  constructor(private readonly workforceService: WorkforceService) {}

  @Get('dashboard')
  @RequireModule('workforce', 1)
  getDashboard(@Req() req: any) {
    return this.workforceService.getDashboard(req.user.organizationId);
  }

  @Patch(':id')
  @RequireModule('workforce', 2)
  updateControl(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.workforceService.updateControl(req.user.organizationId, id, dto);
  }

  @Patch('bulk/update')
  @RequireModule('workforce', 2)
  bulkUpdate(@Req() req: any, @Body() body: { updates: any[] }) {
    return this.workforceService.bulkUpdate(req.user.organizationId, body.updates);
  }
}
