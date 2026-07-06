import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Nis2MeasureStatus } from '../generated/prisma/client';

// ── NIS2 Article 21 — 10 mandatory security measures ────────
// Directive (EU) 2022/2555, Article 21(2) a-j
const NIS2_MEASURES = [
  {
    measureCode: 'ART21_A',
    category: 'RISK_MANAGEMENT',
    title: 'Políticas de Análise de Risco e Segurança dos Sistemas',
    description: 'Políticas de análise de riscos e segurança dos sistemas de informação (Art. 21(2)(a))',
  },
  {
    measureCode: 'ART21_B',
    category: 'INCIDENT_RESPONSE',
    title: 'Tratamento de Incidentes',
    description: 'Tratamento de incidentes (prevenção, deteção, análise, contenção, recuperação e notificação) (Art. 21(2)(b))',
  },
  {
    measureCode: 'ART21_C',
    category: 'BCP',
    title: 'Continuidade de Negócio e Gestão de Crises',
    description: 'Continuidade das atividades e gestão de crises — backups, recuperação de desastres, gestão de crises (Art. 21(2)(c))',
  },
  {
    measureCode: 'ART21_D',
    category: 'SUPPLY_CHAIN',
    title: 'Segurança da Cadeia de Abastecimento',
    description: 'Segurança da cadeia de abastecimento, incluindo aspetos de segurança relativos às relações entre cada entidade e os seus fornecedores (Art. 21(2)(d))',
  },
  {
    measureCode: 'ART21_E',
    category: 'SUPPLY_CHAIN',
    title: 'Segurança na Aquisição, Desenvolvimento e Manutenção de Sistemas',
    description: 'Segurança na aquisição, desenvolvimento e manutenção de redes e sistemas de informação, incluindo tratamento e divulgação de vulnerabilidades (Art. 21(2)(e))',
  },
  {
    measureCode: 'ART21_F',
    category: 'RISK_MANAGEMENT',
    title: 'Políticas e Procedimentos para Avaliação da Eficácia',
    description: 'Políticas e procedimentos para avaliar a eficácia das medidas de gestão dos riscos de cibersegurança (Art. 21(2)(f))',
  },
  {
    measureCode: 'ART21_G',
    category: 'HR_SECURITY',
    title: 'Práticas de Ciberhigiene e Formação em Cibersegurança',
    description: 'Práticas de ciberhigiene básicas e formação em cibersegurança (Art. 21(2)(g))',
  },
  {
    measureCode: 'ART21_H',
    category: 'CRYPTOGRAPHY',
    title: 'Políticas e Procedimentos de Criptografia',
    description: 'Políticas e procedimentos relativos à utilização de criptografia e, se for caso disso, de cifragem (Art. 21(2)(h))',
  },
  {
    measureCode: 'ART21_I',
    category: 'ACCESS_CONTROL',
    title: 'Segurança dos Recursos Humanos, Controlo de Acessos e Gestão de Ativos',
    description: 'Segurança dos recursos humanos, políticas de controlo de acessos e gestão de ativos (Art. 21(2)(i))',
  },
  {
    measureCode: 'ART21_J',
    category: 'ACCESS_CONTROL',
    title: 'Autenticação Multifator e Soluções de Comunicação Segura',
    description: 'Utilização de soluções de autenticação multifator ou de autenticação contínua, comunicações de voz, vídeo e texto seguras e sistemas de comunicação de emergência (Art. 21(2)(j))',
  },
  // Article 23 — Reporting obligations
  {
    measureCode: 'ART23_EARLY',
    category: 'INCIDENT_RESPONSE',
    title: 'Alerta Precoce — 24 horas',
    description: 'Processo para emitir alerta precoce à CNCS em 24h após conhecimento de incidente significativo (Art. 23(1)(a))',
  },
  {
    measureCode: 'ART23_NOTIF',
    category: 'INCIDENT_RESPONSE',
    title: 'Notificação de Incidente — 72 horas',
    description: 'Processo para notificação de incidente à CNCS em 72h (Art. 23(1)(b))',
  },
  {
    measureCode: 'ART23_REPORT',
    category: 'INCIDENT_RESPONSE',
    title: 'Relatório Final — 1 mês',
    description: 'Processo para envio de relatório final à CNCS no prazo de 1 mês (Art. 23(1)(c))',
  },
  // Governance
  {
    measureCode: 'ART20_GOV',
    category: 'RISK_MANAGEMENT',
    title: 'Supervisão da Gestão',
    description: 'Os órgãos de gestão aprovam as medidas de cibersegurança e supervisionam a sua implementação (Art. 20)',
  },
  {
    measureCode: 'ART20_TRAIN',
    category: 'HR_SECURITY',
    title: 'Formação dos Órgãos de Gestão',
    description: 'Os membros dos órgãos de gestão recebem formação em cibersegurança (Art. 20(2))',
  },
];

