import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  Ip,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WhistleblowService } from './whistleblow.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

// ─────────────────────────────────────────────────────────────
// PUBLIC routes (no auth) — for anonymous/identified reporters
// ─────────────────────────────────────────────────────────────

@Controller('whistleblow')
export class WhistleblowController {
  constructor(private readonly svc: WhistleblowService) {}

  // POST /whistleblow/submit/:orgSlug — public
  @Post('submit/:orgSlug')
  @HttpCode(HttpStatus.CREATED)
  async submit(
    @Param('orgSlug') orgSlug: string,
    @Body() body: any,
  ) {
    // Resolve orgSlug → organizationId
    const org = await (this.svc as any).prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true },
    });
    if (!org) return { error: 'Organização não encontrada.' };
    return this.svc.submitReport(org.id, body);
  }

  // GET /whistleblow/status/:token — public (reporter checks status)
  @Get('status/:token')
  async checkStatus(@Param('token') token: string) {
    return this.svc.getStatusByToken(token);
  }

  // ─────────────────────────────────────────────────────────────
  // PROTECTED routes — management dashboard
  // ─────────────────────────────────────────────────────────────

  // GET /whistleblow/dashboard
  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  async dashboard(@Request() req: any) {
    return this.svc.getDashboard(req.user.organizationId);
  }

  // GET /whistleblow/reports
  @Get('reports')
  @UseGuards(JwtAuthGuard)
  async listReports(@Request() req: any, @Query() query: any) {
    return this.svc.listReports(req.user.organizationId, query);
  }

  // GET /whistleblow/reports/:id
  @Get('reports/:id')
  @UseGuards(JwtAuthGuard)
  async getReport(@Request() req: any, @Param('id') id: string) {
    return this.svc.getReport(req.user.organizationId, id);
  }

  // PATCH /whistleblow/reports/:id
  @Patch('reports/:id')
  @UseGuards(JwtAuthGuard)
  async updateReport(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.svc.updateReport(req.user.organizationId, id, body, req.user.id);
  }

  // POST /whistleblow/reports/:id/notes
  @Post('reports/:id/notes')
  @UseGuards(JwtAuthGuard)
  async addNote(
    @Request() req: any,
    @Param('id') id: string,
    @Body('note') note: string,
  ) {
    return this.svc.addNote(req.user.organizationId, id, note, req.user.id);
  }

  // GET /whistleblow/menac?year=2024
  @Get('menac')
  @UseGuards(JwtAuthGuard)
  async menacReport(@Request() req: any, @Query('year') year?: string) {
    const y = year ? parseInt(year) : new Date().getFullYear();
    return this.svc.getMenacReport(req.user.organizationId, y);
  }

  // ── Code of Conduct ──────────────────────────────────────────

  // GET /whistleblow/conduct
  @Get('conduct')
  @UseGuards(JwtAuthGuard)
  async listConduct(@Request() req: any) {
    return this.svc.listCodesOfConduct(req.user.organizationId);
  }

  // GET /whistleblow/conduct/:id
  @Get('conduct/:id')
  @UseGuards(JwtAuthGuard)
  async getConduct(@Request() req: any, @Param('id') id: string) {
    return this.svc.getCodeOfConduct(req.user.organizationId, id);
  }

  // POST /whistleblow/conduct
  @Post('conduct')
  @UseGuards(JwtAuthGuard)
  async createConduct(@Request() req: any, @Body() body: any) {
    return this.svc.upsertCodeOfConduct(req.user.organizationId, body);
  }

  // PATCH /whistleblow/conduct/:id
  @Patch('conduct/:id')
  @UseGuards(JwtAuthGuard)
  async updateConduct(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.svc.upsertCodeOfConduct(req.user.organizationId, body, id);
  }

  // POST /whistleblow/conduct/:id/acknowledge
  @Post('conduct/:id/acknowledge')
  @UseGuards(JwtAuthGuard)
  async acknowledgeConduct(
    @Request() req: any,
    @Param('id') id: string,
    @Ip() ip: string,
  ) {
    return this.svc.acknowledgeCodeOfConduct(id, req.user.id, ip);
  }

  // ── Training Plans ───────────────────────────────────────────

  // GET /whistleblow/trainings
  @Get('trainings')
  @UseGuards(JwtAuthGuard)
  async listTrainings(@Request() req: any) {
    return this.svc.listTrainings(req.user.organizationId);
  }

  // POST /whistleblow/trainings
  @Post('trainings')
  @UseGuards(JwtAuthGuard)
  async createTraining(@Request() req: any, @Body() body: any) {
    return this.svc.createTraining(req.user.organizationId, body);
  }

  // PATCH /whistleblow/trainings/:id
  @Patch('trainings/:id')
  @UseGuards(JwtAuthGuard)
  async updateTraining(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.svc.updateTraining(req.user.organizationId, id, body);
  }

  // PATCH /whistleblow/trainings/:id/attendance
  @Patch('trainings/:trainingId/attendance/:userId')
  @UseGuards(JwtAuthGuard)
  async markAttendance(
    @Param('trainingId') trainingId: string,
    @Param('userId') userId: string,
    @Body() body: { attended: boolean; score?: number; certificateUrl?: string },
  ) {
    return this.svc.markAttendance(
      trainingId,
      userId,
      body.attended,
      body.score,
      body.certificateUrl,
    );
  }
}
