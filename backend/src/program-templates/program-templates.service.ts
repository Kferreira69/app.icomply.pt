import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActionPlanStatus } from '@prisma/client';

const BUILT_IN_TEMPLATES = [
  {
    name: 'GDPR — Programa de Conformidade',
    description: 'Programa estruturado para implementação do RGPD em 90 dias.',
    framework: 'GDPR',
    category: 'Privacy',
    isGlobal: true,
    tasks: [
      { title: 'Mapeamento de dados pessoais', description: 'Inventariar todos os tratamentos de dados', durationDays: 14, order: 0 },
      { title: 'Atualizar Política de Privacidade', description: 'Rever e publicar política atualizada', durationDays: 7, order: 1 },
      { title: 'Implementar mecanismos de consentimento', description: 'Formulários e opt-in/opt-out', durationDays: 10, order: 2 },
      { title: 'Treino de colaboradores', description: 'Sessão de formação sobre RGPD', durationDays: 5, order: 3 },
      { title: 'Procedimento de violações de dados', description: 'Documentar processo de resposta a incidentes', durationDays: 7, order: 4 },
      { title: 'Auditoria interna final', description: 'Verificar conformidade com todos os artigos aplicáveis', durationDays: 14, order: 5 },
    ],
  },
  {
    name: 'ISO 27001 — Implementação SGSI',
    description: 'Plano de implementação do Sistema de Gestão de Segurança da Informação.',
    framework: 'ISO27001',
    category: 'Security',
    isGlobal: true,
    tasks: [
      { title: 'Definir âmbito do SGSI', description: 'Delimitar ativos e processos em âmbito', durationDays: 7, order: 0 },
      { title: 'Avaliação de riscos', description: 'Identificar e avaliar riscos de segurança', durationDays: 21, order: 1 },
      { title: 'Plano de tratamento de riscos', description: 'Definir controlos para cada risco identificado', durationDays: 14, order: 2 },
      { title: 'Implementar controlos técnicos', description: 'Firewall, MFA, encriptação, backups', durationDays: 30, order: 3 },
      { title: 'Políticas e procedimentos', description: 'Documentar ISMS policies obrigatórias', durationDays: 14, order: 4 },
      { title: 'Auditoria interna', description: 'Auditar todos os controlos Annex A', durationDays: 10, order: 5 },
      { title: 'Revisão pela gestão', description: 'Reunião formal de revisão do SGSI', durationDays: 3, order: 6 },
    ],
  },
  {
    name: 'NIS2 — Conformidade Diretiva',
    description: 'Plano de implementação dos requisitos NIS2 para operadores essenciais.',
    framework: 'NIS2',
    category: 'Cybersecurity',
    isGlobal: true,
    tasks: [
      { title: 'Avaliação de criticidade NIS2', description: 'Determinar se a entidade é essencial ou importante', durationDays: 5, order: 0 },
      { title: 'Governance e responsabilidades', description: 'Nomear responsável de cibersegurança', durationDays: 7, order: 1 },
      { title: 'Gestão de riscos de cadeia de fornecimento', description: 'Avaliar fornecedores críticos', durationDays: 21, order: 2 },
      { title: 'Plano de resposta a incidentes', description: 'Definir procedimentos de notificação (24h/72h)', durationDays: 10, order: 3 },
      { title: 'Testes de continuidade de negócio', description: 'Exercício de simulação de incidente', durationDays: 7, order: 4 },
    ],
  },
  {
    name: 'ISO 9001 — Sistema de Qualidade',
    description: 'Implementação de sistema de gestão da qualidade em 60 dias.',
    framework: 'ISO9001',
    category: 'Quality',
    isGlobal: true,
    tasks: [
      { title: 'Contexto da organização', description: 'Partes interessadas, âmbito, requisitos', durationDays: 7, order: 0 },
      { title: 'Política de qualidade', description: 'Definir e comunicar política e objetivos', durationDays: 5, order: 1 },
      { title: 'Mapeamento de processos', description: 'Fluxogramas de processos chave', durationDays: 14, order: 2 },
      { title: 'Gestão de não conformidades', description: 'Implementar processo CAPA', durationDays: 10, order: 3 },
      { title: 'Auditoria interna', description: 'Auditar conformidade com ISO 9001:2015', durationDays: 10, order: 4 },
    ],
  },
];

@Injectable()
export class ProgramTemplatesService {
  constructor(private prisma: PrismaService) {}

  async seedGlobalTemplates() {
    for (const t of BUILT_IN_TEMPLATES) {
      const exists = await this.prisma.programTemplate.findFirst({ where: { name: t.name, isGlobal: true } });
      if (!exists) {
        await this.prisma.programTemplate.create({ data: t as any });
      }
    }
  }

  async findAll(organizationId: string) {
    await this.seedGlobalTemplates();
    return this.prisma.programTemplate.findMany({
      where: { OR: [{ isGlobal: true }, { organizationId }] },
      include: { _count: { select: { activations: true } } },
      orderBy: [{ isGlobal: 'desc' }, { framework: 'asc' }],
    });
  }

  async activate(templateId: string, organizationId: string, userId: string, dto: { startDate: string }) {
    const template = await this.prisma.programTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new NotFoundException('Template not found');

    const tasks = template.tasks as any[];
    const start = new Date(dto.startDate);

    // Create action plan from template
    const plan = await this.prisma.actionPlan.create({
      data: {
        organizationId,
        ownerId: userId,
        title: template.name,
        description: template.description,
        status: 'ACTIVE',
        startDate: start,
        tasks: {
          create: tasks.map(t => {
            const taskStart = new Date(start);
            taskStart.setDate(taskStart.getDate() + tasks.slice(0, t.order).reduce((s: number, x: any) => s + x.durationDays, 0));
            const taskEnd = new Date(taskStart);
            taskEnd.setDate(taskEnd.getDate() + t.durationDays);
            return {
              title: t.title,
              description: t.description,
              startDate: taskStart,
              dueDate: taskEnd,
              sortOrder: t.order,
            };
          }),
        },
      },
    });

    // Record activation
    const activation = await this.prisma.programActivation.create({
      data: {
        programTemplateId: templateId,
        organizationId,
        activatedById: userId,
        actionPlanId: plan.id,
        startDate: start,
        status: 'ACTIVE',
      },
      include: {
        template: true,
        actionPlan: { include: { tasks: { orderBy: { sortOrder: 'asc' } } } },
      },
    });

    return activation;
  }

  async getActivations(organizationId: string) {
    return this.prisma.programActivation.findMany({
      where: { organizationId },
      include: {
        template: { select: { id: true, name: true, framework: true, category: true } },
        activatedBy: { select: { id: true, firstName: true, lastName: true } },
        actionPlan: {
          select: { id: true, status: true, _count: { select: { tasks: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
