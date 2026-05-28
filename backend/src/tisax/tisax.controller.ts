import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { TisaxService } from './tisax.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('tisax')
export class TisaxController {
  constructor(private readonly tisaxService: TisaxService) {}

  @Get('dashboard')
  getDashboard(@Req() req: any) {
    return this.tisaxService.getDashboard(req.user.organizationId);
  }

  @Post('assessments')
  createAssessment(@Req() req: any, @Body() dto: any) {
    return this.tisaxService.createAssessment(req.user.organizationId, dto);
  }

  @Patch('assessments/:id')
  updateAssessment(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.tisaxService.updateAssessment(req.user.organizationId, id, dto);
  }

  @Patch('controls/:id')
  updateControl(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.tisaxService.updateControl(req.user.organizationId, id, dto);
  }

  @Patch('controls/bulk/update')
  bulkUpdate(@Req() req: any, @Body() body: { updates: any[] }) {
    return this.tisaxService.bulkUpdate(req.user.organizationId, body.updates);
  }
}
