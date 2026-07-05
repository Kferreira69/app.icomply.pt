import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { CreateDecisionDto } from './dto/create-decision.dto';
import { UpdateDecisionDto } from './dto/update-decision.dto';

export type AttendanceStatus = 'PRESENT' | 'REMOTE' | 'ABSENT';

@Injectable()
export class ManagementBodyService {
  constructor(private prisma: PrismaService) {}

  // ─── Members ────────────────────────────────────────────────

  async getMembers(organizationId: string) {
    return (this.prisma as any).managementBodyMember.findMany({
      where: { organizationId, isActive: true },
      include: { actions: { orderBy: { createdAt: 'desc' } } },
      orderBy: { name: 'asc' },
    });
  }

  async addMember(organizationId: string, dto: any) {
    return (this.prisma as any).managementBodyMember.create({ data: { ...dto, organizationId } });
  }

  async updateMember(id: string, organizationId: string, dto: any) {
    const m = await (this.prisma as any).managementBodyMember.findFirst({ where: { id, organizationId } });
    if (!m) throw new NotFoundException();
    return (this.prisma as any).managementBodyMember.update({ where: { id }, data: dto });
  }

  async removeMember(id: string, organizationId: string) {
    const m = await (this.prisma as any).managementBodyMember.findFirst({ where: { id, organizationId } });
    if (!m) throw new NotFoundException();
    return (this.prisma as any).managementBodyMember.update({ where: { id }, data: { isActive: false } });
  }

  async addAction(memberId: string, organizationId: string, dto: any) {
    const m = await (this.prisma as any).managementBodyMember.findFirst({ where: { id: memberId, organizationId } });
    if (!m) throw new NotFoundException();
    return (this.prisma as any).managementBodyAction.create({ data: { ...dto, memberId } });
  }

  async acknowledgeAction(actionId: string, organizationId: string) {
    const action = await (this.prisma as any).managementBodyAction.findFirst({
      where: { id: actionId, member: { organizationId } },
    });
    if (!action) throw new NotFoundException();
    return (this.prisma as any).managementBodyAction.update({ where: { id: actionId }, data: { acknowledgedAt: new Date() } });
  }

  async getLiabilitySummary(organizationId: string) {
    const members = await this.getMembers(organizationId);
    return members.map((m: any) => ({
      ...m,
      totalActions: m.actions.length,
      acknowledged: m.actions.filter((a: any) => a.acknowledgedAt).length,
      pending: m.actions.filter((a: any) => !a.acknowledgedAt).length,
      complianceRate: m.actions.length > 0
        ? Math.round((m.actions.filter((a: any) => a.acknowledgedAt).length / m.actions.length) * 100)
        : 0,
    }));
  }

  // ─── Meetings ────────────────────────────────────────────────

  async getMeetings(orgId: string, filters?: { status?: string; type?: string }) {
    const where: any = { organizationId: orgId };
    if (filters?.status) where.status = filters.status;
    if (filters?.type)   where.type   = filters.type;

    return (this.prisma as any).meeting.findMany({
      where,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        attendances: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        decisions: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async getMeeting(id: string, orgId: string) {
    const meeting = await (this.prisma as any).meeting.findFirst({
      where: { id, organizationId: orgId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        attendances: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        decisions: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!meeting) throw new NotFoundException(`Meeting ${id} not found`);
    return meeting;
  }

  async createMeeting(orgId: string, userId: string, dto: CreateMeetingDto) {
    return (this.prisma as any).meeting.create({
      data: {
        organizationId: orgId,
        createdById:    userId,
        title:          dto.title,
        type:           dto.type ?? 'ORDINARY',
        scheduledAt:    new Date(dto.scheduledAt),
        location:       dto.location,
        videoUrl:       dto.videoUrl,
        agenda:         dto.agenda,
        notes:          dto.notes,
        quorumRequired: dto.quorumRequired ?? 0,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        attendances: true,
        decisions:   true,
      },
    });
  }

  async updateMeeting(id: string, orgId: string, dto: UpdateMeetingDto) {
    await this.getMeeting(id, orgId); // throws if not found / wrong org
    const data: any = { ...dto };
    if (dto.scheduledAt) data.scheduledAt = new Date(dto.scheduledAt);
    return (this.prisma as any).meeting.update({ where: { id }, data });
  }

  async deleteMeeting(id: string, orgId: string) {
    await this.getMeeting(id, orgId);
    return (this.prisma as any).meeting.delete({ where: { id } });
  }

  async cancelMeeting(id: string, orgId: string) {
    await this.getMeeting(id, orgId);
    return (this.prisma as any).meeting.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  // ─── Minutes ─────────────────────────────────────────────────

  async saveMinutes(id: string, orgId: string, minutes: string) {
    await this.getMeeting(id, orgId);
    return (this.prisma as any).meeting.update({
      where: { id },
      data: {
        minutes,
        minutesSavedAt: new Date(),
        status: 'COMPLETED',
      },
    });
  }

  // ─── Attendance ───────────────────────────────────────────────

  async updateAttendance(meetingId: string, orgId: string, userId: string, status: AttendanceStatus) {
    await this.getMeeting(meetingId, orgId);

    // Fetch user name for denormalization
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    const name = user ? `${user.firstName} ${user.lastName}` : userId;

    return (this.prisma as any).meetingAttendance.upsert({
      where: { meetingId_userId: { meetingId, userId } },
      create: { meetingId, userId, name, status },
      update: { status },
    });
  }

  // ─── Decisions ────────────────────────────────────────────────

  async getDecisions(orgId: string, filters?: { status?: string }) {
    const where: any = { meeting: { organizationId: orgId } };
    if (filters?.status) where.status = filters.status;

    return (this.prisma as any).meetingDecision.findMany({
      where,
      include: {
        meeting: { select: { id: true, title: true, scheduledAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addDecision(meetingId: string, orgId: string, dto: CreateDecisionDto) {
    await this.getMeeting(meetingId, orgId);
    return (this.prisma as any).meetingDecision.create({
      data: {
        meetingId,
        text:        dto.text,
        responsible: dto.responsible,
        deadline:    dto.deadline ? new Date(dto.deadline) : undefined,
      },
    });
  }

  async updateDecision(id: string, orgId: string, dto: UpdateDecisionDto) {
    const decision = await (this.prisma as any).meetingDecision.findFirst({
      where: { id, meeting: { organizationId: orgId } },
    });
    if (!decision) throw new NotFoundException(`Decision ${id} not found`);

    const data: any = { ...dto };
    if (dto.deadline) data.deadline = new Date(dto.deadline);

    return (this.prisma as any).meetingDecision.update({ where: { id }, data });
  }

  async deleteDecision(id: string, orgId: string) {
    const decision = await (this.prisma as any).meetingDecision.findFirst({
      where: { id, meeting: { organizationId: orgId } },
    });
    if (!decision) throw new NotFoundException(`Decision ${id} not found`);
    return (this.prisma as any).meetingDecision.delete({ where: { id } });
  }
}
