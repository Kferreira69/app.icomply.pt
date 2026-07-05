import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DiagnosticsService } from './diagnostics.service';
import { SubmitAnswersDto } from './dto/submit-answers.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequireModule } from '../permissions/require-module.decorator';

@ApiTags('Diagnostics')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('diagnostics')
export class DiagnosticsController {
  constructor(private service: DiagnosticsService) {}

  @Get('questions')
  @RequireModule('diagnostic', 1)
  @ApiOperation({ summary: 'Get diagnostic questionnaire' })
  getQuestions(
    @Query('category') category?: string,
    @Query('frameworks') frameworks?: string,
  ) {
    // Accept comma-separated framework codes: ?frameworks=ISO_27001,GDPR,NIS2
    const frameworkCodes = frameworks
      ? frameworks.split(',').map((c) => c.trim()).filter(Boolean)
      : undefined;
    return this.service.getQuestions(category, frameworkCodes);
  }

  @Post('runs')
  @RequireModule('diagnostic', 2)
  @ApiOperation({ summary: 'Start a new diagnostic run' })
  startRun(
    @CurrentUser('organizationId') orgId: string,
    @Body() body: { sector?: string; country?: string },
  ) {
    return this.service.startRun(orgId, body.sector, body.country);
  }

  @Get('runs')
  @RequireModule('diagnostic', 1)
  @ApiOperation({ summary: 'List diagnostic runs for this organization' })
  listRuns(@CurrentUser('organizationId') orgId: string) {
    return this.service.findAllRuns(orgId);
  }

  @Get('runs/:id')
  @RequireModule('diagnostic', 1)
  @ApiOperation({ summary: 'Get diagnostic run details' })
  getRun(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.getRunById(id, orgId);
  }

  @Post('runs/:id/answers')
  @RequireModule('diagnostic', 2)
  @ApiOperation({ summary: 'Submit answers (partial or final)' })
  submitAnswers(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: SubmitAnswersDto,
  ) {
    return this.service.submitAnswers(id, orgId, dto);
  }

  @Get('platform-health')
  @RequireModule('diagnostic', 1)
  @ApiOperation({ summary: 'Real compliance data snapshot — used to auto-populate diagnostic answers' })
  platformHealth(@CurrentUser('organizationId') orgId: string) {
    return this.service.getPlatformHealth(orgId);
  }
}
