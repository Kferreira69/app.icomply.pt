import { Controller, Get, Patch, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ControlsService } from './controls.service';
import { ControlStatus } from '@prisma/client';

@ApiTags('Controls')
@ApiBearerAuth('JWT')
@Controller('controls')
export class ControlsController {
  constructor(private service: ControlsService) {}

  @Get()
  @ApiOperation({ summary: 'List controls (optionally filtered by framework)' })
  findAll(
    @Query('frameworkId') frameworkId?: string,
    @Query('status') status?: ControlStatus,
  ) {
    return this.service.findAll(frameworkId, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: ControlStatus,
  ) {
    return this.service.updateStatus(id, status);
  }
}
