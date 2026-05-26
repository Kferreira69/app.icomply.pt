import { Controller, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SoaService } from './soa.service';

@ApiTags('SoA')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('soa')
export class SoaController {
  constructor(private readonly service: SoaService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'SoA dashboard — score and theme breakdown' })
  getDashboard(@CurrentUser() user: any) {
    return this.service.getDashboard(user.organizationId);
  }

  @Get()
  @ApiOperation({ summary: 'List all ISO 27001:2022 controls' })
  findAll(@CurrentUser() user: any, @Query('theme') theme?: string) {
    return this.service.findAll(user.organizationId, theme);
  }

  @Patch('bulk')
  @ApiOperation({ summary: 'Bulk-update multiple controls' })
  bulkUpdate(@Body() body: { updates: any[] }, @CurrentUser() user: any) {
    return this.service.bulkUpdate(user.organizationId, body.updates);
  }

  @Patch(':controlCode')
  @ApiOperation({ summary: 'Update a single control status / notes' })
  update(
    @Param('controlCode') controlCode: string,
    @Body() dto: any,
    @CurrentUser() user: any,
  ) {
    return this.service.update(controlCode, user.organizationId, dto);
  }
}
