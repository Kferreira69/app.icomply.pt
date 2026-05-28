import { Controller, Get, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { WorkforceService } from './workforce.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('workforce')
export class WorkforceController {
  constructor(private readonly workforceService: WorkforceService) {}

  @Get('dashboard')
  getDashboard(@Req() req: any) {
    return this.workforceService.getDashboard(req.user.organizationId);
  }

  @Patch(':id')
  updateControl(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.workforceService.updateControl(req.user.organizationId, id, dto);
  }

  @Patch('bulk/update')
  bulkUpdate(@Req() req: any, @Body() body: { updates: any[] }) {
    return this.workforceService.bulkUpdate(req.user.organizationId, body.updates);
  }
}
