import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StandardsService } from './standards.service';

// Access is decided per standard (each one belongs to a permission module), inside the service.
@ApiTags('Standards')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('standards')
export class StandardsController {
  constructor(private readonly service: StandardsService) {}

  @Get()
  @ApiOperation({ summary: 'Checklist standards the caller can open, with the organisation\'s progress' })
  list(@CurrentUser() user: any) {
    return this.service.list(user.organizationId, user.userId);
  }

  @Get(':key')
  @ApiOperation({ summary: 'Checklist and score of one standard (created on first visit)' })
  dashboard(@Param('key') key: string, @CurrentUser() user: any) {
    return this.service.dashboard(user.organizationId, user.userId, key);
  }

  @Patch(':key/requirements/:id')
  update(@Param('key') key: string, @Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.service.updateRequirement(user.organizationId, user.userId, key, id, dto);
  }
}
