import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Response } from 'express';
import { StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { StorageService } from '../common/storage/storage.service';
import { MailService } from '../common/mail/mail.service';
import { ComplianceMetricsService } from '../common/services/compliance-metrics.service';
import { ReportType, ReportFormat } from '../generated/prisma/client';

const BRAND = {
  primary: '#1E40AF',
  accent:  '#3B82F6',
  dark:    '#1E293B',
  muted:   '#64748B',
  light:   '#F1F5F9',
  white:   '#FFFFFF',
  success: '#16A34A',
  warning: '#D97706',
  danger:  '#DC2626',
  border:  '#E2E8F0',
};

// ── Portuguese label maps ─────────────────────────────────────
const REPORT_TYPE_PT: Record<string, string> = {
  COMPLIANCE_SUMMARY: 'Sumário de Conformidade',
  RISK_REGISTER:      'Registo de Riscos',
  TASK_STATUS:        'Estado de Tarefas',
  EVIDENCE_GAP:       'Gap de Evidências',
  EXECUTIVE_SUMMARY:  'Sumário Executivo',
  AUDIT_REPORT:       'Relatório de Auditoria',
  GAP_ANALYSIS:       'Análise de Gap',
};
const RISK_LEVEL_PT: Record<string, string> = {
  CRITICAL: 'Crítico', HIGH: 'Alto', MEDIUM: 'Médio', LOW: 'Baixo',
};
const RISK_STATUS_PT: Record<string, string> = {
  IDENTIFIED: 'Identificado', IN_TREATMENT: 'Em Tratamento',
  MITIGATED:  'Mitigado',     ACCEPTED:     'Aceite',  CLOSED: 'Fechado',
};
const TASK_STATUS_PT: Record<string, string> = {
  TODO: 'A Fazer', IN_PROGRESS: 'Em Curso', IN_REVIEW: 'Em Revisão',
  DONE: 'Concluída', CANCELLED: 'Cancelada',
};
const EVIDENCE_STATUS_PT: Record<string, string> = {
  APPROVED: 'Aprovada', PENDING: 'Pendente', REJECTED: 'Rejeitada',
  EXPIRED:  'Expirada', DRAFT:   'Rascunho',
};
const PROJECT_STATUS_PT: Record<string, string> = {
  ACTIVE: 'Ativo', DRAFT: 'Rascunho', COMPLETED: 'Concluído', ARCHIVED: 'Arquivado',
};

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private mail: MailService,
    private config: ConfigService,
    private complianceMetrics: ComplianceMetricsService,
  ) {}

  private get frontendUrl(): string {
    return this.config.get<string>('FRONTEND_URL', 'https://app.icomply.pt');
  }

  // ── Public API ────────────────────────────────────────────────

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
    const reports = await this.prisma.report.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    // Strip raw MinIO/S3 URLs (may contain credentials or internal hostnames).
    // Return a backend-proxied download path instead.
    return reports.map(({ s3Url, ...r }) => ({
      ...r,
      downloadUrl: r.status === 'READY' ? `/api/v1/reports/${r.id}/download` : null,
    }));
  }

  async findOne(id: string, organizationId: string) {
    const report = await this.prisma.report.findFirst({ where: { id, organizationId } });
    if (!report) return null;
    const { s3Url, ...r } = report;
    return {
      ...r,
      downloadUrl: r.status === 'READY' ? `/api/v1/reports/${r.id}/download` : null,
    };
  }

  /**
   * Generate a fresh 5-minute presigned URL for the report file and
   * return it so the controller can issue a 302 redirect.
   * Only called by GET /reports/:id/download after JWT validation.
   */
  async getPresignedDownloadUrl(id: string, organizationId: string): Promise<string | null> {
    const report = await this.prisma.report.findFirst({ where: { id, organizationId } });
    if (!report || report.status !== 'READY' || !report.s3Key) return null;
    return this.storage.getPresignedUrl(report.s3Key, 300); // 5 minutes
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

    res.set('Content-Type', mime);
    res.set('Content-Disposition', `attachment; filename="${report.name}.${ext}"`);

    const buffer = this.storage.readLocalFile(report.s3Key);
    if (buffer) {
      res.set('Content-Length', String(buffer.length));
      return new StreamableFile(buffer);
    }

    const s3Buffer = await this.storage.readS3Buffer(report.s3Key);
    if (s3Buffer) {
      res.set('Content-Length', String(s3Buffer.length));
      return new StreamableFile(s3Buffer);
    }

    throw new NotFoundException('Report file not available');
  }

  // ── Data fetchers ─────────────────────────────────────────────

  async getComplianceSummary(organizationId: string, projectId?: string) {
    const where: any = { organizationId, ...(projectId && { id: projectId }) };

    const [projects, tasks, risks, evidence, audits, openCapas, totalAudits, totalCapas, complianceScore] =
      await Promise.all([
        this.prisma.project.findMany({
          where,
          select: { id: true, name: true, complianceScore: true, status: true, framework: { select: { name: true } } },
        }),
        this.prisma.task.groupBy({ by: ['status'], where: { project: { organizationId } }, _count: true }),
        this.prisma.risk.findMany({
          where: { organizationId },
          select: { id: true, title: true, status: true, inherentScore: true, residualScore: true },
          orderBy: { inherentScore: 'desc' },
        }),
        this.prisma.evidence.groupBy({ by: ['status'], where: { uploadedBy: { organizationId } }, _count: true }),
        this.prisma.audit.count({ where: { project: { organizationId }, status: 'COMPLETED' } }),
        this.prisma.capa.count({ where: { createdBy: { organizationId }, status: { notIn: ['CLOSED'] } } }),
        this.prisma.audit.count({ where: { project: { organizationId } } }),
        this.prisma.capa.count({ where: { createdBy: { organizationId } } }),
        // Single source of truth for compliance score
        this.complianceMetrics.getComplianceScore(organizationId),
      ]);

    return {
      generatedAt: new Date(),
      organization: { id: organizationId },
      complianceScore,
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

  private async getRiskRegisterData(organizationId: string) {
    const risks = await this.prisma.risk.findMany({
      where: { organizationId },
      orderBy: { inherentScore: 'desc' },
    });
    return risks.map((r: any) => ({
      ...r,
      level: r.inherentScore >= 20 ? 'CRITICAL'
        : r.inherentScore >= 12 ? 'HIGH'
        : r.inherentScore >= 6  ? 'MEDIUM'
        : 'LOW',
    }));
  }

  private async getEvidenceGapData(organizationId: string) {
    return this.prisma.evidence.findMany({
      where: { project: { organizationId } },
      select: {
        id: true, title: true, status: true, expiresAt: true,
        project:    { select: { name: true } },
        uploadedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ status: 'asc' }, { expiresAt: 'asc' }],
      take: 500,
    });
  }

  private async getTaskStatusData(organizationId: string) {
    return this.prisma.task.findMany({
      where: { project: { organizationId } },
      select: {
        id: true, title: true, status: true, priority: true, dueDate: true,
        project:  { select: { name: true } },
        assignee: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
      take: 500,
    });
  }

  // ── PDF helpers ───────────────────────────────────────────────

  private truncate(text: string, maxPts: number, fontSize = 9): string {
    const avgCharWidth = fontSize * 0.52;
    const maxChars = Math.floor(maxPts / avgCharWidth);
    if (!text || text.length <= maxChars) return text || '';
    return text.substring(0, maxChars - 3) + '...';
  }

  private pdfHeader(doc: any, orgName: string, type: string, dateStr: string): void {
    const W = doc.page.width;
    const M = 50;
    doc.rect(0, 0, W, 90).fill(BRAND.primary);
    doc.fillColor(BRAND.white).font('Helvetica-Bold').fontSize(22)
      .text('iComply', M, 22, { continued: true })
      .font('Helvetica').fillColor('#93C5FD')
      .text('  Compliance Platform');
    doc.fillColor('#BFDBFE').font('Helvetica').fontSize(11)
      .text(REPORT_TYPE_PT[type] ?? type, M, 50);
    doc.fillColor('#93C5FD').fontSize(9)
      .text(`${orgName}  ·  Gerado em ${dateStr}`, M, 68);
    doc.y = 110;
  }

  private pdfKpis(doc: any, items: Array<{ label: string; value: string | number; color?: string }>): void {
    const W = doc.page.width;
    const M = 50;
    const gap = 6;
    const available = W - 2 * M;
    const boxW = Math.floor((available - gap * (items.length - 1)) / items.length);
    const boxH = 54;
    const startY = doc.y;
    let x = M;
    const smallFont = items.length > 4 ? 16 : 20;

    items.forEach(item => {
      doc.rect(x, startY, boxW, boxH).fill(BRAND.light);
      doc.rect(x, startY, boxW, boxH).strokeColor(BRAND.border).lineWidth(0.5).stroke();
      doc.fillColor(item.color || BRAND.primary).font('Helvetica-Bold').fontSize(smallFont)
        .text(String(item.value), x, startY + 8, { width: boxW, align: 'center', lineBreak: false });
      doc.fillColor(BRAND.muted).font('Helvetica').fontSize(7)
        .text(item.label, x, startY + smallFont + 14, { width: boxW, align: 'center', lineBreak: false });
      x += boxW + gap;
    });
    doc.y = startY + boxH + 14;
  }

  private pdfSectionTitle(doc: any, title: string): void {
    const M = 50;
    const W = doc.page.width;
    doc.moveDown(0.5);
    if (doc.y + 30 > doc.page.height - 80) { doc.addPage(); doc.y = 40; }
    doc.moveTo(M, doc.y).lineTo(W - M, doc.y)
      .strokeColor(BRAND.border).lineWidth(0.8).stroke();
    doc.y += 6;
    doc.fillColor(BRAND.primary).font('Helvetica-Bold').fontSize(10)
      .text(title.toUpperCase(), M, doc.y, { characterSpacing: 0.4, lineBreak: false });
    doc.y += 16;
    doc.fillColor(BRAND.dark).font('Helvetica').fontSize(9);
  }

  private pdfTable(
    doc: any,
    headers: string[],
    rows: string[][],
    colWidths: number[],
    startX: number,
  ): void {
    const ROW_H = 18;
    const PAD   = 4;
    const totalW = colWidths.reduce((a, b) => a + b, 0);

    // Header row
    if (doc.y + ROW_H > doc.page.height - 80) { doc.addPage(); doc.y = 50; }
    const headerY = doc.y;
    doc.rect(startX, headerY, totalW, ROW_H).fill(BRAND.primary);
    let cx = startX;
    headers.forEach((h, i) => {
      doc.fillColor(BRAND.white).font('Helvetica-Bold').fontSize(8)
        .text(
          this.truncate(h, colWidths[i] - PAD * 2, 8),
          cx + PAD, headerY + PAD,
          { width: colWidths[i] - PAD * 2, lineBreak: false },
        );
      cx += colWidths[i];
    });
    doc.y = headerY + ROW_H;

    if (rows.length === 0) {
      doc.fillColor(BRAND.muted).font('Helvetica').fontSize(9)
        .text('Sem dados disponíveis.', startX + PAD, doc.y + PAD);
      doc.y += ROW_H;
      return;
    }

    // Data rows — key fix: save rowY before any text() call
    rows.forEach((row, ri) => {
      if (doc.y + ROW_H > doc.page.height - 80) { doc.addPage(); doc.y = 50; }
      const rowY = doc.y; // capture once for all columns in this row
      if (ri % 2 === 0) {
        doc.rect(startX, rowY, totalW, ROW_H).fill(BRAND.light);
      }
      cx = startX;
      row.forEach((cell, i) => {
        doc.fillColor(BRAND.dark).font('Helvetica').fontSize(9)
          .text(
            this.truncate(cell || '—', colWidths[i] - PAD * 2, 9),
            cx + PAD, rowY + PAD,
            { width: colWidths[i] - PAD * 2, lineBreak: false },
          );
        cx += colWidths[i];
      });
      doc.y = rowY + ROW_H; // advance by exactly one row height
    });
  }

  private pdfFooter(doc: any, orgName: string, dateStr: string): void {
    const W = doc.page.width;
    const M = 50;
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(pages.start + i);
      doc.rect(0, doc.page.height - 30, W, 30).fill(BRAND.dark);
      doc.fillColor(BRAND.white).font('Helvetica').fontSize(8)
        .text(
          `iComply Compliance Platform  ·  ${orgName}  ·  ${dateStr}`,
          M, doc.page.height - 18,
          { width: W - 2 * M - 60, lineBreak: false },
        );
      doc.fillColor('#94A3B8').font('Helvetica').fontSize(8)
        .text(
          `Pág. ${i + 1} / ${pages.count}`,
          W - M - 55, doc.page.height - 18,
          { width: 55, align: 'right', lineBreak: false },
        );
    }
  }

  // ── Type-specific PDF generators ──────────────────────────────

  private async generateComplianceSummaryPdf(data: any, orgName: string): Promise<Buffer> {
    const pdfkit = await import('pdfkit');
    const PDFDocument = (pdfkit as any).default ?? pdfkit;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width;
      const M = 50;
      // Available table width: 595 - 2*50 = 495
      const dateStr = new Date(data.generatedAt).toLocaleDateString('pt-PT', {
        day: '2-digit', month: 'long', year: 'numeric',
      });

      this.pdfHeader(doc, orgName, 'COMPLIANCE_SUMMARY', dateStr);

      // Score band
      const score = data.complianceScore ?? 0;
      const scoreColor = score >= 80 ? BRAND.success : score >= 60 ? BRAND.warning : BRAND.danger;
      const bandY = doc.y;
      doc.rect(M, bandY, W - 2 * M, 68).fill(BRAND.light);
      doc.fillColor(scoreColor).font('Helvetica-Bold').fontSize(44)
        .text(`${score}%`, M + 16, bandY + 8, { width: 110, align: 'left', lineBreak: false });
      doc.fillColor(BRAND.dark).font('Helvetica-Bold').fontSize(13)
        .text('Pontuação de Conformidade', M + 136, bandY + 10, { lineBreak: false });
      doc.fillColor(BRAND.muted).font('Helvetica').fontSize(9)
        .text('Média ponderada de todos os projetos ativos', M + 136, bandY + 30, { lineBreak: false });
      const bX = M + 136, bY = bandY + 50, bW = W - 2 * M - 156;
      doc.rect(bX, bY, bW, 6).fill(BRAND.border);
      doc.rect(bX, bY, Math.round(bW * score / 100), 6).fill(scoreColor);
      doc.y = bandY + 82;

      // KPI row
      const risks = data.risks ?? [];
      const highCount = risks.filter((r: any) => ['HIGH', 'CRITICAL'].includes(r.level)).length;
      this.pdfKpis(doc, [
        { label: 'Projetos', value: data.projects?.total ?? 0 },
        { label: 'Riscos Críticos/Altos', value: highCount, color: highCount > 0 ? BRAND.danger : BRAND.success },
        { label: 'Auditorias Concluídas', value: data.auditsCompleted ?? 0, color: BRAND.success },
        { label: 'CAPA em Aberto', value: data.openCapas ?? 0, color: (data.openCapas ?? 0) > 0 ? BRAND.warning : BRAND.success },
      ]);

      // Projects table — 495 = 195+150+80+70
      this.pdfSectionTitle(doc, 'Projetos');
      this.pdfTable(doc,
        ['Nome', 'Framework', 'Estado', 'Score'],
        (data.projects?.list ?? []).map((p: any) => [
          p.name,
          p.framework?.name ?? '—',
          PROJECT_STATUS_PT[p.status] ?? p.status,
          `${p.complianceScore ?? 0}%`,
        ]),
        [195, 150, 80, 70], M,
      );

      // Risk overview — 495 = 255+80+80+80
      this.pdfSectionTitle(doc, 'Riscos');
      const medCount = risks.filter((r: any) => r.level === 'MEDIUM').length;
      const lowCount = risks.filter((r: any) => r.level === 'LOW').length;
      doc.fillColor(BRAND.dark).font('Helvetica').fontSize(9)
        .text(
          `Total: ${risks.length}  ·  Críticos/Altos: ${highCount}  ·  Médios: ${medCount}  ·  Baixos: ${lowCount}`,
          M, doc.y,
        );
      doc.y += 10;

      const topRisks = risks.filter((r: any) => ['HIGH', 'CRITICAL'].includes(r.level)).slice(0, 10);
      if (topRisks.length > 0) {
        this.pdfTable(doc,
          ['Título', 'Nível', 'Score Inerente', 'Estado'],
          topRisks.map((r: any) => [
            r.title,
            RISK_LEVEL_PT[r.level] ?? r.level,
            String(r.inherentScore ?? '—'),
            RISK_STATUS_PT[r.status] ?? r.status,
          ]),
          [255, 80, 80, 80], M,
        );
      }

      // Tasks by status — 495 = 380+115
      this.pdfSectionTitle(doc, 'Tarefas por Estado');
      const taskEntries = Object.entries(data.tasks as Record<string, number>);
      this.pdfTable(doc,
        ['Estado', 'Quantidade'],
        taskEntries.map(([k, v]) => [TASK_STATUS_PT[k] ?? k, String(v)]),
        [380, 115], M,
      );

      // Evidence by status
      const evidenceMap = data.evidence as Record<string, number>;
      const evidenceEntries = Object.entries(evidenceMap ?? {});
      if (evidenceEntries.length > 0) {
        this.pdfSectionTitle(doc, 'Evidências por Estado');
        this.pdfTable(doc,
          ['Estado', 'Quantidade'],
          evidenceEntries.map(([k, v]) => [EVIDENCE_STATUS_PT[k] ?? k, String(v)]),
          [380, 115], M,
        );
      }

      // Audits & CAPA
      this.pdfSectionTitle(doc, 'Auditorias & CAPA');
      this.pdfTable(doc,
        ['Indicador', 'Valor'],
        [
          ['Auditorias Concluídas', `${data.auditsCompleted ?? 0} / ${data.totalAudits ?? 0}`],
          ['CAPA em Aberto', `${data.openCapas ?? 0} / ${data.totalCapas ?? 0}`],
        ],
        [380, 115], M,
      );

      this.pdfFooter(doc, orgName, dateStr);
      doc.end();
    });
  }

  private async generateRiskRegisterPdf(data: any, orgName: string): Promise<Buffer> {
    const pdfkit = await import('pdfkit');
    const PDFDocument = (pdfkit as any).default ?? pdfkit;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const M = 50;
      const dateStr = new Date(data.generatedAt).toLocaleDateString('pt-PT', {
        day: '2-digit', month: 'long', year: 'numeric',
      });

      this.pdfHeader(doc, orgName, 'RISK_REGISTER', dateStr);

      const risks = data.fullRisks ?? data.risks ?? [];
      const critical = risks.filter((r: any) => r.level === 'CRITICAL').length;
      const high     = risks.filter((r: any) => r.level === 'HIGH').length;
      const medium   = risks.filter((r: any) => r.level === 'MEDIUM').length;
      const low      = risks.filter((r: any) => r.level === 'LOW').length;

      this.pdfKpis(doc, [
        { label: 'Total Riscos',  value: risks.length },
        { label: 'Críticos',      value: critical, color: '#7C3AED' },
        { label: 'Altos',         value: high,     color: BRAND.danger },
        { label: 'Médios',        value: medium,   color: BRAND.warning },
        { label: 'Baixos',        value: low,       color: BRAND.success },
      ]);

      // Full risk table — 495 = 185+70+80+70+90
      this.pdfSectionTitle(doc, 'Registo Completo de Riscos');
      this.pdfTable(doc,
        ['Título', 'Nível', 'Estado', 'Inerente', 'Tratamento'],
        risks.map((r: any) => [
          r.title,
          RISK_LEVEL_PT[r.level] ?? r.level,
          RISK_STATUS_PT[r.status] ?? r.status,
          `${r.inherentScore ?? 0}${r.residualScore ? ` → ${r.residualScore}` : ''}`,
          r.treatmentType ?? '—',
        ]),
        [185, 70, 80, 70, 90], M,
      );

      // By level breakdown
      const byLevel = [
        { level: 'CRITICAL', label: 'Críticos', items: risks.filter((r: any) => r.level === 'CRITICAL') },
        { level: 'HIGH',     label: 'Altos',    items: risks.filter((r: any) => r.level === 'HIGH') },
      ];
      for (const group of byLevel) {
        if (group.items.length === 0) continue;
        this.pdfSectionTitle(doc, `Riscos ${group.label}`);
        this.pdfTable(doc,
          ['Título', 'Estado', 'Score Inerente', 'Score Residual'],
          group.items.map((r: any) => [
            r.title,
            RISK_STATUS_PT[r.status] ?? r.status,
            String(r.inherentScore ?? '—'),
            String(r.residualScore ?? '—'),
          ]),
          [225, 100, 90, 80], M,
        );
      }

      this.pdfFooter(doc, orgName, dateStr);
      doc.end();
    });
  }

  private async generateEvidenceGapPdf(data: any, orgName: string): Promise<Buffer> {
    const pdfkit = await import('pdfkit');
    const PDFDocument = (pdfkit as any).default ?? pdfkit;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const M = 50;
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });

      this.pdfHeader(doc, orgName, 'EVIDENCE_GAP', dateStr);

      const evidences = data.evidenceData ?? [];
      const approved = evidences.filter((e: any) => e.status === 'APPROVED').length;
      const pending  = evidences.filter((e: any) => e.status === 'PENDING').length;
      const expired  = evidences.filter((e: any) =>
        e.status === 'EXPIRED' || (e.expiresAt && new Date(e.expiresAt) < now),
      ).length;
      const rejected = evidences.filter((e: any) => e.status === 'REJECTED').length;

      this.pdfKpis(doc, [
        { label: 'Total Evidências', value: evidences.length },
        { label: 'Aprovadas',        value: approved, color: BRAND.success },
        { label: 'Pendentes',        value: pending,  color: BRAND.warning },
        { label: 'Expiradas/Rejeit.', value: expired + rejected, color: BRAND.danger },
      ]);

      // Evidence table — 495 = 195+120+80+100
      this.pdfSectionTitle(doc, 'Evidências por Estado');
      this.pdfTable(doc,
        ['Título', 'Projeto', 'Estado', 'Expira em'],
        evidences.slice(0, 60).map((e: any) => [
          e.title,
          e.project?.name ?? '—',
          EVIDENCE_STATUS_PT[e.status] ?? e.status,
          e.expiresAt ? new Date(e.expiresAt).toLocaleDateString('pt-PT') : '—',
        ]),
        [195, 120, 80, 100], M,
      );

      // Expiring soon
      const in30 = new Date(now.getTime() + 30 * 86400000);
      const expiringSoon = evidences.filter((e: any) => {
        if (!e.expiresAt) return false;
        const exp = new Date(e.expiresAt);
        return exp > now && exp <= in30;
      });
      if (expiringSoon.length > 0) {
        this.pdfSectionTitle(doc, 'A Expirar nos Próximos 30 Dias');
        this.pdfTable(doc,
          ['Título', 'Projeto', 'Expira em'],
          expiringSoon.map((e: any) => [
            e.title,
            e.project?.name ?? '—',
            new Date(e.expiresAt).toLocaleDateString('pt-PT'),
          ]),
          [255, 140, 100], M,
        );
      }

      this.pdfFooter(doc, orgName, dateStr);
      doc.end();
    });
  }

  private async generateTaskStatusPdf(data: any, orgName: string): Promise<Buffer> {
    const pdfkit = await import('pdfkit');
    const PDFDocument = (pdfkit as any).default ?? pdfkit;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const M = 50;
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });

      this.pdfHeader(doc, orgName, 'TASK_STATUS', dateStr);

      const tasks = data.taskData ?? [];
      const todo   = tasks.filter((t: any) => t.status === 'TODO').length;
      const inProg = tasks.filter((t: any) => t.status === 'IN_PROGRESS').length;
      const done   = tasks.filter((t: any) => t.status === 'DONE').length;
      const overdue = tasks.filter((t: any) =>
        t.dueDate && new Date(t.dueDate) < now && !['DONE', 'CANCELLED'].includes(t.status),
      ).length;

      this.pdfKpis(doc, [
        { label: 'Total',      value: tasks.length },
        { label: 'A Fazer',    value: todo },
        { label: 'Em Curso',   value: inProg,  color: BRAND.warning },
        { label: 'Concluídas', value: done,    color: BRAND.success },
        { label: 'Atrasadas',  value: overdue, color: BRAND.danger },
      ]);

      // Tasks table — 495 = 175+120+80+60+60
      this.pdfSectionTitle(doc, 'Lista de Tarefas');
      this.pdfTable(doc,
        ['Título', 'Projeto', 'Estado', 'Prioridade', 'Prazo'],
        tasks.slice(0, 80).map((t: any) => [
          t.title,
          t.project?.name ?? '—',
          TASK_STATUS_PT[t.status] ?? t.status,
          t.priority ?? '—',
          t.dueDate ? new Date(t.dueDate).toLocaleDateString('pt-PT') : '—',
        ]),
        [175, 120, 80, 60, 60], M,
      );

      // Overdue tasks
      const overdueList = tasks.filter((t: any) =>
        t.dueDate && new Date(t.dueDate) < now && !['DONE', 'CANCELLED'].includes(t.status),
      );
      if (overdueList.length > 0) {
        this.pdfSectionTitle(doc, 'Tarefas Atrasadas');
        this.pdfTable(doc,
          ['Título', 'Projeto', 'Prazo'],
          overdueList.map((t: any) => [
            t.title,
            t.project?.name ?? '—',
            t.dueDate ? new Date(t.dueDate).toLocaleDateString('pt-PT') : '—',
          ]),
          [255, 140, 100], M,
        );
      }

      this.pdfFooter(doc, orgName, dateStr);
      doc.end();
    });
  }

  private async generatePdf(data: any, type: ReportType, orgName: string): Promise<Buffer> {
    switch (type) {
      case 'RISK_REGISTER': return this.generateRiskRegisterPdf(data, orgName);
      case 'EVIDENCE_GAP':  return this.generateEvidenceGapPdf(data, orgName);
      case 'TASK_STATUS':   return this.generateTaskStatusPdf(data, orgName);
      default:              return this.generateComplianceSummaryPdf(data, orgName);
    }
  }

  // ── Excel generation ──────────────────────────────────────────

  private async generateExcel(data: any, type: ReportType, orgName: string): Promise<Buffer> {
    const exceljs = await import('exceljs');
    const ExcelJS = (exceljs as any).default ?? exceljs;
    const wb = new ExcelJS.Workbook();
    wb.creator = 'iComply';

    const hStyle = (cell: any) => {
      cell.font  = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FF3B82F6' } },
      };
    };

    // ── Summary sheet (all types) ─────────────────────────────
    const ws = wb.addWorksheet('Resumo');
    ws.columns = [{ width: 35 }, { width: 22 }, { width: 18 }, { width: 14 }];
    const t1 = ws.addRow([`iComply — ${REPORT_TYPE_PT[type as string] ?? type}`]);
    t1.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1E40AF' } };
    ws.addRow([`Organização: ${orgName}`]);
    ws.addRow([`Gerado em: ${new Date(data.generatedAt).toLocaleDateString('pt-PT')}`]);
    ws.addRow([]);

    const sc = data.complianceScore ?? 0;
    const scoreRow = ws.addRow(['Pontuação de Conformidade', `${sc}%`]);
    scoreRow.getCell(1).font = { bold: true, size: 12 };
    scoreRow.getCell(2).font = {
      bold: true, size: 12,
      color: { argb: sc >= 80 ? 'FF16A34A' : sc >= 60 ? 'FFD97706' : 'FFDC2626' },
    };
    ws.addRow([]);

    // Projects
    ws.addRow(['PROJETOS']).getCell(1).font = { bold: true, color: { argb: 'FF1E40AF' } };
    const ph = ws.addRow(['Nome', 'Framework', 'Estado', 'Score']);
    ['A', 'B', 'C', 'D'].forEach(col => hStyle(ph.getCell(col)));
    (data.projects?.list ?? []).forEach((p: any) => {
      ws.addRow([
        p.name,
        p.framework?.name ?? '—',
        PROJECT_STATUS_PT[p.status] ?? p.status,
        `${p.complianceScore ?? 0}%`,
      ]);
    });
    ws.addRow([]);

    // Tasks by status
    ws.addRow(['TAREFAS POR ESTADO']).getCell(1).font = { bold: true, color: { argb: 'FF1E40AF' } };
    const th = ws.addRow(['Estado', 'Quantidade']);
    hStyle(th.getCell('A')); hStyle(th.getCell('B'));
    Object.entries(data.tasks as Record<string, number>).forEach(([k, v]) => {
      ws.addRow([TASK_STATUS_PT[k] ?? k, v]);
    });
    ws.addRow([]);

    // Evidence by status
    const evidMap = data.evidence as Record<string, number> | undefined;
    if (evidMap && Object.keys(evidMap).length > 0) {
      ws.addRow(['EVIDÊNCIAS POR ESTADO']).getCell(1).font = { bold: true, color: { argb: 'FF1E40AF' } };
      const eh = ws.addRow(['Estado', 'Quantidade']);
      hStyle(eh.getCell('A')); hStyle(eh.getCell('B'));
      Object.entries(evidMap).forEach(([k, v]) => { ws.addRow([EVIDENCE_STATUS_PT[k] ?? k, v]); });
      ws.addRow([]);
    }

    ws.addRow(['Auditorias Concluídas', `${data.auditsCompleted ?? 0} / ${data.totalAudits ?? 0}`]);
    ws.addRow(['CAPA em Aberto', `${data.openCapas ?? 0} / ${data.totalCapas ?? 0}`]);

    // ── Risks sheet ───────────────────────────────────────────
    const wsR = wb.addWorksheet('Riscos');
    wsR.columns = [
      { width: 40 }, { width: 12 }, { width: 18 }, { width: 14 }, { width: 14 }, { width: 20 },
    ];
    const rh = wsR.addRow(['Título', 'Nível', 'Estado', 'Score Inerente', 'Score Residual', 'Tratamento']);
    ['A', 'B', 'C', 'D', 'E', 'F'].forEach(col => hStyle(rh.getCell(col)));
    const risks = data.fullRisks ?? data.risks ?? [];
    const levelArgb: Record<string, string> = {
      CRITICAL: 'FF7C3AED', HIGH: 'FFDC2626', MEDIUM: 'FFD97706', LOW: 'FF16A34A',
    };
    risks.forEach((r: any) => {
      const row = wsR.addRow([
        r.title,
        RISK_LEVEL_PT[r.level] ?? r.level,
        RISK_STATUS_PT[r.status] ?? r.status,
        r.inherentScore ?? '',
        r.residualScore ?? '',
        r.treatmentType ?? '—',
      ]);
      if (levelArgb[r.level]) row.getCell('B').font = { bold: true, color: { argb: levelArgb[r.level] } };
    });

    // ── Evidence sheet (when available) ──────────────────────
    const evidenceData = data.evidenceData;
    if (evidenceData?.length > 0) {
      const wsE = wb.addWorksheet('Evidências');
      wsE.columns = [{ width: 35 }, { width: 25 }, { width: 14 }, { width: 14 }, { width: 22 }];
      const eh2 = wsE.addRow(['Título', 'Projeto', 'Estado', 'Expira em', 'Enviado por']);
      ['A', 'B', 'C', 'D', 'E'].forEach(col => hStyle(eh2.getCell(col)));
      evidenceData.forEach((e: any) => {
        wsE.addRow([
          e.title,
          e.project?.name ?? '—',
          EVIDENCE_STATUS_PT[e.status] ?? e.status,
          e.expiresAt ? new Date(e.expiresAt).toLocaleDateString('pt-PT') : '—',
          e.uploadedBy
            ? `${e.uploadedBy.firstName ?? ''} ${e.uploadedBy.lastName ?? ''}`.trim()
            : '—',
        ]);
      });
    }

    // ── Tasks sheet (when available) ─────────────────────────
    const taskData = data.taskData;
    if (taskData?.length > 0) {
      const wsT = wb.addWorksheet('Tarefas');
      wsT.columns = [
        { width: 35 }, { width: 25 }, { width: 14 }, { width: 12 }, { width: 14 }, { width: 22 },
      ];
      const th2 = wsT.addRow(['Título', 'Projeto', 'Estado', 'Prioridade', 'Prazo', 'Responsável']);
      ['A', 'B', 'C', 'D', 'E', 'F'].forEach(col => hStyle(th2.getCell(col)));
      taskData.forEach((t: any) => {
        wsT.addRow([
          t.title,
          t.project?.name ?? '—',
          TASK_STATUS_PT[t.status] ?? t.status,
          t.priority ?? '—',
          t.dueDate ? new Date(t.dueDate).toLocaleDateString('pt-PT') : '—',
          t.assignee
            ? `${t.assignee.firstName ?? ''} ${t.assignee.lastName ?? ''}`.trim()
            : '—',
        ]);
      });
    }

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
      const base = await this.getComplianceSummary(organizationId, parameters.projectId);

      // Fetch type-specific data
      const data: any = { ...base };
      if (type === 'RISK_REGISTER' || format === 'EXCEL') {
        data.fullRisks = await this.getRiskRegisterData(organizationId);
      }
      if (type === 'EVIDENCE_GAP' || format === 'EXCEL') {
        data.evidenceData = await this.getEvidenceGapData(organizationId);
      }
      if (type === 'TASK_STATUS' || format === 'EXCEL') {
        data.taskData = await this.getTaskStatusData(organizationId);
      }

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
        const report = await this.generate(
          schedule.organizationId,
          schedule.type,
          schedule.format,
          schedule.parameters || {},
        );

        let ready = false;
        for (let i = 0; i < 12; i++) {
          await new Promise(r => setTimeout(r, 5000));
          const r = await this.prisma.report.findUnique({ where: { id: report.id } });
          if (r?.status === 'READY') { ready = true; break; }
          if (r?.status === 'FAILED') break;
        }

        if (ready && schedule.recipients?.length > 0) {
          // s3Url uses internal Docker network (minio:9000) — send frontend link instead
          const reportsPageLink = `${this.frontendUrl}/reports`;
          let stats: any;
          try { stats = await this.getComplianceSummary(schedule.organizationId); } catch { /* non-critical */ }

          for (const email of schedule.recipients) {
            await this.mail.sendScheduledReport(
              email,
              schedule.name,
              schedule.organization?.name || 'iComply',
              reportsPageLink,
              schedule.frequency,
              schedule.type,
              stats,
            );
          }
        }

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
