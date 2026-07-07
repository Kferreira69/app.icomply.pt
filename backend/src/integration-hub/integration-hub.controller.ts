import {
  Controller, Get, Post, Delete, Body, Param,
  UseGuards, Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../generated/prisma/client';
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

  // Connecting/removing integrations and API keys is org-wide infra config —
  // ADMIN+ only, not something any authenticated viewer should be able to do.
  @Post()
  @Roles(UserRole.ADMIN)
  upsert(@Req() req: any, @Body() dto: UpsertIntegrationDto) {
    return this.svc.upsert(req.user.organizationId, dto);
  }

  @Post(':key/connect')
  @Roles(UserRole.ADMIN)
  connect(@Req() req: any, @Param('key') key: string) {
    return this.svc.connect(req.user.organizationId, key);
  }

  @Post(':key/disconnect')
  @Roles(UserRole.ADMIN)
  disconnect(@Req() req: any, @Param('key') key: string) {
    return this.svc.disconnect(req.user.organizationId, key);
  }

  @Delete(':key')
  @Roles(UserRole.ADMIN)
  remove(@Req() req: any, @Param('key') key: string) {
    return this.svc.remove(req.user.organizationId, key);
  }

  @Get('truto/key')
  @Roles(UserRole.ADMIN)
  getTrutoKey(@Req() req: any) {
    return this.svc.getTrutoKey(req.user.organizationId);
  }

  @Post('truto/key')
  @Roles(UserRole.ADMIN)
  saveTrutoKey(@Req() req: any, @Body() body: { apiKey: string }) {
    return this.svc.saveTrutoKey(req.user.organizationId, body.apiKey);
  }
}
