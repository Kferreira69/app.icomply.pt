import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';
import { ManagementBodyService, AttendanceStatus } from './management-body.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { CreateDecisionDto } from './dto/create-decision.dto';
import { UpdateDecisionDto } from './dto/update-decision.dto';

@ApiTags('Management Body')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('management-body')
export class ManagementBodyController {
  constructor(private svc: ManagementBodyService) {}

  // ─── Members (existing) ──────────────────────────────────────

  @Get()
  @RequireModule('governance', 1)
  getMembers(@CurrentUser('organizationId') o: string) {
    return this.svc.getMembers(o);
  }

  @Get('summary')
  @RequireModule('governance', 1)
  getSummary(@CurrentUser('organizationId') o: string) {
    return this.svc.getLiabilitySummary(o);
  }

  @Post()
  @RequireModule('governance', 2)
  addMember(
    @CurrentUser('organizationId') o: string,
    @Body() dto: any,
  ) {
    return this.svc.addMember(o, dto);
  }

  @Put(':id')
  @RequireModule('governance', 2)
  updateMember(
    @Param('id') id: string,
    @CurrentUser('organizationId') o: string,
    @Body() dto: any,
  ) {
    return this.svc.updateMember(id, o, dto);
  }

  @Delete(':id')
  @RequireModule('governance', 2)
  removeMember(
    @Param('id') id: string,
    @CurrentUser('organizationId') o: string,
  ) {
    return this.svc.removeMember(id, o);
  }

  @Post(':memberId/actions')
  @RequireModule('governance', 2)
  addAction(
    @Param('memberId') mid: string,
    @CurrentUser('organizationId') o: string,
    @Body() dto: any,
  ) {
    return this.svc.addAction(mid, o, dto);
  }

  @Put('actions/:id/acknowledge')
  @RequireModule('governance', 2)
  ack(
    @Param('id') id: string,
    @CurrentUser('organizationId') o: string,
  ) {
    return this.svc.acknowledgeAction(id, o);
  }

  // ─── Meetings ────────────────────────────────────────────────

  @Get('meetings')
  @RequireModule('governance', 1)
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type',   required: false })
  getMeetings(
    @CurrentUser('organizationId') o: string,
    @Query('status') status?: string,
    @Query('type')   type?: string,
  ) {
    return this.svc.getMeetings(o, { status, type });
  }

  @Post('meetings')
  @RequireModule('governance', 2)
  createMeeting(
    @CurrentUser('organizationId') o: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateMeetingDto,
  ) {
    return this.svc.createMeeting(o, userId, dto);
  }

  @Get('meetings/:id')
  @RequireModule('governance', 1)
  getMeeting(
    @Param('id') id: string,
    @CurrentUser('organizationId') o: string,
  ) {
    return this.svc.getMeeting(id, o);
  }

  @Patch('meetings/:id')
  @RequireModule('governance', 2)
  updateMeeting(
    @Param('id') id: string,
    @CurrentUser('organizationId') o: string,
    @Body() dto: UpdateMeetingDto,
  ) {
    return this.svc.updateMeeting(id, o, dto);
  }

  @Delete('meetings/:id')
  @RequireModule('governance', 2)
  deleteMeeting(
    @Param('id') id: string,
    @CurrentUser('organizationId') o: string,
  ) {
    return this.svc.deleteMeeting(id, o);
  }

  @Patch('meetings/:id/minutes')
  @RequireModule('governance', 2)
  saveMinutes(
    @Param('id') id: string,
    @CurrentUser('organizationId') o: string,
    @Body('minutes') minutes: string,
  ) {
    return this.svc.saveMinutes(id, o, minutes);
  }

  @Patch('meetings/:id/attendance/:userId')
  @RequireModule('governance', 2)
  updateAttendance(
    @Param('id') meetingId: string,
    @Param('userId') userId: string,
    @CurrentUser('organizationId') o: string,
    @Body('status') status: AttendanceStatus,
  ) {
    return this.svc.updateAttendance(meetingId, o, userId, status);
  }

  // ─── Decisions ────────────────────────────────────────────────

  @Get('decisions')
  @RequireModule('governance', 1)
  @ApiQuery({ name: 'status', required: false })
  getDecisions(
    @CurrentUser('organizationId') o: string,
    @Query('status') status?: string,
  ) {
    return this.svc.getDecisions(o, { status });
  }

  @Post('meetings/:id/decisions')
  @RequireModule('governance', 2)
  addDecision(
    @Param('id') meetingId: string,
    @CurrentUser('organizationId') o: string,
    @Body() dto: CreateDecisionDto,
  ) {
    return this.svc.addDecision(meetingId, o, dto);
  }

  @Patch('decisions/:id')
  @RequireModule('governance', 2)
  updateDecision(
    @Param('id') id: string,
    @CurrentUser('organizationId') o: string,
    @Body() dto: UpdateDecisionDto,
  ) {
    return this.svc.updateDecision(id, o, dto);
  }

  @Delete('decisions/:id')
  @RequireModule('governance', 2)
  deleteDecision(
    @Param('id') id: string,
    @CurrentUser('organizationId') o: string,
  ) {
    return this.svc.deleteDecision(id, o);
  }
}
