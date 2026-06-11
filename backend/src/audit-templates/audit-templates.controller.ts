import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuditTemplatesService } from './audit-templates.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Audit Templates')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('audit-templates')
export class AuditTemplatesController {
  constructor(private svc: AuditTemplatesService) {}

  @Get()
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('framework') framework?: string,
  ) {
    return this.svc.findAll(orgId, framework);
  }

  @Post()
  create(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    return this.svc.create(orgId, userId, body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() body: any,
  ) {
    return this.svc.update(id, orgId, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.svc.remove(id, orgId);
  }
}
