import { Controller, Get, Patch, Body, Param, Query, UseGuards, Res, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProduces } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SoaService } from './soa.service';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@ApiTags('SoA')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('soa')
export class SoaController {
  constructor(private readonly service: SoaService) {}

  @Get('dashboard')
  @RequireModule('soa', 1)
  @ApiOperation({ summary: 'SoA dashboard — score and theme breakdown' })
  getDashboard(@CurrentUser() user: any) {
    return this.service.getDashboard(user.organizationId);
  }

  @Get('export/csv')
  @RequireModule('soa', 1)
  @ApiOperation({ summary: 'Export SoA as CSV (ISO 27001:2022 format)' })
  @ApiProduces('text/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportCsv(@CurrentUser() user: any, @Res() res: Response) {
    const csv = await this.service.exportCsv(user.organizationId);
    res.setHeader('Content-Disposition', 'attachment; filename="soa-iso27001-2022.csv"');
    res.send(csv);
  }

  @Get()
  @RequireModule('soa', 1)
  @ApiOperation({ summary: 'List all ISO 27001:2022 controls' })
  findAll(@CurrentUser() user: any, @Query('theme') theme?: string) {
    return this.service.findAll(user.organizationId, theme);
  }

  @Patch('bulk')
  @RequireModule('soa', 2)
  @ApiOperation({ summary: 'Bulk-update multiple controls' })
  bulkUpdate(@Body() body: { updates: any[] }, @CurrentUser() user: any) {
    return this.service.bulkUpdate(user.organizationId, body.updates);
  }

  @Patch(':controlCode')
  @RequireModule('soa', 2)
  @ApiOperation({ summary: 'Update a single control status / notes' })
  update(
    @Param('controlCode') controlCode: string,
    @Body() dto: any,
    @CurrentUser() user: any,
  ) {
    return this.service.update(controlCode, user.organizationId, dto);
  }
}
