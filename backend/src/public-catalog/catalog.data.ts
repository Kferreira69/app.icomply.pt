// The product manifest: what iComply does today, by governance domain. This file is the single
// source of truth the website reads (GET /public/catalog) — the site must not promise anything
// that is not listed here as `available`, and everything built here is published to the site.
//
// Maintenance rule: when a module, domain or standard ships (or stops being a promise), change it
// HERE in the same commit. Tests keep it honest: every standard of the generic engine must be
// listed as available, and every module key must be a real permission module.

export type StandardStatus =
  | 'available'  // a module or checklist exists in the app
  | 'partial'    // exists in part (diagnostic, control mapping…) — see `note`
  | 'roadmap';   // promised / planned, not in the app yet

export interface CatalogStandard {
  name: string;
  status: StandardStatus;
  note?: string;
  /** In-app path, when there is one (not exposed to the site as a link, informational). */
  appPath?: string;
}

export interface CatalogDomain {
  /** Machine key. */
  id: string;
  /** Number on the website ("07"); null when the site has no card for it yet. */
  number: string | null;
  name: string;
  tagline: string;
  standards: CatalogStandard[];
  capabilities: string[];
  /** Permission modules (backend/src/permissions) that make up the domain. */
  modules: string[];
}

export const CATALOG_VERSION = '1.1.0';
export const CATALOG_RELEASED = '2026-10-01';

export const RELEASE_HIGHLIGHTS: string[] = [
  'ISO 14001 (Gestão Ambiental) no domínio ESG & Sustentabilidade, com objetivos ambientais ligados às métricas ESG',
  'Gestão Documental por norma ISO, com versões e aprovação',
  'Pesquisa global que encontra qualquer palavra do conteúdo',
  'Novas normas: ISO 22000, ISO 13485, ISO 20000-1, ISO 27018, ISO 27036, NIST AI RMF e ISO 23894',
];