@Injectable()
export class Nis2Service {
  constructor(private prisma: PrismaService) {}

  // ── Bootstrap: ensure all 15 measures exist for org ──────────

  async initOrganization(organizationId: string) {
    const existing = await this.prisma.nis2Assessment.findMany({
      where: { organizationId },
      select: { measureCode: true },
    });
    const existingCodes = new Set(existing.map(e => e.measureCode));

    const toCreate = NIS2_MEASURES.filter(m => !existingCodes.has(m.measureCode));
    if (toCreate.length > 0) {
      await this.prisma.nis2Assessment.createMany({
        data: toCreate.map(m => ({ ...m, organizationId })),
      });
    }
  }

  // ── Dashboard ─────────────────────────────────────────────────

  async getDashboard(organizationId: string) {
    await this.initOrganization(organizationId);

    const assessments = await this.prisma.nis2Assessment.findMany({
      where: { organizationId },
      include: { responsible: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { measureCode: 'asc' },
    });

    const total = assessments.length;
    const compliant = assessments.filter(a => a.status === 'COMPLIANT').length;
    const partial = assessments.filter(a => a.status === 'PARTIAL').length;
    const nonCompliant = assessments.filter(a => a.status === 'NON_COMPLIANT').length;
    const notAssessed = assessments.filter(a => a.status === 'NOT_ASSESSED').length;
    const notApplicable = assessments.filter(a => a.status === 'NOT_APPLICABLE').length;

    const applicable = total - notApplicable;
    const score = applicable > 0
      ? Math.round(((compliant + partial * 0.5) / applicable) * 100)
      : 0;

    const byCategory = assessments.reduce((acc: any, a) => {
      if (!acc[a.category]) acc[a.category] = { total: 0, compliant: 0 };
      acc[a.category].total++;
      if (a.status === 'COMPLIANT') acc[a.category].compliant++;
      if (a.status === 'PARTIAL') acc[a.category].compliant += 0.5;
      return acc;
    }, {});

    return { score, total, compliant, partial, nonCompliant, notAssessed, notApplicable, byCategory, assessments };
  }

  // ── Update a measure ──────────────────────────────────────────

  async updateMeasure(
    organizationId: string,
    measureCode: string,
    data: {
      status?: Nis2MeasureStatus;
      evidence?: string;
      notes?: string;
      responsibleId?: string;
      targetDate?: string;
    },
  ) {
    const assessment = await this.prisma.nis2Assessment.findUnique({
      where: { organizationId_measureCode: { organizationId, measureCode } },
    });

    if (!assessment) throw new Error('Measure not found');

    return this.prisma.nis2Assessment.update({
      where: { organizationId_measureCode: { organizationId, measureCode } },
      data: {
        ...data,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
        completedAt: data.status === 'COMPLIANT' ? new Date() : undefined,
      },
      include: { responsible: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  // ── Bulk update ───────────────────────────────────────────────

  async bulkUpdateStatus(organizationId: string, updates: Array<{ measureCode: string; status: Nis2MeasureStatus }>) {
    const results = await Promise.all(
      updates.map(u => this.updateMeasure(organizationId, u.measureCode, { status: u.status })),
    );
    return results;
  }
}
