import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { QualityService } from './quality.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('quality')
export class QualityController {
  constructor(private readonly qualityService: QualityService) {}

  @Get('dashboard')
  getDashboard(@Req() req: any) {
    return this.qualityService.getDashboard(req.user.organizationId);
  }

  // CAPA
  @Get('capa')
  listCapas(@Req() req: any, @Query('type') type: string, @Query('status') status: string) {
    return this.qualityService.listCapas(req.user.organizationId, type, status);
  }

  @Post('capa')
  createCapa(@Req() req: any, @Body() dto: any) {
    return this.qualityService.createCapa(req.user.organizationId, req.user.id, dto);
  }

  @Patch('capa/:id')
  updateCapa(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.qualityService.updateCapa(req.user.organizationId, id, dto);
  }

  @Delete('capa/:id')
  removeCapa(@Req() req: any, @Param('id') id: string) {
    return this.qualityService.removeCapa(req.user.organizationId, id);
  }

  // Controls
  @Patch('controls/:id')
  updateControl(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.qualityService.updateControl(req.user.organizationId, id, dto);
  }
}
