import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Audit Logs')
@ApiBearerAuth('JWT')
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private service: AuditLogsService) {}

  @Get()
  @Roles(UserRole.COMPLIANCE_MANAGER)
  @ApiOperation({ summary: 'Get system audit trail' })
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('entity') entity?: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.findAll(orgId, page, limit, entity, userId);
  }
}
