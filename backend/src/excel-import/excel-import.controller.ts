import {
  Controller, Get, Post, Body, Param, Query,
  UploadedFile, UseInterceptors, Res, UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { ExcelImportService } from './excel-import.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@ApiTags('Excel Import')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('excel-import')
export class ExcelImportController {
  constructor(private service: ExcelImportService) {}

  @Post('upload')
  @RequireModule('excelImport', 2)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload Excel file for import' })
  importFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { type: string; mapping?: string; projectId?: string },
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
  ) {
    const mapping = body.mapping ? JSON.parse(body.mapping) : {};
    return this.service.importFile(file, body.type, mapping, orgId, body.projectId, userId);
  }

  @Get('history')
  @RequireModule('excelImport', 1)
  getHistory(@CurrentUser('organizationId') orgId: string) {
    return this.service.getHistory(orgId);
  }

  @Get('template')
  @RequireModule('excelImport', 1)
  @ApiOperation({ summary: 'Download Excel import template' })
  async downloadTemplate(
    @Query('type') type: string,
    @Res() res: Response,
  ) {
    const buffer = await this.service.downloadTemplate(type || 'TASKS');
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="icomply_${type}_template.xlsx"`,
    });
    res.send(buffer);
  }

  @Get(':id')
  @RequireModule('excelImport', 1)
  getStatus(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.getStatus(id, orgId);
  }
}
