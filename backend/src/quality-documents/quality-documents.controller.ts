import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';
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

@ApiTags('Quality Documents')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('quality-documents')
export class QualityDocumentsController {
  constructor(private readonly service: QualityDocumentsService) {}

  @Get()
  @RequireModule('quality', 1)
  list(
    @CurrentUser('organizationId') orgId: string,
    @Query('clause') clause?: string,
    @Query('status') status?: string,
    @Query('docType') docType?: string,
  ) {
    return this.service.list(orgId, { clause, status, docType });
  }

  @Get(':id')
  @RequireModule('quality', 1)
  get(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.get(id, orgId);
  }

  @Get(':id/download')
  @RequireModule('quality', 1)
  @ApiOperation({ summary: 'Short-lived download URL for the current (or a given) version' })
  download(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Query('versionId') versionId?: string,
  ) {
    return this.service.getDownloadUrl(id, versionId, orgId);
  }

  @Post()
  @RequireModule('quality', 2)
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
  @RequireModule('quality', 2)
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
  @RequireModule('quality', 2)
  update(@Param('id') id: string, @Body() body: any, @CurrentUser('organizationId') orgId: string) {
    return this.service.update(id, orgId, body);
  }

  @Post(':id/submit')
  @RequireModule('quality', 2)
  @HttpCode(200)
  submit(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.submit(id, orgId);
  }

  @Post(':id/approve')
  @RequireModule('quality', 2)
  @HttpCode(200)
  approve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.approve(id, user.organizationId, user.userId);
  }

  @Post(':id/obsolete')
  @RequireModule('quality', 2)
  @HttpCode(200)
  obsolete(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.markObsolete(id, orgId);
  }

  @Post(':id/revert')
  @RequireModule('quality', 2)
  @HttpCode(200)
  revert(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.revertToDraft(id, orgId);
  }

  @Delete(':id')
  @RequireModule('quality', 2)
  remove(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.remove(id, orgId);
  }
}
