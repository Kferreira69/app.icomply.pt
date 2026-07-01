import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';
import { BoardReportsService } from './board-reports.service';

@ApiTags('Board Reports')
@Controller('board-reports')
export class BoardReportsController {
  constructor(private svc: BoardReportsService) {}

  @ApiBearerAuth('JWT') @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireModule('reports', 1)
  @Get() list(@CurrentUser('organizationId') o: string) { return this.svc.list(o); }

  @ApiBearerAuth('JWT') @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireModule('reports', 1)
  @Get(':id') get(@Param('id') id: string, @CurrentUser('organizationId') o: string) { return this.svc.get(id, o); }

  @ApiBearerAuth('JWT') @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireModule('reports', 1)
  @Get(':id/pack-data') packData(@Param('id') id: string, @CurrentUser('organizationId') o: string) { return this.svc.generatePackData(id, o); }

  @ApiBearerAuth('JWT') @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireModule('reports', 2)
  @Post() create(@CurrentUser('organizationId') o: string, @CurrentUser('id') uid: string, @Body() dto: any) { return this.svc.create(o, uid, dto); }

  @ApiBearerAuth('JWT') @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireModule('reports', 2)
  @Put(':id') update(@Param('id') id: string, @CurrentUser('organizationId') o: string, @Body() dto: any) { return this.svc.update(id, o, dto); }

  @ApiBearerAuth('JWT') @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequireModule('reports', 2)
  @Post(':id/request-signoff') requestSignoff(@Param('id') id: string, @CurrentUser('organizationId') o: string, @Body() body: { signers: any[] }) { return this.svc.requestSignoff(id, o, body.signers); }

  @Public()
  @Post(':id/sign')
  sign(@Param('id') id: string, @Body() body: { name: string; email: string }) { return this.svc.sign(id, body.name, body.email); }
}
