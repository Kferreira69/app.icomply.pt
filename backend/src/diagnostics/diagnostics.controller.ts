import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DiagnosticsService } from './diagnostics.service';
import { SubmitAnswersDto } from './dto/submit-answers.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Diagnostics')
@ApiBearerAuth('JWT')
@Controller('diagnostics')
export class DiagnosticsController {
  constructor(private service: DiagnosticsService) {}

  @Get('questions')
  @ApiOperation({ summary: 'Get diagnostic questionnaire' })
  getQuestions(@Query('category') category?: string) {
    return this.service.getQuestions(category);
  }

  @Post('runs')
  @ApiOperation({ summary: 'Start a new diagnostic run' })
  startRun(
    @CurrentUser('organizationId') orgId: string,
    @Body() body: { sector?: string; country?: string },
  ) {
    return this.service.startRun(orgId, body.sector, body.country);
  }

  @Get('runs')
  @ApiOperation({ summary: 'List diagnostic runs for this organization' })
  listRuns(@CurrentUser('organizationId') orgId: string) {
    return this.service.findAllRuns(orgId);
  }

  @Get('runs/:id')
  @ApiOperation({ summary: 'Get diagnostic run details' })
  getRun(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.getRunById(id, orgId);
  }

  @Post('runs/:id/answers')
  @ApiOperation({ summary: 'Submit answers (partial or final)' })
  submitAnswers(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: SubmitAnswersDto,
  ) {
    return this.service.submitAnswers(id, orgId, dto);
  }
}