export const CATALOG_DOMAINS: CatalogDomain[] = [
  {
    id: 'security', number: '01', name: 'Governança de Segurança',
    tagline: 'Segurança da informação e resiliência digital com controlos partilhados.',
    standards: [
      { name: 'ISO 27001 (Declaração de Aplicabilidade)', status: 'available', appPath: '/soa' },
      { name: 'ISO 27002', status: 'available', note: 'Controlos do Anexo A na Declaração de Aplicabilidade', appPath: '/soa' },
      { name: 'NIS2', status: 'available', appPath: '/nis2' },
      { name: 'DORA', status: 'available', note: 'Inclui o Registo de Informação', appPath: '/dora' },
      { name: 'CIS Controls v8', status: 'available', appPath: '/cis' },
      { name: 'SOC 2', status: 'available', appPath: '/soc2' },
      { name: 'TISAX', status: 'available', appPath: '/tisax' },
      { name: 'ISO 20000-1', status: 'available', appPath: '/standards/ISO_20000' },
    ],
    capabilities: ['Checklists por norma', 'Notificação de incidentes NIS2', 'Gestão de serviços de TI (incidentes, problemas, mudanças)', 'Monitorização de dispositivos (iGuard)'],
    modules: ['soa', 'nis2', 'dora', 'cis', 'soc2', 'tisax', 'itsm', 'iguard'],
  },
  {
    id: 'privacy', number: '02', name: 'Governança de Privacidade',
    tagline: 'RGPD operacional: registos, avaliações de impacto e pedidos de titulares.',
    standards: [
      { name: 'RGPD', status: 'available', note: 'ROPA, AIPD/DPIA, violações de dados, pedidos de titulares', appPath: '/gdpr' },
      { name: 'ISO 27701', status: 'available', appPath: '/iso27701' },
      { name: 'ISO 27018', status: 'available', appPath: '/standards/ISO_27018' },
      { name: 'ePrivacy', status: 'partial', note: 'Diagnóstico e mapeamento de controlos' },
    ],
    capabilities: ['Registo de atividades de tratamento', 'Avaliações de impacto', 'Portal público de pedidos de titulares', 'Gestão de consentimentos'],
    modules: ['gdpr', 'iso27701'],
  },
  {
    id: 'ai', number: '03', name: 'Governança de IA',
    tagline: 'Inventário e risco dos sistemas de IA, alinhados com o AI Act e normas de referência.',
    standards: [
      { name: 'EU AI Act', status: 'available', appPath: '/ai-governance' },
      { name: 'ISO 42001', status: 'available', appPath: '/ai-governance' },
      { name: 'NIST AI RMF', status: 'available', appPath: '/standards/NIST_AI_RMF' },
      { name: 'ISO 23894', status: 'available', appPath: '/standards/ISO_23894' },
    ],
    capabilities: ['Inventário de sistemas de IA', 'Riscos e avaliações de impacto de IA', 'Checklists NIST AI RMF e ISO 23894'],
    modules: ['aiGovernance'],
  },
  {
    id: 'ethics', number: '04', name: 'Governança de Ética & Integridade',
    tagline: 'Canal de denúncias, anticorrupção e prevenção do branqueamento.',
    standards: [
      { name: 'Canal de denúncias', status: 'available', appPath: '/denuncias' },
      { name: 'ISO 37001', status: 'available', appPath: '/anti-bribery' },
      { name: 'ISO 37301', status: 'available', appPath: '/anti-bribery' },
      { name: 'RGPC', status: 'partial', note: 'Diagnóstico e plano de ação' },
      { name: 'AML / KYC', status: 'available', note: 'Casos e rastreios; verificação automática de identidade em preparação', appPath: '/aml' },
    ],
    capabilities: ['Canal de denúncias com acompanhamento', 'Código de conduta e formação', 'Casos e rastreios AML'],
    modules: ['denuncias', 'antiBribery', 'aml'],
  },
  {
    id: 'people', number: '05', name: 'Governança de Pessoas',
    tagline: 'Transparência salarial, saúde e segurança no trabalho e conformidade laboral.',
    standards: [
      { name: 'Transparência salarial (UE)', status: 'available', note: 'Bandas salariais e análise de disparidades', appPath: '/hr-compliance' },
      { name: 'ISO 45001', status: 'available', appPath: '/workforce' },
    ],
    capabilities: ['Bandas salariais e análise de disparidades', 'Formação e incidentes de SST', 'Contratos e trabalho remoto'],
    modules: ['hrCompliance', 'workforce'],
  },
  {
    id: 'third-parties', number: '06', name: 'Governança de Terceiros',
    tagline: 'Risco de fornecedores e cadeia de fornecimento TIC.',
    standards: [
      { name: 'Gestão de risco de terceiros (TPRM)', status: 'available', appPath: '/vendors' },
      { name: 'DORA — registo de prestadores TIC', status: 'available', appPath: '/dora/register' },
      { name: 'ISO 27036', status: 'available', appPath: '/standards/ISO_27036' },
    ],
    capabilities: ['Inventário e classificação de risco de fornecedores', 'Questionários de avaliação', 'Checklist ISO 27036'],
    modules: ['vendors'],
  },
  {
    id: 'esg', number: '07', name: 'Governança ESG e Sustentabilidade',
    tagline: 'Reporte CSRD/ESRS e GRI e Sistema de Gestão Ambiental ISO 14001, no mesmo domínio.',
    standards: [
      { name: 'CSRD / ESRS', status: 'available', appPath: '/esg' },
      { name: 'GRI', status: 'available', appPath: '/esg' },
      { name: 'ISO 14001', status: 'available', note: 'Requisitos, aspetos e impactos, objetivos (ligados às métricas ESG) e requisitos legais', appPath: '/environment' },
      { name: 'Taxonomia UE', status: 'roadmap' },
    ],
    capabilities: ['Métricas CSRD/ESRS e GRI', 'Aspetos e impactos ambientais com significância', 'Objetivos ambientais ligados às métricas ESG', 'Requisitos legais ambientais'],
    modules: ['esg', 'environment'],
  },
  {
    id: 'quality', number: '08', name: 'Governança de Qualidade e Operações',
    tagline: 'Sistemas de gestão da qualidade com documentação controlada e ações corretivas.',
    standards: [
      { name: 'ISO 9001', status: 'available', appPath: '/quality' },
      { name: 'ISO 13485', status: 'available', appPath: '/standards/ISO_13485' },
      { name: 'ISO 22000', status: 'available', appPath: '/standards/ISO_22000' },
    ],
    capabilities: ['Não conformidades e ações corretivas (CAPA)', 'Gestão Documental com versões e aprovação', 'Checklists por norma'],
    modules: ['quality'],
  },
  {
    id: 'audit', number: '09', name: 'Governança de Auditoria & Garantia de Conformidade',
    tagline: 'Auditorias internas, ações corretivas e portal para auditores externos.',
    standards: [
      { name: 'Auditoria interna', status: 'available', appPath: '/audits' },
      { name: 'CAPA', status: 'available', appPath: '/capa' },
      { name: 'Portal de auditores externos', status: 'available', appPath: '/auditor-sessions' },
    ],
    capabilities: ['Planeamento e execução de auditorias', 'Constatações e ações corretivas', 'Partilha segura com auditores externos'],
    modules: ['audits', 'capa'],
  },
  {
    id: 'regulatory-change', number: '10', name: 'Governança de Mudança Regulatória',
    tagline: 'Acompanhar alterações legais e o seu impacto.',
    standards: [
      { name: 'Horizonte regulatório e calendário', status: 'available', appPath: '/regulatory-change' },
    ],
    capabilities: ['Registo de alterações regulatórias e impacto', 'Calendário de obrigações', 'Feed regulatório'],
    modules: ['regulatoryChange'],
  },
  {
    // Built, but without a card on the website yet.
    id: 'resilience', number: null, name: 'Continuidade e Resiliência',
    tagline: 'Planos de continuidade de negócio e recuperação de desastres.',
    standards: [
      { name: 'ISO 22301', status: 'available', appPath: '/business-continuity' },
    ],
    capabilities: ['Planos BCP/DR', 'Testes e ativos críticos'],
    modules: ['bcp'],
  },
];

/** Platform-wide capabilities that cut across domains. */
export const CATALOG_PLATFORM_FEATURES: string[] = [
  'Gestão Documental por norma ISO (versões, aprovação, separação de funções), com documentos partilhados entre normas',
  'Pesquisa global em todo o conteúdo',
  'Controlos unificados entre normas',
  'Riscos, tarefas, evidências e relatórios partilhados por todos os domínios',
  'Permissões por função e por módulo, 2FA e SSO',
  'Portal de confiança (Trust Center) público',
];
