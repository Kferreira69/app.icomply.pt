import {
  Controller, Get, Post, Delete, Body, Param,
  UseGuards, Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { IntegrationHubService } from './integration-hub.service';
import { UpsertIntegrationDto } from './dto/upsert-integration.dto';

@ApiTags('Integration Hub')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('integration-hub')
export class IntegrationHubController {
  constructor(private readonly svc: IntegrationHubService) {}

  @Get()
  list(@Req() req: any) {
    return this.svc.findAll(req.user.organizationId);
  }

  @Post()
  upsert(@Req() req: any, @Body() dto: UpsertIntegrationDto) {
    return this.svc.upsert(req.user.organizationId, dto);
  }

  @Post(':key/connect')
  connect(@Req() req: any, @Param('key') key: string) {
    return this.svc.connect(req.user.organizationId, key);
  }

  @Post(':key/disconnect')
  disconnect(@Req() req: any, @Param('key') key: string) {
    return this.svc.disconnect(req.user.organizationId, key);
  }

  @Delete(':key')
  remove(@Req() req: any, @Param('key') key: string) {
    return this.svc.remove(req.user.organizationId, key);
  }

  @Get('truto/key')
  getTrutoKey(@Req() req: any) {
    return this.svc.getTrutoKey(req.user.organizationId);
  }

  @Post('truto/key')
  saveTrutoKey(@Req() req: any, @Body() body: { apiKey: string }) {
    return this.svc.saveTrutoKey(req.user.organizationId, body.apiKey);
  }
}
