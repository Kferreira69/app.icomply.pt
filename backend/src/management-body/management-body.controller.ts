import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ManagementBodyService, AttendanceStatus } from './management-body.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { CreateDecisionDto } from './dto/create-decision.dto';
import { UpdateDecisionDto } from './dto/update-decision.dto';

@ApiTags('Management Body')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('management-body')
export class ManagementBodyController {
  constructor(private svc: ManagementBodyService) {}

  // ─── Members (existing) ──────────────────────────────────────

  @Get()
  getMembers(@CurrentUser('organizationId') o: string) {
    return this.svc.getMembers(o);
  }

  @Get('summary')
  getSummary(@CurrentUser('organizationId') o: string) {
    return this.svc.getLiabilitySummary(o);
  }

  @Post()
  addMember(
    @CurrentUser('organizationId') o: string,
    @Body() dto: any,
  ) {
    return this.svc.addMember(o, dto);
  }

  @Put(':id')
  updateMember(
    @Param('id') id: string,
    @CurrentUser('organizationId') o: string,
    @Body() dto: any,
  ) {
    return this.svc.updateMember(id, o, dto);
  }

  @Delete(':id')
  removeMember(
    @Param('id') id: string,
    @CurrentUser('organizationId') o: string,
  ) {
    return this.svc.removeMember(id, o);
  }

  @Post(':memberId/actions')
  addAction(
    @Param('memberId') mid: string,
    @CurrentUser('organizationId') o: string,
    @Body() dto: any,
  ) {
    return this.svc.addAction(mid, o, dto);
  }

  @Put('actions/:id/acknowledge')
  ack(
    @Param('id') id: string,
    @CurrentUser('organizationId') o: string,
  ) {
    return this.svc.acknowledgeAction(id, o);
  }

  // ─── Meetings ────────────────────────────────────────────────

  @Get('meetings')
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
  createMeeting(
    @CurrentUser('organizationId') o: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateMeetingDto,
  ) {
    return this.svc.createMeeting(o, userId, dto);
  }

  @Get('meetings/:id')
  getMeeting(
    @Param('id') id: string,
    @CurrentUser('organizationId') o: string,
  ) {
    return this.svc.getMeeting(id, o);
  }

  @Patch('meetings/:id')
  updateMeeting(
    @Param('id') id: string,
    @CurrentUser('organizationId') o: string,
    @Body() dto: UpdateMeetingDto,
  ) {
    return this.svc.updateMeeting(id, o, dto);
  }

  @Delete('meetings/:id')
  deleteMeeting(
    @Param('id') id: string,
    @CurrentUser('organizationId') o: string,
  ) {
    return this.svc.deleteMeeting(id, o);
  }

  @Patch('meetings/:id/minutes')
  saveMinutes(
    @Param('id') id: string,
    @CurrentUser('organizationId') o: string,
    @Body('minutes') minutes: string,
  ) {
    return this.svc.saveMinutes(id, o, minutes);
  }

  @Patch('meetings/:id/attendance/:userId')
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
  @ApiQuery({ name: 'status', required: false })
  getDecisions(
    @CurrentUser('organizationId') o: string,
    @Query('status') status?: string,
  ) {
    return this.svc.getDecisions(o, { status });
  }

  @Post('meetings/:id/decisions')
  addDecision(
    @Param('id') meetingId: string,
    @CurrentUser('organizationId') o: string,
    @Body() dto: CreateDecisionDto,
  ) {
    return this.svc.addDecision(meetingId, o, dto);
  }

  @Patch('decisions/:id')
  updateDecision(
    @Param('id') id: string,
    @CurrentUser('organizationId') o: string,
    @Body() dto: UpdateDecisionDto,
  ) {
    return this.svc.updateDecision(id, o, dto);
  }

  @Delete('decisions/:id')
  deleteDecision(
    @Param('id') id: string,
    @CurrentUser('organizationId') o: string,
  ) {
    return this.svc.deleteDecision(id, o);
  }
}
