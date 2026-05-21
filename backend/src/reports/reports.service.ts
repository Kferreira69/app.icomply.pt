import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StorageService } from '../common/storage/storage.service';
import { ReportType, ReportFormat } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async generate(
    organizationId: string,
    type: ReportType,
    format: ReportFormat,
    parameters: Record<string, any> = {},
  ) {
    // Create report record
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

    // Generate data asynchronously (non-blocking for MVP)
    this.processReport(report.id, organizationId, type, format, parameters).catch(console.error);

    return { ...report, message: 'Report generation started. Check status with the report ID.' };
  }

  async findAll(organizationId: string) {
    return this.prisma.report.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    return this.prisma.report.findFirst({
      where: { id, organizationId },
    });
  }

  async getComplianceSummary(organizationId: string, projectId?: string) {
    const where: any = { organizationId, ...(projectId && { id: projectId }) };

    const [projects, tasks, risks, evidence, audits, openCapas] = await Promise.all([
      this.prisma.project.findMany({ where, select: { id: true, name: true, complianceScore: true, status: true } }),
      this.prisma.task.groupBy({ by: ['status'], where: { project: { organizationId } }, _count: true }),
      this.prisma.risk.groupBy({ by: ['status'], where: { organizationId }, _count: true }),
      this.prisma.evidence.groupBy({ by: ['status'], where: { uploadedBy: { organizationId } }, _count: true }),
      this.prisma.audit.count({ where: { project: { organizationId }, status: 'COMPLETED' } }),
      this.prisma.capa.count({ where: { createdBy: { organizationId }, status: { notIn: ['CLOSED'] } } }),
    ]);

    const avgScore = projects.length > 0
      ? Math.round(projects.reduce((s, p) => s + (p.complianceScore || 0), 0) / projects.length)
      : 0;

    return {
      generatedAt: new Date(),
      organization: { id: organizationId },
      complianceScore: avgScore,
      projects: { total: projects.length, byStatus: projects },
      tasks: tasks.reduce((acc, t) => ({ ...acc, [t.status]: t._count }), {}),
      risks: risks.reduce((acc, r) => ({ ...acc, [r.status]: r._count }), {}),
      evidence: evidence.reduce((acc, e) => ({ ...acc, [e.status]: e._count }), {}),
      auditsCompleted: audits,
      openCapas,
    };
  }

  private async processReport(
    reportId: string,
    organizationId: string,
    type: ReportType,
    format: ReportFormat,
    parameters: Record<string, any>,
  ) {
    try {
      const data = await this.getComplianceSummary(organizationId, parameters.projectId);

      let buffer: Buffer;
      let mimeType: string;

      if (format === 'JSON') {
        buffer = Buffer.from(JSON.stringify(data, null, 2));
        mimeType = 'application/json';
      } else if (format === 'EXCEL') {
        buffer = await this.generateExcel(data, type);
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else {
        // PDF - simplified text for MVP
        buffer = Buffer.from(this.generateTextReport(data, type));
        mimeType = 'text/plain';
      }

      const { key, url } = await this.storage.uploadFile(
        buffer,
        `${type}_report.${format.toLowerCase()}`,
        mimeType,
        `reports/${organizationId}`,
      );

      await this.prisma.report.update({
        where: { id: reportId },
        data: { s3Key: key, s3Url: url, status: 'READY', generatedAt: new Date() },
      });
    } catch (err) {
      await this.prisma.report.update({
        where: { id: reportId },
        data: { status: 'FAILED' },
      });
    }
  }

  private generateTextReport(data: any, type: ReportType): string {
    return `
iComply Compliance Report
Generated: ${data.generatedAt}
Type: ${type}

COMPLIANCE SCORE: ${data.complianceScore}%

PROJECTS: ${data.projects.total} total

OPEN CAPAS: ${data.openCapas}
AUDITS COMPLETED: ${data.auditsCompleted}
    `.trim();
  }

  private async generateExcel(data: any, type: ReportType): Promise<Buffer> {
    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.default.Workbook();
    const ws = wb.addWorksheet('Compliance Report');

    ws.addRow(['iComply Compliance Report']);
    ws.addRow(['Generated:', data.generatedAt.toISOString()]);
    ws.addRow(['Compliance Score:', `${data.complianceScore}%`]);
    ws.addRow([]);
    ws.addRow(['Projects Total:', data.projects.total]);
    ws.addRow(['Open CAPAs:', data.openCapas]);
    ws.addRow(['Audits Completed:', data.auditsCompleted]);

    return Buffer.from(await wb.xlsx.writeBuffer() as any);
  }
}
