import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CapaService } from './capa.service';
import { CreateCapaDto } from './dto/create-capa.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CapaStatus } from '../generated/prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@ApiTags('CAPA')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('capa')
export class CapaController {
  constructor(private service: CapaService) {}

  @Post()
  @RequireModule('capa', 2)
  create(@Body() dto: CreateCapaDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Get()
  @RequireModule('capa', 1)
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('status') status?: CapaStatus,
    @Query('overdue') overdue?: string,
  ) {
    return this.service.findAll(orgId, status, overdue === 'true');
  }

  @Get(':id')
  @RequireModule('capa', 1)
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.findOne(id, orgId);
  }

  @Patch(':id')
  @RequireModule('capa', 2)
  update(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() body: any,
  ) {
    return this.service.update(id, orgId, body);
  }
}
