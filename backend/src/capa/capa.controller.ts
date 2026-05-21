import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CapaService } from './capa.service';
import { CreateCapaDto } from './dto/create-capa.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CapaStatus } from '@prisma/client';

@ApiTags('CAPA')
@ApiBearerAuth('JWT')
@Controller('capa')
export class CapaController {
  constructor(private service: CapaService) {}

  @Post()
  create(@Body() dto: CreateCapaDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Get()
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('status') status?: CapaStatus,
    @Query('overdue') overdue?: string,
  ) {
    return this.service.findAll(orgId, status, overdue === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.findOne(id, orgId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() body: any,
  ) {
    return this.service.update(id, orgId, body);
  }
}
