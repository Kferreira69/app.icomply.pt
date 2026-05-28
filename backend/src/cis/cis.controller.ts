import { Controller, Get, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { CisService } from './cis.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('cis')
export class CisController {
  constructor(private readonly cisService: CisService) {}

  @Get('dashboard')
  getDashboard(@Req() req: any) {
    return this.cisService.getDashboard(req.user.organizationId);
  }

  @Patch(':id')
  updateControl(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.cisService.updateControl(req.user.organizationId, id, dto);
  }

  @Patch('bulk/update')
  bulkUpdate(@Req() req: any, @Body() body: { updates: any[] }) {
    return this.cisService.bulkUpdate(req.user.organizationId, body.updates);
  }
}
