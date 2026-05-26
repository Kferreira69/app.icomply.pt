import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { VendorsService } from './vendors.service';

@ApiTags('Vendors')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('vendors')
export class VendorsController {
  constructor(private readonly service: VendorsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Vendor risk dashboard stats' })
  getDashboard(@CurrentUser() user: any) {
    return this.service.getDashboard(user.organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Register a new vendor' })
  create(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.create(user.organizationId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all vendors' })
  findAll(@CurrentUser() user: any, @Query() query: any) {
    return this.service.findAll(user.organizationId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user.organizationId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.service.update(id, user.organizationId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user.organizationId);
  }

  @Post(':id/assessments')
  @ApiOperation({ summary: 'Add a risk assessment to a vendor (updates risk score)' })
  addAssessment(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.service.addAssessment(id, user.organizationId, user.id, dto);
  }
}
