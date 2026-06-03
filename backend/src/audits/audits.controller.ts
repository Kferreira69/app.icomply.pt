import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditsService } from './audits.service';
import { CreateAuditDto } from './dto/create-audit.dto';
import { CreateFindingDto } from './dto/create-finding.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditStatus } from '@prisma/client';

@ApiTags('Audits')
@ApiBearerAuth('JWT')
@Controller('audits')
export class AuditsController {
  constructor(private service: AuditsService) {}

  @Post()
  create(@Body() dto: CreateAuditDto, @CurrentUser('organizationId') orgId: string) {
    return this.service.create(dto, orgId);
  }

  @Get()
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: AuditStatus,
  ) {
    return this.service.findAll(orgId, projectId, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.findOne(id, orgId);
  }

  @Patch(':id')
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
  updateStatus(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() body: { status: AuditStatus; summary?: string; score?: number },
  ) {
    return this.service.updateStatus(id, body.status, orgId, body.summary, body.score);
  }

  @Post(':id/findings')
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
  updateFindingNested(
    @Param('auditId') auditId: string,
    @Param('findingId') findingId: string,
    @Body() dto: Partial<CreateFindingDto>,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.updateFinding(findingId, dto, orgId);
  }

  @Patch('findings/:id')
  updateFinding(
    @Param('id') id: string,
    @Body() dto: Partial<CreateFindingDto>,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.updateFinding(id, dto, orgId);
  }
}
