import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Res, UseGuards, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { VendorsService } from './vendors.service';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@ApiTags('Vendors')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('vendors')
export class VendorsController {
  constructor(private readonly service: VendorsService) {}

  @Get('dashboard')
  @RequireModule('vendors', 1)
  @ApiOperation({ summary: 'Vendor risk dashboard stats' })
  getDashboard(@CurrentUser() user: any) {
    return this.service.getDashboard(user.organizationId);
  }

  @Get('export/csv')
  @RequireModule('vendors', 1)
  @ApiOperation({ summary: 'Export all vendors as CSV (UTF-8 BOM)' })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportCsv(@CurrentUser() user: any, @Res() res: Response) {
    const csv = await this.service.exportCsv(user.organizationId);
    res.setHeader('Content-Disposition', 'attachment; filename="vendors.csv"');
    res.send(csv);
  }

  // ── Assessment CRUD endpoints (must be before :id routes) ─────

  @Get('assessments')
  @RequireModule('vendors', 1)
  @ApiOperation({ summary: 'List all vendor assessments' })
  listAllAssessments(@CurrentUser() user: any) {
    return this.service.listAllAssessments(user.organizationId);
  }

  @Post('assessments')
  @RequireModule('vendors', 2)
  @ApiOperation({ summary: 'Create a vendor assessment' })
  createAssessment(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createAssessment(user.organizationId, user.id, dto);
  }

  @Patch('assessments/:id')
  @RequireModule('vendors', 2)
  @ApiOperation({ summary: 'Update a vendor assessment' })
  updateAssessment(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.service.updateAssessment(id, user.organizationId, dto);
  }

  // ── Vendor CRUD ───────────────────────────────────────────────

  @Post()
  @RequireModule('vendors', 2)
  @ApiOperation({ summary: 'Register a new vendor' })
  create(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.create(user.organizationId, dto);
  }

  @Get()
  @RequireModule('vendors', 1)
  @ApiOperation({ summary: 'List all vendors' })
  findAll(@CurrentUser() user: any, @Query() query: any) {
    return this.service.findAll(user.organizationId, query);
  }

  @Get(':id')
  @RequireModule('vendors', 1)
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user.organizationId);
  }

  @Patch(':id')
  @RequireModule('vendors', 2)
  update(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.service.update(id, user.organizationId, dto);
  }

  @Delete(':id')
  @RequireModule('vendors', 2)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user.organizationId);
  }

  @Post(':id/assessments')
  @RequireModule('vendors', 2)
  @ApiOperation({ summary: 'Add a risk assessment to a vendor (updates risk score)' })
  addAssessment(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.service.addAssessment(id, user.organizationId, user.id, dto);
  }
}
