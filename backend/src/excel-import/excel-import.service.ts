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

    if (type === 'GAP_ANALYSIS_ISO27001') {
      return this.buildGapIso27001Template(wb);
    }

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

  private async buildGapIso27001Template(wb: any): Promise<Buffer> {
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B4F8A' } },
      alignment: { wrapText: true, vertical: 'middle' as const },
    };
    const sectionStyle = {
      font: { bold: true, size: 10 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } },
    };

    const COLS = [
      { header: 'Cláusula ISO 27001', key: 'code', width: 18 },
      { header: 'Requisito / Controlo', key: 'title', width: 40 },
      { header: 'Estado', key: 'status', width: 30 },
      { header: 'Evidências', key: 'evidence', width: 35 },
      { header: 'Doc (X)', key: 'doc', width: 8 },
      { header: 'Reunião (X)', key: 'meeting', width: 10 },
      { header: 'Observado (X)', key: 'observed', width: 12 },
      { header: 'Esforço', key: 'effort', width: 20 },
      { header: 'Ação Corretiva', key: 'action', width: 35 },
      { header: 'Prioridade', key: 'priority', width: 12 },
      { header: 'Notas Adicionais', key: 'notes', width: 30 },
    ];

    // Sheet 1: Requisitos ISO 27001
    const ws1 = wb.addWorksheet('Requisitos ISO 27001');
    ws1.columns = COLS;
    ws1.getRow(1).eachCell((cell: any) => { Object.assign(cell, headerStyle); });
    ws1.getRow(1).height = 30;

    const reqRows = [
      ['4', 'Contexto da Organização', '', '', '', '', '', '', '', '', ''],
      ['4.1', 'Compreender a organização e o seu contexto', 'Implementado e em Conformidade', 'Revisão anual do contexto', 'X', '', '', 'Não aplicável', '', 'Não aplicável', ''],
      ['4.2', 'Compreender as necessidades e expetativas das partes interessadas', 'Necessita de Melhoria(s)', '', '', 'X', '', 'Algum esforço', 'Mapear partes interessadas', 'Média', 'Atualizar registo'],
      ['4.3', 'Determinar o âmbito do SGSI', 'Não Conformidade Menor', '', '', '', 'X', 'Pouco esforço', 'Definir âmbito formal', 'Alta', ''],
      ['5', 'Liderança', '', '', '', '', '', '', '', '', ''],
      ['5.1', 'Liderança e comprometimento', 'Implementado e em Conformidade', 'Ata de aprovação', 'X', '', '', 'Não aplicável', '', 'Não aplicável', ''],
      ['6', 'Planeamento', '', '', '', '', '', '', '', '', ''],
      ['6.1', 'Ações para tratar riscos e oportunidades', 'Necessita de Melhoria(s)', '', '', 'X', '', 'Esforço executável', 'Implementar processo formal de gestão de riscos', 'Alta', ''],
    ];
    reqRows.forEach((r, i) => {
      ws1.addRow(r);
      if (!r[2]) { // section header row (no status)
        ws1.getRow(i + 2).eachCell((cell: any) => { Object.assign(cell, sectionStyle); });
      }
    });

    // Sheet 2: Anexo A
    const ws2 = wb.addWorksheet('Anexo A 2013 Controlos');
    const annexCols = [...COLS, { header: 'Notas Auditor', key: 'auditorNotes', width: 30 }];
    ws2.columns = annexCols;
    ws2.getRow(1).eachCell((cell: any) => { Object.assign(cell, headerStyle); });
    ws2.getRow(1).height = 30;

    const annexRows = [
      ['A.5', 'Políticas de Segurança da Informação', '', '', '', '', '', '', '', '', '', ''],
      ['A.5.1', 'Orientação de gestão para segurança da informação', '', '', '', '', '', '', '', '', '', ''],
      ['A.5.1.1', 'Políticas para a segurança da informação', 'Implementado e em Conformidade', 'Política aprovada v2.1', 'X', '', '', 'Não aplicável', '', 'Não aplicável', '', 'Verificado em reunião'],
      ['A.5.1.2', 'Revisão das políticas de segurança da informação', 'Necessita de Melhoria(s)', '', '', 'X', '', 'Pouco esforço', 'Calendarizar revisão anual', 'Baixa', '', ''],
      ['A.6', 'Organização da Segurança da Informação', '', '', '', '', '', '', '', '', '', ''],
      ['A.6.1', 'Organização interna', '', '', '', '', '', '', '', '', '', ''],
      ['A.6.1.1', 'Responsabilidades e funções de segurança da informação', 'Não Conformidade Menor', '', '', '', 'X', 'Algum esforço', 'Definir responsabilidades formais', 'Alta', '', 'Sem RACI definido'],
      ['A.9', 'Controlo de Acessos', '', '', '', '', '', '', '', '', '', ''],
      ['A.9.1.1', 'Política de controlo de acesso', 'Não Conformidade Maior', '', '', '', '', 'Esforço executável', 'Implementar política de controlo de acesso', 'Alta', '', 'Crítico'],
    ];
    annexRows.forEach((r, i) => {
      ws2.addRow(r);
      if (!r[2]) {
        ws2.getRow(i + 2).eachCell((cell: any) => { Object.assign(cell, sectionStyle); });
      }
    });

    // Sheet 3: Legend
    const ws3 = wb.addWorksheet('Tabelas de Suporte Auditoria');
    ws3.addRow(['Valores de Estado aceites:']);
    ws3.addRow(['Implementado e em Conformidade', '→ Controlo totalmente implementado']);
    ws3.addRow(['Necessita de Melhoria(s)', '→ Controlo parcialmente implementado']);
    ws3.addRow(['Não Conformidade Menor', '→ Não conformidade de menor impacto — cria CAPA automático']);
    ws3.addRow(['Não Conformidade Maior', '→ Não conformidade crítica — cria CAPA prioritário']);
    ws3.addRow(['Não aplicável', '→ Controlo excluído do âmbito']);
    ws3.addRow([]);
    ws3.addRow(['Valores de Prioridade:', 'Baixa | Média | Alta | Não aplicável']);
    ws3.addRow(['Valores de Esforço:', 'Não aplicável | Pouco esforço | Algum esforço | Esforço executável']);
    ws3.getRow(1).font = { bold: true };

    return Buffer.from(await wb.xlsx.writeBuffer() as any);
  }

  // Normalise Portuguese ISO 27001 audit status strings → internal enum values
  private normalizeGapStatus(raw: string): 'IMPLEMENTED' | 'PARTIALLY_IMPLEMENTED' | 'NOT_STARTED' | 'NOT_APPLICABLE' | null {
    if (!raw) return null;
    const s = raw.trim();
    // Non-conformity check BEFORE implementado (avoids false positive if someone writes "Não Conformidade Implementada")
    if (/[Cc]onformidade\s+[Mm]en[oa]r|[Cc]onformidade\s+[Mm]ai[oa]r|[Nn][ãa]o\s+[Cc]onformidade/i.test(s)) return 'NOT_STARTED';
    if (/[Ii]mplementado/i.test(s)) return 'IMPLEMENTED';
    if (/[Nn]ecessita|[Mm]elhoria/i.test(s)) return 'PARTIALLY_IMPLEMENTED';
    if (/[Nn][ãa]o\s+[Aa]plic/i.test(s)) return 'NOT_APPLICABLE';
    return null;
  }

  private async processGapIso27001(
    importId: string,
    buffer: Buffer,
    organizationId: string,
    creator: any,
  ) {
    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.default.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await wb.xlsx.load(buffer as any);

    let rowsTotal = 0;
    let rowsProcessed = 0;
    let rowsError = 0;
    const errors: any[] = [];

    // Process sheets 0 (Requisitos ISO 27001) and 1 (Anexo A controls)
    for (let si = 0; si <= 1 && si < wb.worksheets.length; si++) {
      const ws = wb.worksheets[si];
      const sheetTheme = si === 0 ? 'ISO 27001 Requisitos' : 'Anexo A';

      const allRows: string[][] = [];
      ws.eachRow((row: any, rowNum: number) => {
        if (rowNum === 1) return; // skip column headers
        allRows.push([
          String(row.getCell(1).value ?? '').trim(),  // A: clause / control code
          String(row.getCell(2).value ?? '').trim(),  // B: title / requirement text
          String(row.getCell(3).value ?? '').trim(),  // C: status (Estado)
          String(row.getCell(4).value ?? '').trim(),  // D: evidence (Evidências)
          String(row.getCell(9).value ?? '').trim(),  // I: corrective action (Ação corretiva)
          String(row.getCell(10).value ?? '').trim(), // J: priority (Prioridade)
          String(row.getCell(11).value ?? '').trim(), // K: additional notes
        ]);
      });

      // Track current clause/control context across section-header rows
      let lastCode = '';
      let lastTitle = '';

      for (const [colA, colB, colC, colD, colI, , colK] of allRows) {
        // Update context: section header rows have code+title but no status
        if (colA) { lastCode = colA; if (colB) lastTitle = colB; }
        else if (colB && !colC) { lastTitle = colB; }

        const mappedStatus = this.normalizeGapStatus(colC);
        if (!mappedStatus) continue; // skip section headers and empty rows

        rowsTotal++;

        try {
          const controlCode = lastCode || `${sheetTheme}-unknown`;
          const controlTitle = (lastTitle || colB || controlCode).substring(0, 250);
          const notes = [colD, colI, colK].filter(Boolean).join('\n') || null;

          await this.prisma.soaControl.upsert({
            where: { organizationId_controlCode: { organizationId, controlCode } },
            create: {
              organizationId,
              controlCode,
              theme: sheetTheme,
              title: controlTitle,
              status: mappedStatus as any,
              implementationNotes: notes,
              applicable: mappedStatus !== 'NOT_APPLICABLE',
              justification: colD || null,
            },
            update: {
              status: mappedStatus as any,
              implementationNotes: notes,
              applicable: mappedStatus !== 'NOT_APPLICABLE',
            },
          });

          // Auto-create CAPA for non-conformities
          if (mappedStatus === 'NOT_STARTED' && creator) {
            const isMinor = /[Mm]enor/i.test(colC);
            await this.prisma.capa.create({
              data: {
                createdById: creator.id,
                title: `NC ${isMinor ? 'Menor' : 'Maior'}: ${lastCode} — ${controlTitle.substring(0, 80)}`,
                description: `Não Conformidade ${isMinor ? 'Menor' : 'Maior'} detetada na importação GAP ISO 27001.\n\nControlo: ${lastCode}\n${controlTitle}`,
                rootCause: colD || null,
                correctiveAction: colI || null,
                status: 'OPEN',
              },
            });
          }

          rowsProcessed++;
        } catch (err: any) {
          rowsError++;
          errors.push({ code: lastCode, sheet: sheetTheme, error: err.message });
        }
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
        result: { created: rowsProcessed, errors: rowsError, type: 'GAP_ANALYSIS_ISO27001' },
      },
    });
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

      if (type === 'GAP_ANALYSIS_ISO27001') {
        const creator = await this.prisma.user.findFirst({
          where: { organizationId, role: { in: ['ADMIN', 'COMPLIANCE_MANAGER'] } },
        });
        await this.processGapIso27001(importId, buffer, organizationId, creator);
        return;
      }

      const ExcelJS = await import('exceljs');
      const wb = new ExcelJS.default.Workbook();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await wb.xlsx.load(buffer as any);
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
