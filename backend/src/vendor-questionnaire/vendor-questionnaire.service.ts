import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { MailService } from '../common/mail/mail.service';

// ── Standard questionnaire sections & questions ──────────────────
export const QUESTIONNAIRE_SECTIONS = [
  {
    key: 'organization',
    label: 'Informação sobre a Organização',
    questions: [
      { key: 'employees',        label: 'Número de colaboradores',                                    type: 'select', options: ['<10','10-50','51-250','251-1000','>1000'] },
      { key: 'certifications',   label: 'Certificações de segurança (ISO 27001, SOC 2, etc.)',        type: 'multiselect', options: ['ISO 27001','SOC 2','ISO 9001','PCI DSS','NIST','Nenhuma','Outra'] },
      { key: 'has_dpo',          label: 'Tem DPO (Data Protection Officer)?',                        type: 'yesno' },
      { key: 'gdpr_compliant',   label: 'A sua organização está conforme com o RGPD?',               type: 'yesno' },
    ],
  },
  {
    key: 'data_security',
    label: 'Segurança da Informação',
    questions: [
      { key: 'encryption_rest',       label: 'Os dados são encriptados em repouso?',                 type: 'yesno' },
      { key: 'encryption_transit',    label: 'Os dados são encriptados em trânsito (TLS)?',          type: 'yesno' },
      { key: 'access_control',        label: 'Existe controlo de acesso baseado em roles (RBAC)?',   type: 'yesno' },
      { key: 'mfa_enabled',           label: 'MFA é obrigatório para sistemas críticos?',            type: 'yesno' },
      { key: 'vulnerability_scans',   label: 'Realizam scans de vulnerabilidade regulares?',         type: 'yesno' },
      { key: 'penetration_testing',   label: 'Realizam testes de penetração?',                       type: 'select', options: ['Nunca','Esporadicamente','Anualmente','Semestralmente','Trimestralmente'] },
      { key: 'security_training',     label: 'Os colaboradores recebem formação de segurança?',      type: 'yesno' },
    ],
  },
  {
    key: 'data_processing',
    label: 'Processamento de Dados',
    questions: [
      { key: 'data_location',         label: 'Onde são processados/armazenados os dados?',           type: 'select', options: ['Portugal','EU','EEE','USA','Outro país terceiro','Múltiplas jurisdições'] },
      { key: 'subprocessors',         label: 'Utilizam subprocessadores para processar os nossos dados?', type: 'yesno' },
      { key: 'subprocessors_list',    label: 'Se sim, indique os principais subprocessadores:',      type: 'text' },
      { key: 'data_retention',        label: 'Têm política de retenção de dados documentada?',       type: 'yesno' },
      { key: 'data_deletion',         label: 'Conseguem apagar/devolver dados no fim do contrato?',  type: 'yesno' },
      { key: 'breach_notification',   label: 'Prazo de notificação de incidentes de segurança:',     type: 'select', options: ['24 horas','48 horas','72 horas','5 dias','Não definido'] },
    ],
  },
  {
    key: 'business_continuity',
    label: 'Continuidade de Negócio',
    questions: [
      { key: 'bcp_exists',       label: 'Têm plano de continuidade de negócio documentado?',        type: 'yesno' },
      { key: 'bcp_tested',       label: 'O plano é testado regularmente?',                          type: 'yesno' },
      { key: 'rto',              label: 'Recovery Time Objective (RTO) para serviços críticos:',    type: 'select', options: ['<1 hora','1-4 horas','4-24 horas','1-3 dias','>3 dias','Não definido'] },
      { key: 'rpo',              label: 'Recovery Point Objective (RPO) para dados críticos:',      type: 'select', options: ['<15 min','15-60 min','1-4 horas','4-24 horas','>24 horas','Não definido'] },
    ],
  },
  {
    key: 'compliance',
    label: 'Conformidade e Auditoria',
    questions: [
      { key: 'audit_internal',   label: 'Realizam auditorias internas de segurança?',               type: 'yesno' },
      { key: 'audit_external',   label: 'São auditados por entidades externas?',                    type: 'yesno' },
      { key: 'incident_history', label: 'Sofreram incidentes de segurança nos últimos 2 anos?',     type: 'yesno' },
      { key: 'incident_detail',  label: 'Se sim, descreva brevemente:',                             type: 'text' },
      { key: 'additional_info',  label: 'Informação adicional que considere relevante:',            type: 'textarea' },
    ],
  },
];

