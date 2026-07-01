import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { TisaxService } from './tisax.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tisax')
export class TisaxController {
  constructor(private readonly tisaxService: TisaxService) {}

  @Get('dashboard')
  @RequireModule('tisax', 1)
  getDashboard(@Req() req: any) {
    return this.tisaxService.getDashboard(req.user.organizationId);
  }

  @Post('assessments')
  @RequireModule('tisax', 2)
  createAssessment(@Req() req: any, @Body() dto: any) {
    return this.tisaxService.createAssessment(req.user.organizationId, dto);
  }

  @Patch('assessments/:id')
  @RequireModule('tisax', 2)
  updateAssessment(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.tisaxService.updateAssessment(req.user.organizationId, id, dto);
  }

  @Patch('controls/:id')
  @RequireModule('tisax', 2)
  updateControl(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.tisaxService.updateControl(req.user.organizationId, id, dto);
  }

  @Patch('controls/bulk/update')
  @RequireModule('tisax', 2)
  bulkUpdate(@Req() req: any, @Body() body: { updates: any[] }) {
    return this.tisaxService.bulkUpdate(req.user.organizationId, body.updates);
  }
}
