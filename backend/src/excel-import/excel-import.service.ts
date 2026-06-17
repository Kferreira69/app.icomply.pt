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
    if (type === 'ROPA') {
      return this.buildRopaTemplate(wb);
    }
    if (type === 'ASSET_INVENTORY') {
      return this.buildAssetInventoryTemplate(wb);
    }
    if (type === 'TREATMENT_PLAN') {
      return this.buildTreatmentPlanTemplate(wb);
    }
    if (type === 'ACTION_PLAN') {
      return this.buildActionPlanTemplate(wb);
    }
    if (type === 'POLICIES') {
      return this.buildPoliciesTemplate(wb);
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

  private applyHeaderStyle(ws: any, colCount: number) {
    ws.getRow(1).eachCell((cell: any) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B4F8A' } };
      cell.alignment = { wrapText: true, vertical: 'middle' };
    });
    ws.getRow(1).height = 28;
    ws.columns.forEach((col: any) => { if (!col.width) col.width = 28; });
    void colCount; // suppress unused warning
  }

  private async buildRopaTemplate(wb: any): Promise<Buffer> {
    const ws = wb.addWorksheet('ROPA - Registo Tratamentos');
    ws.columns = [
      { header: 'Nome do Tratamento*', key: 'name', width: 35 },
      { header: 'Responsável', key: 'responsible', width: 25 },
      { header: 'Finalidade*', key: 'purpose', width: 40 },
      { header: 'Base Legal (Art. 6)*', key: 'legalBasis', width: 30 },
      { header: 'Categorias de Dados*', key: 'dataCategories', width: 35 },
      { header: 'Categorias de Titulares*', key: 'dataSubjects', width: 35 },
      { header: 'Destinatários', key: 'recipients', width: 30 },
      { header: 'Transferências Internacionais', key: 'intlTransfers', width: 30 },
      { header: 'Prazo de Conservação', key: 'retention', width: 25 },
      { header: 'Medidas de Segurança', key: 'securityMeasures', width: 35 },
      { header: 'Observações', key: 'notes', width: 30 },
    ];
    this.applyHeaderStyle(ws, 11);
    ws.addRow([
      'Gestão de Recursos Humanos',
      'Diretor de RH',
      'Gestão de contratos e remunerações de colaboradores',
      'LEGITIMATE_INTERESTS',
      'Dados de identificação; Dados financeiros',
      'Colaboradores',
      'Seguradora XYZ',
      'Não',
      '5 anos após cessação',
      'Controlo de acessos; Cifragem',
      'Revisão anual prevista',
    ]);
    ws.addRow([
      'Marketing Digital',
      'Responsável de Marketing',
      'Envio de newsletters e campanhas promocionais',
      'CONSENT',
      'E-mail; Dados comportamentais',
      'Clientes; Potenciais clientes',
      'Mailchimp (subcontratante)',
      'EUA - Adequação (Cláusulas Contratuais Padrão)',
      '3 anos ou até retirada de consentimento',
      'Pseudonimização; TLS',
      '',
    ]);
    ws.addRow([]);
    ws.addRow(['Valores válidos para Base Legal:', 'CONSENT | CONTRACT | LEGAL_OBLIGATION | VITAL_INTERESTS | PUBLIC_TASK | LEGITIMATE_INTERESTS']);
    ws.getRow(4).font = { italic: true, color: { argb: 'FF666666' } };
    return Buffer.from(await wb.xlsx.writeBuffer() as any);
  }

  private async buildAssetInventoryTemplate(wb: any): Promise<Buffer> {
    const ws = wb.addWorksheet('Inventário de Ativos');
    ws.columns = [
      { header: 'Nome do Ativo*', key: 'name', width: 35 },
      { header: 'Tipo (Hardware/Software/Dado/Serviço/Pessoas/Local)*', key: 'type', width: 45 },
      { header: 'Classificação (Público/Interno/Confidencial/Secreto)*', key: 'classification', width: 45 },
      { header: 'Proprietário*', key: 'owner', width: 25 },
      { header: 'Localização', key: 'location', width: 30 },
      { header: 'Valor de Negócio (Baixo/Médio/Alto/Crítico)', key: 'businessValue', width: 40 },
      { header: 'Observações', key: 'notes', width: 35 },
    ];
    this.applyHeaderStyle(ws, 7);
    ws.addRow([
      'Servidor de Produção ERP',
      'Hardware',
      'Confidencial',
      'Diretor de TI',
      'Datacenter Lisboa',
      'Crítico',
      'Licença válida até 2027',
    ]);
    ws.addRow([
      'Base de Dados de Clientes',
      'Dado',
      'Secreto',
      'DPO',
      'Cloud AWS eu-west-1',
      'Crítico',
      'Sujeito a RGPD Art. 30',
    ]);
    ws.addRow([
      'Microsoft 365',
      'Software',
      'Interno',
      'Diretor de TI',
      'Cloud Microsoft',
      'Alto',
      'Renovação anual em março',
    ]);
    return Buffer.from(await wb.xlsx.writeBuffer() as any);
  }

  private async buildTreatmentPlanTemplate(wb: any): Promise<Buffer> {
    const ws = wb.addWorksheet('Plano de Tratamento de Riscos');
    ws.columns = [
      { header: 'Risco Referência', key: 'riskRef', width: 20 },
      { header: 'Título do Tratamento*', key: 'title', width: 40 },
      { header: 'Descrição*', key: 'description', width: 45 },
      { header: 'Tipo (Aceitar/Mitigar/Transferir/Evitar)*', key: 'treatmentType', width: 40 },
      { header: 'Prioridade (LOW/MEDIUM/HIGH)*', key: 'priority', width: 30 },
      { header: 'Responsável', key: 'owner', width: 25 },
      { header: 'Data Limite', key: 'dueDate', width: 20 },
      { header: 'Estado (OPEN/IN_PROGRESS/CLOSED)', key: 'status', width: 35 },
      { header: 'Custo Estimado (€)', key: 'cost', width: 20 },
    ];
    this.applyHeaderStyle(ws, 9);
    ws.addRow([
      'RISK-001',
      'Implementar autenticação multifator',
      'Implementar MFA em todos os sistemas críticos para reduzir risco de acesso não autorizado',
      'Mitigar',
      'HIGH',
      'diretor.ti@empresa.pt',
      '2026-09-30',
      'IN_PROGRESS',
      '5000',
    ]);
    ws.addRow([
      'RISK-002',
      'Contratação de seguro cibernético',
      'Transferir o risco residual de incidentes de segurança para seguradora especializada',
      'Transferir',
      'MEDIUM',
      'cfo@empresa.pt',
      '2026-12-31',
      'OPEN',
      '12000',
    ]);
    ws.addRow([]);
    ws.addRow(['Nota:', 'O campo "Risco Referência" é opcional. Se preenchido, o sistema tenta ligar ao risco existente.']);
    ws.getRow(4).font = { italic: true, color: { argb: 'FF666666' } };
    return Buffer.from(await wb.xlsx.writeBuffer() as any);
  }

  private async buildActionPlanTemplate(wb: any): Promise<Buffer> {
    const ws = wb.addWorksheet('Plano de Ações');
    ws.columns = [
      { header: 'Título*', key: 'title', width: 40 },
      { header: 'Descrição', key: 'description', width: 45 },
      { header: 'Origem (Auditoria/GAP/Risco/CAPA/Manual)', key: 'origin', width: 40 },
      { header: 'Responsável Email', key: 'assigneeEmail', width: 30 },
      { header: 'Data Limite (YYYY-MM-DD)', key: 'dueDate', width: 25 },
      { header: 'Prioridade (LOW/MEDIUM/HIGH/CRITICAL)*', key: 'priority', width: 35 },
      { header: 'Departamento', key: 'department', width: 25 },
      { header: 'Estado (OPEN/IN_PROGRESS/CLOSED)', key: 'status', width: 35 },
      { header: 'Notas', key: 'notes', width: 35 },
    ];
    this.applyHeaderStyle(ws, 9);
    ws.addRow([
      'Atualizar política de controlo de acessos',
      'Rever e atualizar a política de controlo de acessos para incluir requisitos MFA e acesso mínimo necessário',
      'Auditoria',
      'dpo@empresa.pt',
      '2026-08-31',
      'HIGH',
      'TI',
      'OPEN',
      'Relacionado com não conformidade detetada em audit Q1 2026',
    ]);
    ws.addRow([
      'Formação em RGPD para novos colaboradores',
      'Implementar programa de formação obrigatório em proteção de dados para todos os novos colaboradores',
      'GAP',
      'rh@empresa.pt',
      '2026-10-01',
      'MEDIUM',
      'RH',
      'IN_PROGRESS',
      '',
    ]);
    return Buffer.from(await wb.xlsx.writeBuffer() as any);
  }

  private async buildPoliciesTemplate(wb: any): Promise<Buffer> {
    const ws = wb.addWorksheet('Registo de Políticas');
    ws.columns = [
      { header: 'Código*', key: 'code', width: 18 },
      { header: 'Nome da Política*', key: 'name', width: 45 },
      { header: 'Versão', key: 'version', width: 12 },
      { header: 'Âmbito', key: 'scope', width: 35 },
      { header: 'Proprietário', key: 'owner', width: 25 },
      { header: 'Data Aprovação (YYYY-MM-DD)', key: 'approvedAt', width: 28 },
      { header: 'Data Revisão (YYYY-MM-DD)', key: 'reviewDate', width: 28 },
      { header: 'Estado (DRAFT/APPROVED/OBSOLETE)', key: 'status', width: 35 },
      { header: 'Frameworks (ISO27001/GDPR/NIS2)', key: 'frameworks', width: 35 },
      { header: 'Localização Documento', key: 'documentUrl', width: 35 },
    ];
    this.applyHeaderStyle(ws, 10);
    ws.addRow([
      'POL-SI-001',
      'Política de Segurança da Informação',
      '2.1',
      'Toda a organização',
      'CISO',
      '2026-01-15',
      '2027-01-15',
      'APPROVED',
      'ISO27001,NIS2',
      'SharePoint/Politicas/POL-SI-001-v2.1.pdf',
    ]);
    ws.addRow([
      'POL-DP-001',
      'Política de Proteção de Dados',
      '1.3',
      'Toda a organização',
      'DPO',
      '2025-11-01',
      '2026-11-01',
      'APPROVED',
      'GDPR',
      'SharePoint/Politicas/POL-DP-001-v1.3.pdf',
    ]);
    ws.addRow([
      'POL-AC-001',
      'Política de Controlo de Acessos',
      '1.0',
      'Sistemas de informação',
      'Diretor de TI',
      '',
      '2026-12-31',
      'DRAFT',
      'ISO27001',
      '',
    ]);
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows: any[] = [];
      let headers: string[] = [];
      let rowsTotal = 0;
      let rowsProcessed = 0;
      let rowsError = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errors: any[] = [];

      ws.eachRow((row, idx) => {
        if (idx === 1) {
          headers = row.values as string[];
          headers = headers.filter(Boolean);
        } else {
          rowsTotal++;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                tags: row[headers[5]] ? String(row[headers[5]]).split(',').map((t: string) => t.trim()) : [],
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                likelihood: l as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                impact: i as any,
                inherentScore: (likelihoodMap[l] || 3) * (impactMap[i] || 3),
              },
            });
            rowsProcessed++;
          } else if (type === 'ROPA' && creator) {
            // Map to DataProcessingActivity
            const rawLegal = String(row[headers[3]] || 'LEGITIMATE_INTERESTS').trim().toUpperCase().replace(/[^A-Z_]/g, '_');
            const validLegal = ['CONSENT','CONTRACT','LEGAL_OBLIGATION','VITAL_INTERESTS','PUBLIC_TASK','LEGITIMATE_INTERESTS'];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const legalBasis: any = validLegal.includes(rawLegal) ? rawLegal : 'LEGITIMATE_INTERESTS';
            const dataCategories = String(row[headers[4]] || '').split(';').map((s: string) => s.trim()).filter(Boolean);
            const dataSubjects = String(row[headers[5]] || '').split(';').map((s: string) => s.trim()).filter(Boolean);
            const recipients = String(row[headers[6]] || '').split(';').map((s: string) => s.trim()).filter(Boolean);
            const intlRaw = String(row[headers[7]] || '').toLowerCase();
            const hasIntlTransfer = intlRaw === 'sim' || intlRaw === 'yes' || intlRaw === 'true' || intlRaw === '1';
            const secMeasures = String(row[headers[9]] || '').split(';').map((s: string) => s.trim()).filter(Boolean);
            await this.prisma.dataProcessingActivity.create({
              data: {
                organizationId,
                controllerId: creator.id,
                name: String(row[headers[0]] || '').trim(),
                purpose: String(row[headers[2]] || '').trim(),
                legalBasis,
                dataCategories,
                dataSubjects,
                recipients,
                internationalTransfers: hasIntlTransfer,
                retentionPeriod: String(row[headers[8]] || 'Não definido').trim(),
                technicalMeasures: secMeasures,
                status: 'ACTIVE',
              },
            });
            rowsProcessed++;
          } else if (type === 'ASSET_INVENTORY') {
            // No Asset model — fallback: create Risk with category="Asset Inventory"
            const typeVal = String(row[headers[1]] || 'Hardware').trim();
            const classification = String(row[headers[2]] || '').trim();
            const businessValue = String(row[headers[5]] || 'Médio').trim();
            const impactMap: Record<string, string> = { 'Crítico': 'CATASTROPHIC', 'Alto': 'MAJOR', 'Médio': 'MODERATE', 'Baixo': 'MINOR' };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const impact: any = impactMap[businessValue] || 'MODERATE';
            await this.prisma.risk.create({
              data: {
                organizationId,
                projectId: projectId || null,
                ownerId: creator?.id || null,
                title: String(row[headers[0]] || '').trim(),
                description: [
                  `Tipo: ${typeVal}`,
                  `Classificação: ${classification}`,
                  `Proprietário: ${String(row[headers[3]] || '')}`,
                  `Localização: ${String(row[headers[4]] || '')}`,
                  `Observações: ${String(row[headers[6]] || '')}`,
                ].filter(s => !s.endsWith(': ')).join('\n'),
                category: 'Asset Inventory',
                likelihood: 'POSSIBLE',
                impact,
                inherentScore: 3 * (impactMap[businessValue] === 'CATASTROPHIC' ? 5 : impactMap[businessValue] === 'MAJOR' ? 4 : impactMap[businessValue] === 'MINOR' ? 2 : 3),
                tags: [typeVal, classification].filter(Boolean),
              },
            });
            rowsProcessed++;
          } else if (type === 'TREATMENT_PLAN') {
            // Create/update Risk with treatment fields
            const treatRaw = String(row[headers[3]] || 'Mitigar').toLowerCase();
            const treatMap: Record<string, string> = { 'mitigar': 'MITIGATE', 'aceitar': 'ACCEPT', 'transferir': 'TRANSFER', 'evitar': 'AVOID', 'mitigate': 'MITIGATE', 'accept': 'ACCEPT', 'transfer': 'TRANSFER', 'avoid': 'AVOID' };
            const treatmentType = treatMap[treatRaw] || 'MITIGATE';
            const statusRaw = String(row[headers[7]] || 'OPEN').toUpperCase();
            const statusMap: Record<string, string> = { 'OPEN': 'PLANNED', 'IN_PROGRESS': 'IN_PROGRESS', 'CLOSED': 'COMPLETED' };
            const treatmentStatus = statusMap[statusRaw] || 'PLANNED';
            const priorityRaw = String(row[headers[4]] || 'MEDIUM').toUpperCase();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const priorityImpact: any = priorityRaw === 'HIGH' ? 'MAJOR' : priorityRaw === 'LOW' ? 'MINOR' : 'MODERATE';
            const dueDateRaw = row[headers[6]] ? String(row[headers[6]]).trim() : null;
            const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;
            // If there's a Risco Referência, try to find existing risk by title/ref
            const riscRef = String(row[headers[0]] || '').trim();
            let existingRisk = null;
            if (riscRef) {
              existingRisk = await this.prisma.risk.findFirst({
                where: { organizationId, title: { contains: riscRef } },
              });
            }
            if (existingRisk) {
              await this.prisma.risk.update({
                where: { id: existingRisk.id },
                data: {
                  treatmentType,
                  treatmentPlan: String(row[headers[2]] || '').trim(),
                  treatmentStatus,
                  treatmentDueDate: dueDate,
                  treatmentOwnerId: creator?.id || null,
                },
              });
            } else {
              await this.prisma.risk.create({
                data: {
                  organizationId,
                  projectId: projectId || null,
                  ownerId: creator?.id || null,
                  title: String(row[headers[1]] || '').trim(),
                  description: String(row[headers[2]] || '').trim(),
                  category: 'Treatment Plan',
                  likelihood: 'POSSIBLE',
                  impact: priorityImpact,
                  inherentScore: 9,
                  treatmentType,
                  treatmentPlan: String(row[headers[2]] || '').trim(),
                  treatmentStatus,
                  treatmentDueDate: dueDate,
                  treatmentOwnerId: creator?.id || null,
                  tags: [riscRef].filter(Boolean),
                },
              });
            }
            rowsProcessed++;
          } else if (type === 'ACTION_PLAN' && creator) {
            // Create CAPA record
            const priorityRaw = String(row[headers[5]] || 'MEDIUM').toUpperCase();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const statusRaw = String(row[headers[7]] || 'OPEN').toUpperCase();
            const capaStatusMap: Record<string, string> = { 'OPEN': 'OPEN', 'IN_PROGRESS': 'IN_PROGRESS', 'CLOSED': 'CLOSED' };
            const capaStatus = capaStatusMap[statusRaw] || 'OPEN';
            const dueDateRaw = row[headers[4]] ? String(row[headers[4]]).trim() : null;
            const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;
            await this.prisma.capa.create({
              data: {
                createdById: creator.id,
                title: String(row[headers[0]] || '').trim(),
                description: String(row[headers[1]] || '').trim() || String(row[headers[0]] || '').trim(),
                rootCause: String(row[headers[2]] || '').trim() || null, // Origem
                correctiveAction: String(row[headers[8]] || '').trim() || null, // Notas
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                status: capaStatus as any,
                dueDate,
                evidence: [
                  `Departamento: ${String(row[headers[6]] || '')}`,
                  `Prioridade: ${priorityRaw}`,
                ].filter(s => !s.endsWith(': ')).join(' | ') || null,
              },
            });
            rowsProcessed++;
          } else if (type === 'POLICIES' && creator) {
            // Map status from spreadsheet to Prisma PolicyStatus enum
            const rawStatus = String(row[headers[7]] || 'DRAFT').trim().toUpperCase();
            const statusMap: Record<string, string> = { 'DRAFT': 'DRAFT', 'APPROVED': 'APPROVED', 'OBSOLETE': 'ARCHIVED' };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const policyStatus: any = statusMap[rawStatus] || 'DRAFT';
            const approvedAtRaw = row[headers[5]] ? String(row[headers[5]]).trim() : null;
            const reviewDateRaw = row[headers[6]] ? String(row[headers[6]]).trim() : null;
            const approvedAt = approvedAtRaw ? new Date(approvedAtRaw) : null;
            const reviewDate = reviewDateRaw ? new Date(reviewDateRaw) : null;
            const frameworkRaw = String(row[headers[8]] || '').trim();
            const tags = frameworkRaw ? frameworkRaw.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
            await this.prisma.policy.create({
              data: {
                organizationId,
                ownerId: creator.id,
                title: String(row[headers[1]] || '').trim(),
                description: [
                  `Código: ${String(row[headers[0]] || '')}`,
                  `Âmbito: ${String(row[headers[3]] || '')}`,
                  `Localização: ${String(row[headers[9]] || '')}`,
                ].filter(s => !s.endsWith(': ')).join(' | ') || null,
                content: String(row[headers[3]] || String(row[headers[1]] || '')).trim(),
                version: String(row[headers[2]] || '1.0').trim(),
                status: policyStatus,
                approvedAt,
                reviewDate,
                tags,
              },
            });
            rowsProcessed++;
          }
        } catch (err) {
          rowsError++;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          errors.push({ row: rowsProcessed + rowsError, error: (err as any).message });
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { status: 'FAILED', errors: [{ message: (err as any).message }] },
      });
    }
  }
}
