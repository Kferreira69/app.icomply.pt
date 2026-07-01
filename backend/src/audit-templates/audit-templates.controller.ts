import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuditTemplatesService } from './audit-templates.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@ApiTags('Audit Templates')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('audit-templates')
export class AuditTemplatesController {
  constructor(private svc: AuditTemplatesService) {}

  @Get()
  @RequireModule('audits', 1)
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('framework') framework?: string,
  ) {
    return this.svc.findAll(orgId, framework);
  }

  @Post()
  @RequireModule('audits', 2)
  create(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    return this.svc.create(orgId, userId, body);
  }

  @Patch(':id')
  @RequireModule('audits', 2)
  update(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() body: any,
  ) {
    return this.svc.update(id, orgId, body);
  }

  @Delete(':id')
  @RequireModule('audits', 2)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.svc.remove(id, orgId);
  }
}
