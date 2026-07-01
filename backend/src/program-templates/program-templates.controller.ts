import { Controller, Get, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ProgramTemplatesService } from './program-templates.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('program-templates')
export class ProgramTemplatesController {
  constructor(private readonly svc: ProgramTemplatesService) {}

  @Get()
  @RequireModule('projects', 1)
  findAll(@Req() req: any) {
    return this.svc.findAll(req.user.organizationId);
  }

  @Get('activations')
  @RequireModule('projects', 1)
  getActivations(@Req() req: any) {
    return this.svc.getActivations(req.user.organizationId);
  }

  @Post(':id/activate')
  @RequireModule('projects', 2)
  activate(@Req() req: any, @Param('id') id: string, @Body() body: { startDate: string }) {
    return this.svc.activate(id, req.user.organizationId, req.user.id, body);
  }
}
