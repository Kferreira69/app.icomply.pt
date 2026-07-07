import { Controller, Get, Patch, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ControlsService } from './controls.service';
import { ControlStatus, UserRole } from '../generated/prisma/client';
import { Roles } from '../common/decorators/roles.decorator';

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

  // Reading the control catalogue is fine for any authenticated user; only
  // changing an implementation status requires at least a compliance role.
  @Patch(':id/status')
  @Roles(UserRole.COMPLIANCE_MANAGER)
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: ControlStatus,
  ) {
    return this.service.updateStatus(id, status);
  }
}
