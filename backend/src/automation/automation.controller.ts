import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Req, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AutomationService } from './automation.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('automation')
export class AutomationController {
  constructor(private readonly svc: AutomationService) {}

  @Post()
  @RequireModule('automation', 2)
  create(@Req() req: any, @Body() body: any) {
    return this.svc.create(req.user.organizationId, req.user.id, body);
  }

  @Get()
  @RequireModule('automation', 1)
  findAll(@Req() req: any) {
    return this.svc.findAll(req.user.organizationId);
  }

  @Get('summary')
  @RequireModule('automation', 1)
  getSummary(@Req() req: any) {
    return this.svc.getSummary(req.user.organizationId);
  }

  @Get(':id/logs')
  @RequireModule('automation', 1)
  getLogs(@Req() req: any, @Param('id') id: string) {
    return this.svc.getLogs(id, req.user.organizationId);
  }

  @Patch(':id')
  @RequireModule('automation', 2)
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.update(id, req.user.organizationId, body);
  }

  @Post(':id/trigger')
  @RequireModule('automation', 2)
  triggerManual(@Req() req: any, @Param('id') id: string) {
    return this.svc.triggerManual(id, req.user.organizationId);
  }

  @Delete(':id')
  @RequireModule('automation', 2)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.svc.remove(id, req.user.organizationId);
  }
}
