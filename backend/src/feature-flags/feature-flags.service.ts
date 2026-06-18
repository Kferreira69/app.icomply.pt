import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

const DEFAULT_FLAGS = [
  // FREE
  { key: 'dashboard',          label: 'Dashboard Principal',        category: 'CORE',         requiredPlan: 'FREE',         sortOrder: 1  },
  { key: 'tasks',              label: 'Tarefas & Projetos',          category: 'CORE',         requiredPlan: 'FREE',         sortOrder: 2  },
  { key: 'risks_basic',        label: 'Gestão de Riscos (básico)',   category: 'CORE',         requiredPlan: 'FREE',         sortOrder: 3  },
  { key: 'diagnostic',        label: 'Diagnóstico de Conformidade', category: 'CORE',         requiredPlan: 'FREE',         sortOrder: 4  },
  { key: 'policies',           label: 'Políticas & Documentos',      category: 'COMPLIANCE',   requiredPlan: 'FREE',         sortOrder: 5  },
  { key: 'gdpr_basic',         label: 'GDPR (básico)',               category: 'COMPLIANCE',   requiredPlan: 'FREE',         sortOrder: 6  },
  // STARTER
  { key: 'evidence',           label: 'Evidências',                  category: 'COMPLIANCE',   requiredPlan: 'STARTER',      sortOrder: 10 },
  { key: 'audits',             label: 'Auditorias',                  category: 'COMPLIANCE',   requiredPlan: 'STARTER',      sortOrder: 11 },
  { key: 'capa',               label: 'CAPA / Ações Corretivas',     category: 'COMPLIANCE',   requiredPlan: 'STARTER',      sortOrder: 12 },
  { key: 'reports',            label: 'Relatórios',                  category: 'COMPLIANCE',   requiredPlan: 'STARTER',      sortOrder: 13 },
  { key: 'nis2',               label: 'NIS2',                        category: 'FRAMEWORKS',   requiredPlan: 'STARTER',      sortOrder: 14 },
  { key: 'dora',               label: 'DORA',                        category: 'FRAMEWORKS',   requiredPlan: 'STARTER',      sortOrder: 15 },
  { key: 'soc2',               label: 'SOC 2',                       category: 'FRAMEWORKS',   requiredPlan: 'STARTER',      sortOrder: 16 },
  { key: 'cis',                label: 'CIS Controls',                category: 'FRAMEWORKS',   requiredPlan: 'STARTER',      sortOrder: 17 },
  { key: 'itsm',               label: 'ITSM / Service Desk',         category: 'OPERATIONS',   requiredPlan: 'STARTER',      sortOrder: 18 },
  { key: 'projects',           label: 'Projetos de Conformidade',    category: 'OPERATIONS',   requiredPlan: 'STARTER',      sortOrder: 19 },
  // PROFESSIONAL
  { key: 'vendors',            label: 'Gestão de Fornecedores',      category: 'OPERATIONS',   requiredPlan: 'PROFESSIONAL', sortOrder: 20 },
  { key: 'esg',                label: 'ESG & Sustentabilidade',       category: 'COMPLIANCE',   requiredPlan: 'PROFESSIONAL', sortOrder: 21 },
  { key: 'business_continuity',label: 'Continuidade de Negócio',     category: 'COMPLIANCE',   requiredPlan: 'PROFESSIONAL', sortOrder: 22 },
  { key: 'tisax',              label: 'TISAX',                        category: 'FRAMEWORKS',   requiredPlan: 'PROFESSIONAL', sortOrder: 23 },
  { key: 'iso27701',           label: 'ISO 27701 / PIMS',            category: 'FRAMEWORKS',   requiredPlan: 'PROFESSIONAL', sortOrder: 24 },
  { key: 'aml',                label: 'AML / BCFT',                   category: 'COMPLIANCE',   requiredPlan: 'PROFESSIONAL', sortOrder: 25 },
  { key: 'anti_bribery',       label: 'Anti-Suborno',                 category: 'COMPLIANCE',   requiredPlan: 'PROFESSIONAL', sortOrder: 26 },
  { key: 'hr_compliance',      label: 'HR & Conformidade Laboral',   category: 'OPERATIONS',   requiredPlan: 'PROFESSIONAL', sortOrder: 27 },
  { key: 'unified_controls',   label: 'Biblioteca de Controlos',     category: 'INTELLIGENCE', requiredPlan: 'PROFESSIONAL', sortOrder: 28 },
  { key: 'raci',               label: 'RACI Matrix',                  category: 'OPERATIONS',   requiredPlan: 'PROFESSIONAL', sortOrder: 29 },
  { key: 'portfolio',          label: 'Portfolio de Conformidade',   category: 'INTELLIGENCE', requiredPlan: 'PROFESSIONAL', sortOrder: 30 },
  { key: 'board_reports',      label: 'Relatórios de Conselho',      category: 'GOVERNANCE',   requiredPlan: 'PROFESSIONAL', sortOrder: 31 },
  { key: 'auditor_sessions',   label: 'Portal de Auditores',         category: 'GOVERNANCE',   requiredPlan: 'PROFESSIONAL', sortOrder: 32 },
  { key: 'regulatory_change',  label: 'Gestão de Mudança Regulatória',category: 'INTELLIGENCE',requiredPlan: 'PROFESSIONAL', sortOrder: 33 },
  { key: 'workforce',          label: 'Formação & Workforce',        category: 'OPERATIONS',   requiredPlan: 'PROFESSIONAL', sortOrder: 34 },
  // ENTERPRISE
  { key: 'ai_governance',      label: 'AI Governance',               category: 'ENTERPRISE',   requiredPlan: 'ENTERPRISE',   sortOrder: 40 },
  { key: 'client_hub',         label: 'Client Hub (multi-cliente)',  category: 'ENTERPRISE',   requiredPlan: 'ENTERPRISE',   sortOrder: 41 },
  { key: 'iguard',             label: 'iGuard (endpoint agent)',     category: 'ENTERPRISE',   requiredPlan: 'ENTERPRISE',   sortOrder: 42 },
  { key: 'automation',         label: 'Motor de Automatizações',     category: 'ENTERPRISE',   requiredPlan: 'ENTERPRISE',   sortOrder: 43 },
  { key: 'integrations',       label: 'Integration Hub',             category: 'ENTERPRISE',   requiredPlan: 'ENTERPRISE',   sortOrder: 44 },
  { key: 'ai_tools',           label: 'Ferramentas IA',              category: 'ENTERPRISE',   requiredPlan: 'ENTERPRISE',   sortOrder: 45 },
  { key: 'ai_assistant',       label: 'Assistente IA',               category: 'ENTERPRISE',   requiredPlan: 'ENTERPRISE',   sortOrder: 46 },
  { key: 'compliance_monitor', label: 'Monitor de Conformidade',     category: 'ENTERPRISE',   requiredPlan: 'ENTERPRISE',   sortOrder: 47 },
  { key: 'management_body',    label: 'Órgão de Gestão / Atas',      category: 'GOVERNANCE',   requiredPlan: 'ENTERPRISE',   sortOrder: 48 },
  { key: 'audit_templates',    label: 'Templates de Auditoria',      category: 'GOVERNANCE',   requiredPlan: 'ENTERPRISE',   sortOrder: 49 },
  { key: 'program_templates',  label: 'Templates de Programa',       category: 'GOVERNANCE',   requiredPlan: 'ENTERPRISE',   sortOrder: 50 },
];

@Injectable()
export class FeatureFlagsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    for (const flag of DEFAULT_FLAGS) {
      await (this.prisma as any).featureFlag.upsert({
        where:  { key: flag.key },
        update: {},
        create: flag,
      });
    }
  }

  listAll() {
    return (this.prisma as any).featureFlag.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async updateFlag(key: string, data: { requiredPlan?: string; isActive?: boolean; label?: string; description?: string }) {
    return (this.prisma as any).featureFlag.update({ where: { key }, data });
  }

  async bulkUpdate(updates: { key: string; requiredPlan: string }[]) {
    const results = await Promise.all(
      updates.map(u => (this.prisma as any).featureFlag.update({ where: { key: u.key }, data: { requiredPlan: u.requiredPlan } })),
    );
    return { updated: results.length };
  }

  async getPublic() {
    const flags = await (this.prisma as any).featureFlag.findMany({
      where:   { isActive: true },
      select:  { key: true, requiredPlan: true },
    });
    return Object.fromEntries(flags.map((f: any) => [f.key, f.requiredPlan]));
  }
}
