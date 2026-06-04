import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuditorPortalService } from './auditor-portal.service';

@ApiTags('Auditor Portal')
@Controller('auditor-portal')
export class AuditorPortalController {
  constructor(private svc: AuditorPortalService) {}

  // ── Authenticated (org management) ───────────────────────────

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  listSessions(@CurrentUser('organizationId') orgId: string) {
    return this.svc.listSessions(orgId);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @Post('sessions')
  @ApiOperation({ summary: 'Create an auditor portal session and send invite email' })
  createSession(@CurrentUser('organizationId') orgId: string, @CurrentUser('id') userId: string, @Body() dto: any) {
    return this.svc.createSession(orgId, userId, dto);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  deactivate(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.svc.deactivateSession(id, orgId);
  }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @Put('requests/:id/respond')
  respond(@Param('id') id: string, @CurrentUser('organizationId') orgId: string, @Body() body: { response: string }) {
    return this.svc.respondToRequest(id, orgId, body.response);
  }

  // ── Public (token-based, no auth) ─────────────────────────────

  @Public()
  @Get('public/:token')
  @ApiOperation({ summary: 'Get auditor portal data by token' })
  getPortal(@Param('token') token: string) {
    return this.svc.getPortal(token);
  }

  @Public()
  @Post('public/:token/request')
  @ApiOperation({ summary: 'Auditor submits a request/question' })
  createRequest(@Param('token') token: string, @Body() dto: any) {
    return this.svc.createRequest(token, dto);
  }
}
