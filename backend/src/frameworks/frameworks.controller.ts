import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FrameworksService } from './frameworks.service';

@ApiTags('Frameworks')
@ApiBearerAuth('JWT')
@Controller('frameworks')
export class FrameworksController {
  constructor(private service: FrameworksService) {}

  @Get()
  @ApiOperation({ summary: 'List all active compliance frameworks' })
  findAll() { return this.service.findAll(); }

  @Get(':id')
  @ApiOperation({ summary: 'Get framework with requirements hierarchy' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Get(':id/controls')
  @ApiOperation({ summary: 'Get controls for a framework' })
  getControls(@Param('id') id: string) { return this.service.getControls(id); }

  @Get(':id/templates')
  @ApiOperation({ summary: 'Get project templates for a framework' })
  getTemplates(@Param('id') id: string) { return this.service.getTemplates(id); }
}
