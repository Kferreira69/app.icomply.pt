import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ClientHubService } from './client-hub.service';

@ApiTags('Client Hub')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('client-hub')
export class ClientHubController {
  constructor(private svc: ClientHubService) {}
  @Get()                    getDashboard(@CurrentUser('organizationId') o: string) { return this.svc.getHubDashboard(o); }
  @Post()                   addClient(@CurrentUser('organizationId') o: string, @CurrentUser('id') uid: string, @Body() dto: any) { return this.svc.addClient(o, uid, dto); }
  @Delete(':clientOrgId')   removeClient(@Param('clientOrgId') cid: string, @CurrentUser('organizationId') o: string) { return this.svc.removeClient(o, cid); }
}
