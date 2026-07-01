import { Controller, Get, Post, Put, Delete, Body, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DoraRegisterService } from './dora-register.service';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@ApiTags('DORA Register of Information')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dora-register')
export class DoraRegisterController {
  constructor(private svc: DoraRegisterService) {}

  @Get('dashboard')
  @RequireModule('dora', 1)
  getDashboard(@CurrentUser('organizationId') orgId: string) {
    return this.svc.getDashboard(orgId);
  }

  @Get()
  @RequireModule('dora', 1)
  list(@CurrentUser('organizationId') orgId: string, @Query() q: any) {
    return this.svc.list(orgId, q);
  }

  @Post()
  @RequireModule('dora', 2)
  create(@CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.svc.create(orgId, dto);
  }

  @Put(':id')
  @RequireModule('dora', 2)
  update(@Param('id') id: string, @CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.svc.update(id, orgId, dto);
  }

  @Delete(':id')
  @RequireModule('dora', 2)
  remove(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.svc.remove(id, orgId);
  }

  @Get('export/csv')
  @RequireModule('dora', 1)
  @ApiOperation({ summary: 'Export DORA Register as ESA-compatible CSV' })
  async exportCsv(@CurrentUser('organizationId') orgId: string, @Res() res: Response) {
    const csv = await this.svc.exportCsv(orgId);
    res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="dora-register.csv"' });
    res.send(csv);
  }
}
