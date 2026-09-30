import {
  BadRequestException, Controller, Get, Post, Patch, Delete, Body, Param,
  Query, UseGuards, Req, Res, HttpCode, StreamableFile, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PoliciesService } from './policies.service';
import { PolicyAttachmentsService } from './policy-attachments.service';
import { DOC_MAX_BYTES, isAllowedDocFile } from '../common/storage/upload-rules';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { PolicyStatus } from '../generated/prisma/client';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

const attachmentUpload = FileInterceptor('file', {
  limits: { fileSize: DOC_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!isAllowedDocFile(file.originalname)) {
      return cb(new BadRequestException('Tipo de ficheiro não permitido'), false);
    }
    cb(null, true);
  },
});

@ApiTags('Policies')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('policies')
export class PoliciesController {
  constructor(
    private readonly service: PoliciesService,
    private readonly attachments: PolicyAttachmentsService,
  ) {}

  @Post()
  @RequireModule('policies', 2)
  @ApiOperation({ summary: 'Create a new policy' })
  create(@Body() dto: CreatePolicyDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.id, user.organizationId);
  }

  @Get()
  @RequireModule('policies', 1)
  @ApiOperation({ summary: 'List all policies' })
  findAll(
    @CurrentUser() user: any,
    @Query('status') status?: PolicyStatus,
    @Query('category') category?: string,
  ) {
    return this.service.findAll(user.organizationId, status, category);
  }

  @Get('stats')
  @RequireModule('policies', 1)
  @ApiOperation({ summary: 'Get policy statistics' })
  getStats(@CurrentUser() user: any) {
    return this.service.getStats(user.organizationId);
  }

  @Get(':id')
  @RequireModule('policies', 1)
  @ApiOperation({ summary: 'Get policy detail with versions and acknowledgments' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user.organizationId);
  }

  @Patch(':id')
  @RequireModule('policies', 2)
  @ApiOperation({ summary: 'Update policy content (auto-versions if content changes)' })
  update(
    @Param('id') id: string,
    @Body() data: Partial<CreatePolicyDto> & { changeNote?: string },
    @CurrentUser() user: any,
  ) {
    return this.service.update(id, user.organizationId, data, user.id);
  }

  @Post(':id/submit')
  @RequireModule('policies', 2)
  @ApiOperation({ summary: 'Submit policy for review' })
  @HttpCode(200)
  submitForReview(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.submitForReview(id, user.organizationId);
  }

  @Post(':id/approve')
  @RequireModule('policies', 2)
  @ApiOperation({ summary: 'Approve policy' })
  @HttpCode(200)
  approve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.approve(id, user.organizationId, user.id);
  }

  @Post(':id/archive')
  @RequireModule('policies', 2)
  @ApiOperation({ summary: 'Archive policy' })
  @HttpCode(200)
  archive(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.archive(id, user.organizationId);
  }

  @Post(':id/revert')
  @RequireModule('policies', 2)
  @ApiOperation({ summary: 'Revert policy to DRAFT' })
  @HttpCode(200)
  revertToDraft(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.revertToDraft(id, user.organizationId);
  }

  @Post(':id/acknowledge')
  @RequireModule('policies', 2)
  @ApiOperation({ summary: 'Acknowledge that you have read this policy' })
  @HttpCode(200)
  acknowledge(@Param('id') id: string, @CurrentUser() user: any, @Req() req: any) {
    const ip = req.ip || req.headers['x-forwarded-for'];
    return this.service.acknowledge(id, user.organizationId, user.id, ip);
  }

  @Get(':id/acknowledgment-status')
  @RequireModule('policies', 1)
  @ApiOperation({ summary: 'Get acknowledgment statistics for a policy' })
  getAcknowledgmentStatus(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.getAcknowledgmentStatus(id, user.organizationId);
  }

  // ── Attachments (Word/PDF/… files with their own version history) ──

  @Get(':id/attachments')
  @RequireModule('policies', 1)
  @ApiOperation({ summary: 'List policy attachments with version history' })
  listAttachments(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.attachments.list(id, orgId);
  }

  @Post(':id/attachments')
  @RequireModule('policies', 2)
  @UseInterceptors(attachmentUpload)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Attach a file to a policy (sends an approved policy back to DRAFT)' })
  addAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.attachments.add(id, user.organizationId, user.userId, body, file);
  }

  @Post(':id/attachments/:attId/versions')
  @RequireModule('policies', 2)
  @UseInterceptors(attachmentUpload)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a new version of an attachment (sends an approved policy back to DRAFT)' })
  addAttachmentVersion(
    @Param('id') id: string,
    @Param('attId') attId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.attachments.addVersion(id, attId, user.organizationId, user.userId, body, file);
  }

  @Get(':id/attachments/:attId/file')
  @RequireModule('policies', 1)
  @ApiOperation({ summary: 'Download the current (or a given) version of an attachment' })
  async downloadAttachment(
    @Param('id') id: string,
    @Param('attId') attId: string,
    @CurrentUser('organizationId') orgId: string,
    @Res({ passthrough: true }) res: Response,
    @Query('versionId') versionId?: string,
  ) {
    const f = await this.attachments.getFile(id, attId, versionId, orgId);
    res.set({
      'Content-Type': 'application/octet-stream', // never render user-supplied files inline
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(f.fileName)}`,
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(f.buffer);
  }

  @Delete(':id/attachments/:attId')
  @RequireModule('policies', 2)
  @ApiOperation({ summary: 'Delete an attachment and all its versions' })
  removeAttachment(
    @Param('id') id: string,
    @Param('attId') attId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.attachments.remove(id, attId, orgId);
  }

  @Delete(':id')
  @RequireModule('policies', 2)
  @ApiOperation({ summary: 'Delete a policy' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user.organizationId);
  }
}
