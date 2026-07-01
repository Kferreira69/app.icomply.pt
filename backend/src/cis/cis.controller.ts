import { Controller, Get, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { CisService } from './cis.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('cis')
export class CisController {
  constructor(private readonly cisService: CisService) {}

  @Get('dashboard')
  @RequireModule('cis', 1)
  getDashboard(@Req() req: any) {
    return this.cisService.getDashboard(req.user.organizationId);
  }

  @Patch(':id')
  @RequireModule('cis', 2)
  updateControl(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.cisService.updateControl(req.user.organizationId, id, dto);
  }

  @Patch('bulk/update')
  @RequireModule('cis', 2)
  bulkUpdate(@Req() req: any, @Body() body: { updates: any[] }) {
    return this.cisService.bulkUpdate(req.user.organizationId, body.updates);
  }
}
