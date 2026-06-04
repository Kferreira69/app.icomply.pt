import { Controller, Get, Put, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RegulatoryFeedService } from './regulatory-feed.service';

@ApiTags('Regulatory Feed')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('regulatory-feed')
export class RegulatoryFeedController {
  constructor(private svc: RegulatoryFeedService) {}
  @Get()              list(@Query() q: any) { return this.svc.list(q); }
  @Get('unread-count') unreadCount() { return this.svc.getUnreadCount().then(count => ({ count })); }
  @Put(':id/read')    markRead(@Param('id') id: string) { return this.svc.markRead(id); }
  @Put('read-all')    markAllRead() { return this.svc.markAllRead(); }
  @Post('seed')       seed(@CurrentUser('organizationId') orgId: string) { return this.svc.seedSampleItems(orgId); }
}
