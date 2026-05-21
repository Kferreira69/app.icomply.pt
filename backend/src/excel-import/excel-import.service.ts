import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StorageService } from '../common/storage/storage.service';

@Injectable()
export class ExcelImportService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async importFile(
    file: Express.Multer.File,
    type: string,
    mapping: Record<string, string>,
    organizationId: string,
    projectId?: string,
    userId?: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');

    // Store file
    const { key } = await this.storage.uploadFile(
      file.buffer, file.originalname, file.mimetype,
      `imports/${organizationId}`,
    );

    const importRecord = await this.prisma.excelImport.create({
      data: {
        organizationId,
        fileName: file.originalname,
        fileSize: file.size,
        s3Key: key,
        type,
        mapping,
        status: 'PENDING',
      },
    });

    // Process asynchronously
    this.processImport(importRecord.id, file.buffer, type, mapping, organizationId, projectId, userId)
      .catch(console.error);

    return {
      id: importRecord.id,
      message: 'Import started. Check status using the import ID.',
    };
  }

  async getStatus(id: string, organizationId: string) {
    return this.prisma.excelImport.findFirst({ where: { id, organizationId } });
  }

  async getHistory(organizationId: string) {
    return this.prisma.excelImport.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async downloadTemplate(type: string): Promise<Buffer> {
    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.default.Workbook();
    const ws = wb.addWorksheet('Import Template');

    const headers: Record<string, string[]> = {
      TASKS: ['Title*', 'Description', 'Priority (LOW/MEDIUM/HIGH/CRITICAL)', 'Due Date (YYYY-MM-DD)', 'Assignee Email', 'Tags (comma-separated)'],
      RISKS: ['Title*', 'Description', 'Category', 'Likelihood (RARE/UNLIKELY/POSSIBLE/LIKELY/ALMOST_CERTAIN)*', 'Impact (NEGLIGIBLE/MINOR/MODERATE/MAJOR/CATASTROPHIC)*', 'Mitigation Plan', 'Status'],
      CONTROLS: ['Code*', 'Title*', 'Description', 'Category', 'Status (NOT_IMPLEMENTED/PARTIALLY_IMPLEMENTED/IMPLEMENTED)'],
    };

    const cols = headers[type] || headers.TASKS;
    ws.addRow(cols);

    // Style header
    ws.getRow(1).eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B4F8A' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });

    // Add example row
    if (type === 'TASKS') {
      ws.addRow(['Example Task', 'Task description', 'HIGH', '2026-12-31', 'user@example.com', 'gdpr,iso27001']);
    } else if (type === 'RISKS') {
      ws.addRow(['Example Risk', 'Risk description', 'IT Security', 'POSSIBLE', 'MAJOR', 'Implement controls', 'IDENTIFIED']);
    }

    ws.columns.forEach(col => { col.width = 30; });

    return Buffer.from(await wb.xlsx.writeBuffer() as any);
  }

  private async processImport(
    importId: string,
    buffer: Buffer,
    type: string,
    mapping: Record<string, string>,
    organizationId: string,
    projectId: string | undefined,
    userId: string | undefined,
  ) {
    try {
      await this.prisma.excelImport.update({
        where: { id: importId },
        data: { status: 'PROCESSING' },
      });

      const ExcelJS = await import('exceljs');
      const wb = new ExcelJS.default.Workbook();
      await wb.xlsx.load(buffer as unknown as Buffer);
      const ws = wb.worksheets[0];

      const rows: any[] = [];
      let headers: string[] = [];
      let rowsTotal = 0;
      let rowsProcessed = 0;
      let rowsError = 0;
      const errors: any[] = [];

      ws.eachRow((row, idx) => {
        if (idx === 1) {
          headers = row.values as string[];
          headers = headers.filter(Boolean);
        } else {
          rowsTotal++;
          const obj: Record<string, any> = {};
          headers.forEach((h, i) => { obj[h] = row.getCell(i + 1).value; });
          rows.push(obj);
        }
      });

      // Create admin user ref
      const creator = await this.prisma.user.findFirst({
        where: { organizationId, role: { in: ['ADMIN', 'COMPLIANCE_MANAGER'] } },
      });

      for (const row of rows) {
        try {
          if (type === 'TASKS' && projectId && creator) {
            await this.prisma.task.create({
              data: {
                projectId,
                title: String(row[headers[0]] || '').trim(),
                description: String(row[headers[1]] || '').trim() || null,
                priority: row[headers[2]] || 'MEDIUM',
                dueDate: row[headers[3]] ? new Date(row[headers[3]]) : null,
                tags: row[headers[5]] ? String(row[headers[5]]).split(',').map(t => t.trim()) : [],
                createdById: creator.id,
              },
            });
            rowsProcessed++;
          } else if (type === 'RISKS') {
            const l = String(row[headers[3]] || 'POSSIBLE').toUpperCase();
            const i = String(row[headers[4]] || 'MODERATE').toUpperCase();
            const likelihoodMap: Record<string, number> = { RARE: 1, UNLIKELY: 2, POSSIBLE: 3, LIKELY: 4, ALMOST_CERTAIN: 5 };
            const impactMap: Record<string, number> = { NEGLIGIBLE: 1, MINOR: 2, MODERATE: 3, MAJOR: 4, CATASTROPHIC: 5 };
            await this.prisma.risk.create({
              data: {
                organizationId,
                projectId: projectId || null,
                ownerId: creator?.id || null,
                title: String(row[headers[0]] || '').trim(),
                description: String(row[headers[1]] || '').trim() || null,
                category: String(row[headers[2]] || '').trim() || null,
                likelihood: l as any,
                impact: i as any,
                inherentScore: (likelihoodMap[l] || 3) * (impactMap[i] || 3),
              },
            });
            rowsProcessed++;
          }
        } catch (err) {
          rowsError++;
          errors.push({ row: rowsProcessed + rowsError, error: err.message });
        }
      }

      await this.prisma.excelImport.update({
        where: { id: importId },
        data: {
          status: 'COMPLETED',
          rowsTotal,
          rowsProcessed,
          rowsError,
          errors: errors.length > 0 ? errors : null,
          processedAt: new Date(),
          result: { created: rowsProcessed, errors: rowsError },
        },
      });
    } catch (err) {
      await this.prisma.excelImport.update({
        where: { id: importId },
        data: { status: 'FAILED', errors: [{ message: err.message }] },
      });
    }
  }
}
