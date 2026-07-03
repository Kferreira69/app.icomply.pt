import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, Req, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ActionPlansService } from './action-plans.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ActionPlanStatus } from '../generated/prisma/client';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('action-plans')
export class ActionPlansController {
  constructor(private readonly svc: ActionPlansService) {}

  @Post()
  @RequireModule('capa', 2)
  create(@Req() req: any, @Body() body: any) {
    return this.svc.create(req.user.organizationId, req.user.id, body);
  }

  @Get()
  @RequireModule('capa', 1)
  findAll(@Req() req: any, @Query('status') status?: ActionPlanStatus) {
    return this.svc.findAll(req.user.organizationId, status);
  }

  @Get('summary')
  @RequireModule('capa', 1)
  getSummary(@Req() req: any) {
    return this.svc.getSummary(req.user.organizationId);
  }

  @Get(':id')
  @RequireModule('capa', 1)
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.svc.findOne(id, req.user.organizationId);
  }

  @Patch(':id')
  @RequireModule('capa', 2)
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.update(id, req.user.organizationId, body);
  }

  @Delete(':id')
  @RequireModule('capa', 2)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.svc.remove(id, req.user.organizationId);
  }

  @Post(':id/tasks')
  @RequireModule('capa', 2)
  createTask(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.createTask(id, req.user.organizationId, body);
  }

  @Patch(':id/tasks/:taskId')
  @RequireModule('capa', 2)
  updateTask(@Req() req: any, @Param('taskId') taskId: string, @Body() body: any) {
    return this.svc.updateTask(taskId, req.user.organizationId, body);
  }

  @Delete(':id/tasks/:taskId')
  @RequireModule('capa', 2)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTask(@Req() req: any, @Param('taskId') taskId: string) {
    return this.svc.removeTask(taskId, req.user.organizationId);
  }
}
