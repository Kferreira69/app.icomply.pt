import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Response } from 'express';
import { StreamableFile } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StorageService } from '../common/storage/storage.service';
import { MailService } from '../common/mail/mail.service';
import { ReportType, ReportFormat } from '@prisma/client';

// ── Colour palette ────────────────────────────────────────────
const BRAND = {
  primary:   '#1E40AF', // blue-800
  accent:    '#3B82F6', // blue-500
  dark:      '#1E293B', // slate-800
  muted:     '#64748B', // slate-500
  light:     '#F1F5F9', // slate-100
  white:     '#FFFFFF',
  success:   '#16A34A',
  warning:   '#D97706',
  danger:    '#DC2626',
};

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private mail: MailService,
  ) {}

  async generate(
    organizationId: string,
    type: ReportType,
    format: ReportFormat,
    parameters: Record<string, any> = {},
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    const report = await this.prisma.report.create({
      data: {
        organizationId,
        type,
        format,
        name: `${type}_${new Date().toISOString().split('T')[0]}`,
        parameters,
        status: 'PENDING',
        projectId: parameters.projectId || null,
      },
    });

    this.processReport(report.id, organizationId, org?.name ?? 'Organização', type, format, parameters)
      .catch(console.error);

    return { ...report, message: 'Report generation started.' };
  }

  async findAll(organizationId: string) {
    return this.prisma.report.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    return this.prisma.report.findFirst({ where: { id, organizationId } });
  }

  async downloadReport(id: string, organizationId: string, res: Response): Promise<StreamableFile | void> {
    const report = await this.prisma.report.findFirst({ where: { id, organizationId } });
    if (!report || report.status !== 'READY' || !report.s3Key) {
      throw new NotFoundException('Report not ready or not found');
    }

    const mimeTypes: Record<string, string> = {
      PDF:   'application/pdf',
      EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      JSON:  'application/json',
    };
    const extensions: Record<string, string> = { PDF: 'pdf', EXCEL: 'xlsx', JSON: 'json' };
    const mime = mimeTypes[report.format] ?? 'application/octet-stream';
    const ext  = extensions[report.format] ?? 'bin';
    const filename = `${report.name}.${ext}`;

    res.set('Content-Type', mime);
    res.set('Content-Disposition', `attachment; filename="${filename}"`);

    // Try local storage first
    const buffer = this.storage.readLocalFile(report.s3Key);
    if (buffer) {
      res.set('Content-Length', String(buffer.length));
      return new StreamableFile(buffer);
    }

    // S3/MinIO: stream through backend (presigned URLs use internal Docker network — can't redirect browser)
    const s3Buffer = await this.storage.readS3Buffer(report.s3Key);
    if (s3Buffer) {
      res.set('Content-Length', String(s3Buffer.length));
      return new StreamableFile(s3Buffer);
    }

    throw new NotFoundException('Report file not available');
  }

  async getComplianceSummary(organizationId: string, projectId?: string) {
    const where: any = { organizationId, ...(projectId && { id: projectId }) };

    const [projects, tasks, risks, evidence, audits, openCapas, totalAudits, totalCapas] =
      await Promise.all([
        this.prisma.project.findMany({
          where,
          select: { id: true, name: true, complianceScore: true, status: true, framework: { select: { name: true } } },
        }),
        this.prisma.task.groupBy({ by: ['status'], where: { project: { organizationId } }, _count: true }),
        this.prisma.risk.findMany({
          where: { organizationId },
          select: { title: true, status: true, inherentScore: true },
          orderBy: { inherentScore: 'desc' },
        }),
        this.prisma.evidence.groupBy({ by: ['status'], where: { uploadedBy: { organizationId } }, _count: true }),
        this.prisma.audit.count({ where: { project: { organizationId }, status: 'COMPLETED' } }),
        this.prisma.capa.count({ where: { createdBy: { organizationId }, status: { notIn: ['CLOSED'] } } }),
        this.prisma.audit.count({ where: { project: { organizationId } } }),
        this.prisma.capa.count({ where: { createdBy: { organizationId } } }),
      ]);

    const avgScore = projects.length > 0
      ? Math.round(projects.reduce((s, p) => s + (p.complianceScore || 0), 0) / projects.length)
      : 0;

    return {
      generatedAt: new Date(),
      organization: { id: organizationId },
      complianceScore: avgScore,
      projects: { total: projects.length, list: projects },
      tasks: tasks.reduce((acc, t) => ({ ...acc, [t.status]: t._count }), {} as Record<string, number>),
      risks: risks.map((r: any) => ({
        ...r,
        level: r.inherentScore >= 20 ? 'CRITICAL'
          : r.inherentScore >= 12 ? 'HIGH'
          : r.inherentScore >= 6  ? 'MEDIUM'
          : 'LOW',
      })),
      evidence: evidence.reduce((acc, e) => ({ ...acc, [e.status]: e._count }), {} as Record<string, number>),
      auditsCompleted: audits,
      totalAudits,
      openCapas,
      totalCapas,
    };
  }

  // ── PDF generation ────────────────────────────────────────────

  private async generatePdf(data: any, type: ReportType, orgName: string): Promise<Buffer> {
    const pdfkit = await import('pdfkit');
    const PDFDocument = (pdfkit as any).default ?? pdfkit;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width;
      const M = 50; // margin

      // ── Helper: horizontal rule ──────────────────────────
      const hr = (y?: number) => {
        const yy = y ?? doc.y;
        doc.moveTo(M, yy).lineTo(W - M, yy).strokeColor('#E2E8F0').lineWidth(1).stroke();
      };

      // ── Header band ──────────────────────────────────────
      doc.rect(0, 0, W, 90).fill(BRAND.primary);
      doc.fillColor(BRAND.white)
        .font('Helvetica-Bold').fontSize(22)
        .text('iComply', M, 22, { continued: true })
        .font('Helvetica').fillColor('#93C5FD')
        .text('  Compliance Platform', { continued: false });

      const typeLabel: Record<string, string> = {
        COMPLIANCE_REPORT: 'Relatório de Conformidade',
        RISK_ASSESSMENT: 'Avaliação de Risco',
        AUDIT_REPORT: 'Relatório de Auditoria',
        GAP_ANALYSIS: 'Análise de Gap',
        EXECUTIVE_SUMMARY: 'Sumário Executivo',
      };
      doc.fillColor('#BFDBFE').font('Helvetica').fontSize(11)
        .text(typeLabel[type] ?? type, M, 50);

      const dateStr = new Date(data.generatedAt).toLocaleDateString('pt-PT', {
        day: '2-digit', month: 'long', year: 'numeric',
      });
      doc.fillColor('#93C5FD').fontSize(9)
        .text(`${orgName}  ·  Gerado em ${dateStr}`, M, 68);

      doc.y = 110;

      // ── Compliance Score ─────────────────────────────────
      const score = data.complianceScore;
      const scoreColor = score >= 80 ? BRAND.success : score >= 60 ? BRAND.warning : BRAND.danger;

      doc.rect(M, doc.y, W - 2 * M, 72).fill(BRAND.light);
      const scoreY = doc.y + 10;
      doc.fillColor(scoreColor).font('Helvetica-Bold').fontSize(48)
        .text(`${score}%`, M + 20, scoreY, { width: 120, align: 'left' });
      doc.fillColor(BRAND.dark).font('Helvetica-Bold').fontSize(13)
        .text('Pontuação de Conformidade', M + 140, scoreY + 8);
      doc.fillColor(BRAND.muted).font('Helvetica').fontSize(9)
        .text('Média ponderada de todos os projetos ativos', M + 140, scoreY + 28);

      // Score bar
      const barX = M + 140, barY = scoreY + 48, barW = W - 2 * M - 160;
      doc.rect(barX, barY, barW, 6).fill('#E2E8F0');
      doc.rect(barX, barY, Math.round(barW * score / 100), 6).fill(scoreColor);
      doc.y += 92;

      // ── Section: Projects ────────────────────────────────
      const section = (title: string) => {
        doc.moveDown(0.6);
        hr();
        doc.moveDown(0.4);
        doc.fillColor(BRAND.primary).font('Helvetica-Bold').fontSize(12)
          .text(title.toUpperCase(), { characterSpacing: 0.5 });
        doc.moveDown(0.3);
        doc.fillColor(BRAND.dark).font('Helvetica').fontSize(10);
      };

      const tableRow = (cols: string[], widths: number[], isHeader = false) => {
        const x = M;
        let cx = x;
        const rowH = 18;
        if (isHeader) doc.rect(M, doc.y, W - 2 * M, rowH).fill(BRAND.primary);
        else if ((doc.y - 110) % 36 < 18) doc.rect(M, doc.y, W - 2 * M, rowH).fill(BRAND.light);

        cols.forEach((col, i) => {
          doc.fillColor(isHeader ? BRAND.white : BRAND.dark)
            .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(isHeader ? 8 : 9)
            .text(col, cx + 4, doc.y + 4, { width: widths[i] - 8, lineBreak: false });
          cx += widths[i];
        });
        doc.y += rowH;
      };

      section('Projetos');
      const pW = [W - 2 * M - 200, 80, 80, 80];
      tableRow(['Nome', 'Framework', 'Estado', 'Score'], pW, true);
      if (data.projects.list.length === 0) {
        doc.fillColor(BRAND.muted).fontSize(9).text('Sem projetos registados.', M + 4);
      } else {
        data.projects.list.forEach((p: any) => {
          tableRow([
            p.name,
            p.framework?.name ?? '—',
            p.status,
            `${p.complianceScore ?? 0}%`,
          ], pW);
        });
      }

      // ── Section: Risk Overview ───────────────────────────
      section('Riscos');
      const highRisks = data.risks.filter((r: any) => ['HIGH', 'CRITICAL'].includes(r.level));
      const medRisks  = data.risks.filter((r: any) => r.level === 'MEDIUM');
      const lowRisks  = data.risks.filter((r: any) => r.level === 'LOW');

      doc.fillColor(BRAND.dark).font('Helvetica').fontSize(9).text(
        `Total: ${data.risks.length}  ·  Críticos/Altos: ${highRisks.length}  ·  Médios: ${medRisks.length}  ·  Baixos: ${lowRisks.length}`,
      );
      doc.moveDown(0.3);

      if (highRisks.length > 0) {
        const rW = [W - 2 * M - 120, 60, 60];
        tableRow(['Título', 'Nível', 'Score'], rW, true);
        highRisks.slice(0, 10).forEach((r: any) => {
          tableRow([r.title, r.level, String(r.inherentScore ?? '—')], rW);
        });
        if (highRisks.length > 10) {
          doc.fillColor(BRAND.muted).fontSize(8).text(`  … e mais ${highRisks.length - 10} riscos.`);
        }
      }

      // ── Section: Tasks ───────────────────────────────────
      section('Tarefas');
      const taskStatLabels: Record<string, string> = {
        TODO: 'A Fazer', IN_PROGRESS: 'Em Curso', IN_REVIEW: 'Em Revisão',
        DONE: 'Concluídas', CANCELLED: 'Canceladas',
      };
      const taskTotal = Object.values(data.tasks as Record<string, number>).reduce((s, v) => s + v, 0);
      doc.text(`Total: ${taskTotal}`, { continued: true });
      Object.entries(data.tasks as Record<string, number>).forEach(([k, v], i) => {
        if (i === 0) doc.text('');
        doc.text(`  • ${taskStatLabels[k] ?? k}: ${v}`);
      });

      // ── Section: Audits & CAPA ───────────────────────────
      section('Auditorias & CAPA');
      doc.text(`Auditorias concluídas: ${data.auditsCompleted} / ${data.totalAudits}`);
      doc.text(`CAPA em aberto: ${data.openCapas} / ${data.totalCapas}`);

      // ── Footer on every page ─────────────────────────────
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(pages.start + i);
        doc.rect(0, doc.page.height - 36, W, 36).fill(BRAND.dark);
        doc.fillColor(BRAND.white).font('Helvetica').fontSize(8)
          .text(
            `iComply Compliance Platform  ·  ${orgName}  ·  Gerado em ${dateStr}`,
            M, doc.page.height - 22, { width: W - 2 * M - 60, lineBreak: false },
          )
          .text(
            `Página ${i + 1} / ${pages.count}`,
            W - M - 60, doc.page.height - 22,
            { width: 60, align: 'right', lineBreak: false },
          );
      }

      doc.end();
    });
  }

  // ── Excel generation ──────────────────────────────────────────

  private async generateExcel(data: any, type: ReportType, orgName: string): Promise<Buffer> {
    const exceljs = await import('exceljs');
    const ExcelJS = (exceljs as any).default ?? exceljs;
    const wb = new ExcelJS.Workbook();
    wb.creator = 'iComply';

    // ── Sheet 1: Summary ──────────────────────────────────
    const ws = wb.addWorksheet('Resumo');
    ws.columns = [
      { width: 30 }, { width: 20 }, { width: 20 }, { width: 15 }, { width: 15 },
    ];

    const titleRow = ws.addRow(['iComply — Relatório de Conformidade']);
    titleRow.font = { bold: true, size: 16, color: { argb: 'FF1E40AF' } };
    ws.addRow([`Organização: ${orgName}`]);
    ws.addRow([`Gerado em: ${new Date(data.generatedAt).toLocaleDateString('pt-PT')}`]);
    ws.addRow([]);

    const scoreRow = ws.addRow(['Pontuação de Conformidade', `${data.complianceScore}%`]);
    scoreRow.font = { bold: true, size: 14 };
    scoreRow.getCell(2).font = {
      bold: true, size: 14,
      color: { argb: data.complianceScore >= 80 ? 'FF16A34A' : data.complianceScore >= 60 ? 'FFD97706' : 'FFDC2626' },
    };
    ws.addRow([]);

    // Projects
    ws.addRow(['PROJETOS']).font = { bold: true, color: { argb: 'FF1E40AF' } };
    const pHeader = ws.addRow(['Nome', 'Framework', 'Estado', 'Score']);
    pHeader.font = { bold: true };
    pHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    data.projects.list.forEach((p: any) => {
      ws.addRow([p.name, p.framework?.name ?? '—', p.status, `${p.complianceScore ?? 0}%`]);
    });
    ws.addRow([]);

    // Risks
    ws.addRow(['RISCOS']).font = { bold: true, color: { argb: 'FF1E40AF' } };
    const rHeader = ws.addRow(['Título', 'Nível', 'Estado', 'Score Inerente']);
    rHeader.font = { bold: true };
    rHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    data.risks.forEach((r: any) => {
      const row = ws.addRow([r.title, r.level, r.status, r.inherentScore ?? '']);
      if (['HIGH', 'CRITICAL'].includes(r.level)) {
        row.getCell(2).font = { bold: true, color: { argb: 'FFDC2626' } };
      }
    });
    ws.addRow([]);

    // Tasks
    ws.addRow(['TAREFAS POR ESTADO']).font = { bold: true, color: { argb: 'FF1E40AF' } };
    Object.entries(data.tasks as Record<string, number>).forEach(([k, v]) => {
      ws.addRow([k, v]);
    });

    // ── Sheet 2: Risks detail ─────────────────────────────
    const wsR = wb.addWorksheet('Riscos');
    wsR.columns = [{ width: 40 }, { width: 12 }, { width: 15 }, { width: 15 }];
    wsR.addRow(['Título', 'Nível', 'Estado', 'Score']).font = { bold: true };
    data.risks.forEach((r: any) => wsR.addRow([r.title, r.level, r.status, r.inherentScore ?? '']));

    return Buffer.from(await wb.xlsx.writeBuffer() as any);
  }

  // ── Main processing pipeline ──────────────────────────────────

  private async processReport(
    reportId: string,
    organizationId: string,
    orgName: string,
    type: ReportType,
    format: ReportFormat,
    parameters: Record<string, any>,
  ) {
    try {
      const data = await this.getComplianceSummary(organizationId, parameters.projectId);

      let buffer: Buffer;
      let mimeType: string;
      let ext: string;

      if (format === 'JSON') {
        buffer = Buffer.from(JSON.stringify(data, null, 2));
        mimeType = 'application/json';
        ext = 'json';
      } else if (format === 'EXCEL') {
        buffer = await this.generateExcel(data, type, orgName);
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        ext = 'xlsx';
      } else {
        // Real branded PDF via PDFKit
        buffer = await this.generatePdf(data, type, orgName);
        mimeType = 'application/pdf';
        ext = 'pdf';
      }

      const filename = `${type}_${new Date().toISOString().split('T')[0]}.${ext}`;
      const { key, url } = await this.storage.uploadFile(
        buffer, filename, mimeType, `reports/${organizationId}`,
      );

      await this.prisma.report.update({
        where: { id: reportId },
        data: { s3Key: key, s3Url: url, status: 'READY', generatedAt: new Date() },
      });
    } catch (err) {
      this.logger.error(`Report generation failed: ${err.message}`);
      await this.prisma.report.update({
        where: { id: reportId },
        data: { status: 'FAILED' },
      });
    }
  }

  // ── Scheduled Reports ─────────────────────────────────────────

  async listSchedules(organizationId: string) {
    return (this.prisma as any).reportSchedule.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSchedule(organizationId: string, userId: string, dto: any) {
    const nextRun = this.calcNextRun(dto.frequency || 'MONTHLY');
    return (this.prisma as any).reportSchedule.create({
      data: {
        organizationId,
        createdById: userId,
        name: dto.name,
        type: dto.type || 'COMPLIANCE_SUMMARY',
        format: dto.format || 'PDF',
        frequency: dto.frequency || 'MONTHLY',
        recipients: dto.recipients || [],
        parameters: dto.parameters,
        isActive: true,
        nextRunAt: nextRun,
      },
    });
  }

  async updateSchedule(id: string, organizationId: string, dto: any) {
    const schedule = await (this.prisma as any).reportSchedule.findFirst({ where: { id, organizationId } });
    if (!schedule) throw new NotFoundException('Schedule not found');
    return (this.prisma as any).reportSchedule.update({
      where: { id },
      data: {
        ...dto,
        nextRunAt: dto.frequency ? this.calcNextRun(dto.frequency) : undefined,
      },
    });
  }

  async removeSchedule(id: string, organizationId: string) {
    const schedule = await (this.prisma as any).reportSchedule.findFirst({ where: { id, organizationId } });
    if (!schedule) throw new NotFoundException('Schedule not found');
    return (this.prisma as any).reportSchedule.delete({ where: { id } });
  }

  private calcNextRun(frequency: string): Date {
    const now = new Date();
    switch (frequency) {
      case 'DAILY':     return new Date(now.getTime() + 86400000);
      case 'WEEKLY':    return new Date(now.getTime() + 7 * 86400000);
      case 'QUARTERLY': return new Date(now.getTime() + 90 * 86400000);
      case 'MONTHLY':
      default:          return new Date(now.getTime() + 30 * 86400000);
    }
  }

  // ── Cron: run scheduled reports daily at 6 AM ────────────────

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async runScheduledReports() {
    this.logger.log('Running scheduled reports cron...');
    const now = new Date();
    const due = await (this.prisma as any).reportSchedule.findMany({
      where: { isActive: true, nextRunAt: { lte: now } },
      include: { organization: { select: { name: true } } },
    });

    for (const schedule of due) {
      try {
        // Generate the report
        const report = await this.generate(
          schedule.organizationId,
          schedule.type,
          schedule.format,
          schedule.parameters || {},
        );

        // Wait for it to complete (poll for up to 60s)
        let ready = false;
        for (let i = 0; i < 12; i++) {
          await new Promise(r => setTimeout(r, 5000));
          const r = await this.prisma.report.findUnique({ where: { id: report.id } });
          if (r?.status === 'READY') { ready = true; break; }
          if (r?.status === 'FAILED') break;
        }

        // Email recipients
        if (ready && schedule.recipients?.length > 0) {
          const r = await this.prisma.report.findUnique({ where: { id: report.id } });
          const downloadLink = r?.s3Url || '';
          for (const email of schedule.recipients) {
            await this.mail.sendScheduledReport(
              email,
              schedule.name,
              schedule.organization?.name || 'iComply',
              downloadLink,
              schedule.frequency,
            );
          }
        }

        // Update next run date
        await (this.prisma as any).reportSchedule.update({
          where: { id: schedule.id },
          data: { lastRunAt: now, nextRunAt: this.calcNextRun(schedule.frequency) },
        });
      } catch (err) {
        this.logger.error(`Scheduled report ${schedule.id} failed: ${err.message}`);
      }
    }
    this.logger.log(`Scheduled reports cron done — processed ${due.length}`);
  }
}
