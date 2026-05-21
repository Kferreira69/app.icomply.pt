import {
  Controller, Get, Post, Body, Param, Query,
  UploadedFile, UseInterceptors, Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { ExcelImportService } from './excel-import.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Excel Import')
@ApiBearerAuth('JWT')
@Controller('excel-import')
export class ExcelImportController {
  constructor(private service: ExcelImportService) {}

  @Post('upload')
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
  getHistory(@CurrentUser('organizationId') orgId: string) {
    return this.service.getHistory(orgId);
  }

  @Get('template')
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
  getStatus(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.getStatus(id, orgId);
  }
}
