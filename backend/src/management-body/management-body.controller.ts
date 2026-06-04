import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ManagementBodyService } from './management-body.service';

@ApiTags('Management Body')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('management-body')
export class ManagementBodyController {
  constructor(private svc: ManagementBodyService) {}
  @Get()         getMembers(@CurrentUser('organizationId') o: string) { return this.svc.getMembers(o); }
  @Get('summary') getSummary(@CurrentUser('organizationId') o: string) { return this.svc.getLiabilitySummary(o); }
  @Post()        addMember(@CurrentUser('organizationId') o: string, @Body() dto: any) { return this.svc.addMember(o, dto); }
  @Put(':id')    updateMember(@Param('id') id: string, @CurrentUser('organizationId') o: string, @Body() dto: any) { return this.svc.updateMember(id, o, dto); }
  @Delete(':id') removeMember(@Param('id') id: string, @CurrentUser('organizationId') o: string) { return this.svc.removeMember(id, o); }
  @Post(':memberId/actions') addAction(@Param('memberId') mid: string, @CurrentUser('organizationId') o: string, @Body() dto: any) { return this.svc.addAction(mid, o, dto); }
  @Put('actions/:id/acknowledge') ack(@Param('id') id: string, @CurrentUser('organizationId') o: string) { return this.svc.acknowledgeAction(id, o); }
}
