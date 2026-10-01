import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query,
  Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  QUALITY_DOC_MAX_BYTES,
  QualityDocumentsService,
} from './quality-documents.service';

const uploadInterceptor = FileInterceptor('file', {
  limits: { fileSize: QUALITY_DOC_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!QualityDocumentsService.isAllowedFile(file.originalname)) {
      return cb(new BadRequestException('Tipo de ficheiro não permitido'), false);
    }
    cb(null, true);
  },
});

// Access is decided per management-system standard (ISO 9001 → "quality" module,
// ISO 14001 → "environment", …), so it is checked inside the service rather than
// with a single @RequireModule on the route.
@ApiTags('Quality Documents')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('quality-documents')
export class QualityDocumentsController {
  constructor(private readonly service: QualityDocumentsService) {}

  @Get('standards')
  @ApiOperation({ summary: 'Management-system standards the caller can see (and whether they can change them)' })
  standards(@CurrentUser('userId') userId: string) {
    return this.service.standards(userId);
  }

  @Get()
  list(
    @CurrentUser() user: any,
    @Query('standard') standard?: string,
    @Query('clause') clause?: string,
    @Query('status') status?: string,
    @Query('docType') docType?: string,
  ) {
    return this.service.list(user.organizationId, user.userId, { standard, clause, status, docType });
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.get(id, user.organizationId, user.userId);
  }

  @Get(':id/file')
  @ApiOperation({ summary: 'Download the current (or a given) version of the file' })
  async file(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
    @Query('versionId') versionId?: string,
  ) {
    const f = await this.service.getFile(id, versionId, user.organizationId, user.userId);
    res.set({
      'Content-Type': 'application/octet-stream', // never let the browser render user-supplied files inline
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(f.fileName)}`,
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(f.buffer);
  }

  @Post()
  @UseInterceptors(uploadInterceptor)
  @ApiConsumes('multipart/form-data')
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.service.create(user.organizationId, user.userId, body, file);
  }

  @Post(':id/versions')
  @UseInterceptors(uploadInterceptor)
  @ApiConsumes('multipart/form-data')
  addVersion(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.service.addVersion(id, user.organizationId, user.userId, body, file);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.service.update(id, user.organizationId, user.userId, body);
  }

  @Post(':id/submit')
  @HttpCode(200)
  submit(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.submit(id, user.organizationId, user.userId);
  }

  @Post(':id/approve')
  @HttpCode(200)
  approve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.approve(id, user.organizationId, user.userId);
  }

  @Post(':id/obsolete')
  @HttpCode(200)
  obsolete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.markObsolete(id, user.organizationId, user.userId);
  }

  @Post(':id/revert')
  @HttpCode(200)
  revert(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.revertToDraft(id, user.organizationId, user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user.organizationId, user.userId);
  }
}
