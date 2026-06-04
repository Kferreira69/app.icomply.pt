import { Controller, Get, Post, Put, Delete, Body, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DoraRegisterService } from './dora-register.service';

@ApiTags('DORA Register of Information')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('dora-register')
export class DoraRegisterController {
  constructor(private svc: DoraRegisterService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser('organizationId') orgId: string) {
    return this.svc.getDashboard(orgId);
  }

  @Get()
  list(@CurrentUser('organizationId') orgId: string, @Query() q: any) {
    return this.svc.list(orgId, q);
  }

  @Post()
  create(@CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.svc.create(orgId, dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @CurrentUser('organizationId') orgId: string, @Body() dto: any) {
    return this.svc.update(id, orgId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.svc.remove(id, orgId);
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Export DORA Register as ESA-compatible CSV' })
  async exportCsv(@CurrentUser('organizationId') orgId: string, @Res() res: Response) {
    const csv = await this.svc.exportCsv(orgId);
    res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="dora-register.csv"' });
    res.send(csv);
  }
}
