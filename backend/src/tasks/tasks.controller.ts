import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  ParseIntPipe, DefaultValuePipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AddDependencyDto } from './dto/add-dependency.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TaskStatus, TaskPriority } from '../generated/prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@ApiTags('Tasks')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tasks')
export class TasksController {
  constructor(private service: TasksService) {}

  @Post()
  @RequireModule('tasks', 2)
  create(
    @Body() dto: CreateTaskDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.create(dto, userId, orgId);
  }

  @Get()
  @RequireModule('tasks', 1)
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'assigneeId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
  @ApiQuery({ name: 'priority', required: false, enum: TaskPriority })
  @ApiQuery({ name: 'overdue', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, description: 'Filter tasks by title (case-insensitive)' })
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('projectId') projectId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: TaskPriority,
    @Query('overdue') overdue?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(
      orgId, projectId, assigneeId, status, priority,
      overdue === 'true', page, limit, search,
    );
  }

  @Get(':id')
  @RequireModule('tasks', 1)
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.getWithDependencies(id, orgId);
  }

  @Patch(':id')
  @RequireModule('tasks', 2)
  update(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.service.update(id, orgId, dto, userId);
  }

  @Post(':id/comments')
  @RequireModule('tasks', 2)
  addComment(
    @Param('id') taskId: string,
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body('content') content: string,
  ) {
    return this.service.addComment(taskId, orgId, userId, content);
  }

  @Patch('bulk/status')
  @RequireModule('tasks', 2)
  bulkUpdateStatus(
    @Body('ids') ids: string[],
    @Body('status') status: TaskStatus,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.bulkUpdateStatus(ids, status, orgId);
  }

  // ─── Dependencies ────────────────────────────────────────────

  @Post(':id/dependencies')
  @RequireModule('tasks', 2)
  @ApiOperation({ summary: 'Add a blocking dependency to a task' })
  addDependency(
    @Param('id') dependentTaskId: string,
    @Body() dto: AddDependencyDto,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.addDependency(dependentTaskId, dto.blockingTaskId, orgId);
  }

  @Delete(':id/dependencies/:blockingTaskId')
  @RequireModule('tasks', 2)
  @ApiOperation({ summary: 'Remove a blocking dependency from a task' })
  removeDependency(
    @Param('id') dependentTaskId: string,
    @Param('blockingTaskId') blockingTaskId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.removeDependency(dependentTaskId, blockingTaskId, orgId);
  }
}
