import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, Req, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ActionPlansService } from './action-plans.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ActionPlanStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('action-plans')
export class ActionPlansController {
  constructor(private readonly svc: ActionPlansService) {}

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.svc.create(req.user.organizationId, req.user.id, body);
  }

  @Get()
  findAll(@Req() req: any, @Query('status') status?: ActionPlanStatus) {
    return this.svc.findAll(req.user.organizationId, status);
  }

  @Get('summary')
  getSummary(@Req() req: any) {
    return this.svc.getSummary(req.user.organizationId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.svc.findOne(id, req.user.organizationId);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.update(id, req.user.organizationId, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.svc.remove(id, req.user.organizationId);
  }

  @Post(':id/tasks')
  createTask(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.createTask(id, req.user.organizationId, body);
  }

  @Patch(':id/tasks/:taskId')
  updateTask(@Req() req: any, @Param('taskId') taskId: string, @Body() body: any) {
    return this.svc.updateTask(taskId, req.user.organizationId, body);
  }

  @Delete(':id/tasks/:taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTask(@Req() req: any, @Param('taskId') taskId: string) {
    return this.svc.removeTask(taskId, req.user.organizationId);
  }
}
