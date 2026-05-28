import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Soc2Service } from './soc2.service';

@ApiTags('SOC2')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('soc2')
export class Soc2Controller {
  constructor(private readonly service: Soc2Service) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: any) {
    return this.service.getDashboard(user.organizationId);
  }

  @Patch('criteria/:criterionCode')
  updateCriterion(
    @Param('criterionCode') code: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.service.updateCriterion(user.organizationId, code, data);
  }

  @Patch('criteria')
  bulkUpdate(
    @Body() body: { updates: any[] },
    @CurrentUser() user: any,
  ) {
    return this.service.bulkUpdate(user.organizationId, body.updates);
  }
}
