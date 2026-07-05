import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditsService } from './audits.service';
import { CreateAuditDto } from './dto/create-audit.dto';
import { CreateFindingDto } from './dto/create-finding.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditStatus } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@ApiTags('Audits')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('audits')
export class AuditsController {
  constructor(private service: AuditsService) {}

  @Post()
  @RequireModule('audits', 2)
  create(@Body() dto: CreateAuditDto, @CurrentUser('organizationId') orgId: string) {
    return this.service.create(dto, orgId);
  }

  @Get()
  @RequireModule('audits', 1)
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: AuditStatus,
  ) {
    return this.service.findAll(orgId, projectId, status);
  }

  @Get(':id')
  @RequireModule('audits', 1)
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.findOne(id, orgId);
  }

  @Patch(':id')
  @RequireModule('audits', 2)
  update(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() body: any,
  ) {
    if (body.status) {
      return this.service.updateStatus(id, body.status, orgId, body.summary, body.score);
    }
    return this.service.update(id, body, orgId);
  }

  @Patch(':id/status')
  @RequireModule('audits', 2)
  updateStatus(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() body: { status: AuditStatus; summary?: string; score?: number },
  ) {
    return this.service.updateStatus(id, body.status, orgId, body.summary, body.score);
  }

  @Get('findings')
  @RequireModule('audits', 1)
  @ApiOperation({ summary: 'List all findings across audits for the organization' })
  listFindings(
    @CurrentUser('organizationId') orgId: string,
    @Query('auditId') auditId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.listFindings(orgId, auditId, status);
  }

  @Post(':id/findings')
  @RequireModule('audits', 2)
  @ApiOperation({ summary: 'Add a finding (HIGH/CRITICAL auto-creates CAPA)' })
  createFinding(
    @Param('id') auditId: string,
    @Body() dto: CreateFindingDto,
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.createFinding(auditId, dto, orgId, userId);
  }

  @Patch(':auditId/findings/:findingId')
  @RequireModule('audits', 2)
  updateFindingNested(
    @Param('auditId') auditId: string,
    @Param('findingId') findingId: string,
    @Body() dto: Partial<CreateFindingDto>,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.updateFinding(findingId, dto, orgId);
  }

  @Patch('findings/:id')
  @RequireModule('audits', 2)
  updateFinding(
    @Param('id') id: string,
    @Body() dto: Partial<CreateFindingDto>,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.updateFinding(id, dto, orgId);
  }
}
