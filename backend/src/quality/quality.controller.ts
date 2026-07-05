import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { QualityService } from './quality.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('quality')
export class QualityController {
  constructor(private readonly qualityService: QualityService) {}

  @Get('dashboard')
  @RequireModule('quality', 1)
  getDashboard(@Req() req: any) {
    return this.qualityService.getDashboard(req.user.organizationId);
  }

  // CAPA
  @Get('capa')
  @RequireModule('quality', 1)
  listCapas(@Req() req: any, @Query('type') type: string, @Query('status') status: string) {
    return this.qualityService.listCapas(req.user.organizationId, type, status);
  }

  @Post('capa')
  @RequireModule('quality', 2)
  createCapa(@Req() req: any, @Body() dto: any) {
    return this.qualityService.createCapa(req.user.organizationId, req.user.id, dto);
  }

  @Patch('capa/:id')
  @RequireModule('quality', 2)
  updateCapa(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.qualityService.updateCapa(req.user.organizationId, id, dto);
  }

  @Delete('capa/:id')
  @RequireModule('quality', 2)
  removeCapa(@Req() req: any, @Param('id') id: string) {
    return this.qualityService.removeCapa(req.user.organizationId, id);
  }

  // Non-Conformances
  @Get('nonconformances')
  @RequireModule('quality', 1)
  listNCs(@Req() req: any) {
    return this.qualityService.listNCs(req.user.organizationId);
  }

  @Post('nonconformances')
  @RequireModule('quality', 2)
  createNC(@Req() req: any, @Body() dto: any) {
    return this.qualityService.createNC(req.user.organizationId, dto);
  }

  @Patch('nonconformances/:id')
  @RequireModule('quality', 2)
  updateNC(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.qualityService.updateNC(req.user.organizationId, id, dto);
  }

  // Controls
  @Patch('controls/:id')
  @RequireModule('quality', 2)
  updateControl(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.qualityService.updateControl(req.user.organizationId, id, dto);
  }
}
