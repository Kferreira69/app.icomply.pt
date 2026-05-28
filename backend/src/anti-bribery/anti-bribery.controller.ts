import { Controller, Get, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AntiBriberyService } from './anti-bribery.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('anti-bribery')
export class AntiBriberyController {
  constructor(private readonly antiBriberyService: AntiBriberyService) {}

  @Get('dashboard')
  getDashboard(@Req() req: any) {
    return this.antiBriberyService.getDashboard(req.user.organizationId);
  }

  @Patch(':id')
  updateControl(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.antiBriberyService.updateControl(req.user.organizationId, id, dto);
  }

  @Patch('bulk/update')
  bulkUpdate(@Req() req: any, @Body() body: { updates: any[] }) {
    return this.antiBriberyService.bulkUpdate(req.user.organizationId, body.updates);
  }
}
