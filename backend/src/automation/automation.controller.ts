import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Req, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AutomationService } from './automation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('automation')
export class AutomationController {
  constructor(private readonly svc: AutomationService) {}

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.svc.create(req.user.organizationId, req.user.id, body);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.svc.findAll(req.user.organizationId);
  }

  @Get('summary')
  getSummary(@Req() req: any) {
    return this.svc.getSummary(req.user.organizationId);
  }

  @Get(':id/logs')
  getLogs(@Req() req: any, @Param('id') id: string) {
    return this.svc.getLogs(id, req.user.organizationId);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.update(id, req.user.organizationId, body);
  }

  @Post(':id/trigger')
  triggerManual(@Req() req: any, @Param('id') id: string) {
    return this.svc.triggerManual(id, req.user.organizationId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.svc.remove(id, req.user.organizationId);
  }
}
