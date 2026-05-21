import {
  Controller, Get, Post, Patch, Body, Param, Query,
  ParseIntPipe, DefaultValuePipe, ParseBoolPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TaskStatus, TaskPriority } from '@prisma/client';

@ApiTags('Tasks')
@ApiBearerAuth('JWT')
@Controller('tasks')
export class TasksController {
  constructor(private service: TasksService) {}

  @Post()
  create(
    @Body() dto: CreateTaskDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.create(dto, userId, orgId);
  }

  @Get()
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'assigneeId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
  @ApiQuery({ name: 'priority', required: false, enum: TaskPriority })
  @ApiQuery({ name: 'overdue', required: false, type: Boolean })
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('projectId') projectId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: TaskPriority,
    @Query('overdue') overdue?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.service.findAll(
      orgId, projectId, assigneeId, status, priority,
      overdue === 'true', page, limit,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.findOne(id, orgId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.service.update(id, orgId, dto, userId);
  }

  @Post(':id/comments')
  addComment(
    @Param('id') taskId: string,
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body('content') content: string,
  ) {
    return this.service.addComment(taskId, orgId, userId, content);
  }

  @Patch('bulk/status')
  bulkUpdateStatus(
    @Body('ids') ids: string[],
    @Body('status') status: TaskStatus,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.bulkUpdateStatus(ids, status, orgId);
  }
}
