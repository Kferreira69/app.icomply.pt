import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TimeTrackingService } from './time-tracking.service';
import { StartTimerDto } from './dto/start-timer.dto';
import { CreateManualEntryDto } from './dto/create-manual-entry.dto';

@ApiTags('Time Tracking')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('time-tracking')
export class TimeTrackingController {
  constructor(private service: TimeTrackingService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start a timer for a task' })
  startTimer(
    @Body() dto: StartTimerDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.startTimer(dto, userId, orgId);
  }

  @Patch(':id/stop')
  @ApiOperation({ summary: 'Stop a running timer' })
  stopTimer(
    @Param('id') entryId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.stopTimer(entryId, userId, orgId);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my time entries (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMyEntries(
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') orgId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.getMyTimeEntries(userId, orgId, page, limit);
  }

  @Get('task/:taskId')
  @ApiOperation({ summary: 'Get all time entries for a specific task' })
  getTaskEntries(
    @Param('taskId') taskId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.getTaskTimeEntries(taskId, orgId);
  }

  @Get('project/:projectId/report')
  @ApiOperation({ summary: 'Get time report grouped by task for a project' })
  getProjectReport(
    @Param('projectId') projectId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.getProjectTimeReport(projectId, orgId);
  }

  @Post('manual')
  @ApiOperation({ summary: 'Create a manual time entry with start and end times' })
  createManualEntry(
    @Body() dto: CreateManualEntryDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.createManualEntry(dto, userId, orgId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a time entry (own entries only)' })
  deleteEntry(
    @Param('id') entryId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.deleteEntry(entryId, userId, orgId);
  }
}
