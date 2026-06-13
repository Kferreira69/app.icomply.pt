import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { EvidenceIntegrationsService } from './evidence-integrations.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Evidence Integrations')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('evidence-integrations')
export class EvidenceIntegrationsController {
  constructor(private readonly service: EvidenceIntegrationsService) {}

  @Get()
  @ApiOperation({ summary: 'List all evidence integrations for the organization' })
  findAll(@CurrentUser('organizationId') orgId: string) {
    return this.service.findAll(orgId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.COMPLIANCE_MANAGER)
  @ApiOperation({ summary: 'Create a new evidence integration' })
  create(
    @Body() dto: CreateIntegrationDto,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.create(orgId, dto);
  }

  @Post('sync-all')
  @Roles(UserRole.ADMIN, UserRole.COMPLIANCE_MANAGER)
  @ApiOperation({ summary: 'Run sync for all active integrations' })
  runAllActive(@CurrentUser('organizationId') orgId: string) {
    return this.service.runAllActive(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single integration by ID' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.findOne(id, orgId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.COMPLIANCE_MANAGER)
  @ApiOperation({ summary: 'Update an integration' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateIntegrationDto,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.update(id, orgId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.COMPLIANCE_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an integration' })
  remove(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.remove(id, orgId);
  }

  @Patch(':id/toggle')
  @Roles(UserRole.ADMIN, UserRole.COMPLIANCE_MANAGER)
  @ApiOperation({ summary: 'Toggle integration active/inactive' })
  toggleActive(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.toggleActive(id, orgId);
  }

  @Post(':id/sync')
  @Roles(UserRole.ADMIN, UserRole.COMPLIANCE_MANAGER)
  @ApiOperation({ summary: 'Run sync for a single integration' })
  runSync(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.runSync(id, orgId);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get last 20 sync logs for an integration' })
  getSyncLogs(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.getSyncLogs(id, orgId);
  }
}
