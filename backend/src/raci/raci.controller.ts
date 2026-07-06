import {
  Controller, Get, Post, Delete, Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RaciService } from './raci.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, RaciEntityType, RaciRole } from '../generated/prisma/client';

@ApiTags('RACI')
@ApiBearerAuth('JWT')
@Controller('raci')
export class RaciController {
  constructor(private service: RaciService) {}

  /** GET /raci/entity/:type/:id — assignments for a specific entity */
  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Get RACI assignments for an entity' })
  getForEntity(
    @Param('entityType') entityType: RaciEntityType,
    @Param('entityId') entityId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.getForEntity(entityType, entityId, orgId);
  }

  /** POST /raci/assign — assign a user to an entity */
  @Post('assign')
  @Roles(UserRole.COMPLIANCE_MANAGER)
  @ApiOperation({ summary: 'Assign a RACI role to a user for an entity' })
  assign(
    @CurrentUser('organizationId') orgId: string,
    @Body('entityType') entityType: RaciEntityType,
    @Body('entityId') entityId: string,
    @Body('userId') userId: string,
    @Body('role') role: RaciRole,
    @Body('notes') notes?: string,
  ) {
    return this.service.assign(orgId, entityType, entityId, userId, role, notes);
  }

  /** POST /raci/bulk — replace all assignments for an entity */
  @Post('bulk')
  @Roles(UserRole.COMPLIANCE_MANAGER)
  @ApiOperation({ summary: 'Bulk set RACI assignments for an entity (replaces all)' })
  bulkSet(
    @CurrentUser('organizationId') orgId: string,
    @Body('entityType') entityType: RaciEntityType,
    @Body('entityId') entityId: string,
    @Body('assignments') assignments: Array<{ userId: string; role: RaciRole; notes?: string }>,
  ) {
    return this.service.bulkSet(orgId, entityType, entityId, assignments);
  }

  /** DELETE /raci/:id — remove an assignment */
  @Delete(':id')
  @Roles(UserRole.COMPLIANCE_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a RACI assignment' })
  remove(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.remove(id, orgId);
  }

  /** GET /raci/me — my RACI roles across all entities */
  @Get('me')
  @ApiOperation({ summary: 'Get all RACI roles for the current user' })
  @ApiQuery({ name: 'entityType', required: false })
  getMyRoles(
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') orgId: string,
    @Query('entityType') entityType?: RaciEntityType,
  ) {
    return this.service.getForUser(userId, orgId, entityType);
  }

  /** GET /raci/user/:userId — RACI roles for a specific user */
  @Get('user/:userId')
  @Roles(UserRole.COMPLIANCE_MANAGER)
  @ApiOperation({ summary: 'Get all RACI roles for a specific user' })
  @ApiQuery({ name: 'entityType', required: false })
  getForUser(
    @Param('userId') userId: string,
    @CurrentUser('organizationId') orgId: string,
    @Query('entityType') entityType?: RaciEntityType,
  ) {
    return this.service.getForUser(userId, orgId, entityType);
  }

  /** GET /raci/matrix/:entityType — full matrix view */
  @Get('matrix/:entityType')
  @Roles(UserRole.COMPLIANCE_MANAGER)
  @ApiOperation({ summary: 'Get full RACI matrix for an entity type' })
  getMatrix(
    @Param('entityType') entityType: RaciEntityType,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.getMatrix(orgId, entityType);
  }

  /** GET /raci/summary — dashboard stats */
  @Get('summary')
  @ApiOperation({ summary: 'RACI summary stats for the organization' })
  getSummary(@CurrentUser('organizationId') orgId: string) {
    return this.service.getSummary(orgId);
  }
}
