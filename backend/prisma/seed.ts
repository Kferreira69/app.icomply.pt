import {
  PrismaClient,
  UserRole,
  UserStatus,
  TaskStatus,
  TaskPriority,
  RiskLikelihood,
  RiskImpact,
  RiskStatus,
  AuditType,
  AuditStatus,
  FindingSeverity,
  FindingStatus,
  CapaStatus,
  EvidenceStatus,
  PolicyStatus,
  PolicyCategory,
  LegalBasis,
} from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting comprehensive demo seed...');

  // ── Demo Organisation ────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {
      name: 'Fintech Segura, S.A.',
      legalName: 'Fintech Segura, Sociedade Anónima',
      tradeName: 'Fintech Segura',
      industry: 'FINANCIAL_SERVICES',
      size: 'MEDIUM',
      country: 'PT',
      employeeCount: 180,
      address: 'Av. da Liberdade, 258, 1250-149 Lisboa',
      website: 'https://www.fintech-segura.pt',
      plan: 'PROFESSIONAL',
      isActive: true,
    },
    create: {
      name: 'Fintech Segura, S.A.',
      slug: 'demo-org',
      legalName: 'Fintech Segura, Sociedade Anónima',
      tradeName: 'Fintech Segura',
      industry: 'FINANCIAL_SERVICES',
      size: 'MEDIUM',
      country: 'PT',
      employeeCount: 180,
      address: 'Av. da Liberdade, 258, 1250-149 Lisboa',
      website: 'https://www.fintech-segura.pt',
      plan: 'PROFESSIONAL',
      isActive: true,
    },
  });
  console.log(`✓ Organization: ${org.name}`);

  // ── Password hash ────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Admin@123456', 12);
  const demoPasswordHash = await bcrypt.hash('Demo@12345', 12);

  // ── Admin User ───────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo.icomply.pt' },
    update: {},
    create: {
      email: 'admin@demo.icomply.pt',
      firstName: 'Admin',
      lastName: 'iComply',
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      organizationId: org.id,
    },
  });
  console.log(`✓ Admin user: ${adminUser.email}`);

  // ── Compliance Manager (existing) ────────────────────────────
  const managerUser = await prisma.user.upsert({
    where: { email: 'compliance@demo.icomply.pt' },
    update: {},
    create: {
      email: 'compliance@demo.icomply.pt',
      firstName: 'Joao',
      lastName: 'Silva',
      passwordHash,
      role: UserRole.COMPLIANCE_MANAGER,
      status: UserStatus.ACTIVE,
      organizationId: org.id,
    },
  });
  console.log(`✓ Compliance Manager: ${managerUser.email}`);

  // ── DPO User ─────────────────────────────────────────────────
  const dpoUser = await prisma.user.upsert({
    where: { email: 'maria.santos@fintech-segura.pt' },
    update: {},
    create: {
      email: 'maria.santos@fintech-segura.pt',
      firstName: 'Maria',
      lastName: 'Santos',
      passwordHash: demoPasswordHash,
      role: UserRole.COMPLIANCE_MANAGER,
      status: UserStatus.ACTIVE,
      organizationId: org.id,
    },
  });
  console.log(`✓ DPO: ${dpoUser.email}`);

  // ── Risk Officer ─────────────────────────────────────────────
  const riskUser = await prisma.user.upsert({
    where: { email: 'carlos.mendes@fintech-segura.pt' },
    update: {},
    create: {
      email: 'carlos.mendes@fintech-segura.pt',
      firstName: 'Carlos',
      lastName: 'Mendes',
      passwordHash: demoPasswordHash,
      role: UserRole.COMPLIANCE_MANAGER,
      status: UserStatus.ACTIVE,
      organizationId: org.id,
    },
  });
  console.log(`✓ Risk Officer: ${riskUser.email}`);

  // ── Frameworks ───────────────────────────────────────────────
  const iso27001 = await prisma.framework.upsert({
    where: { code: 'ISO_27001_2022' },
    update: {},
    create: {
      name: 'ISO/IEC 27001:2022',
      code: 'ISO_27001_2022',
      version: '2022',
      description: 'Information security management systems — Requirements',
      isActive: true,
    },
  });

  const gdpr = await prisma.framework.upsert({
    where: { code: 'GDPR_2016_679' },
    update: {},
    create: {
      name: 'GDPR — Regulamento Geral de Proteção de Dados',
      code: 'GDPR_2016_679',
      version: '2016/679',
      description: 'General Data Protection Regulation (EU) 2016/679',
      isActive: true,
    },
  });

  const nis2 = await prisma.framework.upsert({
    where: { code: 'NIS2_2022_2555' },
    update: {},
    create: {
      name: 'NIS2 — Diretiva de Segurança de Redes e Sistemas de Informação',
      code: 'NIS2_2022_2555',
      version: '2022/2555',
      description: 'Directive on measures for a high common level of cybersecurity across the Union',
      isActive: true,
    },
  });

  const dora = await prisma.framework.upsert({
    where: { code: 'DORA_2022_2554' },
    update: {},
    create: {
      name: 'DORA — Digital Operational Resilience Act',
      code: 'DORA_2022_2554',
      version: '2022/2554',
      description: 'Regulamento (UE) 2022/2554 relativo à resiliência operacional digital do setor financeiro',
      isActive: true,
    },
  });

  const rgpc = await prisma.framework.upsert({
    where: { code: 'RGPC_PT_2021' },
    update: {},
    create: {
      name: 'RGPC — Regime Geral de Prevenção da Corrupção',
      code: 'RGPC_PT_2021',
      version: '2021',
      description: 'Regime Geral de Prevenção da Corrupção (Lei n.º 94/2021)',
      isActive: true,
    },
  });
  console.log(`✓ Frameworks: ISO 27001, GDPR, NIS2, DORA, RGPC`);

  // ── ISO 27001 Controls ───────────────────────────────────────
  const iso27001Controls = [
    { code: 'A.5.1', title: 'Políticas de segurança da informação', category: '5 - Controlos Organizacionais', status: 'IMPLEMENTED' },
    { code: 'A.5.2', title: 'Funções e responsabilidades de segurança', category: '5 - Controlos Organizacionais', status: 'IMPLEMENTED' },
    { code: 'A.5.3', title: 'Segregação de funções', category: '5 - Controlos Organizacionais', status: 'PARTIALLY_IMPLEMENTED' },
    { code: 'A.5.7', title: 'Inteligência de ameaças', category: '5 - Controlos Organizacionais', status: 'NOT_IMPLEMENTED' },
    { code: 'A.5.9', title: 'Inventário de ativos de informação', category: '5 - Controlos Organizacionais', status: 'PARTIALLY_IMPLEMENTED' },
    { code: 'A.5.10', title: 'Uso aceitável de ativos de informação', category: '5 - Controlos Organizacionais', status: 'IMPLEMENTED' },
    { code: 'A.5.15', title: 'Controlo de acesso', category: '5 - Controlos Organizacionais', status: 'IMPLEMENTED' },
    { code: 'A.5.16', title: 'Gestão de identidade', category: '5 - Controlos Organizacionais', status: 'PARTIALLY_IMPLEMENTED' },
    { code: 'A.5.23', title: 'Segurança da informação para uso de serviços cloud', category: '5 - Controlos Organizacionais', status: 'PARTIALLY_IMPLEMENTED' },
    { code: 'A.5.29', title: 'Segurança da informação durante perturbação', category: '5 - Controlos Organizacionais', status: 'NOT_IMPLEMENTED' },
    { code: 'A.6.1', title: 'Verificação de antecedentes', category: '6 - Controlos de Pessoas', status: 'IMPLEMENTED' },
    { code: 'A.6.2', title: 'Termos e condições de emprego', category: '6 - Controlos de Pessoas', status: 'IMPLEMENTED' },
    { code: 'A.6.3', title: 'Sensibilização e formação em segurança', category: '6 - Controlos de Pessoas', status: 'PARTIALLY_IMPLEMENTED' },
    { code: 'A.6.5', title: 'Responsabilidades após cessação ou mudança de emprego', category: '6 - Controlos de Pessoas', status: 'IMPLEMENTED' },
    { code: 'A.6.8', title: 'Relato de eventos de segurança da informação', category: '6 - Controlos de Pessoas', status: 'PARTIALLY_IMPLEMENTED' },
    { code: 'A.7.1', title: 'Perímetros de segurança física', category: '7 - Controlos Físicos', status: 'IMPLEMENTED' },
    { code: 'A.7.2', title: 'Entrada física', category: '7 - Controlos Físicos', status: 'IMPLEMENTED' },
    { code: 'A.7.4', title: 'Monitorização da segurança física', category: '7 - Controlos Físicos', status: 'IMPLEMENTED' },
    { code: 'A.7.8', title: 'Localização e proteção de equipamentos', category: '7 - Controlos Físicos', status: 'NOT_APPLICABLE' },
    { code: 'A.8.1', title: 'Dispositivos de utilizador final', category: '8 - Controlos Tecnológicos', status: 'PARTIALLY_IMPLEMENTED' },
    { code: 'A.8.2', title: 'Direitos de acesso privilegiado', category: '8 - Controlos Tecnológicos', status: 'IMPLEMENTED' },
    { code: 'A.8.3', title: 'Restrição de acesso à informação', category: '8 - Controlos Tecnológicos', status: 'IMPLEMENTED' },
    { code: 'A.8.5', title: 'Autenticação segura', category: '8 - Controlos Tecnológicos', status: 'IMPLEMENTED' },
    { code: 'A.8.6', title: 'Gestão de capacidade', category: '8 - Controlos Tecnológicos', status: 'NOT_IMPLEMENTED' },
    { code: 'A.8.7', title: 'Proteção contra malware', category: '8 - Controlos Tecnológicos', status: 'PARTIALLY_IMPLEMENTED' },
    { code: 'A.8.8', title: 'Gestão de vulnerabilidades técnicas', category: '8 - Controlos Tecnológicos', status: 'PARTIALLY_IMPLEMENTED' },
    { code: 'A.8.12', title: 'Prevenção de fuga de dados', category: '8 - Controlos Tecnológicos', status: 'NOT_IMPLEMENTED' },
    { code: 'A.8.15', title: 'Logging', category: '8 - Controlos Tecnológicos', status: 'IMPLEMENTED' },
    { code: 'A.8.16', title: 'Atividades de monitorização', category: '8 - Controlos Tecnológicos', status: 'PARTIALLY_IMPLEMENTED' },
    { code: 'A.8.20', title: 'Segurança de redes', category: '8 - Controlos Tecnológicos', status: 'IMPLEMENTED' },
    { code: 'A.8.24', title: 'Uso de criptografia', category: '8 - Controlos Tecnológicos', status: 'IMPLEMENTED' },
    { code: 'A.8.25', title: 'Ciclo de vida de desenvolvimento seguro', category: '8 - Controlos Tecnológicos', status: 'NOT_IMPLEMENTED' },
    { code: 'A.8.28', title: 'Codificação segura', category: '8 - Controlos Tecnológicos', status: 'PARTIALLY_IMPLEMENTED' },
    { code: 'A.8.32', title: 'Gestão de alterações', category: '8 - Controlos Tecnológicos', status: 'PARTIALLY_IMPLEMENTED' },
    { code: 'A.8.33', title: 'Informação de teste', category: '8 - Controlos Tecnológicos', status: 'NOT_IMPLEMENTED' },
    { code: 'A.8.34', title: 'Proteção de sistemas de informação durante auditoria', category: '8 - Controlos Tecnológicos', status: 'NOT_APPLICABLE' },
  ];

  const controlMap: Record<string, string> = {};
  for (const ctrl of iso27001Controls) {
    const c = await prisma.control.upsert({
      where: { frameworkId_code: { frameworkId: iso27001.id, code: ctrl.code } },
      update: { status: ctrl.status as any },
      create: {
        frameworkId: iso27001.id,
        code: ctrl.code,
        title: ctrl.title,
        category: ctrl.category,
        description: `ISO 27001:2022 controlo ${ctrl.code}: ${ctrl.title}`,
        status: ctrl.status as any,
      },
    });
    controlMap[ctrl.code] = c.id;
  }
  console.log(`✓ ISO 27001 controls: ${iso27001Controls.length}`);

  // ── ISO 27001 Requirements ───────────────────────────────────
  const iso27001Requirements = [
    { code: 'ISO27001.4', title: 'Contexto da organização' },
    { code: 'ISO27001.5', title: 'Liderança' },
    { code: 'ISO27001.6', title: 'Planeamento' },
    { code: 'ISO27001.7', title: 'Suporte' },
    { code: 'ISO27001.8', title: 'Operação' },
    { code: 'ISO27001.9', title: 'Avaliação do desempenho' },
    { code: 'ISO27001.10', title: 'Melhoria' },
  ];
  for (const req of iso27001Requirements) {
    await prisma.requirement.upsert({
      where: { frameworkId_code: { frameworkId: iso27001.id, code: req.code } },
      update: {},
      create: { frameworkId: iso27001.id, code: req.code, title: req.title, mandatory: true },
    });
  }

  // GDPR Requirements
  const gdprReqs = [
    { code: 'GDPR.Art5', title: 'Princípios relativos ao tratamento de dados pessoais' },
    { code: 'GDPR.Art6', title: 'Licitude do tratamento' },
    { code: 'GDPR.Art28', title: 'Subcontratante' },
    { code: 'GDPR.Art30', title: 'Registo das atividades de tratamento (ROPA)' },
    { code: 'GDPR.Art32', title: 'Segurança do tratamento' },
    { code: 'GDPR.Art33', title: 'Notificação de violação de dados' },
    { code: 'GDPR.Art35', title: 'Avaliação de impacto sobre a proteção de dados (DPIA)' },
    { code: 'GDPR.Art37', title: 'Designação do DPO' },
  ];
  for (const req of gdprReqs) {
    await prisma.requirement.upsert({
      where: { frameworkId_code: { frameworkId: gdpr.id, code: req.code } },
      update: {},
      create: { frameworkId: gdpr.id, code: req.code, title: req.title, mandatory: true },
    });
  }

  // NIS2 Requirements
  const nis2Reqs = [
    { code: 'NIS2.Art20', title: 'Governo e responsabilidade da gestão de topo' },
    { code: 'NIS2.Art21.1', title: 'Gestão de riscos — Política de segurança' },
    { code: 'NIS2.Art21.2a', title: 'Tratamento de incidentes' },
    { code: 'NIS2.Art23', title: 'Notificação de incidentes significativos' },
  ];
  for (const req of nis2Reqs) {
    await prisma.requirement.upsert({
      where: { frameworkId_code: { frameworkId: nis2.id, code: req.code } },
      update: {},
      create: { frameworkId: nis2.id, code: req.code, title: req.title, mandatory: true },
    });
  }

  // DORA Requirements
  const doraReqs = [
    { code: 'DORA.Art5', title: 'Quadro de gestão de riscos TIC — Governação' },
    { code: 'DORA.Art9', title: 'Proteção e prevenção' },
    { code: 'DORA.Art17', title: 'Gestão de incidentes TIC' },
    { code: 'DORA.Art19', title: 'Reporte de incidentes TIC graves' },
    { code: 'DORA.Art24', title: 'Programa geral de testes de resiliência operacional digital' },
    { code: 'DORA.Art28', title: 'Princípios gerais de risco de terceiros TIC' },
  ];
  for (const req of doraReqs) {
    await prisma.requirement.upsert({
      where: { frameworkId_code: { frameworkId: dora.id, code: req.code } },
      update: {},
      create: { frameworkId: dora.id, code: req.code, title: req.title, mandatory: true },
    });
  }
  console.log(`✓ Requirements seeded`);

  // ── Demo Project ─────────────────────────────────────────────
  const demoProject = await prisma.project.upsert({
    where: { id: 'demo-project-001' },
    update: {
      name: 'Implementação ISO 27001:2022 — Fintech Segura',
      description: 'Projeto de certificação ISO 27001:2022 — fase de implementação dos controlos do Anexo A',
      complianceScore: 58,
    },
    create: {
      id: 'demo-project-001',
      name: 'Implementação ISO 27001:2022 — Fintech Segura',
      description: 'Projeto de certificação ISO 27001:2022 — fase de implementação dos controlos do Anexo A',
      status: 'ACTIVE' as any,
      frameworkId: iso27001.id,
      organizationId: org.id,
      startDate: new Date('2026-01-01'),
      targetDate: new Date('2026-12-31'),
      complianceScore: 58,
      ragStatus: 'AMBER',
    },
  });
  console.log(`✓ Demo project: ${demoProject.name}`);

  // ── DELETE existing bad risks ────────────────────────────────
  console.log('Deleting existing risks...');
  await prisma.risk.deleteMany({ where: { organizationId: org.id } });
  console.log(`✓ Existing risks deleted`);

  // ── 15 Risks ─────────────────────────────────────────────────
  console.log('Seeding risks...');
  const risks = [
    // CRITICAL (2)
    {
      title: 'Violação de dados por ransomware',
      description: 'Ataque de ransomware que cifra dados de clientes e sistemas de pagamento, resultando em violação massiva de dados pessoais e interrupção operacional.',
      category: 'Cibersegurança',
      likelihood: RiskLikelihood.POSSIBLE,
      impact: RiskImpact.CATASTROPHIC,
      inherentScore: 15,
      status: RiskStatus.IDENTIFIED,
      treatmentType: null,
      treatmentPlan: null,
      tags: ['ransomware', 'dados-pessoais', 'GDPR', 'NIS2'],
      ownerId: riskUser.id,
    },
    {
      title: 'Falha DORA no sistema de pagamentos crítico',
      description: 'Indisponibilidade do sistema core de pagamentos por falha de resiliência operacional, com impacto em clientes e obrigações de reporte regulatório DORA.',
      category: 'Resiliência Operacional',
      likelihood: RiskLikelihood.LIKELY,
      impact: RiskImpact.CATASTROPHIC,
      inherentScore: 20,
      status: RiskStatus.ASSESSED,
      treatmentType: 'MITIGATE',
      treatmentPlan: 'Implementar redundância N+2 para sistemas de pagamento. Testes DORA trimestrais. Plano de recuperação com RTO < 4h.',
      tags: ['DORA', 'pagamentos', 'resiliência', 'RTO'],
      ownerId: riskUser.id,
    },
    // HIGH (4)
    {
      title: 'Acesso não autorizado a dados PCI-DSS',
      description: 'Acesso indevido a dados de cartões de pagamento por colaborador interno ou por comprometimento de credenciais, violando requisitos PCI-DSS.',
      category: 'Controlo de Acessos',
      likelihood: RiskLikelihood.POSSIBLE,
      impact: RiskImpact.MAJOR,
      inherentScore: 12,
      status: RiskStatus.ASSESSED,
      treatmentType: 'MITIGATE',
      treatmentPlan: 'Implementar tokenização PCI-DSS. Segregação de funções. Monitorização de acessos privilegiados com PAM. Revisão trimestral de acessos.',
      tags: ['PCI-DSS', 'cartões', 'acessos'],
      ownerId: riskUser.id,
    },
    {
      title: 'Colaborador com acesso excessivo a sistemas críticos',
      description: 'Colaboradores com permissões além do necessário para a sua função, violando o princípio do menor privilégio (ISO 27001 A.8.2).',
      category: 'Controlo de Acessos',
      likelihood: RiskLikelihood.LIKELY,
      impact: RiskImpact.MAJOR,
      inherentScore: 16,
      status: RiskStatus.IDENTIFIED,
      treatmentType: null,
      treatmentPlan: null,
      tags: ['acessos', 'menor-privilégio', 'IAM'],
      ownerId: riskUser.id,
    },
    {
      title: 'Phishing direcionado a equipa de finanças',
      description: 'Campanha de spear-phishing dirigida a colaboradores com acesso a transferências bancárias e sistemas financeiros da empresa.',
      category: 'Cibersegurança',
      likelihood: RiskLikelihood.LIKELY,
      impact: RiskImpact.MAJOR,
      inherentScore: 16,
      status: RiskStatus.ASSESSED,
      treatmentType: 'MITIGATE',
      treatmentPlan: 'Formação de sensibilização semestral. Simulações de phishing mensais. MFA obrigatório. Filtros de email avançados (DMARC/SPF/DKIM).',
      tags: ['phishing', 'engenharia-social', 'formação'],
      ownerId: dpoUser.id,
    },
    {
      title: 'Dependência crítica de AWS eu-west-1 sem redundância multi-região',
      description: 'Toda a infraestrutura de produção concentrada numa única região AWS. Falha da região implica interrupção total de serviços de pagamento.',
      category: 'Resiliência Operacional',
      likelihood: RiskLikelihood.POSSIBLE,
      impact: RiskImpact.MAJOR,
      inherentScore: 12,
      status: RiskStatus.IDENTIFIED,
      treatmentType: null,
      treatmentPlan: null,
      tags: ['AWS', 'cloud', 'DORA', 'concentração'],
      ownerId: riskUser.id,
    },
    // MEDIUM (5)
    {
      title: 'Ausência de DPIA para análise comportamental de clientes',
      description: 'Sistema de análise de comportamento de clientes para deteção de fraude processa dados pessoais de forma automatizada sem DPIA realizada.',
      category: 'Proteção de Dados',
      likelihood: RiskLikelihood.POSSIBLE,
      impact: RiskImpact.MODERATE,
      inherentScore: 9,
      status: RiskStatus.IDENTIFIED,
      treatmentType: 'MITIGATE',
      treatmentPlan: 'Realizar DPIA completa conforme Art.35 GDPR. Nomear DPO como consultor. Submeter à CNPD se resultado for alto risco.',
      tags: ['DPIA', 'GDPR', 'análise-comportamental'],
      ownerId: dpoUser.id,
    },
    {
      title: 'Contratos de fornecedores sem cláusulas GDPR/NIS2 atualizadas',
      description: 'Vários contratos com fornecedores de tecnologia não incluem cláusulas de proteção de dados (DPA) nem requisitos de cibersegurança NIS2.',
      category: 'Fornecedores',
      likelihood: RiskLikelihood.LIKELY,
      impact: RiskImpact.MODERATE,
      inherentScore: 12,
      status: RiskStatus.ASSESSED,
      treatmentType: 'MITIGATE',
      treatmentPlan: 'Rever todos os contratos com fornecedores críticos até Q3 2026. Implementar cláusulas DPA obrigatórias e requisitos de segurança.',
      tags: ['fornecedores', 'DPA', 'GDPR', 'NIS2'],
      ownerId: dpoUser.id,
    },
    {
      title: 'Falta de plano de continuidade de negócio formalizado',
      description: 'Ausência de BCP documentado e testado, em incumprimento com DORA Art.11 e ISO 27001 A.5.29.',
      category: 'Continuidade de Negócio',
      likelihood: RiskLikelihood.POSSIBLE,
      impact: RiskImpact.MODERATE,
      inherentScore: 9,
      status: RiskStatus.IDENTIFIED,
      treatmentType: 'MITIGATE',
      treatmentPlan: 'Desenvolver BCP completo com RTO/RPO definidos. Testar semestralmente. Integrar com planos DORA.',
      tags: ['BCP', 'DORA', 'continuidade'],
      ownerId: riskUser.id,
    },
    {
      title: 'Gestão de patches sem automatização — servidores desatualizados',
      description: 'Processo manual de aplicação de patches de segurança resulta em janelas de exposição de semanas nos servidores de produção.',
      category: 'Vulnerabilidades',
      likelihood: RiskLikelihood.LIKELY,
      impact: RiskImpact.MODERATE,
      inherentScore: 12,
      status: RiskStatus.ASSESSED,
      treatmentType: 'MITIGATE',
      treatmentPlan: 'Implementar solução de patch management automatizado (ex: AWS Systems Manager Patch Manager). SLA: patches críticos em 48h.',
      tags: ['patches', 'vulnerabilidades', 'ISO27001'],
      ownerId: riskUser.id,
    },
    {
      title: 'Canal de denúncias RGPC sem gestor designado',
      description: 'Canal de denúncias implementado mas sem responsável formalmente designado para triagem e investigação, incumprindo Lei 93/2021.',
      category: 'Compliance',
      likelihood: RiskLikelihood.UNLIKELY,
      impact: RiskImpact.MODERATE,
      inherentScore: 6,
      status: RiskStatus.IDENTIFIED,
      treatmentType: null,
      treatmentPlan: null,
      tags: ['RGPC', 'denúncias', 'Lei-93-2021'],
      ownerId: managerUser.id,
    },
    // LOW (4)
    {
      title: 'Ausência de política de trabalho remoto e BYOD',
      description: 'Sem política formal para dispositivos pessoais usados para acesso a sistemas empresariais (BYOD), criando riscos de segurança.',
      category: 'Recursos Humanos',
      likelihood: RiskLikelihood.UNLIKELY,
      impact: RiskImpact.MINOR,
      inherentScore: 4,
      status: RiskStatus.IDENTIFIED,
      treatmentType: 'MITIGATE',
      treatmentPlan: 'Elaborar política de trabalho remoto e BYOD. Implementar MDM para dispositivos pessoais.',
      tags: ['BYOD', 'remoto', 'segurança-endpoint'],
      ownerId: managerUser.id,
    },
    {
      title: 'Cópias de segurança sem teste de recuperação documentado',
      description: 'Backups diários configurados mas sem evidência de testes de recuperação completos realizados e documentados nos últimos 6 meses.',
      category: 'Continuidade de Negócio',
      likelihood: RiskLikelihood.RARE,
      impact: RiskImpact.MINOR,
      inherentScore: 2,
      status: RiskStatus.MITIGATED,
      treatmentType: 'MITIGATE',
      treatmentPlan: 'Testes de restauro documentados mensalmente. Evidências disponíveis no iComply.',
      tags: ['backup', 'recuperação', 'ISO27001'],
      ownerId: riskUser.id,
    },
    {
      title: 'Ausência de processo de onboarding de segurança',
      description: 'Novos colaboradores iniciam funções sem formação de segurança inicial estruturada, criando risco de incidentes por desconhecimento.',
      category: 'Recursos Humanos',
      likelihood: RiskLikelihood.UNLIKELY,
      impact: RiskImpact.MINOR,
      inherentScore: 4,
      status: RiskStatus.IDENTIFIED,
      treatmentType: 'MITIGATE',
      treatmentPlan: 'Criar programa de onboarding de segurança obrigatório para todos os novos colaboradores.',
      tags: ['onboarding', 'formação', 'RH'],
      ownerId: dpoUser.id,
    },
    {
      title: 'Registo de ativos TIC desatualizado',
      description: 'Inventário de ativos de hardware e software não atualizado sistematicamente, dificultando avaliação de exposição a vulnerabilidades.',
      category: 'Gestão de Ativos',
      likelihood: RiskLikelihood.UNLIKELY,
      impact: RiskImpact.MINOR,
      inherentScore: 4,
      status: RiskStatus.IDENTIFIED,
      treatmentType: 'ACCEPT',
      treatmentPlan: 'Aceitar risco residual enquanto se implementa solução CMDB automatizada (prevista Q4 2026).',
      tags: ['inventário', 'ativos', 'CMDB'],
      ownerId: riskUser.id,
    },
  ];

  const createdRisks: any[] = [];
  for (const r of risks) {
    const risk = await prisma.risk.create({
      data: {
        title: r.title,
        description: r.description,
        category: r.category,
        likelihood: r.likelihood,
        impact: r.impact,
        inherentScore: r.inherentScore,
        status: r.status,
        treatmentType: r.treatmentType,
        treatmentPlan: r.treatmentPlan,
        tags: r.tags,
        organizationId: org.id,
        projectId: demoProject.id,
        ownerId: r.ownerId,
        reviewDate: new Date('2026-12-31'),
      },
    });
    createdRisks.push(risk);
  }
  console.log(`✓ Risks created: ${risks.length}`);

  // ── Policies ─────────────────────────────────────────────────
  console.log('Seeding policies...');
  const policies = [
    // APPROVED (5)
    {
      title: 'Política de Segurança da Informação',
      version: '2.1',
      status: PolicyStatus.APPROVED,
      category: PolicyCategory.INFORMATION_SECURITY,
      approvedAt: new Date('2026-01-15'),
      effectiveDate: new Date('2026-02-01'),
      reviewDate: new Date('2027-02-01'),
      description: 'Política mestre de segurança da informação conforme ISO 27001:2022 e NIS2.',
      content: `# Política de Segurança da Informação v2.1\n\n## 1. Objetivo\nEstabelecer os princípios e requisitos de segurança da informação da Fintech Segura, S.A., garantindo a confidencialidade, integridade e disponibilidade dos ativos de informação.\n\n## 2. Âmbito\nAplica-se a todos os colaboradores, prestadores de serviços e terceiros com acesso a sistemas e dados da Fintech Segura.\n\n## 3. Princípios\n- Segurança baseada no risco\n- Menor privilégio\n- Defesa em profundidade\n- Responsabilização individual\n\n## 4. Responsabilidades\nO CISO é responsável pela implementação e supervisão desta política.`,
      tags: ['ISO27001', 'NIS2', 'DORA', 'segurança'],
      ownerId: managerUser.id,
      approverId: adminUser.id,
    },
    {
      title: 'Política de Controlo de Acessos',
      version: '1.3',
      status: PolicyStatus.APPROVED,
      category: PolicyCategory.ACCESS_CONTROL,
      approvedAt: new Date('2026-01-20'),
      effectiveDate: new Date('2026-02-01'),
      reviewDate: new Date('2027-02-01'),
      description: 'Define requisitos de controlo de acesso a sistemas e dados, incluindo MFA e revisão de acessos.',
      content: `# Política de Controlo de Acessos v1.3\n\n## 1. Objetivo\nGarantir que o acesso a sistemas e dados da Fintech Segura seja concedido com base no princípio do menor privilégio.\n\n## 2. Requisitos de Autenticação\n- MFA obrigatório para todos os sistemas críticos\n- Passwords com mínimo 12 caracteres\n- Revisão de acessos trimestral\n\n## 3. Gestão de Acessos Privilegiados\n- PAM implementado para acessos administrativos\n- Just-in-time access para produção`,
      tags: ['ISO27001', 'PCI-DSS', 'MFA', 'acessos'],
      ownerId: managerUser.id,
      approverId: adminUser.id,
    },
    {
      title: 'Política de Gestão de Incidentes de Segurança',
      version: '1.0',
      status: PolicyStatus.APPROVED,
      category: PolicyCategory.INCIDENT_MANAGEMENT,
      approvedAt: new Date('2026-02-10'),
      effectiveDate: new Date('2026-03-01'),
      reviewDate: new Date('2027-03-01'),
      description: 'Procedimentos de deteção, reporte, triagem e resposta a incidentes de segurança, incluindo obrigações GDPR Art.33 e NIS2 Art.23.',
      content: `# Política de Gestão de Incidentes v1.0\n\n## 1. Classificação\n- P1 CRÍTICO: Violação de dados, sistema de pagamentos em baixo\n- P2 ALTO: Incidente de segurança com impacto operacional\n- P3 MÉDIO: Suspeita de comprometimento\n- P4 BAIXO: Evento de segurança sem impacto\n\n## 2. Timelines Regulatórios\n- GDPR: Notificação CNPD em 72h para violações de dados\n- NIS2: Pré-notificação CNCS em 24h, relatório em 72h\n- DORA: Reporte BdP em ≤4h para incidentes TIC graves`,
      tags: ['NIS2', 'GDPR', 'DORA', 'incidentes'],
      ownerId: managerUser.id,
      approverId: adminUser.id,
    },
    {
      title: 'Política de Backup e Recuperação',
      version: '1.1',
      status: PolicyStatus.APPROVED,
      category: PolicyCategory.BUSINESS_CONTINUITY,
      approvedAt: new Date('2026-02-20'),
      effectiveDate: new Date('2026-03-01'),
      reviewDate: new Date('2027-03-01'),
      description: 'Requisitos de backup, retenção e recuperação de dados conforme DORA Art.12 e ISO 27001 A.8.13.',
      content: `# Política de Backup e Recuperação v1.1\n\n## 1. Requisitos de Backup\n- Backup diário incremental, semanal completo\n- Retenção: 30 dias operacional, 1 ano arquivo\n- Backup offsite automático (AWS S3 eu-west-2)\n- Encriptação AES-256 em repouso e trânsito\n\n## 2. RTO e RPO\n- Sistemas críticos de pagamento: RTO 4h, RPO 1h\n- Sistemas de suporte: RTO 24h, RPO 4h\n\n## 3. Testes\n- Teste de recuperação parcial: mensal\n- Teste de recuperação completo: semestral`,
      tags: ['DORA', 'ISO27001', 'backup', 'BCP'],
      ownerId: riskUser.id,
      approverId: adminUser.id,
    },
    {
      title: 'Política de Uso Aceitável de Recursos TI',
      version: '2.0',
      status: PolicyStatus.APPROVED,
      category: PolicyCategory.INFORMATION_SECURITY,
      approvedAt: new Date('2026-03-01'),
      effectiveDate: new Date('2026-04-01'),
      reviewDate: new Date('2027-04-01'),
      description: 'Define o uso aceitável de equipamentos, sistemas e dados da empresa por colaboradores e prestadores.',
      content: `# Política de Uso Aceitável v2.0\n\n## 1. Uso Permitido\n- Acesso a sistemas para fins profissionais\n- Uso de dispositivos aprovados pela empresa\n- Comunicação por canais seguros aprovados\n\n## 2. Uso Proibido\n- Instalação de software não autorizado\n- Acesso a sistemas de terceiros sem autorização\n- Partilha de credenciais\n- Uso de redes Wi-Fi públicas sem VPN`,
      tags: ['ISO27001', 'colaboradores', 'AUP'],
      ownerId: managerUser.id,
      approverId: adminUser.id,
    },
    // UNDER_REVIEW (2)
    {
      title: 'Política de Gestão de Fornecedores',
      version: '0.9',
      status: PolicyStatus.IN_REVIEW,
      category: PolicyCategory.SUPPLIER_MANAGEMENT,
      approvedAt: null,
      effectiveDate: null,
      reviewDate: new Date('2026-09-30'),
      description: 'Requisitos de avaliação, seleção e monitorização de fornecedores críticos, incluindo cláusulas GDPR e NIS2.',
      content: `# Política de Gestão de Fornecedores v0.9 (DRAFT)\n\n## 1. Classificação de Fornecedores\n- Crítico: acesso a dados pessoais ou sistemas de pagamento\n- Importante: suporte a funções operacionais\n- Padrão: fornecimentos gerais\n\n## 2. Due Diligence\n- Avaliação de segurança antes de contratação\n- Questionário de segurança anual\n- Auditoria no local para fornecedores críticos\n\n## 3. Cláusulas Contratuais\n- DPA obrigatório (GDPR Art.28)\n- Requisitos NIS2 para fornecedores de TIC`,
      tags: ['NIS2', 'GDPR', 'fornecedores', 'DORA'],
      ownerId: dpoUser.id,
      approverId: adminUser.id,
    },
    {
      title: 'Política de Classificação de Informação',
      version: '1.0',
      status: PolicyStatus.IN_REVIEW,
      category: PolicyCategory.INFORMATION_SECURITY,
      approvedAt: null,
      effectiveDate: null,
      reviewDate: new Date('2026-08-31'),
      description: 'Esquema de classificação de informação (Pública, Interna, Confidencial, Restrita) e requisitos de tratamento.',
      content: `# Política de Classificação de Informação v1.0 (DRAFT)\n\n## 1. Níveis de Classificação\n- PÚBLICO: Informação para divulgação geral\n- INTERNO: Uso exclusivo de colaboradores\n- CONFIDENCIAL: Dados sensíveis de negócio ou clientes\n- RESTRITO: Dados de pagamento, segredos comerciais\n\n## 2. Requisitos por Nível\n### CONFIDENCIAL\n- Encriptação obrigatória em repouso e trânsito\n- Acesso controlado e auditado\n\n### RESTRITO\n- PCI-DSS aplicável a dados de cartões\n- Tokenização obrigatória`,
      tags: ['ISO27001', 'PCI-DSS', 'classificação'],
      ownerId: managerUser.id,
      approverId: adminUser.id,
    },
    // DRAFT (3)
    {
      title: 'Política de Trabalho Remoto e BYOD',
      version: '0.1',
      status: PolicyStatus.DRAFT,
      category: PolicyCategory.HUMAN_RESOURCES,
      approvedAt: null,
      effectiveDate: null,
      reviewDate: null,
      description: 'Regras de segurança para trabalho remoto e uso de dispositivos pessoais para acesso a sistemas da empresa.',
      content: `# Política de Trabalho Remoto e BYOD v0.1 (DRAFT)\n\n## Estado: EM ELABORAÇÃO\n\nEste documento está em fase de elaboração e não foi ainda aprovado pela gestão.\n\n## Âmbito Previsto\n- Trabalho remoto (full-remote e híbrido)\n- Dispositivos pessoais (BYOD)\n- Acesso remoto a sistemas críticos\n\n## Requisitos Preliminares\n- VPN obrigatória\n- MDM para dispositivos pessoais\n- MFA para todos os acessos remotos`,
      tags: ['BYOD', 'remoto', 'segurança-endpoint'],
      ownerId: managerUser.id,
      approverId: null,
    },
    {
      title: 'Política de Desenvolvimento Seguro (SDLC)',
      version: '0.1',
      status: PolicyStatus.DRAFT,
      category: PolicyCategory.OPERATIONAL,
      approvedAt: null,
      effectiveDate: null,
      reviewDate: null,
      description: 'Requisitos de segurança no ciclo de vida de desenvolvimento de software, incluindo revisão de código e testes de segurança.',
      content: `# Política de Desenvolvimento Seguro v0.1 (DRAFT)\n\n## Estado: EM ELABORAÇÃO\n\n## Princípios SDLC Seguros\n- Security by Design\n- Shift-left security testing\n- Code review obrigatório\n- SAST/DAST integrado em CI/CD\n\n## Requisitos de Segurança\n- Análise de dependências (SCA)\n- Gestão de secrets (sem hardcoding)\n- Penetration testing antes de major releases`,
      tags: ['ISO27001', 'DORA', 'desenvolvimento', 'SDLC'],
      ownerId: riskUser.id,
      approverId: null,
    },
    {
      title: 'Plano de Continuidade do Negócio',
      version: '0.2',
      status: PolicyStatus.DRAFT,
      category: PolicyCategory.BUSINESS_CONTINUITY,
      approvedAt: null,
      effectiveDate: null,
      reviewDate: null,
      description: 'Plano de continuidade do negócio e recuperação de desastre conforme DORA Art.11 e ISO 22301.',
      content: `# Plano de Continuidade do Negócio v0.2 (DRAFT)\n\n## Estado: EM ELABORAÇÃO\n\n## Cenários de Continuidade\n1. Falha de datacenter primário\n2. Ataque de ransomware\n3. Falha de fornecedor crítico (AWS)\n4. Indisponibilidade de pessoal chave\n\n## Objetivos de Recuperação (Preliminares)\n- RTO Sistema de Pagamentos: 4 horas\n- RPO Sistema de Pagamentos: 1 hora\n- RTO Back-office: 24 horas`,
      tags: ['DORA', 'BCP', 'ISO22301', 'continuidade'],
      ownerId: managerUser.id,
      approverId: null,
    },
  ];

  const createdPolicies: any[] = [];
  for (const p of policies) {
    const policy = await prisma.policy.create({
      data: {
        title: p.title,
        version: p.version,
        status: p.status,
        category: p.category,
        description: p.description,
        content: p.content,
        approvedAt: p.approvedAt,
        effectiveDate: p.effectiveDate,
        reviewDate: p.reviewDate,
        tags: p.tags,
        organizationId: org.id,
        frameworkId: iso27001.id,
        ownerId: p.ownerId,
        approverId: p.approverId,
      },
    });
    createdPolicies.push(policy);
  }
  console.log(`✓ Policies created: ${policies.length}`);

  // ── Tasks ────────────────────────────────────────────────────
  console.log('Seeding tasks...');
  const tasks = [
    // DONE (7)
    {
      title: 'Designar Responsável de Proteção de Dados (DPO)',
      status: TaskStatus.DONE,
      priority: TaskPriority.CRITICAL,
      completedAt: new Date('2026-01-10'),
      dueDate: new Date('2026-01-15'),
      description: 'Nomeação formal de DPO conforme GDPR Art.37. Notificação à CNPD realizada.',
      assigneeId: dpoUser.id,
    },
    {
      title: 'Implementar autenticação de dois fatores em sistemas críticos',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      completedAt: new Date('2026-02-15'),
      dueDate: new Date('2026-02-28'),
      description: 'MFA implementado em core banking, sistema de pagamentos e portal de administração.',
      assigneeId: riskUser.id,
    },
    {
      title: 'Realizar análise de lacunas ISO 27001:2022',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      completedAt: new Date('2026-02-28'),
      dueDate: new Date('2026-02-28'),
      description: 'Gap analysis aos 93 controlos do Anexo A ISO 27001:2022. Score inicial: 38%. Plano de ação elaborado.',
      assigneeId: managerUser.id,
    },
    {
      title: 'Rever e atualizar Política de Segurança da Informação',
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      completedAt: new Date('2026-03-01'),
      dueDate: new Date('2026-03-15'),
      description: 'PSI atualizada para v2.1 incluindo requisitos NIS2 e DORA. Aprovada pelo Conselho.',
      assigneeId: managerUser.id,
    },
    {
      title: 'Inventariar todos os tratamentos de dados pessoais (ROPA)',
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      completedAt: new Date('2026-03-15'),
      dueDate: new Date('2026-03-31'),
      description: 'ROPA completo com 23 atividades de tratamento mapeadas. DPO validou e assinou.',
      assigneeId: dpoUser.id,
    },
    {
      title: 'Implementar solução de backup offsite automatizado',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      completedAt: new Date('2026-04-10'),
      dueDate: new Date('2026-04-30'),
      description: 'AWS Backup configurado com replicação automática para eu-west-2. Testes de recuperação bem-sucedidos.',
      assigneeId: riskUser.id,
    },
    {
      title: 'Publicar Trust Center público para parceiros B2B',
      status: TaskStatus.DONE,
      priority: TaskPriority.LOW,
      completedAt: new Date('2026-05-01'),
      dueDate: new Date('2026-05-15'),
      description: 'Trust Center iComply publicado em trust.fintech-segura.pt com certificações e status de compliance.',
      assigneeId: managerUser.id,
    },
    // IN_PROGRESS (6)
    {
      title: 'Programa de formação em segurança para colaboradores (180 pessoas)',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      completedAt: null,
      dueDate: new Date('2026-07-31'),
      description: 'Programa anual de sensibilização em segurança: módulos GDPR, phishing, uso aceitável. 45% dos colaboradores concluíram.',
      assigneeId: dpoUser.id,
    },
    {
      title: 'Contratar empresa CREST para penetration test anual',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      completedAt: null,
      dueDate: new Date('2026-07-15'),
      description: 'Processo de seleção de empresa certificada CREST para pentest dos sistemas de pagamento e infraestrutura cloud.',
      assigneeId: riskUser.id,
    },
    {
      title: 'Implementar gestão de patches automatizada',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      completedAt: null,
      dueDate: new Date('2026-08-31'),
      description: 'Configurar AWS Systems Manager Patch Manager para todos os servidores. Atualmente 60% dos servidores cobertos.',
      assigneeId: riskUser.id,
    },
    {
      title: 'Rever contratos de fornecedores críticos (GDPR/NIS2)',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      completedAt: null,
      dueDate: new Date('2026-09-30'),
      description: 'Revisão de 12 contratos com fornecedores críticos para incluir cláusulas DPA e requisitos NIS2. 5 de 12 concluídos.',
      assigneeId: dpoUser.id,
    },
    {
      title: 'Implementar tokenização PCI-DSS para dados de cartões',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.CRITICAL,
      completedAt: null,
      dueDate: new Date('2026-06-30'),
      description: 'Integração com Stripe Tokenization API para substituir armazenamento de dados de cartões em claro.',
      assigneeId: riskUser.id,
    },
    {
      title: 'Instalar iGuard em todos os endpoints da empresa',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      completedAt: null,
      dueDate: new Date('2026-07-01'),
      description: 'Rollout do agente iGuard para os 180 endpoints. 120 instalados. 60 pendentes (equipa remota).',
      assigneeId: managerUser.id,
    },
    // TODO (4)
    {
      title: 'Realizar DPIA para sistema de análise de comportamento',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      completedAt: null,
      dueDate: new Date('2026-08-31'),
      description: 'DPIA obrigatória (GDPR Art.35) para o sistema de análise comportamental de clientes para deteção de fraude.',
      assigneeId: dpoUser.id,
    },
    {
      title: 'Implementar redundância N+2 para DORA (sistemas de pagamento)',
      status: TaskStatus.TODO,
      priority: TaskPriority.CRITICAL,
      completedAt: null,
      dueDate: new Date('2026-09-30'),
      description: 'Arquitetura multi-região AWS (eu-west-1 + eu-west-2) para sistemas de pagamento. RTO < 4h DORA Art.11.',
      assigneeId: riskUser.id,
    },
    {
      title: 'Desenvolver Plano de Continuidade de Negócio completo',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      completedAt: null,
      dueDate: new Date('2026-10-31'),
      description: 'Elaborar BCP completo com RTO/RPO, cenários de crise, contactos e procedimentos de ativação.',
      assigneeId: managerUser.id,
    },
    {
      title: 'Criar processo de onboarding de segurança para novos colaboradores',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      completedAt: null,
      dueDate: new Date('2026-09-15'),
      description: 'Módulo de onboarding obrigatório: política de uso aceitável, GDPR básico, segurança de passwords, relato de incidentes.',
      assigneeId: dpoUser.id,
    },
    // IN_REVIEW (3)
    {
      title: 'Relatório ISO 27001 para Conselho de Administração — Q2 2026',
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.HIGH,
      completedAt: null,
      dueDate: new Date('2026-06-30'),
      description: 'Relatório executivo de progresso da implementação ISO 27001 para apresentação ao CA. Score atual 58%.',
      assigneeId: managerUser.id,
    },
    {
      title: 'Revisão anual da Política de Gestão de Incidentes',
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.MEDIUM,
      completedAt: null,
      dueDate: new Date('2026-07-15'),
      description: 'Revisão anual da PGI com incorporação dos requisitos NIS2 Art.23 e DORA Art.19 (timelines de notificação).',
      assigneeId: managerUser.id,
    },
    {
      title: 'Avaliação de risco de fornecedores críticos (AWS, Stripe, Salesforce)',
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.HIGH,
      completedAt: null,
      dueDate: new Date('2026-07-31'),
      description: 'Avaliação formal de risco de terceiros TIC conforme DORA Art.28 para os 3 fornecedores críticos.',
      assigneeId: riskUser.id,
    },
  ];

  const createdTasks: any[] = [];
  for (const t of tasks) {
    const task = await prisma.task.create({
      data: {
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        completedAt: t.completedAt,
        dueDate: t.dueDate,
        projectId: demoProject.id,
        createdById: adminUser.id,
        assigneeId: t.assigneeId,
      },
    });
    createdTasks.push(task);
  }
  console.log(`✓ Tasks created: ${tasks.length}`);

  // ── Audits ───────────────────────────────────────────────────
  console.log('Seeding audits...');

  // Audit 1: ISO 27001 Phase 1 — COMPLETED
  const audit1 = await prisma.audit.create({
    data: {
      title: 'Auditoria Interna ISO 27001:2022 — Fase 1 (Controlos 5-6)',
      type: AuditType.INTERNAL,
      status: AuditStatus.COMPLETED,
      scope: 'Controlos organizacionais (5) e de pessoas (6) do Anexo A ISO 27001:2022',
      objectives: 'Avaliar o nível de implementação dos controlos organizacionais e de pessoas, identificar lacunas e emitir recomendações de melhoria.',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-02-28'),
      completedAt: new Date('2026-02-28'),
      leadAuditor: 'João Silva',
      summary: 'Auditoria concluída com 2 não-conformidades menores e 1 observação. Controlos de acesso e gestão de identidade requerem melhoria. Política de segurança aprovada pelo CA.',
      score: 65,
      ragStatus: 'AMBER',
      organizationId: org.id,
      projectId: demoProject.id,
    },
  });

  // Findings for audit 1
  const finding1a = await prisma.finding.create({
    data: {
      auditId: audit1.id,
      title: 'Revisão de acessos privilegiados sem periodicidade definida',
      description: 'Não existe procedimento documentado para revisão trimestral de acessos privilegiados conforme A.8.2. A última revisão data de mais de 6 meses.',
      severity: FindingSeverity.MINOR,
      status: FindingStatus.IN_PROGRESS,
      requirement: 'ISO 27001:2022 A.8.2 — Direitos de acesso privilegiado',
      dueDate: new Date('2026-06-30'),
    },
  });

  const finding1b = await prisma.finding.create({
    data: {
      auditId: audit1.id,
      title: 'Formação de segurança sem evidência de conclusão para todos os colaboradores',
      description: 'Programa de formação em segurança existe mas apenas 45% dos colaboradores completaram o módulo anual obrigatório.',
      severity: FindingSeverity.MINOR,
      status: FindingStatus.IN_PROGRESS,
      requirement: 'ISO 27001:2022 A.6.3 — Sensibilização e formação em segurança',
      dueDate: new Date('2026-07-31'),
    },
  });

  const finding1c = await prisma.finding.create({
    data: {
      auditId: audit1.id,
      title: 'Processo de offboarding sem checklist formal documentado',
      description: 'Observação: o processo de saída de colaboradores não tem checklist documentada para revogação de acessos sistematizada.',
      severity: FindingSeverity.OBSERVATION,
      status: FindingStatus.OPEN,
      requirement: 'ISO 27001:2022 A.6.5 — Responsabilidades após cessação de emprego',
      dueDate: new Date('2026-09-30'),
    },
  });

  // Audit 2: GDPR — COMPLETED
  const audit2 = await prisma.audit.create({
    data: {
      title: 'Auditoria GDPR — Art.5, Art.28 e Art.32',
      type: AuditType.INTERNAL,
      status: AuditStatus.COMPLETED,
      scope: 'Verificação de conformidade com os princípios GDPR (Art.5), contratos de subcontratação (Art.28) e medidas de segurança (Art.32)',
      objectives: 'Avaliar conformidade GDPR com foco em tratamentos de dados pessoais de clientes fintech, contratos com subcontratantes e medidas técnicas de segurança.',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-04-30'),
      completedAt: new Date('2026-04-30'),
      leadAuditor: 'Maria Santos (DPO)',
      summary: 'Auditoria concluída. Encontrada 1 não-conformidade maior relacionada com contratos de fornecedores sem DPA atualizado. 1 não-conformidade menor na gestão de pedidos de direitos de titulares.',
      score: 72,
      ragStatus: 'AMBER',
      organizationId: org.id,
      projectId: demoProject.id,
    },
  });

  const finding2a = await prisma.finding.create({
    data: {
      auditId: audit2.id,
      title: 'Contratos de subcontratantes sem DPA atualizado (Art.28)',
      description: 'Identificados 7 fornecedores que tratam dados pessoais de clientes sem Acordo de Processamento de Dados (DPA) formalizado ou com DPA desatualizado (anterior ao GDPR 2018). Incumprimento GDPR Art.28.',
      severity: FindingSeverity.MAJOR,
      status: FindingStatus.IN_PROGRESS,
      requirement: 'GDPR Art.28 — Subcontratante',
      dueDate: new Date('2026-09-30'),
    },
  });

  const finding2b = await prisma.finding.create({
    data: {
      auditId: audit2.id,
      title: 'Prazo de resposta a pedidos DSAR excedido em 2 casos',
      description: 'Verificados 2 pedidos de acesso (Art.15) respondidos fora do prazo de 30 dias. Ausência de tracking sistematizado de DSARs.',
      severity: FindingSeverity.MINOR,
      status: FindingStatus.RESOLVED,
      requirement: 'GDPR Art.12 — Informação transparente; Art.15 — Direito de acesso',
      dueDate: new Date('2026-06-30'),
    },
  });

  // Audit 3: ISO 27001 Phase 2 — IN_PROGRESS
  const audit3 = await prisma.audit.create({
    data: {
      title: 'Auditoria Interna ISO 27001:2022 — Fase 2 (Controlos Tecnológicos)',
      type: AuditType.INTERNAL,
      status: AuditStatus.IN_PROGRESS,
      scope: 'Controlos tecnológicos (Secção 8 do Anexo A) — endpoint security, gestão de vulnerabilidades, logging e monitorização, criptografia',
      objectives: 'Avaliar implementação dos controlos tecnológicos A.8.x, com foco em segurança de endpoints, gestão de patches, monitorização de segurança e criptografia.',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-30'),
      completedAt: null,
      leadAuditor: 'Carlos Mendes',
      summary: null,
      score: null,
      ragStatus: 'AMBER',
      organizationId: org.id,
      projectId: demoProject.id,
    },
  });

  // Participants
  await prisma.auditParticipant.createMany({
    data: [
      { auditId: audit1.id, userId: managerUser.id, role: 'LEAD_AUDITOR' },
      { auditId: audit1.id, userId: dpoUser.id, role: 'AUDITOR' },
      { auditId: audit2.id, userId: dpoUser.id, role: 'LEAD_AUDITOR' },
      { auditId: audit2.id, userId: managerUser.id, role: 'AUDITEE' },
      { auditId: audit3.id, userId: riskUser.id, role: 'LEAD_AUDITOR' },
      { auditId: audit3.id, userId: managerUser.id, role: 'AUDITOR' },
    ],
    skipDuplicates: true,
  });

  console.log(`✓ Audits created: 3`);

  // ── CAPA ─────────────────────────────────────────────────────
  console.log('Seeding CAPA...');
  await prisma.capa.create({
    data: {
      title: 'Implementar revisão trimestral de acessos privilegiados',
      description: 'Criar e documentar processo formal de revisão trimestral de acessos privilegiados (admin, root, DBA). Incluir evidências no iComply.',
      rootCause: 'Ausência de procedimento documentado e responsável designado para gestão de acessos privilegiados.',
      correctiveAction: 'Documentar procedimento PAM. Nomear responsável. Agendar revisões trimestrais com reminder automático.',
      preventiveAction: 'Implementar PAM (Privileged Access Management) com sessão recording. Configurar alertas para acessos fora de horário.',
      status: CapaStatus.IN_PROGRESS,
      dueDate: new Date('2026-07-31'),
      findingId: finding1a.id,
      createdById: adminUser.id,
      assigneeId: riskUser.id,
      ragStatus: 'AMBER',
    },
  });

  await prisma.capa.create({
    data: {
      title: 'Concluir programa de formação de segurança — 100% de cobertura',
      description: 'Garantir que todos os 180 colaboradores completam o módulo anual de formação em segurança da informação até 31 de julho 2026.',
      rootCause: 'Formação disponível em plataforma LMS mas sem obrigatoriedade forçada e sem reminder automatizado.',
      correctiveAction: 'Configurar reminder semanal automático. Relatório mensal à gestão de colaboradores com formação pendente.',
      preventiveAction: 'Integrar conclusão de formação no processo de avaliação de desempenho anual.',
      status: CapaStatus.IN_PROGRESS,
      dueDate: new Date('2026-07-31'),
      findingId: finding1b.id,
      createdById: adminUser.id,
      assigneeId: dpoUser.id,
      ragStatus: 'AMBER',
    },
  });

  await prisma.capa.create({
    data: {
      title: 'Formalizar e assinar DPA com todos os fornecedores críticos',
      description: 'Identificar todos os fornecedores que tratam dados pessoais. Elaborar/atualizar DPA conforme GDPR Art.28. Obter assinaturas. Arquivo no iComply.',
      rootCause: 'Crescimento rápido do número de fornecedores sem processo formal de onboarding de proteção de dados.',
      correctiveAction: 'Elaborar modelo de DPA. Contactar 7 fornecedores prioritários. Prazo de assinatura: 90 dias.',
      preventiveAction: 'Implementar checklist de onboarding de fornecedores com DPA como requisito obrigatório antes de início de serviço.',
      status: CapaStatus.IN_PROGRESS,
      dueDate: new Date('2026-09-30'),
      findingId: finding2a.id,
      createdById: adminUser.id,
      assigneeId: dpoUser.id,
      ragStatus: 'RED',
    },
  });

  await prisma.capa.create({
    data: {
      title: 'Implementar sistema de tracking de pedidos DSAR',
      description: 'Configurar módulo DSAR no iComply para tracking automático de prazos. Nomear responsável de respostas.',
      rootCause: 'Gestão de DSARs por email sem tracking centralizado resultou em perda de controlo de prazos.',
      correctiveAction: 'Ativar módulo DSAR no iComply. Migrar pedidos existentes. Formação da equipa responsável.',
      preventiveAction: 'Procedimento de registo imediato de todos os pedidos recebidos. SLA interno de 25 dias (5 dias de margem).',
      status: CapaStatus.CLOSED,
      dueDate: new Date('2026-06-15'),
      closedAt: new Date('2026-06-10'),
      verifiedAt: new Date('2026-06-12'),
      findingId: finding2b.id,
      createdById: adminUser.id,
      assigneeId: dpoUser.id,
      ragStatus: 'GREEN',
    },
  });
  console.log(`✓ CAPA created: 4`);

  // ── Evidence ─────────────────────────────────────────────────
  console.log('Seeding evidence...');

  const evidenceItems = [
    {
      title: 'Certificado ISO 27001 AWS 2026',
      description: 'Certificado ISO 27001:2022 da Amazon Web Services para regiões EU (eu-west-1, eu-west-2). Válido até dezembro 2026.',
      fileName: 'AWS_ISO27001_Certificate_2026.pdf',
      fileSize: 245760,
      mimeType: 'application/pdf',
      s3Key: 'evidence/aws-iso27001-cert-2026.pdf',
      status: EvidenceStatus.APPROVED,
      expiresAt: new Date('2026-12-31'),
      tags: ['AWS', 'ISO27001', 'certificado', 'cloud'],
      controlCode: 'A.5.23',
    },
    {
      title: 'Relatório Pentest CREST UK — Março 2026',
      description: 'Relatório de penetration test realizado pela empresa certificada CREST em março 2026. Âmbito: sistemas de pagamento e APIs externas. 3 findings críticos resolvidos.',
      fileName: 'Pentest_Report_CREST_Mar2026.pdf',
      fileSize: 1048576,
      mimeType: 'application/pdf',
      s3Key: 'evidence/pentest-crest-mar2026.pdf',
      status: EvidenceStatus.APPROVED,
      expiresAt: new Date('2027-03-31'),
      tags: ['pentest', 'CREST', 'vulnerabilidades', 'DORA'],
      controlCode: 'A.8.8',
    },
    {
      title: 'Logs de acesso sistemas core banking — Maio 2026',
      description: 'Export de logs de acesso privilegiado aos sistemas core banking de maio 2026. Sem anomalias identificadas. Revisão mensal conforme procedimento.',
      fileName: 'Access_Logs_CoreBanking_May2026.zip',
      fileSize: 5242880,
      mimeType: 'application/zip',
      s3Key: 'evidence/access-logs-corebanking-may2026.zip',
      status: EvidenceStatus.APPROVED,
      expiresAt: new Date('2026-12-31'),
      tags: ['logs', 'acessos', 'core-banking', 'auditoria'],
      controlCode: 'A.8.15',
    },
    {
      title: 'Resultado simulação phishing — 92% taxa de deteção',
      description: 'Relatório da simulação de phishing realizada em abril 2026. 168 de 180 colaboradores identificaram corretamente o email como phishing (92%). Melhoria de 18pp vs ano anterior.',
      fileName: 'Phishing_Simulation_Apr2026_Report.pdf',
      fileSize: 524288,
      mimeType: 'application/pdf',
      s3Key: 'evidence/phishing-simulation-apr2026.pdf',
      status: EvidenceStatus.APPROVED,
      expiresAt: new Date('2027-04-30'),
      tags: ['phishing', 'formação', 'sensibilização', 'KPI'],
      controlCode: 'A.6.3',
    },
    {
      title: 'Contrato DPA com AWS (Data Processing Addendum)',
      description: 'Data Processing Addendum assinado com Amazon Web Services. Cobre todos os serviços AWS utilizados na EU. Conforme GDPR Art.28.',
      fileName: 'DPA_AWS_Signed_2024.pdf',
      fileSize: 716800,
      mimeType: 'application/pdf',
      s3Key: 'evidence/dpa-aws-signed-2024.pdf',
      status: EvidenceStatus.APPROVED,
      expiresAt: null,
      tags: ['DPA', 'AWS', 'GDPR', 'fornecedor'],
      controlCode: null,
    },
    {
      title: 'Contrato DPA com Stripe (Processamento de Pagamentos)',
      description: 'Data Processing Agreement com Stripe para processamento de pagamentos. Inclui cláusulas PCI-DSS e GDPR. Assinado em janeiro 2026.',
      fileName: 'DPA_Stripe_Signed_Jan2026.pdf',
      fileSize: 614400,
      mimeType: 'application/pdf',
      s3Key: 'evidence/dpa-stripe-signed-jan2026.pdf',
      status: EvidenceStatus.APPROVED,
      expiresAt: null,
      tags: ['DPA', 'Stripe', 'GDPR', 'PCI-DSS', 'pagamentos'],
      controlCode: null,
    },
    {
      title: 'Screenshot MFA ativado em sistemas críticos',
      description: 'Capturas de ecrã confirmando ativação de MFA (Duo Security) em core banking, portal de admin, VPN e AWS Console. Data: fevereiro 2026.',
      fileName: 'MFA_Activation_Screenshots_Feb2026.zip',
      fileSize: 2097152,
      mimeType: 'application/zip',
      s3Key: 'evidence/mfa-screenshots-feb2026.zip',
      status: EvidenceStatus.APPROVED,
      expiresAt: new Date('2027-02-28'),
      tags: ['MFA', 'autenticação', 'screenshots', 'segurança'],
      controlCode: 'A.8.5',
    },
    {
      title: 'Lista colaboradores com formação GDPR concluída — Q1 2026',
      description: 'Relatório LMS com lista de 78 colaboradores que completaram o módulo de formação GDPR no Q1 2026. Score médio: 87/100.',
      fileName: 'GDPR_Training_Completion_Q1_2026.xlsx',
      fileSize: 102400,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      s3Key: 'evidence/gdpr-training-q1-2026.xlsx',
      status: EvidenceStatus.APPROVED,
      expiresAt: new Date('2027-03-31'),
      tags: ['formação', 'GDPR', 'LMS', 'colaboradores'],
      controlCode: 'A.6.3',
    },
    {
      title: 'Ata aprovação PSI v2.1 pelo Conselho de Administração',
      description: 'Ata da reunião do Conselho de Administração de 15 de janeiro 2026 com aprovação formal da Política de Segurança da Informação versão 2.1.',
      fileName: 'Ata_CA_PSI_Aprovacao_Jan2026.pdf',
      fileSize: 307200,
      mimeType: 'application/pdf',
      s3Key: 'evidence/ata-ca-psi-jan2026.pdf',
      status: EvidenceStatus.APPROVED,
      expiresAt: null,
      tags: ['PSI', 'CA', 'governança', 'NIS2'],
      controlCode: 'A.5.1',
    },
    {
      title: 'Relatório testes backup — 100% sucesso — Abril 2026',
      description: 'Relatório mensal de testes de recuperação de backup. Teste completo realizado em 12 abril 2026. Recuperação de 847GB em 2h45min. RTO cumprido.',
      fileName: 'Backup_Recovery_Test_Apr2026.pdf',
      fileSize: 204800,
      mimeType: 'application/pdf',
      s3Key: 'evidence/backup-test-apr2026.pdf',
      status: EvidenceStatus.APPROVED,
      expiresAt: new Date('2027-04-30'),
      tags: ['backup', 'recuperação', 'DORA', 'teste'],
      controlCode: null,
    },
    {
      title: 'Inventário ativos críticos — Sistemas de Pagamento',
      description: 'Inventário completo dos ativos TIC que suportam os sistemas de pagamento: 47 servidores, 12 bases de dados, 8 APIs externas, 3 fornecedores críticos.',
      fileName: 'Asset_Inventory_Payment_Systems_2026.xlsx',
      fileSize: 153600,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      s3Key: 'evidence/asset-inventory-payments-2026.xlsx',
      status: EvidenceStatus.APPROVED,
      expiresAt: new Date('2027-01-01'),
      tags: ['inventário', 'ativos', 'DORA', 'pagamentos'],
      controlCode: 'A.5.9',
    },
    {
      title: 'Evidência monitorização contínua — Syslog centralizado',
      description: 'Configuração do SIEM (AWS Security Hub + CloudWatch) com regras de deteção. Logs de maio 2026: 0 alertas críticos, 3 médios resolvidos.',
      fileName: 'SIEM_Monitoring_May2026.pdf',
      fileSize: 409600,
      mimeType: 'application/pdf',
      s3Key: 'evidence/siem-monitoring-may2026.pdf',
      status: EvidenceStatus.APPROVED,
      expiresAt: new Date('2026-12-31'),
      tags: ['SIEM', 'monitorização', 'logs', 'ISO27001'],
      controlCode: 'A.8.16',
    },
    {
      title: 'Ata reunião revisão segurança Conselho — Fevereiro 2026',
      description: 'Ata da Management Review de segurança com o Conselho de Administração. Aprovação do orçamento de cibersegurança e plano de implementação ISO 27001.',
      fileName: 'Management_Review_Feb2026.pdf',
      fileSize: 358400,
      mimeType: 'application/pdf',
      s3Key: 'evidence/management-review-feb2026.pdf',
      status: EvidenceStatus.APPROVED,
      expiresAt: null,
      tags: ['gestão', 'CA', 'ISO27001', 'orçamento'],
      controlCode: null,
    },
    {
      title: 'Scan vulnerabilidades sistema pagamentos — Maio 2026',
      description: 'Relatório de vulnerability scan (Qualys) ao sistema de pagamentos em maio 2026. 0 críticas, 2 altas (remediation em curso), 15 médias.',
      fileName: 'Vuln_Scan_Payment_May2026.pdf',
      fileSize: 819200,
      mimeType: 'application/pdf',
      s3Key: 'evidence/vuln-scan-payments-may2026.pdf',
      status: EvidenceStatus.APPROVED,
      expiresAt: new Date('2026-08-31'),
      tags: ['vulnerabilidades', 'Qualys', 'pagamentos', 'DORA'],
      controlCode: 'A.8.8',
    },
    {
      title: 'ROPA atualizado — Junho 2026',
      description: 'Registo de Atividades de Tratamento (ROPA) atualizado com 23 atividades. Revisão e validação pelo DPO em junho 2026. Conforme GDPR Art.30.',
      fileName: 'ROPA_Jun2026.xlsx',
      fileSize: 204800,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      s3Key: 'evidence/ropa-jun2026.xlsx',
      status: EvidenceStatus.APPROVED,
      expiresAt: new Date('2027-06-30'),
      tags: ['ROPA', 'GDPR', 'DPO', 'Art30'],
      controlCode: null,
    },
  ];

  const createdEvidences: any[] = [];
  for (const e of evidenceItems) {
    const controlId = e.controlCode ? controlMap[e.controlCode] : undefined;
    const evidence = await prisma.evidence.create({
      data: {
        title: e.title,
        description: e.description,
        fileName: e.fileName,
        fileSize: e.fileSize,
        mimeType: e.mimeType,
        s3Key: e.s3Key,
        s3Url: `https://icomply-demo-bucket.s3.eu-west-1.amazonaws.com/${e.s3Key}`,
        status: e.status,
        expiresAt: e.expiresAt,
        tags: e.tags,
        projectId: demoProject.id,
        controlId: controlId || null,
        uploadedById: dpoUser.id,
      },
    });
    createdEvidences.push(evidence);
  }
  console.log(`✓ Evidence created: ${evidenceItems.length}`);

  // ── ROPA (Data Processing Activities) ───────────────────────
  console.log('Seeding ROPA...');
  const ropaActivities = [
    {
      name: 'Onboarding e gestão de clientes',
      purpose: 'Registo, verificação de identidade (KYC) e gestão de conta de clientes da plataforma de pagamentos',
      legalBasis: LegalBasis.CONTRACT,
      dataCategories: ['Dados de identificação', 'Dados de contacto', 'Dados financeiros', 'Documentos de identidade'],
      dataSubjects: ['Clientes', 'Representantes legais'],
      recipients: ['Equipa de operações', 'Equipa de compliance', 'Parceiros KYC (Jumio)'],
      retentionPeriod: '7 anos após cessação do contrato (obrigação legal AML)',
      processorName: 'Jumio',
      processorCountry: 'US',
      internationalTransfers: true,
      transferCountries: ['US'],
      transferSafeguards: 'Cláusulas contratuais padrão (SCCs) aprovadas pela Comissão Europeia',
      dpoConsulted: true,
    },
    {
      name: 'Antifraude e KYC contínuo',
      purpose: 'Monitorização contínua de transações para deteção de fraude, branqueamento de capitais e cumprimento de obrigações AML/KYC',
      legalBasis: LegalBasis.LEGAL_OBLIGATION,
      dataCategories: ['Dados de transações', 'Padrões comportamentais', 'Dados de geolocalização', 'Dados de dispositivo'],
      dataSubjects: ['Clientes'],
      recipients: ['Equipa AML', 'Autoridades reguladoras (BdP, DCIAP)'],
      retentionPeriod: '10 anos (Lei 83/2017 — AML)',
      processorName: null,
      processorCountry: null,
      internationalTransfers: false,
      transferCountries: [],
      transferSafeguards: null,
      dpoConsulted: true,
    },
    {
      name: 'Processamento de pagamentos',
      purpose: 'Processamento, autorização e liquidação de pagamentos por cartão e transferências bancárias',
      legalBasis: LegalBasis.CONTRACT,
      dataCategories: ['Dados de cartão (tokenizados)', 'IBAN', 'Dados de transação', 'Dados do beneficiário'],
      dataSubjects: ['Clientes', 'Beneficiários de pagamentos'],
      recipients: ['Stripe (processador de pagamentos)', 'Redes de cartões (Visa, Mastercard)', 'Banco liquidador'],
      retentionPeriod: '5 anos (PCI-DSS)',
      processorName: 'Stripe',
      processorCountry: 'US',
      internationalTransfers: true,
      transferCountries: ['US', 'IE'],
      transferSafeguards: 'DPA com cláusulas SCCs. Stripe certificado PCI-DSS Level 1.',
      dpoConsulted: true,
    },
    {
      name: 'Marketing e newsletter',
      purpose: 'Envio de comunicações de marketing, newsletters e notificações de produtos para clientes que deram consentimento',
      legalBasis: LegalBasis.CONSENT,
      dataCategories: ['Email', 'Nome', 'Preferências de produto', 'Histórico de interações'],
      dataSubjects: ['Clientes subscritos', 'Prospects'],
      recipients: ['Equipa de marketing', 'Mailchimp (ESP)'],
      retentionPeriod: 'Até retirada de consentimento + 3 meses',
      processorName: 'Mailchimp (Intuit)',
      processorCountry: 'US',
      internationalTransfers: true,
      transferCountries: ['US'],
      transferSafeguards: 'Cláusulas contratuais padrão (SCCs)',
      dpoConsulted: false,
    },
    {
      name: 'Gestão de recursos humanos e dados de colaboradores',
      purpose: 'Gestão do ciclo de vida dos colaboradores: recrutamento, contrato, salários, avaliação, formação e offboarding',
      legalBasis: LegalBasis.CONTRACT,
      dataCategories: ['Dados pessoais', 'NIF/SS', 'Dados bancários (IBAN salários)', 'Dados de saúde (baixas)', 'Avaliações de desempenho'],
      dataSubjects: ['Colaboradores', 'Candidatos'],
      recipients: ['RH', 'Contabilidade', 'BambooHR (HRIS)'],
      retentionPeriod: '5 anos após saída da empresa',
      processorName: 'BambooHR',
      processorCountry: 'US',
      internationalTransfers: true,
      transferCountries: ['US'],
      transferSafeguards: 'DPA com cláusulas SCCs',
      dpoConsulted: true,
    },
  ];

  for (const activity of ropaActivities) {
    await prisma.dataProcessingActivity.create({
      data: {
        name: activity.name,
        purpose: activity.purpose,
        legalBasis: activity.legalBasis,
        dataCategories: activity.dataCategories,
        dataSubjects: activity.dataSubjects,
        recipients: activity.recipients,
        retentionPeriod: activity.retentionPeriod,
        processorName: activity.processorName,
        processorCountry: activity.processorCountry,
        internationalTransfers: activity.internationalTransfers,
        transferCountries: activity.transferCountries,
        transferSafeguards: activity.transferSafeguards,
        dpoConsulted: activity.dpoConsulted,
        technicalMeasures: ['Encriptação TLS 1.3', 'Encriptação em repouso AES-256', 'Controlo de acesso baseado em funções', 'Logging de acessos'],
        organizationalMeasures: ['Política de proteção de dados', 'Formação anual GDPR', 'NDA com colaboradores', 'Procedimento de violação de dados'],
        status: 'ACTIVE' as any,
        organizationId: org.id,
        controllerId: dpoUser.id,
        reviewDate: new Date('2027-01-01'),
      },
    });
  }
  console.log(`✓ ROPA activities created: ${ropaActivities.length}`);

  // ── iGuard Device Agents ─────────────────────────────────────
  console.log('Seeding iGuard devices...');
  const devices = [
    {
      deviceName: 'MacBook Pro — João Silva (IT Director)',
      hostname: 'joao-mbp-m3.local',
      os: 'macos',
      osVersion: '14.5',
      deviceType: 'ENDPOINT',
      status: 'ACTIVE',
      diskEncryption: true,
      screenLock: true,
      antivirusEnabled: true,
      osUpToDate: true,
      passwordManager: true,
      screenLockTimeout: 5,
      complianceScore: 100,
      userId: managerUser.id,
    },
    {
      deviceName: 'ThinkPad X1 Carbon — Maria Santos (DPO)',
      hostname: 'maria-thinkpad.fintech-segura.pt',
      os: 'windows',
      osVersion: '11 Pro 23H2',
      deviceType: 'ENDPOINT',
      status: 'ACTIVE',
      diskEncryption: true,
      screenLock: true,
      antivirusEnabled: true,
      osUpToDate: true,
      passwordManager: true,
      screenLockTimeout: 10,
      complianceScore: 100,
      userId: dpoUser.id,
    },
    {
      deviceName: 'MacBook Air — Carlos Mendes (Dev)',
      hostname: 'carlos-mba.local',
      os: 'macos',
      osVersion: '13.6',
      deviceType: 'ENDPOINT',
      status: 'ACTIVE',
      diskEncryption: true,
      screenLock: false,
      antivirusEnabled: true,
      osUpToDate: false,
      passwordManager: false,
      screenLockTimeout: null,
      complianceScore: 45,
      userId: riskUser.id,
    },
    {
      deviceName: 'Windows Desktop — Sala de Reuniões',
      hostname: 'sala-reunioes-pc.fintech-segura.pt',
      os: 'windows',
      osVersion: '10 Pro 21H2',
      deviceType: 'ENDPOINT',
      status: 'ACTIVE',
      diskEncryption: false,
      screenLock: true,
      antivirusEnabled: true,
      osUpToDate: false,
      passwordManager: null,
      screenLockTimeout: 15,
      complianceScore: 40,
      userId: adminUser.id,
    },
    {
      deviceName: 'Ubuntu Server — CI/CD Pipeline',
      hostname: 'ci-cd-01.internal.fintech-segura.pt',
      os: 'linux',
      osVersion: 'Ubuntu 22.04.3 LTS',
      deviceType: 'SERVER',
      status: 'ACTIVE',
      diskEncryption: true,
      screenLock: null,
      antivirusEnabled: false,
      osUpToDate: true,
      passwordManager: null,
      screenLockTimeout: null,
      sshRootLoginDisabled: true,
      firewallActive: true,
      pendingPatches: 3,
      complianceScore: 60,
      userId: adminUser.id,
    },
  ];

  for (const d of devices) {
    await prisma.deviceAgent.create({
      data: {
        deviceName: d.deviceName,
        hostname: d.hostname,
        os: d.os,
        osVersion: d.osVersion,
        deviceType: d.deviceType as any,
        status: d.status as any,
        diskEncryption: d.diskEncryption,
        screenLock: d.screenLock,
        antivirusEnabled: d.antivirusEnabled,
        osUpToDate: d.osUpToDate,
        passwordManager: d.passwordManager,
        screenLockTimeout: d.screenLockTimeout,
        sshRootLoginDisabled: (d as any).sshRootLoginDisabled ?? null,
        firewallActive: (d as any).firewallActive ?? null,
        pendingPatches: (d as any).pendingPatches ?? null,
        complianceScore: d.complianceScore,
        lastSeenAt: new Date(),
        organizationId: org.id,
        userId: d.userId,
      },
    });
  }
  console.log(`✓ iGuard devices created: ${devices.length}`);

  // ── SoA Controls ─────────────────────────────────────────────
  console.log('Seeding SoA controls...');
  const soaControls = [
    { code: '5.1', theme: 'Organizational Controls', title: 'Políticas de segurança da informação', status: 'IMPLEMENTED' },
    { code: '5.2', theme: 'Organizational Controls', title: 'Funções e responsabilidades', status: 'IMPLEMENTED' },
    { code: '5.7', theme: 'Organizational Controls', title: 'Inteligência de ameaças', status: 'PLANNED' },
    { code: '5.23', theme: 'Organizational Controls', title: 'Segurança de serviços cloud', status: 'PARTIALLY_IMPLEMENTED' },
    { code: '6.3', theme: 'People Controls', title: 'Sensibilização e formação', status: 'PARTIALLY_IMPLEMENTED' },
    { code: '8.1', theme: 'Technological Controls', title: 'Segurança de endpoints', status: 'PARTIALLY_IMPLEMENTED' },
    { code: '8.5', theme: 'Technological Controls', title: 'Autenticação segura (MFA)', status: 'IMPLEMENTED' },
    { code: '8.8', theme: 'Technological Controls', title: 'Gestão de vulnerabilidades', status: 'PARTIALLY_IMPLEMENTED' },
    { code: '8.15', theme: 'Technological Controls', title: 'Logging centralizado', status: 'IMPLEMENTED' },
    { code: '8.24', theme: 'Technological Controls', title: 'Criptografia', status: 'IMPLEMENTED' },
  ];

  for (const soa of soaControls) {
    await prisma.soaControl.upsert({
      where: { organizationId_controlCode: { organizationId: org.id, controlCode: soa.code } },
      update: { status: soa.status as any },
      create: {
        organizationId: org.id,
        controlCode: soa.code,
        theme: soa.theme,
        title: soa.title,
        applicable: true,
        status: soa.status as any,
      },
    });
  }
  console.log(`✓ SoA controls seeded: ${soaControls.length}`);

  // ── Audit Logs (activity) ────────────────────────────────────
  console.log('Seeding activity log...');
  const activityLogs = [
    { action: 'CREATE', entity: 'Policy', userId: managerUser.id, metadata: { title: 'Política de Segurança da Informação v2.1' } },
    { action: 'APPROVE', entity: 'Policy', userId: adminUser.id, metadata: { title: 'Política de Controlo de Acessos v1.3' } },
    { action: 'CREATE', entity: 'Risk', userId: riskUser.id, metadata: { title: 'Violação de dados por ransomware', level: 'CRITICAL' } },
    { action: 'UPDATE', entity: 'Risk', userId: riskUser.id, metadata: { title: 'Falha DORA sistema de pagamentos', change: 'treatment plan added' } },
    { action: 'COMPLETE', entity: 'Task', userId: managerUser.id, metadata: { title: 'Gap analysis ISO 27001:2022' } },
    { action: 'CREATE', entity: 'Audit', userId: managerUser.id, metadata: { title: 'Auditoria Interna ISO 27001 Fase 1' } },
    { action: 'COMPLETE', entity: 'Audit', userId: managerUser.id, metadata: { title: 'Auditoria Interna ISO 27001 Fase 1', score: 65 } },
    { action: 'CREATE', entity: 'Evidence', userId: dpoUser.id, metadata: { title: 'Certificado ISO 27001 AWS 2026' } },
    { action: 'CREATE', entity: 'Capa', userId: adminUser.id, metadata: { title: 'Implementar revisão trimestral de acessos privilegiados' } },
    { action: 'CLOSE', entity: 'Capa', userId: dpoUser.id, metadata: { title: 'Implementar sistema de tracking DSAR' } },
    { action: 'CREATE', entity: 'DataProcessingActivity', userId: dpoUser.id, metadata: { title: 'ROPA — Processamento de pagamentos' } },
    { action: 'CREATE', entity: 'Audit', userId: riskUser.id, metadata: { title: 'Auditoria GDPR Art.5 e Art.32' } },
    { action: 'LOGIN', entity: 'User', userId: adminUser.id, metadata: { email: 'admin@demo.icomply.pt' } },
    { action: 'EXPORT', entity: 'Report', userId: managerUser.id, metadata: { type: 'RISK_REGISTER', format: 'PDF' } },
    { action: 'CREATE', entity: 'Risk', userId: dpoUser.id, metadata: { title: 'Ausência de DPIA sistema análise comportamental' } },
  ];

  for (const log of activityLogs) {
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: log.userId,
        action: log.action,
        entity: log.entity,
        metadata: log.metadata,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`✓ Activity logs created: ${activityLogs.length}`);

  // ── Final Summary ────────────────────────────────────────────
  console.log('\n✅ Seed completed successfully!');
  console.log('\n📋 Demo Credentials:');
  console.log('   Admin:            admin@demo.icomply.pt       / Admin@123456');
  console.log('   DPO:              maria.santos@fintech-segura.pt / Demo@12345');
  console.log('   Risk Officer:     carlos.mendes@fintech-segura.pt / Demo@12345');
  console.log('   Compliance Mgr:   compliance@demo.icomply.pt  / Admin@123456');
  console.log('\n🏢 Organization: Fintech Segura, S.A. (slug: demo-org)');
  console.log('\n📊 Data Summary:');
  console.log('   Risks:     15 (2 Critical, 4 High, 5 Medium, 4 Low)');
  console.log('   Policies:  10 (5 Approved, 2 In Review, 3 Draft)');
  console.log('   Tasks:     20 (7 Done, 6 In Progress, 4 Todo, 3 In Review)');
  console.log('   Audits:    3  (2 Completed, 1 In Progress)');
  console.log('   Evidence:  15 (all Approved)');
  console.log('   CAPA:      4  (3 In Progress, 1 Closed)');
  console.log('   ROPA:      5  activities');
  console.log('   iGuard:    5  devices (2 compliant, 3 non-compliant)');
  console.log('   Controls:  36 ISO 27001 Annex A controls');
  console.log('\n   Compliance Score: ~58% (realistic mid-implementation)');
}

main()
  .catch(e => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
