import {
  Controller, Get, Post, Patch, Body, Param, Query,
  ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Organizations')
@ApiBearerAuth('JWT')
@Controller('organizations')
export class OrganizationsController {
  constructor(private service: OrganizationsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new organization (tenant)' })
  create(@Body() dto: CreateOrganizationDto) {
    return this.service.create(dto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.findAll(page, limit);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current user organization' })
  getMyOrg(@CurrentUser('organizationId') orgId: string) {
    return this.service.findOne(orgId);
  }

  @Get('my/dashboard')
  @ApiOperation({ summary: 'Dashboard stats for current organization' })
  getDashboard(@CurrentUser('organizationId') orgId: string) {
    return this.service.getDashboardStats(orgId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch('my')
  @ApiOperation({ summary: 'Update current organization settings' })
  updateMyOrg(
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.service.update(orgId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.service.update(id, dto);
  }
}
