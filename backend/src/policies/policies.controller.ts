import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, UseGuards, Req, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PoliciesService } from './policies.service';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { PolicyStatus } from '../generated/prisma/client';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@ApiTags('Policies')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('policies')
export class PoliciesController {
  constructor(private readonly service: PoliciesService) {}

  @Post()
  @RequireModule('policies', 2)
  @ApiOperation({ summary: 'Create a new policy' })
  create(@Body() dto: CreatePolicyDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.id, user.organizationId);
  }

  @Get()
  @RequireModule('policies', 1)
  @ApiOperation({ summary: 'List all policies' })
  findAll(
    @CurrentUser() user: any,
    @Query('status') status?: PolicyStatus,
    @Query('category') category?: string,
  ) {
    return this.service.findAll(user.organizationId, status, category);
  }

  @Get('stats')
  @RequireModule('policies', 1)
  @ApiOperation({ summary: 'Get policy statistics' })
  getStats(@CurrentUser() user: any) {
    return this.service.getStats(user.organizationId);
  }

  @Get(':id')
  @RequireModule('policies', 1)
  @ApiOperation({ summary: 'Get policy detail with versions and acknowledgments' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user.organizationId);
  }

  @Patch(':id')
  @RequireModule('policies', 2)
  @ApiOperation({ summary: 'Update policy content (auto-versions if content changes)' })
  update(
    @Param('id') id: string,
    @Body() data: Partial<CreatePolicyDto> & { changeNote?: string },
    @CurrentUser() user: any,
  ) {
    return this.service.update(id, user.organizationId, data, user.id);
  }

  @Post(':id/submit')
  @RequireModule('policies', 2)
  @ApiOperation({ summary: 'Submit policy for review' })
  @HttpCode(200)
  submitForReview(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.submitForReview(id, user.organizationId);
  }

  @Post(':id/approve')
  @RequireModule('policies', 2)
  @ApiOperation({ summary: 'Approve policy' })
  @HttpCode(200)
  approve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.approve(id, user.organizationId, user.id);
  }

  @Post(':id/archive')
  @RequireModule('policies', 2)
  @ApiOperation({ summary: 'Archive policy' })
  @HttpCode(200)
  archive(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.archive(id, user.organizationId);
  }

  @Post(':id/revert')
  @RequireModule('policies', 2)
  @ApiOperation({ summary: 'Revert policy to DRAFT' })
  @HttpCode(200)
  revertToDraft(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.revertToDraft(id, user.organizationId);
  }

  @Post(':id/acknowledge')
  @RequireModule('policies', 2)
  @ApiOperation({ summary: 'Acknowledge that you have read this policy' })
  @HttpCode(200)
  acknowledge(@Param('id') id: string, @CurrentUser() user: any, @Req() req: any) {
    const ip = req.ip || req.headers['x-forwarded-for'];
    return this.service.acknowledge(id, user.organizationId, user.id, ip);
  }

  @Get(':id/acknowledgment-status')
  @RequireModule('policies', 1)
  @ApiOperation({ summary: 'Get acknowledgment statistics for a policy' })
  getAcknowledgmentStatus(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.getAcknowledgmentStatus(id, user.organizationId);
  }

  @Delete(':id')
  @RequireModule('policies', 2)
  @ApiOperation({ summary: 'Delete a policy' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user.organizationId);
  }
}
