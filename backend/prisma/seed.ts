import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ── Demo Organisation ────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo-org',
      industry: 'TECHNOLOGY',
      size: 'MEDIUM',
      country: 'PT',
      plan: 'PROFESSIONAL',
      isActive: true,
    },
  });
  console.log(`✓ Organization: ${org.name}`);

  // ── Admin User ───────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Admin@123456', 12);
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

  // ── Compliance Manager ───────────────────────────────────────
  const managerUser = await prisma.user.upsert({
    where: { email: 'compliance@demo.icomply.pt' },
    update: {},
    create: {
      email: 'compliance@demo.icomply.pt',
      firstName: 'Maria',
      lastName: 'Compliance',
      passwordHash,
      role: UserRole.COMPLIANCE_MANAGER,
      status: UserStatus.ACTIVE,
      organizationId: org.id,
    },
  });
  console.log(`✓ Compliance Manager: ${managerUser.email}`);

  // ── ISO 27001:2022 Framework ─────────────────────────────────
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
  console.log(`✓ Framework: ${iso27001.name}`);

  // ISO 27001 Annexe A Controls (condensed — key controls)
  const iso27001Controls = [
    // 5 – Organizational controls
    { code: 'A.5.1', title: 'Policies for information security', category: '5 - Organizational controls' },
    { code: 'A.5.2', title: 'Information security roles and responsibilities', category: '5 - Organizational controls' },
    { code: 'A.5.3', title: 'Segregation of duties', category: '5 - Organizational controls' },
    { code: 'A.5.7', title: 'Threat intelligence', category: '5 - Organizational controls' },
    { code: 'A.5.9', title: 'Inventory of information and other associated assets', category: '5 - Organizational controls' },
    { code: 'A.5.10', title: 'Acceptable use of information and other associated assets', category: '5 - Organizational controls' },
    { code: 'A.5.15', title: 'Access control', category: '5 - Organizational controls' },
    { code: 'A.5.16', title: 'Identity management', category: '5 - Organizational controls' },
    { code: 'A.5.23', title: 'Information security for use of cloud services', category: '5 - Organizational controls' },
    { code: 'A.5.29', title: 'Information security during disruption', category: '5 - Organizational controls' },
    // 6 – People controls
    { code: 'A.6.1', title: 'Screening', category: '6 - People controls' },
    { code: 'A.6.2', title: 'Terms and conditions of employment', category: '6 - People controls' },
    { code: 'A.6.3', title: 'Information security awareness, education and training', category: '6 - People controls' },
    { code: 'A.6.5', title: 'Responsibilities after termination or change of employment', category: '6 - People controls' },
    { code: 'A.6.8', title: 'Information security event reporting', category: '6 - People controls' },
    // 7 – Physical controls
    { code: 'A.7.1', title: 'Physical security perimeters', category: '7 - Physical controls' },
    { code: 'A.7.2', title: 'Physical entry', category: '7 - Physical controls' },
    { code: 'A.7.4', title: 'Physical security monitoring', category: '7 - Physical controls' },
    { code: 'A.7.8', title: 'Equipment siting and protection', category: '7 - Physical controls' },
    // 8 – Technological controls
    { code: 'A.8.1', title: 'User endpoint devices', category: '8 - Technological controls' },
    { code: 'A.8.2', title: 'Privileged access rights', category: '8 - Technological controls' },
    { code: 'A.8.3', title: 'Information access restriction', category: '8 - Technological controls' },
    { code: 'A.8.5', title: 'Secure authentication', category: '8 - Technological controls' },
    { code: 'A.8.6', title: 'Capacity management', category: '8 - Technological controls' },
    { code: 'A.8.7', title: 'Protection against malware', category: '8 - Technological controls' },
    { code: 'A.8.8', title: 'Management of technical vulnerabilities', category: '8 - Technological controls' },
    { code: 'A.8.12', title: 'Data leakage prevention', category: '8 - Technological controls' },
    { code: 'A.8.15', title: 'Logging', category: '8 - Technological controls' },
    { code: 'A.8.16', title: 'Monitoring activities', category: '8 - Technological controls' },
    { code: 'A.8.20', title: 'Networks security', category: '8 - Technological controls' },
    { code: 'A.8.24', title: 'Use of cryptography', category: '8 - Technological controls' },
    { code: 'A.8.25', title: 'Secure development life cycle', category: '8 - Technological controls' },
    { code: 'A.8.28', title: 'Secure coding', category: '8 - Technological controls' },
    { code: 'A.8.32', title: 'Change management', category: '8 - Technological controls' },
    { code: 'A.8.33', title: 'Test information', category: '8 - Technological controls' },
    { code: 'A.8.34', title: 'Protection of information systems during audit testing', category: '8 - Technological controls' },
  ];

  for (const ctrl of iso27001Controls) {
    await prisma.control.upsert({
      where: { frameworkId_code: { frameworkId: iso27001.id, code: ctrl.code } },
      update: {},
      create: {
        frameworkId: iso27001.id,
        code: ctrl.code,
        title: ctrl.title,
        category: ctrl.category,
        description: `ISO 27001:2022 control ${ctrl.code}: ${ctrl.title}`,
      },
    });
  }
  console.log(`✓ ISO 27001 controls: ${iso27001Controls.length}`);

  // ISO 27001 Requirements (clause-level)
  const iso27001Requirements = [
    { code: 'ISO27001.4', title: 'Context of the organization', description: 'Understanding the organization and its context, needs and expectations of interested parties, scope, ISMS' },
    { code: 'ISO27001.5', title: 'Leadership', description: 'Leadership and commitment, information security policy, organizational roles responsibilities and authorities' },
    { code: 'ISO27001.6', title: 'Planning', description: 'Actions to address risks and opportunities, information security risk assessment and treatment, information security objectives' },
    { code: 'ISO27001.7', title: 'Support', description: 'Resources, competence, awareness, communication, documented information' },
    { code: 'ISO27001.8', title: 'Operation', description: 'Operational planning and control, risk assessment and treatment' },
    { code: 'ISO27001.9', title: 'Performance evaluation', description: 'Monitoring, measurement, analysis and evaluation; internal audit; management review' },
    { code: 'ISO27001.10', title: 'Improvement', description: 'Nonconformity and corrective action; continual improvement' },
  ];

  for (const req of iso27001Requirements) {
    await prisma.requirement.upsert({
      where: { frameworkId_code: { frameworkId: iso27001.id, code: req.code } },
      update: {},
      create: {
        frameworkId: iso27001.id,
        code: req.code,
        title: req.title,
        description: req.description,
        mandatory: true,
      },
    });
  }
  console.log(`✓ ISO 27001 requirements: ${iso27001Requirements.length}`);

  // ── GDPR Framework ───────────────────────────────────────────
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
  console.log(`✓ Framework: ${gdpr.name}`);

  const gdprRequirements = [
    { code: 'GDPR.Art5', title: 'Princípios relativos ao tratamento de dados pessoais', description: 'Licitude, lealdade e transparência; limitação das finalidades; minimização dos dados; exatidão; limitação da conservação; integridade e confidencialidade; responsabilidade' },
    { code: 'GDPR.Art6', title: 'Licitude do tratamento', description: 'Condições para tratamento lícito de dados pessoais incluindo consentimento, contrato, obrigação legal, interesse vital, interesse público, interesse legítimo' },
    { code: 'GDPR.Art7', title: 'Condições aplicáveis ao consentimento', description: 'Requisitos para obtenção e prova de consentimento válido' },
    { code: 'GDPR.Art12', title: 'Informação transparente', description: 'Obrigações de transparência — informação concisa, transparente e inteligível ao titular' },
    { code: 'GDPR.Art13', title: 'Informação a fornecer quando os dados são recolhidos junto do titular', description: 'Aviso de privacidade aquando da recolha direta de dados' },
    { code: 'GDPR.Art14', title: 'Informação quando os dados não são recolhidos junto do titular', description: 'Aviso de privacidade quando dados obtidos de terceiros' },
    { code: 'GDPR.Art15', title: 'Direito de acesso', description: 'Direito do titular a aceder aos seus dados pessoais e informações associadas' },
    { code: 'GDPR.Art16', title: 'Direito de retificação', description: 'Direito a corrigir dados pessoais inexatos' },
    { code: 'GDPR.Art17', title: 'Direito ao apagamento ("direito a ser esquecido")', description: 'Circunstâncias em que o titular pode exigir o apagamento dos seus dados' },
    { code: 'GDPR.Art18', title: 'Direito à limitação do tratamento', description: 'Direito a restringir o tratamento em determinadas circunstâncias' },
    { code: 'GDPR.Art20', title: 'Direito à portabilidade dos dados', description: 'Direito a receber dados em formato estruturado e legível por máquina' },
    { code: 'GDPR.Art21', title: 'Direito de oposição', description: 'Direito a opor-se ao tratamento baseado em interesse legítimo ou para fins de marketing direto' },
    { code: 'GDPR.Art22', title: 'Decisões individuais automatizadas, incluindo definição de perfis', description: 'Proteção contra decisões baseadas exclusivamente em tratamento automatizado' },
    { code: 'GDPR.Art24', title: 'Responsabilidade do responsável pelo tratamento', description: 'Obrigação de implementar medidas técnicas e organizativas adequadas' },
    { code: 'GDPR.Art25', title: 'Proteção de dados desde a conceção e por defeito', description: 'Privacy by design e privacy by default' },
    { code: 'GDPR.Art28', title: 'Subcontratante', description: 'Contratos de subcontratação — DPA obrigatório com subcontratantes' },
    { code: 'GDPR.Art30', title: 'Registo das atividades de tratamento', description: 'Obrigação de manter registo das atividades de tratamento (ROPA)' },
    { code: 'GDPR.Art32', title: 'Segurança do tratamento', description: 'Medidas técnicas e organizativas para garantir segurança adequada ao risco' },
    { code: 'GDPR.Art33', title: 'Notificação de violação de dados à autoridade de controlo', description: 'Notificação à CNPD em 72 horas em caso de violação de dados pessoais' },
    { code: 'GDPR.Art34', title: 'Comunicação de violação de dados ao titular', description: 'Comunicação ao titular quando violação tiver elevada probabilidade de risco' },
    { code: 'GDPR.Art35', title: 'Avaliação de impacto sobre a proteção de dados (AIPD/DPIA)', description: 'Obrigação de DPIA para tratamentos de alto risco' },
    { code: 'GDPR.Art37', title: 'Designação do encarregado da proteção de dados (DPO)', description: 'Obrigação e condições para designação de DPO' },
    { code: 'GDPR.Art44', title: 'Princípio geral das transferências', description: 'Requisitos para transferências de dados para países terceiros' },
  ];

  for (const req of gdprRequirements) {
    await prisma.requirement.upsert({
      where: { frameworkId_code: { frameworkId: gdpr.id, code: req.code } },
      update: {},
      create: {
        frameworkId: gdpr.id,
        code: req.code,
        title: req.title,
        description: req.description,
        mandatory: true,
      },
    });
  }
  console.log(`✓ GDPR requirements: ${gdprRequirements.length}`);

  // ── NIS2 Framework ───────────────────────────────────────────
  const nis2 = await prisma.framework.upsert({
    where: { code: 'NIS2_2022_2555' },
    update: {},
    create: {
      name: 'NIS2 — Diretiva de Segurança de Redes e Sistemas de Informação',
      code: 'NIS2_2022_2555',
      version: '2022/2555',
      description: 'Directive on measures for a high common level of cybersecurity across the Union (NIS2)',
      isActive: true,
    },
  });
  console.log(`✓ Framework: ${nis2.name}`);

  const nis2Requirements = [
    { code: 'NIS2.Art20', title: 'Governo e responsabilidade da gestão de topo', description: 'Obrigações dos órgãos de gestão: aprovação de medidas, supervisão, responsabilização. Formação obrigatória em cibersegurança.' },
    { code: 'NIS2.Art21.1', title: 'Gestão de riscos — Política de segurança', description: 'Políticas de análise de riscos e segurança dos sistemas de informação' },
    { code: 'NIS2.Art21.2a', title: 'Tratamento de incidentes', description: 'Procedimentos de prevenção, deteção, resposta e recuperação de incidentes' },
    { code: 'NIS2.Art21.2b', title: 'Continuidade de negócio e gestão de crises', description: 'Gestão de backups, recuperação de desastres, gestão de crises' },
    { code: 'NIS2.Art21.2c', title: 'Segurança da cadeia de abastecimento', description: 'Segurança nas relações com fornecedores e prestadores de serviços' },
    { code: 'NIS2.Art21.2d', title: 'Segurança na aquisição, desenvolvimento e manutenção', description: 'Segurança no desenvolvimento e manutenção de sistemas incluindo gestão de vulnerabilidades' },
    { code: 'NIS2.Art21.2e', title: 'Eficácia das medidas de gestão de risco', description: 'Políticas e procedimentos para avaliação da eficácia das medidas de gestão de riscos' },
    { code: 'NIS2.Art21.2f', title: 'Formação em segurança', description: 'Práticas básicas de higiene cibernética e formação em cibersegurança' },
    { code: 'NIS2.Art21.2g', title: 'Criptografia', description: 'Políticas e procedimentos relativos à utilização de criptografia e cifragem' },
    { code: 'NIS2.Art21.2h', title: 'Segurança dos recursos humanos e controlo de acessos', description: 'Segurança dos recursos humanos, políticas de controlo de acesso, gestão de ativos' },
    { code: 'NIS2.Art21.2i', title: 'Autenticação multifator', description: 'Utilização de autenticação multifator ou autenticação contínua, comunicações seguras de voz/vídeo/texto' },
    { code: 'NIS2.Art23', title: 'Notificação de incidentes significativos', description: 'Pré-notificação em 24h, notificação completa em 72h, relatório final em 1 mês ao CERT/CNCS' },
    { code: 'NIS2.Art24', title: 'Registo e certificação', description: 'Registo obrigatório de entidades essenciais e importantes' },
    { code: 'NIS2.Art32', title: 'Medidas de supervisão e execução — entidades essenciais', description: 'Auditorias regulares de segurança, auditorias ad hoc, scans de segurança, inspeções' },
    { code: 'NIS2.Art33', title: 'Medidas de supervisão e execução — entidades importantes', description: 'Supervisão ex-post, investigação quando indicação de incumprimento' },
  ];

  for (const req of nis2Requirements) {
    await prisma.requirement.upsert({
      where: { frameworkId_code: { frameworkId: nis2.id, code: req.code } },
      update: {},
      create: {
        frameworkId: nis2.id,
        code: req.code,
        title: req.title,
        description: req.description,
        mandatory: true,
      },
    });
  }
  console.log(`✓ NIS2 requirements: ${nis2Requirements.length}`);

  // ── RGPC (Lei 93/2017 — Proteção de Denunciantes) ───────────
  const rgpc = await prisma.framework.upsert({
    where: { code: 'RGPC_PT_2021' },
    update: {},
    create: {
      name: 'RGPC — Regime Geral de Prevenção da Corrupção',
      code: 'RGPC_PT_2021',
      version: '2021',
      description: 'Regime Geral de Prevenção da Corrupção (Lei n.º 94/2021) — obrigações de compliance anti-corrupção',
      isActive: true,
    },
  });
  console.log(`✓ Framework: ${rgpc.name}`);

  const rgpcRequirements = [
    { code: 'RGPC.1', title: 'Adoção de programa de cumprimento normativo', description: 'Entidades com 50+ trabalhadores ou receita ≥10M€ obrigadas a adotar programa de prevenção de riscos de corrupção' },
    { code: 'RGPC.2', title: 'Mapeamento e avaliação de riscos', description: 'Identificação, avaliação e hierarquização dos riscos de corrupção e infracções conexas' },
    { code: 'RGPC.3', title: 'Código de Conduta', description: 'Elaboração e publicação de código de conduta com regras sobre conflitos de interesse, uso de recursos, presentes e hospitalidade' },
    { code: 'RGPC.4', title: 'Canal de denúncia interno', description: 'Implementação de canal de denúncia interno acessível a trabalhadores e terceiros, com garantia de confidencialidade e proteção do denunciante' },
    { code: 'RGPC.5', title: 'Responsável pelo cumprimento normativo', description: 'Designação de responsável pelo cumprimento normativo (Compliance Officer) com autonomia e recursos adequados' },
    { code: 'RGPC.6', title: 'Formação e sensibilização', description: 'Programa de formação regular para trabalhadores sobre prevenção de corrupção e código de conduta' },
    { code: 'RGPC.7', title: 'Due diligence de terceiros', description: 'Procedimentos de avaliação de integridade de parceiros, fornecedores e outros terceiros relevantes' },
    { code: 'RGPC.8', title: 'Controlo de conflitos de interesse', description: 'Identificação, declaração e gestão de situações de conflito de interesse' },
    { code: 'RGPC.9', title: 'Registo e rastreabilidade', description: 'Registo documentado de ocorrências, investigações e medidas adotadas' },
    { code: 'RGPC.10', title: 'Comunicação ao MENAC', description: 'Envio de relatório anual ao Mecanismo Nacional Anticorrupção (MENAC)' },
    { code: 'RGPC.11', title: 'Auditoria e revisão do programa', description: 'Revisão periódica (mínimo anual) do programa de cumprimento e adequação face a novos riscos' },
  ];

  for (const req of rgpcRequirements) {
    await prisma.requirement.upsert({
      where: { frameworkId_code: { frameworkId: rgpc.id, code: req.code } },
      update: {},
      create: {
        frameworkId: rgpc.id,
        code: req.code,
        title: req.title,
        description: req.description,
        mandatory: true,
      },
    });
  }
  console.log(`✓ RGPC requirements: ${rgpcRequirements.length}`);

  // ── DORA Framework ───────────────────────────────────────────
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
  console.log(`✓ Framework: ${dora.name}`);

  const doraRequirements = [
    // ICT Risk Management (Art. 5–16)
    { code: 'DORA.Art5', title: 'Quadro de gestão de riscos TIC — Governação', description: 'O órgão de gestão define, aprova e supervisiona o quadro de gestão de riscos TIC. Responsabilidade máxima pela resiliência operacional digital.' },
    { code: 'DORA.Art6', title: 'Quadro de gestão de riscos TIC — Componentes', description: 'Estratégias, políticas, procedimentos, protocolos e ferramentas para proteger ativos de informação e TIC contra riscos.' },
    { code: 'DORA.Art7', title: 'Sistemas, protocolos e ferramentas TIC', description: 'Gestão de ativos TIC; inventário atualizado de hardware, software e serviços cloud; avaliação contínua de riscos.' },
    { code: 'DORA.Art8', title: 'Identificação de riscos', description: 'Identificação, classificação e documentação de funções críticas ou importantes e ativos TIC de suporte.' },
    { code: 'DORA.Art9', title: 'Proteção e prevenção', description: 'Políticas de segurança da informação; controlos de acesso, autenticação forte, encriptação, gestão de patches e vulnerabilidades.' },
    { code: 'DORA.Art10', title: 'Deteção', description: 'Mecanismos de deteção de atividades anómalas, indicadores de comprometimento e alertas automáticos.' },
    { code: 'DORA.Art11', title: 'Resposta e recuperação', description: 'Planos de resposta a incidentes TIC e de recuperação com RTO e RPO definidos; testes periódicos.' },
    { code: 'DORA.Art12', title: 'Políticas de backup e recuperação', description: 'Políticas de backup, restauro e recuperação. Testes de recuperação no mínimo anualmente.' },
    { code: 'DORA.Art13', title: 'Aprendizagem e evolução', description: 'Revisão pós-incidente, integração de lições aprendidas, atualização do quadro de risco TIC.' },
    { code: 'DORA.Art14', title: 'Comunicação', description: 'Planos de crise e comunicação interna e externa para incidentes TIC de impacto relevante.' },
    // ICT Incident Management (Art. 17–23)
    { code: 'DORA.Art17', title: 'Gestão de incidentes TIC', description: 'Processo de gestão de incidentes TIC: deteção, classificação, priorização, resolução e comunicação.' },
    { code: 'DORA.Art18', title: 'Classificação de incidentes TIC', description: 'Classificação de incidentes e ciber-ameaças com base em critérios: clientes afetados, duração, impacto financeiro, reputacional e geográfico.' },
    { code: 'DORA.Art19', title: 'Reporte de incidentes TIC graves', description: 'Notificação à autoridade competente: pré-notificação ≤4h, notificação inicial ≤24h, relatório final ≤1 mês.' },
    { code: 'DORA.Art20', title: 'Harmonização de reporte', description: 'Conteúdo normalizado e taxonomia comum de incidentes conforme normas técnicas da EBA/ESMA/EIOPA.' },
    // Resilience Testing (Art. 24–27)
    { code: 'DORA.Art24', title: 'Programa geral de testes de resiliência operacional digital', description: 'Testes anuais de ferramentas, sistemas e processos TIC: testes de vulnerabilidade, análise de lacunas, testes de rede e segurança.' },
    { code: 'DORA.Art25', title: 'Testes avançados — TLPT', description: 'Threat-Led Penetration Testing (TLPT) para entidades identificadas. Âmbito baseado em funções críticas. Realizado por testadores externos certificados.' },
    { code: 'DORA.Art26', title: 'Requisitos para testadores TLPT', description: 'Qualificações, independência e metodologia dos testadores; aprovação prévia da autoridade competente.' },
    // ICT Third-Party Risk (Art. 28–44)
    { code: 'DORA.Art28', title: 'Princípios gerais de risco de terceiros TIC', description: 'Estratégia de risco de terceiros TIC; registo de acordos contratuais; avaliação de concentração; proporcionalidade.' },
    { code: 'DORA.Art29', title: 'Due diligence preliminar', description: 'Avaliação prévia de fornecedores TIC em funções críticas: solvabilidade, qualidade, segurança, subcontratação, localização de dados.' },
    { code: 'DORA.Art30', title: 'Cláusulas contratuais chave', description: 'Cláusulas obrigatórias: SLAs, auditoria, portabilidade de dados, planos de saída, segurança da informação, continuidade de negócio.' },
    { code: 'DORA.Art31', title: 'Fornecedores TIC críticos', description: 'Designação de fornecedores TIC terceiros críticos (CTPP); supervisão directa pelas ESAs (EBA, ESMA, EIOPA).' },
    // Information Sharing (Art. 45)
    { code: 'DORA.Art45', title: 'Partilha de informação sobre ciber-ameaças', description: 'Participação voluntária em acordos de partilha de informação sobre ciber-ameaças, táticas, técnicas e procedimentos (TTP). Regras de confidencialidade.' },
  ];

  for (const req of doraRequirements) {
    await prisma.requirement.upsert({
      where: { frameworkId_code: { frameworkId: dora.id, code: req.code } },
      update: {},
      create: {
        frameworkId: dora.id,
        code: req.code,
        title: req.title,
        description: req.description,
        mandatory: true,
      },
    });
  }
  console.log(`✓ DORA requirements: ${doraRequirements.length}`);

  // ── EU Pay Transparency Directive ────────────────────────────
  const payTransparency = await prisma.framework.upsert({
    where: { code: 'EU_PAY_TRANSPARENCY_2023_970' },
    update: {},
    create: {
      name: 'Diretiva Transparência Salarial (UE) 2023/970',
      code: 'EU_PAY_TRANSPARENCY_2023_970',
      version: '2023/970',
      description: 'Diretiva (UE) 2023/970 para reforçar a aplicação do princípio da igualdade de remuneração entre homens e mulheres',
      isActive: true,
    },
  });
  console.log(`✓ Framework: ${payTransparency.name}`);

  const payTransparencyRequirements = [
    // Pre-employment transparency
    { code: 'PAYT.Art5', title: 'Transparência salarial antes do emprego', description: 'Os empregadores devem indicar a remuneração inicial ou a respetiva gama no anúncio ou antes da entrevista. Proibição de perguntar sobre histórico salarial.' },
    { code: 'PAYT.Art6', title: 'Transparência sobre desenvolvimento da remuneração', description: 'Critérios de progressão salarial e de carreira devem ser objetivos, género-neutros e acessíveis aos trabalhadores.' },
    // Right to information
    { code: 'PAYT.Art7', title: 'Direito à informação sobre remuneração', description: 'Trabalhadores têm direito a solicitar informação sobre o nível de remuneração individual e médio por categoria de trabalhadores que exercem trabalho igual ou de valor igual, desagregada por sexo.' },
    { code: 'PAYT.Art8', title: 'Prazo de resposta ao pedido de informação', description: 'Resposta em prazo razoável (máx. 2 meses). Empregadores com ≤ 50 trabalhadores podem reduzir frequência de reporte.' },
    // Pay gap reporting
    { code: 'PAYT.Art9', title: 'Reporte da diferença de remuneração', description: 'Empregadores com ≥ 100 trabalhadores reportam anualmente: diferença de remuneração por sexo, percentagem de trabalhadoras e trabalhadores em cada quartil salarial, diferença em componentes variáveis.' },
    { code: 'PAYT.Art9b', title: 'Limiares de reporte por dimensão', description: 'Empregadores 100-149 trabalhadores: cada 3 anos. 150-249: cada 3 anos (2027). 250+: anualmente a partir de 2026. Publicação em website ou entidade designada.' },
    // Joint pay assessment
    { code: 'PAYT.Art10', title: 'Avaliação conjunta das remunerações', description: 'Quando reporte revelar diferença de ≥5% não justificada por fatores neutros, o empregador realiza avaliação conjunta com representantes dos trabalhadores para identificar e corrigir discriminação.' },
    // Equal pay for equal work
    { code: 'PAYT.Art4', title: 'Trabalho de igual valor — critérios', description: 'Sistemas de classificação e avaliação de funções baseados em critérios objetivos e género-neutros: competências, esforço, responsabilidade, condições de trabalho. Revisão regular.' },
    // Enforcement
    { code: 'PAYT.Art16', title: 'Direito à reparação', description: 'Trabalhadores vítimas de discriminação salarial têm direito a indemnização por danos incluindo remunerações em falta, bónus e benefícios perdidos e danos não materiais.' },
    { code: 'PAYT.Art17', title: 'Sanções — coimas', description: 'Estados-membros asseguram sanções efetivas, proporcionadas e dissuasoras — coimas mínimas obrigatórias para incumprimento. Portugal transpõe até 7 de junho de 2026.' },
    { code: 'PAYT.Art18', title: 'Ónus da prova invertido', description: 'Em litígio, presume-se que houve violação do princípio da igualdade de remuneração. Cabe ao empregador provar a ausência de discriminação direta ou indireta.' },
    { code: 'PAYT.Art19', title: 'Autoridade de fiscalização', description: 'Designação de autoridade nacional competente (ACT em Portugal). Cooperação entre organismos de igualdade, inspeções de trabalho e autoridades de proteção de dados.' },
  ];

  for (const req of payTransparencyRequirements) {
    await prisma.requirement.upsert({
      where: { frameworkId_code: { frameworkId: payTransparency.id, code: req.code } },
      update: {},
      create: {
        frameworkId: payTransparency.id,
        code: req.code,
        title: req.title,
        description: req.description,
        mandatory: true,
      },
    });
  }
  console.log(`✓ Pay Transparency requirements: ${payTransparencyRequirements.length}`);

  // ── ISO 9001:2015 Framework ──────────────────────────────────
  const iso9001 = await prisma.framework.upsert({
    where: { code: 'ISO_9001_2015' },
    update: {},
    create: {
      name: 'ISO 9001:2015',
      code: 'ISO_9001_2015',
      version: '2015',
      description: 'Quality management systems — Requirements',
      isActive: true,
    },
  });
  console.log(`✓ Framework: ${iso9001.name}`);

  const iso9001Requirements = [
    { code: 'ISO9001.4', title: 'Contexto da organização', description: 'Contexto, partes interessadas, âmbito do SGQ, sistema de gestão da qualidade' },
    { code: 'ISO9001.5', title: 'Liderança', description: 'Liderança e compromisso, política da qualidade, funções responsabilidades e autoridades' },
    { code: 'ISO9001.6', title: 'Planeamento', description: 'Riscos e oportunidades, objetivos da qualidade, planeamento de alterações' },
    { code: 'ISO9001.7', title: 'Suporte', description: 'Recursos, competência, consciencialização, comunicação, informação documentada' },
    { code: 'ISO9001.8', title: 'Operacionalização', description: 'Planeamento e controlo operacional, requisitos para produtos/serviços, design, controlo externo, produção/prestação' },
    { code: 'ISO9001.9', title: 'Avaliação do desempenho', description: 'Monitorização, medição, análise e avaliação; auditoria interna; revisão pela gestão' },
    { code: 'ISO9001.10', title: 'Melhoria', description: 'Não conformidades e ações corretivas; melhoria contínua' },
  ];

  for (const req of iso9001Requirements) {
    await prisma.requirement.upsert({
      where: { frameworkId_code: { frameworkId: iso9001.id, code: req.code } },
      update: {},
      create: {
        frameworkId: iso9001.id,
        code: req.code,
        title: req.title,
        description: req.description,
        mandatory: true,
      },
    });
  }
  console.log(`✓ ISO 9001 requirements: ${iso9001Requirements.length}`);

  // ── Diagnostic Questions ─────────────────────────────────────
  const questions = [
    // GDPR
    { code: 'DQ_GDPR_01', question: 'A sua organização recolhe, trata ou armazena dados pessoais de cidadãos europeus?', type: 'BOOLEAN', category: 'GDPR', sortOrder: 1 },
    { code: 'DQ_GDPR_02', question: 'Mantém um Registo de Atividades de Tratamento (ROPA) atualizado?', type: 'BOOLEAN', category: 'GDPR', sortOrder: 2 },
    { code: 'DQ_GDPR_03', question: 'Possui procedimentos para responder a pedidos de direitos dos titulares (acesso, retificação, apagamento) no prazo de 30 dias?', type: 'BOOLEAN', category: 'GDPR', sortOrder: 3 },
    { code: 'DQ_GDPR_04', question: 'Qual o volume de dados pessoais que a sua organização trata?', type: 'SINGLE_CHOICE', category: 'GDPR', sortOrder: 4, options: ['Menos de 1.000 titulares', '1.000 – 10.000 titulares', '10.000 – 100.000 titulares', 'Mais de 100.000 titulares'] },
    { code: 'DQ_GDPR_05', question: 'Tem procedimentos documentados para notificação de violações de dados em 72h à CNPD?', type: 'BOOLEAN', category: 'GDPR', sortOrder: 5 },
    // ISO 27001
    { code: 'DQ_ISO27001_01', question: 'A sua organização tem uma política de segurança de informação formalmente aprovada pela gestão de topo?', type: 'BOOLEAN', category: 'ISO_27001', sortOrder: 10 },
    { code: 'DQ_ISO27001_02', question: 'Realiza avaliações de risco de segurança de informação de forma regular (mínimo anual)?', type: 'BOOLEAN', category: 'ISO_27001', sortOrder: 11 },
    { code: 'DQ_ISO27001_03', question: 'Tem controlos de acesso implementados com base no princípio do menor privilégio?', type: 'BOOLEAN', category: 'ISO_27001', sortOrder: 12 },
    { code: 'DQ_ISO27001_04', question: 'Qual o nível de maturidade atual da segurança de informação na sua organização?', type: 'SINGLE_CHOICE', category: 'ISO_27001', sortOrder: 13, options: ['Inicial (ad-hoc, sem processos formais)', 'Repetível (alguns processos definidos)', 'Definido (processos documentados)', 'Gerido (medido e controlado)', 'Otimizado (melhoria contínua)'] },
    { code: 'DQ_ISO27001_05', question: 'Realiza auditorias internas ao SGSI?', type: 'BOOLEAN', category: 'ISO_27001', sortOrder: 14 },
    // NIS2
    { code: 'DQ_NIS2_01', question: 'A sua organização é considerada uma entidade essencial ou importante nos termos da Diretiva NIS2?', type: 'BOOLEAN', category: 'NIS2', sortOrder: 20 },
    { code: 'DQ_NIS2_02', question: 'Tem um plano de resposta a incidentes de cibersegurança documentado e testado?', type: 'BOOLEAN', category: 'NIS2', sortOrder: 21 },
    { code: 'DQ_NIS2_03', question: 'Os membros do órgão de gestão receberam formação em cibersegurança no último ano?', type: 'BOOLEAN', category: 'NIS2', sortOrder: 22 },
    { code: 'DQ_NIS2_04', question: 'Tem procedimentos para notificar o CNCS de incidentes significativos em 24 horas?', type: 'BOOLEAN', category: 'NIS2', sortOrder: 23 },
    // RGPC
    { code: 'DQ_RGPC_01', question: 'A sua organização emprega 50 ou mais trabalhadores, ou tem receita anual igual ou superior a 10 milhões de euros?', type: 'BOOLEAN', category: 'RGPC', sortOrder: 30 },
    { code: 'DQ_RGPC_02', question: 'Tem um Código de Conduta aprovado e comunicado a todos os colaboradores?', type: 'BOOLEAN', category: 'RGPC', sortOrder: 31 },
    { code: 'DQ_RGPC_03', question: 'Possui um canal de denúncia interno (whistleblowing) em funcionamento?', type: 'BOOLEAN', category: 'RGPC', sortOrder: 32 },
    // DORA
    { code: 'DQ_DORA_01', question: 'A sua organização pertence ao setor financeiro (banca, seguros, gestão de ativos, prestadores de serviços de pagamento, etc.)?', type: 'BOOLEAN', category: 'DORA', sortOrder: 35 },
    { code: 'DQ_DORA_02', question: 'Tem um quadro formal de gestão de riscos TIC documentado e aprovado pelo órgão de gestão?', type: 'BOOLEAN', category: 'DORA', sortOrder: 36 },
    { code: 'DQ_DORA_03', question: 'Realiza testes de resiliência operacional digital (incluindo testes de penetração) com que frequência?', type: 'SINGLE_CHOICE', category: 'DORA', sortOrder: 37, options: ['Nunca realizámos', 'Pontualmente / sem calendário', 'Anualmente', 'Semestralmente ou com maior frequência'] },
    { code: 'DQ_DORA_04', question: 'Tem procedimentos documentados para notificação de incidentes TIC graves às autoridades competentes (EBA/Banco de Portugal) nos prazos DORA (≤24h)?', type: 'BOOLEAN', category: 'DORA', sortOrder: 38 },
    { code: 'DQ_DORA_05', question: 'Avalia e monitoriza os riscos TIC dos seus fornecedores críticos de tecnologia (cloud, core banking, etc.)?', type: 'BOOLEAN', category: 'DORA', sortOrder: 39 },
    // Pay Transparency
    { code: 'DQ_PAYT_01', question: 'A sua organização tem 100 ou mais trabalhadores?', type: 'BOOLEAN', category: 'PAY_TRANSPARENCY', sortOrder: 45 },
    { code: 'DQ_PAYT_02', question: 'Os seus anúncios de emprego indicam a remuneração ou gama salarial prevista para a função?', type: 'BOOLEAN', category: 'PAY_TRANSPARENCY', sortOrder: 46 },
    { code: 'DQ_PAYT_03', question: 'A sua organização calcula e monitoriza a diferença de remuneração entre géneros?', type: 'BOOLEAN', category: 'PAY_TRANSPARENCY', sortOrder: 47 },
    { code: 'DQ_PAYT_04', question: 'Tem sistemas de classificação e avaliação de funções baseados em critérios objetivos e género-neutros?', type: 'BOOLEAN', category: 'PAY_TRANSPARENCY', sortOrder: 48 },
    // ISO 9001
    { code: 'DQ_ISO9001_01', question: 'A sua organização tem um Sistema de Gestão da Qualidade (SGQ) implementado?', type: 'BOOLEAN', category: 'ISO_9001', sortOrder: 60 },
    { code: 'DQ_ISO9001_02', question: 'Realiza auditorias internas ao SGQ com regularidade?', type: 'BOOLEAN', category: 'ISO_9001', sortOrder: 61 },
    // General
    { code: 'DQ_GEN_01', question: 'Qual o setor de atividade principal da sua organização?', type: 'SINGLE_CHOICE', category: 'GENERAL', sortOrder: 70, options: ['Tecnologia / Software', 'Serviços Financeiros / Seguros', 'Saúde / Farmacêutico', 'Indústria / Manufatura', 'Retalho / E-commerce', 'Energia / Utilities', 'Telecomunicações', 'Setor Público', 'Educação', 'Outro'] },
    { code: 'DQ_GEN_02', question: 'Qual a dimensão da sua organização?', type: 'SINGLE_CHOICE', category: 'GENERAL', sortOrder: 71, options: ['Micro (< 10 colaboradores)', 'Pequena (10–49)', 'Média (50–249)', 'Grande (250–999)', 'Enterprise (≥ 1000)'] },
    { code: 'DQ_GEN_03', question: 'Quais as principais preocupações de compliance da sua organização? (descreva brevemente)', type: 'TEXT', category: 'GENERAL', sortOrder: 72 },
  ];

  for (const q of questions) {
    const { options, ...qData } = q as any;
    await prisma.diagnosticQuestion.upsert({
      where: { code: q.code },
      update: {},
      create: {
        ...qData,
        options: options || [],
        isActive: true,
      },
    });
  }
  console.log(`✓ Diagnostic questions: ${questions.length}`);

  // ── Demo Project ─────────────────────────────────────────────
  const demoProject = await prisma.project.upsert({
    where: { id: 'demo-project-001' },
    update: {},
    create: {
      id: 'demo-project-001',
      name: 'Implementação GDPR 2025',
      description: 'Projeto de adequação ao Regulamento Geral de Proteção de Dados',
      status: 'ACTIVE' as any,
      frameworkId: gdpr.id,
      organizationId: org.id,
      targetDate: new Date('2025-12-31'),
      complianceScore: 42,
    },
  });
  console.log(`✓ Demo project: ${demoProject.name}`);

  // Demo Tasks
  const demoTasks = [
    { title: 'Elaborar Registo de Atividades de Tratamento (ROPA)', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: new Date('2025-07-31') },
    { title: 'Rever e atualizar Aviso de Privacidade do website', status: 'TODO', priority: 'HIGH', dueDate: new Date('2025-08-15') },
    { title: 'Implementar canal de exercício de direitos dos titulares', status: 'TODO', priority: 'MEDIUM', dueDate: new Date('2025-09-30') },
    { title: 'Celebrar DPA com todos os subcontratantes', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: new Date('2025-07-15') },
    { title: 'Realizar DPIA para sistema de análise de comportamento', status: 'TODO', priority: 'CRITICAL', dueDate: new Date('2025-08-31') },
    { title: 'Formação GDPR para toda a equipa', status: 'DONE', priority: 'MEDIUM', dueDate: new Date('2025-06-30') },
    { title: 'Designar/rever papel do DPO', status: 'DONE', priority: 'HIGH', dueDate: new Date('2025-05-31') },
    { title: 'Implementar procedimento de notificação de violações de dados', status: 'IN_REVIEW', priority: 'HIGH', dueDate: new Date('2025-07-30') },
  ];

  for (const task of demoTasks) {
    await prisma.task.create({
      data: {
        ...task,
        status: task.status as any,
        priority: task.priority as any,
        projectId: demoProject.id,
        createdById: adminUser.id,
        assigneeId: managerUser.id,
      },
    });
  }
  console.log(`✓ Demo tasks: ${demoTasks.length}`);

  // Likelihood/Impact enum mapping (score → enum)
  const likelihoodMap: Record<number, string> = { 1: 'RARE', 2: 'UNLIKELY', 3: 'POSSIBLE', 4: 'LIKELY', 5: 'ALMOST_CERTAIN' };
  const impactMap: Record<number, string> = { 1: 'NEGLIGIBLE', 2: 'MINOR', 3: 'MODERATE', 4: 'MAJOR', 5: 'CATASTROPHIC' };

  // Demo Risks
  const demoRisks = [
    { title: 'Violação de dados pessoais por acesso não autorizado', category: 'Segurança', likelihoodNum: 3, impactNum: 5 },
    { title: 'Incumprimento de pedido de apagamento de dados em prazo legal', category: 'Legal', likelihoodNum: 2, impactNum: 4 },
    { title: 'Transferência ilícita de dados para países terceiros', category: 'Legal', likelihoodNum: 2, impactNum: 5 },
    { title: 'Subcontratante sem DPA adequado a tratar dados pessoais', category: 'Fornecedores', likelihoodNum: 3, impactNum: 4 },
    { title: 'Falta de consentimento válido para marketing direto', category: 'Marketing', likelihoodNum: 4, impactNum: 3 },
  ];

  for (const risk of demoRisks) {
    const inherentScore = risk.likelihoodNum * risk.impactNum;
    await prisma.risk.create({
      data: {
        title: risk.title,
        category: risk.category,
        likelihood: likelihoodMap[risk.likelihoodNum] as any,
        impact: impactMap[risk.impactNum] as any,
        inherentScore,
        status: 'IDENTIFIED' as any,
        projectId: demoProject.id,
        organizationId: org.id,
        ownerId: adminUser.id,
      },
    });
  }
  console.log(`✓ Demo risks: ${demoRisks.length}`);

  console.log('\n✅ Seed completed successfully!');
  console.log('\n📋 Demo Credentials:');
  console.log('   Admin:              admin@demo.icomply.pt / Admin@123456');
  console.log('   Compliance Manager: compliance@demo.icomply.pt / Admin@123456');
}

main()
  .catch(e => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
