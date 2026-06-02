import {
  Controller, Get, Post, Patch, Body, Param, Query,
  ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RisksService } from './risks.service';
import { CreateRiskDto } from './dto/create-risk.dto';
import { UpdateRiskDto } from './dto/update-risk.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RiskStatus } from '@prisma/client';

@ApiTags('Risks')
@ApiBearerAuth('JWT')
@Controller('risks')
export class RisksController {
  constructor(private service: RisksService) {}

  @Post()
  create(
    @Body() dto: CreateRiskDto,
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.create(dto, orgId, userId);
  }

  @Get()
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: RiskStatus })
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: RiskStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.service.findAll(orgId, projectId, status, page, limit);
  }

  @Get('heatmap')
  @ApiOperation({ summary: 'Get risk heatmap data (5x5 matrix)' })
  getHeatmap(@CurrentUser('organizationId') orgId: string) {
    return this.service.getHeatmapData(orgId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.findOne(id, orgId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: UpdateRiskDto,
  ) {
    return this.service.update(id, orgId, dto);
  }

  @Patch(':id/treatment')
  @ApiOperation({ summary: 'Update risk treatment plan & residual score' })
  updateTreatment(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: any,
  ) {
    return this.service.updateTreatmentPlan(id, orgId, dto);
  }

  @Post(':id/accept')
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
