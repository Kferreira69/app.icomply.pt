// ISO 14001:2015 — checklist seeded for every organisation (one row per clause/sub-clause
// that carries a requirement). Titles follow the standard's structure; the descriptions are
// short plain-language summaries of what an auditor expects to see.

export interface EnvRequirementSeed {
  clauseNumber: string;
  title: string;
  description: string;
}

export const ISO14001_REQUIREMENTS: EnvRequirementSeed[] = [
  { clauseNumber: '4.1', title: 'Compreender a organização e o seu contexto', description: 'Determinar as questões externas e internas (clima, legislação, mercado, recursos, cultura) que afetam a capacidade de atingir os resultados pretendidos do sistema de gestão ambiental.' },
  { clauseNumber: '4.2', title: 'Compreender as necessidades e expectativas das partes interessadas', description: 'Identificar as partes interessadas relevantes (clientes, autoridades, comunidade, trabalhadores) e quais das suas necessidades e expectativas se tornam requisitos a cumprir.' },
  { clauseNumber: '4.3', title: 'Determinar o âmbito do sistema de gestão ambiental', description: 'Definir e documentar os limites e a aplicabilidade do sistema (instalações, atividades, produtos e serviços), tendo em conta o contexto e os requisitos a cumprir.' },
  { clauseNumber: '4.4', title: 'Sistema de gestão ambiental', description: 'Estabelecer, implementar, manter e melhorar continuamente o sistema, incluindo os processos necessários e as suas interações.' },
  { clauseNumber: '5.1', title: 'Liderança e compromisso', description: 'A gestão de topo demonstra liderança: assume responsabilidade pela eficácia do sistema, integra-o nos processos de negócio e assegura os recursos necessários.' },
  { clauseNumber: '5.2', title: 'Política ambiental', description: 'Estabelecer, documentar e comunicar a política ambiental, com compromisso de proteção do ambiente (incluindo prevenção da poluição), cumprimento dos requisitos legais e melhoria contínua.' },
  { clauseNumber: '5.3', title: 'Funções, responsabilidades e autoridades', description: 'Atribuir e comunicar as responsabilidades e autoridades relevantes, incluindo quem reporta o desempenho do sistema à gestão de topo.' },
  { clauseNumber: '6.1.1', title: 'Ações para abordar riscos e oportunidades — generalidades', description: 'Determinar os riscos e oportunidades ligados aos aspetos ambientais, aos requisitos a cumprir e ao contexto, e planear ações para os abordar.' },
  { clauseNumber: '6.1.2', title: 'Aspetos ambientais', description: 'Determinar os aspetos ambientais das atividades, produtos e serviços e os impactos associados, numa perspetiva de ciclo de vida, e identificar os aspetos significativos (registo de aspetos e impactos).' },
  { clauseNumber: '6.1.3', title: 'Requisitos legais e outros requisitos', description: 'Identificar e ter acesso aos requisitos legais e outros requisitos aplicáveis aos aspetos ambientais, determinar como se aplicam à organização e mantê-los atualizados.' },
  { clauseNumber: '6.1.4', title: 'Planeamento de ações', description: 'Planear as ações para abordar aspetos significativos, requisitos a cumprir, riscos e oportunidades, e a forma de as integrar e avaliar a sua eficácia.' },
  { clauseNumber: '6.2.1', title: 'Objetivos ambientais', description: 'Estabelecer objetivos ambientais coerentes com a política, mensuráveis (quando praticável), monitorizados, comunicados e atualizados.' },
  { clauseNumber: '6.2.2', title: 'Planeamento de ações para alcançar os objetivos ambientais', description: 'Definir o que será feito, com que recursos, quem é responsável, quando termina e como serão avaliados os resultados, incluindo indicadores.' },
  { clauseNumber: '7.1', title: 'Recursos', description: 'Determinar e disponibilizar os recursos necessários para estabelecer, implementar, manter e melhorar o sistema.' },
  { clauseNumber: '7.2', title: 'Competência', description: 'Determinar a competência necessária das pessoas cujo trabalho afeta o desempenho ambiental, assegurar formação ou outras ações e reter evidência.' },
  { clauseNumber: '7.3', title: 'Consciencialização', description: 'As pessoas que trabalham sob o controlo da organização conhecem a política, os aspetos significativos, o seu contributo e as consequências de não cumprir os requisitos.' },
  { clauseNumber: '7.4', title: 'Comunicação', description: 'Estabelecer os processos de comunicação interna e externa: o que, quando, com quem e como comunicar, respondendo a pedidos das partes interessadas.' },
  { clauseNumber: '7.5', title: 'Informação documentada', description: 'Manter a informação documentada exigida pela norma e a necessária para a eficácia do sistema, com identificação, revisão, aprovação e controlo (ver Gestão Documental).' },
  { clauseNumber: '8.1', title: 'Planeamento e controlo operacionais', description: 'Estabelecer controlos operacionais para os processos associados aos aspetos significativos, considerar o ciclo de vida e controlar processos e serviços subcontratados.' },
  { clauseNumber: '8.2', title: 'Preparação e resposta a emergências', description: 'Identificar potenciais situações de emergência (derrames, incêndios, fugas), preparar a resposta, testá-la periodicamente e rever os planos após ocorrências.' },
  { clauseNumber: '9.1.1', title: 'Monitorização, medição, análise e avaliação — generalidades', description: 'Determinar o que monitorizar e medir (consumos, resíduos, emissões), os métodos, os critérios e quando analisar os resultados; manter equipamento de medição calibrado.' },
  { clauseNumber: '9.1.2', title: 'Avaliação do cumprimento', description: 'Avaliar periodicamente o cumprimento dos requisitos legais e outros requisitos, tomar ações quando necessário e reter evidência dos resultados.' },
  { clauseNumber: '9.2', title: 'Auditoria interna', description: 'Realizar auditorias internas planeadas ao sistema, com programa, critérios e âmbito definidos, auditores objetivos e imparciais, e reportar os resultados à gestão.' },
  { clauseNumber: '9.3', title: 'Revisão pela gestão', description: 'A gestão de topo revê o sistema a intervalos planeados, considerando ações anteriores, alterações, desempenho, cumprimento e oportunidades de melhoria, e regista as decisões.' },
  { clauseNumber: '10.1', title: 'Melhoria — generalidades', description: 'Determinar oportunidades de melhoria e implementar as ações necessárias para atingir os resultados pretendidos do sistema.' },
  { clauseNumber: '10.2', title: 'Não conformidade e ação corretiva', description: 'Reagir às não conformidades, avaliar a necessidade de ações para eliminar as causas, implementá-las, rever a sua eficácia e manter registos.' },
  { clauseNumber: '10.3', title: 'Melhoria contínua', description: 'Melhorar continuamente a adequação, a pertinência e a eficácia do sistema de gestão ambiental para melhorar o desempenho ambiental.' },
];
