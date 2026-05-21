import {
  Controller, Get, Post, Patch, Body, Param, Query,
  ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, ProjectStatus } from '@prisma/client';

@ApiTags('Projects')
@ApiBearerAuth('JWT')
@Controller('projects')
export class ProjectsController {
  constructor(private service: ProjectsService) {}

  @Post()
  @Roles(UserRole.COMPLIANCE_MANAGER)
  @ApiOperation({ summary: 'Create a compliance project' })
  create(@Body() dto: CreateProjectDto, @CurrentUser('organizationId') orgId: string) {
    return this.service.create(dto, orgId);
  }

  @Get()
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ProjectStatus })
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: ProjectStatus,
  ) {
    return this.service.findAll(orgId, page, limit, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.findOne(id, orgId);
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.getStats(id, orgId);
  }

  @Patch(':id')
  @Roles(UserRole.COMPLIANCE_MANAGER)
  update(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.service.update(id, orgId, dto);
  }
}
