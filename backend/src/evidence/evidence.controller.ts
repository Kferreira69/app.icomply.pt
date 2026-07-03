import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
  UploadedFile, UseInterceptors, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { EvidenceService } from './evidence.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EvidenceStatus } from '../generated/prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@ApiTags('Evidence')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('evidence')
export class EvidenceController {
  constructor(private service: EvidenceService) {}

  @Post('upload')
  @RequireModule('evidence', 2)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload evidence file' })
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.upload(file, body, userId, orgId);
  }

  @Get()
  @RequireModule('evidence', 1)
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'taskId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: EvidenceStatus })
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('projectId') projectId?: string,
    @Query('taskId') taskId?: string,
    @Query('status') status?: EvidenceStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.service.findAll(orgId, projectId, taskId, status, page, limit);
  }

  @Get('gap-analysis')
  @RequireModule('evidence', 1)
  @ApiOperation({ summary: 'Evidence gap analysis for a framework' })
  getGapAnalysis(
    @CurrentUser('organizationId') orgId: string,
    @Query('frameworkId') frameworkId: string,
  ) {
    return this.service.getGapAnalysis(orgId, frameworkId);
  }

  @Get(':id')
  @RequireModule('evidence', 1)
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.findOne(id, orgId);
  }

  @Patch(':id/status')
  @RequireModule('evidence', 2)
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: EvidenceStatus,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.updateStatus(id, status, orgId);
  }

  @Patch('bulk/status')
  @RequireModule('evidence', 2)
  @ApiOperation({ summary: 'Bulk update evidence status' })
  bulkUpdateStatus(
    @Body() body: { ids: string[]; status: EvidenceStatus },
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.bulkUpdateStatus(body.ids, body.status, orgId);
  }
}
