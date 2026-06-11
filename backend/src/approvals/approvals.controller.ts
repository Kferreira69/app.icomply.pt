import {
  Controller, Get, Post, Patch, Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ApprovalsService } from './approvals.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApprovalEntityType, ApprovalDecision, ApprovalStatus } from '@prisma/client';

@ApiTags('Approvals')
@ApiBearerAuth('JWT')
@Controller('approvals')
export class ApprovalsController {
  constructor(private service: ApprovalsService) {}

  /** POST /approvals — create a new approval request */
  @Post()
  @ApiOperation({ summary: 'Create a new multi-stakeholder approval request' })
  create(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() body: {
      entityType: ApprovalEntityType;
      entityId: string;
      title: string;
      description?: string;
      approverIds: string[];
      threshold?: number;
      dueDate?: string;
    },
  ) {
    return this.service.create(orgId, userId, body);
  }

  /** GET /approvals/entity/:type/:id — requests for a specific entity */
  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Get approval requests for an entity' })
  getForEntity(
    @Param('entityType') entityType: ApprovalEntityType,
    @Param('entityId') entityId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.getForEntity(entityType, entityId, orgId);
  }

  /** GET /approvals/me — pending approvals for current user */
  @Get('me')
  @ApiOperation({ summary: 'Get pending approvals assigned to current user' })
  getMyPending(
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.getMyPending(userId, orgId);
  }

  /** GET /approvals — all approvals (manager view) */
  @Get()
  @ApiOperation({ summary: 'Get all approval requests for the organization' })
  @ApiQuery({ name: 'status', required: false })
  getAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('status') status?: ApprovalStatus,
  ) {
    return this.service.getAll(orgId, status);
  }

  /** GET /approvals/summary — dashboard stats */
  @Get('summary')
  @ApiOperation({ summary: 'Approval summary stats' })
  getSummary(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.getSummary(orgId, userId);
  }

  /** PATCH /approvals/:id/vote — cast a vote */
  @Patch(':id/vote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cast a vote on an approval request' })
  vote(
    @Param('id') requestId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') orgId: string,
    @Body('decision') decision: ApprovalDecision,
    @Body('comment') comment?: string,
  ) {
    return this.service.vote(requestId, userId, orgId, decision, comment);
  }

  /** PATCH /approvals/:id/cancel — cancel a request */
  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an approval request' })
  cancel(
    @Param('id') requestId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.service.cancel(requestId, userId, orgId);
  }
}