function calculateScore(responses: Array<{ questionKey: string; answer: string | null }>): number {
  let positive = 0, total = 0;
  for (const r of responses) {
    if (r.answer === null) continue;
    if (r.answer === 'Sim' || r.answer === 'true') { positive++; total++; }
    else if (r.answer === 'Não' || r.answer === 'false') total++;
    // select/text questions don't count toward score
  }
  return total > 0 ? Math.round((positive / total) * 100) : 50;
}

@Injectable()
export class VendorQuestionnaireService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  // ── Create questionnaire ─────────────────────────────────────

  async create(vendorId: string, organizationId: string, userId: string, dto: any) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id: vendorId, organizationId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const q = await (this.prisma as any).vendorQuestionnaire.create({
      data: {
        vendorId,
        createdById: userId,
        title: dto.title || `Questionário de Segurança — ${vendor.name}`,
        instructions: dto.instructions,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : new Date(Date.now() + 30 * 86400000),
      },
    });

    // Send email to vendor if contactEmail exists
    if (vendor.contactEmail && dto.sendEmail !== false) {
      const url = `${process.env.FRONTEND_URL || 'https://app.icomply.pt'}/vendor-assessment/${q.token}`;
      await this.mail.sendVendorQuestionnaire(vendor.contactEmail, vendor.name, url, q.expiresAt);
    }

    return q;
  }

  // ── List questionnaires for a vendor ─────────────────────────

  async list(vendorId: string, organizationId: string) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id: vendorId, organizationId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return (this.prisma as any).vendorQuestionnaire.findMany({
      where: { vendorId },
      include: { responses: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Get public form (no auth) ─────────────────────────────────

  async getPublicForm(token: string) {
    const q = await (this.prisma as any).vendorQuestionnaire.findUnique({
      where: { token },
      include: { vendor: { select: { name: true, organizationId: true } } },
    });
    if (!q) throw new NotFoundException('Questionnaire not found');
    if (q.status === 'COMPLETED') throw new BadRequestException('Este questionário já foi preenchido');
    if (q.expiresAt && new Date(q.expiresAt) < new Date()) {
      await (this.prisma as any).vendorQuestionnaire.update({ where: { id: q.id }, data: { status: 'EXPIRED' } });
      throw new BadRequestException('Este questionário expirou');
    }
    return {
      id: q.id,
      token: q.token,
      title: q.title,
      instructions: q.instructions,
      vendorName: q.vendor?.name,
      expiresAt: q.expiresAt,
      sections: QUESTIONNAIRE_SECTIONS,
    };
  }

  // ── Submit public form (no auth) ──────────────────────────────

  async submit(token: string, dto: { responses: Array<{ sectionKey: string; questionKey: string; answer: string }>; vendorName?: string; vendorContact?: string }) {
    const q = await (this.prisma as any).vendorQuestionnaire.findUnique({ where: { token } });
    if (!q) throw new NotFoundException('Questionnaire not found');
    if (q.status === 'COMPLETED') throw new BadRequestException('Já preenchido');
    if (q.expiresAt && new Date(q.expiresAt) < new Date()) throw new BadRequestException('Expirado');

    // Save responses
    await (this.prisma as any).vendorQuestionnaireResponse.createMany({
      data: dto.responses.map(r => ({
        questionnaireId: q.id,
        sectionKey: r.sectionKey,
        questionKey: r.questionKey,
        answer: r.answer,
      })),
    });

    // Calculate score and update questionnaire
    const score = calculateScore(dto.responses);
    await (this.prisma as any).vendorQuestionnaire.update({
      where: { id: q.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        vendorName: dto.vendorName,
        vendorContact: dto.vendorContact,
      },
    });

    // Update vendor risk score from questionnaire
    const riskLevel = score >= 80 ? 'LOW' : score >= 60 ? 'MEDIUM' : score >= 40 ? 'HIGH' : 'CRITICAL';
    await this.prisma.vendor.update({
      where: { id: q.vendorId },
      data: { riskScore: score, riskLevel: riskLevel as any, lastAssessedAt: new Date() },
    });

    return { success: true, score };
  }
}
