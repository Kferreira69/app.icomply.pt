import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(private svc: WebhooksService) {}

  @Get('events')
  @ApiOperation({ summary: 'List available webhook event types' })
  getEvents() {
    return this.svc.getEventList();
  }

  @Get()
  @ApiOperation({ summary: 'List webhooks for current org' })
  list(@CurrentUser('organizationId') orgId: string) {
    return this.svc.list(orgId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a webhook endpoint' })
  create(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.svc.create(orgId, userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a webhook' })
  update(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: any,
  ) {
    return this.svc.update(id, orgId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a webhook' })
  remove(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.svc.remove(id, orgId);
  }
}
