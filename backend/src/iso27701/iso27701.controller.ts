import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Iso27701Service } from './iso27701.service';

@ApiTags('ISO 27701')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('iso27701')
export class Iso27701Controller {
  constructor(private readonly service: Iso27701Service) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: any) {
    return this.service.getDashboard(user.organizationId);
  }

  @Patch('controls/:controlCode')
  updateControl(
    @Param('controlCode') code: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.service.updateControl(user.organizationId, code, data);
  }

  @Patch('controls')
  bulkUpdate(
    @Body() body: { updates: any[] },
    @CurrentUser() user: any,
  ) {
    return this.service.bulkUpdateStatus(user.organizationId, body.updates);
  }
}
