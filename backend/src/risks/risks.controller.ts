import {
  Controller, Get, Post, Patch, Body, Param, Query,
  ParseIntPipe, DefaultValuePipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RisksService } from './risks.service';
import { CreateRiskDto } from './dto/create-risk.dto';
import { UpdateRiskDto } from './dto/update-risk.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RiskStatus } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@ApiTags('Risks')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('risks')
export class RisksController {
  constructor(private service: RisksService) {}

  @Post()
  @RequireModule('risks', 2)
  create(
    @Body() dto: CreateRiskDto,
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.create(dto, orgId, userId);
  }

  @Get()
  @RequireModule('risks', 1)
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: RiskStatus })
  @ApiQuery({ name: 'search', required: false, description: 'Filter risks by title (case-insensitive)' })
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: RiskStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(orgId, projectId, status, page, limit, search);
  }

  @Get('heatmap')
  @RequireModule('risks', 1)
  @ApiOperation({ summary: 'Get risk heatmap data (5x5 matrix)' })
  getHeatmap(@CurrentUser('organizationId') orgId: string) {
    return this.service.getHeatmapData(orgId);
  }

  @Get(':id')
  @RequireModule('risks', 1)
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.findOne(id, orgId);
  }

  @Patch(':id')
  @RequireModule('risks', 2)
  update(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateRiskDto,
  ) {
    return this.service.update(id, orgId, dto, userId);
  }

  @Get(':id/history')
  @RequireModule('risks', 1)
  @ApiOperation({ summary: 'Get risk score history (snapshots)' })
  getHistory(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.getHistory(id, orgId);
  }

  @Patch(':id/treatment')
  @RequireModule('risks', 2)
  @ApiOperation({ summary: 'Update risk treatment plan & residual score' })
  updateTreatment(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: any,
  ) {
    return this.service.updateTreatmentPlan(id, orgId, dto);
  }

  @Post(':id/accept')
  @RequireModule('risks', 2)
  @ApiOperation({ summary: 'Accept a risk (risk acceptance workflow)' })
  acceptRisk(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { rationale: string },
  ) {
    return this.service.acceptRisk(id, orgId, userId, dto);
  }
}
