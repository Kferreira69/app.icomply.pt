export interface HelpSection {
  heading: string;
  text: string;
}

export interface HelpContent {
  title: string;
  description: string;
  sections: HelpSection[];
  tips: string[];
}

export const helpContent: Record<string, HelpContent> = {
  dashboard: {
    title: 'Painel Principal',
    description:
      'O painel principal fornece uma visão geral do estado de conformidade da sua organização. Aqui encontra métricas chave, alertas e atalhos para as áreas mais importantes.',
    sections: [
      {
        heading: 'Score de Conformidade',
        text: 'O anel de score de conformidade mostra a percentagem global de conformidade calculada com base nos controlos ativos, políticas aprovadas e riscos mitigados. Um score acima de 80% indica um bom nível de conformidade.',
      },
      {
        heading: 'KPIs e Alertas',
        text: 'Os cartões de KPI mostram métricas em tempo real como tarefas em atraso, riscos abertos e evidências pendentes. Os alertas de conformidade destacam situações críticas que requerem atenção imediata.',
      },
      {
        heading: 'Atividade Recente',
        text: 'O feed de atividade regista todas as ações realizadas pelos membros da equipa. Utilize-o para acompanhar alterações recentes e manter a rastreabilidade das operações.',
      },
    ],
    tips: [
      'Clique em qualquer KPI para navegar diretamente para a secção correspondente.',
      'Verifique os alertas de conformidade diariamente para não perder prazos críticos.',
      'O score de maturidade mostra a evolução do programa de conformidade por domínio.',
      'Use as ações rápidas para registar novos riscos ou políticas sem sair do painel.',
    ],
  },

  risks: {
    title: 'Gestão de Riscos',
    description:
      'O módulo de riscos permite identificar, avaliar e tratar os riscos da organização. Utilize a matriz de riscos para visualizar a distribuição por probabilidade e impacto.',
    sections: [
      {
        heading: 'Registo e Avaliação',
        text: 'Cada risco é classificado por probabilidade (de Raro a Quase Certo) e impacto (de Negligenciável a Catastrófico). O score inerente resulta da multiplicação destes dois fatores, num máximo de 25 pontos.',
      },
      {
        heading: 'Plano de Tratamento',
        text: 'Após avaliação, defina uma estratégia de tratamento: Mitigar, Aceitar, Transferir ou Evitar. O score residual deve ser registado após a implementação dos controlos, refletindo o risco remanescente.',
      },
      {
        heading: 'Mapa de Calor',
        text: 'A vista de mapa de calor organiza os riscos numa grelha 5×5 por probabilidade e impacto. As células vermelhas indicam riscos críticos que devem ser priorizados imediatamente.',
      },
    ],
    tips: [
      'Riscos com score acima de 20 são considerados Críticos e requerem plano de tratamento imediato.',
      'Utilize a aba "Histórico" para acompanhar a evolução do score de risco ao longo do tempo.',
      'Associe riscos a projetos e tarefas para garantir rastreabilidade completa.',
      'Reveja regularmente os riscos Aceites para verificar se o apetite de risco continua adequado.',
    ],
  },

  projects: {
    title: 'Projetos',
    description:
      'O módulo de projetos organiza o trabalho de conformidade em iniciativas estruturadas com prazos, responsáveis e tarefas associadas.',
    sections: [
      {
        heading: 'Criação e Gestão',
        text: 'Cada projeto define um âmbito, datas de início e fim, e um responsável principal. Os projetos agrupam tarefas relacionadas e permitem acompanhar o progresso global de uma iniciativa de conformidade.',
      },
      {
        heading: 'Acompanhamento de Progresso',
        text: 'O progresso é calculado automaticamente com base no número de tarefas concluídas face ao total. Projetos em atraso são sinalizados para garantir que os prazos são respeitados.',
      },
      {
        heading: 'Colaboração e Responsabilidade',
        text: 'Atribua membros da equipa a projetos específicos para garantir responsabilidade clara. Cada membro pode ver as suas tarefas no painel principal através do widget "O Meu Trabalho".',
      },
    ],
    tips: [
      'Divida projetos grandes em fases com tarefas específicas e prazos realistas.',
      'Associe evidências diretamente a projetos para facilitar auditorias futuras.',
      'Use o Gantt para ter uma visão temporal das iniciativas em curso.',
    ],
  },

  tasks: {
    title: 'Tarefas',
    description:
      'O módulo de tarefas centraliza o trabalho operacional de conformidade. Gerencie tarefas em vista de lista ou quadro Kanban, e acompanhe prazos e responsáveis.',
    sections: [
      {
        heading: 'Vista de Lista e Kanban',
        text: 'Alterne entre a vista de lista para filtrar e ordenar tarefas, e o quadro Kanban para uma visão visual do fluxo de trabalho por estado. O Kanban suporta drag-and-drop para mover tarefas entre colunas.',
      },
      {
        heading: 'Estados e Prioridades',
        text: 'As tarefas passam pelos estados: A Fazer, Em Curso, Em Revisão, Concluída e Cancelada. A prioridade (Baixa a Crítica) define a urgência. Tarefas em atraso são sinalizadas a vermelho automaticamente.',
      },
      {
        heading: 'Painel de Detalhe',
        text: 'Clique no título de uma tarefa para abrir o painel de detalhe, onde pode adicionar comentários, criar subtarefas e consultar o histórico de alterações. Isto facilita a colaboração da equipa.',
      },
    ],
    tips: [
      'Tarefas a vermelho estão em atraso — priorize a sua resolução.',
      'Use o filtro de estado para focar nas tarefas que precisam de atenção imediata.',
      'Adicione comentários nas tarefas para documentar decisões e progresso.',
      'Associe tarefas a projetos para manter a rastreabilidade organizacional.',
    ],
  },

  evidence: {
    title: 'Evidências',
    description:
      'O módulo de evidências centraliza o armazenamento e gestão de documentos que comprovam a conformidade da organização. Faça upload, reveja e aprove evidências para auditorias.',
    sections: [
      {
        heading: 'Upload e Organização',
        text: 'Faça upload de ficheiros PDF, Excel, imagens e outros documentos relevantes. Cada evidência deve ter um título descritivo e pode ser associada a um projeto, tarefa ou controlo específico.',
      },
      {
        heading: 'Processo de Aprovação',
        text: 'As evidências passam pelos estados: Pendente, Aprovada, Rejeitada e Expirada. A aprovação deve ser feita por um utilizador com permissões adequadas, garantindo a qualidade dos documentos.',
      },
      {
        heading: 'Ações em Massa',
        text: 'Selecione múltiplas evidências para aprovar ou rejeitar em bloco. Esta funcionalidade é útil após auditorias quando é necessário processar um grande volume de documentos.',
      },
    ],
    tips: [
      'Aprove evidências regularmente para evitar acumulação de documentos pendentes.',
      'Evidências expiradas devem ser renovadas antes de auditorias.',
      'Use títulos descritivos nos ficheiros para facilitar a pesquisa futura.',
      'Associe cada evidência ao controlo ou tarefa correspondente para rastreabilidade.',
    ],
  },

  reports: {
    title: 'Relatórios',
    description:
      'O módulo de relatórios gera documentação formal de conformidade em PDF e Excel. Configure relatórios automáticos para envio periódico a partes interessadas.',
    sections: [
      {
        heading: 'Geração de Relatórios',
        text: 'Gere relatórios de Resumo de Conformidade, Registo de Riscos, Estado de Tarefas e Gap de Evidências a qualquer momento. Os relatórios ficam disponíveis no histórico para download posterior.',
      },
      {
        heading: 'Agendamento Automático',
        text: 'Configure relatórios automáticos com frequência Diária, Semanal, Mensal ou Trimestral. Adicione destinatários por email para receberem os relatórios automaticamente sem intervenção manual.',
      },
      {
        heading: 'Indicadores Visuais',
        text: 'O painel de relatórios inclui gráficos de conformidade, distribuição de riscos e estado de tarefas. Use estes indicadores para apresentações a gestores e comités de conformidade.',
      },
    ],
    tips: [
      'Configure um relatório mensal de Resumo de Conformidade para a gestão de topo.',
      'O relatório de Gap de Evidências identifica controlos sem documentação suficiente.',
      'Relatórios EXCEL são ideais para análise detalhada e manipulação de dados.',
      'Mantenha o histórico de relatórios como evidência de acompanhamento contínuo.',
    ],
  },

  audits: {
    title: 'Auditorias',
    description:
      'O módulo de auditorias gere o ciclo completo de auditorias internas e externas, desde o planeamento até ao encerramento com as constatações documentadas.',
    sections: [
      {
        heading: 'Planeamento de Auditorias',
        text: 'Crie auditorias com âmbito definido, datas, auditores responsáveis e tipo (interna ou externa). O planeamento adequado garante que todas as áreas críticas são cobertas sistematicamente.',
      },
      {
        heading: 'Constatações e Não-Conformidades',
        text: 'Registe constatações durante a auditoria com nível de severidade (Menor, Maior, Crítica). Cada constatação pode gerar automaticamente uma ação CAPA para resolução e seguimento.',
      },
      {
        heading: 'Encerramento e Evidências',
        text: 'Após conclusão, documente o resultado da auditoria e anexe o relatório final como evidência. O histórico de auditorias demonstra maturidade do programa de conformidade.',
      },
    ],
    tips: [
      'Programe auditorias com antecedência para garantir disponibilidade dos auditores.',
      'Constatações críticas devem gerar CAPAs imediatamente após a auditoria.',
      'Use as evidências associadas à auditoria para suportar certificações externas.',
    ],
  },

  capa: {
    title: 'CAPA — Ações Corretivas e Preventivas',
    description:
      'O módulo CAPA gere ações corretivas e preventivas resultantes de auditorias, não-conformidades e riscos identificados. Garante o encerramento efetivo de problemas.',
    sections: [
      {
        heading: 'Criação de CAPAs',
        text: 'Crie CAPAs com descrição clara da não-conformidade, causa raiz identificada e ações planeadas para resolução. Defina um responsável e prazo de encerramento para garantir accountability.',
      },
      {
        heading: 'Acompanhamento e Verificação',
        text: 'Acompanhe o progresso das CAPAs pelo estado: Aberta, Em Curso, Verificação Pendente e Encerrada. A verificação de eficácia confirma que a ação corretiva resolveu efetivamente o problema.',
      },
      {
        heading: 'Análise de Causa Raiz',
        text: 'Documente a análise de causa raiz para cada CAPA usando metodologias como os 5 Porquês ou Diagrama de Ishikawa. Uma boa análise previne a recorrência do problema.',
      },
    ],
    tips: [
      'CAPAs abertas há mais de 90 dias sem progresso devem ser escaladas.',
      'Verifique a eficácia das ações 30 dias após o encerramento.',
      'Associe CAPAs às auditorias ou riscos de origem para rastreabilidade.',
    ],
  },

  policies: {
    title: 'Políticas',
    description:
      'O módulo de políticas centraliza a gestão do ciclo de vida de políticas, procedimentos e normas internas. Controle versões, aprovações e comunicação às partes interessadas.',
    sections: [
      {
        heading: 'Ciclo de Vida das Políticas',
        text: 'As políticas passam pelos estados: Rascunho, Em Revisão, Aprovada e Expirada. O fluxo de aprovação garante que apenas políticas revistas e autorizadas são comunicadas à organização.',
      },
      {
        heading: 'Versões e Revisões',
        text: 'O sistema mantém o histórico de versões de cada política. A data de revisão define quando a política deve ser reavaliada para garantir que continua adequada e atualizada com a legislação.',
      },
      {
        heading: 'Categorias e Pesquisa',
        text: 'Organize políticas por categoria (Segurança, RGPD, Operacional, etc.) para facilitar a navegação. A pesquisa por título e conteúdo permite localizar rapidamente documentos específicos.',
      },
    ],
    tips: [
      'Reveja políticas pelo menos anualmente ou quando ocorram mudanças regulatórias.',
      'Políticas expiradas devem ser atualizadas antes de auditorias externas.',
      'Comunique aprovações de novas políticas a todos os colaboradores afetados.',
      'Mantenha uma política mestra de segurança da informação sempre atualizada.',
    ],
  },

  vendors: {
    title: 'Fornecedores',
    description:
      'O módulo de fornecedores gere o risco de terceiros e garante que os fornecedores cumprem os requisitos de conformidade e segurança da organização.',
    sections: [
      {
        heading: 'Avaliação de Risco de Terceiros',
        text: 'Classifique fornecedores por nível de risco com base no acesso a dados, criticidade do serviço e historial de conformidade. Fornecedores de alto risco requerem avaliações mais frequentes.',
      },
      {
        heading: 'Contratos e Cláusulas',
        text: 'Registe os contratos com fornecedores e as cláusulas de conformidade, incluindo DPA (Data Processing Agreement) para fornecedores com acesso a dados pessoais ao abrigo do RGPD.',
      },
      {
        heading: 'Monitorização Contínua',
        text: 'Programe avaliações periódicas de conformidade dos fornecedores. Certifique-se de que certificações como ISO 27001 e SOC 2 estão atualizadas e que os contratos são renovados atempadamente.',
      },
    ],
    tips: [
      'Fornecedores críticos devem ser avaliados anualmente no mínimo.',
      'Verifique se todos os fornecedores com acesso a dados têm DPA assinado.',
      'Documente os resultados das avaliações como evidência para auditorias RGPD.',
    ],
  },

  settings: {
    title: 'Configurações',
    description:
      'As configurações permitem personalizar o iComply de acordo com as necessidades da sua organização, gerir utilizadores e configurar integrações.',
    sections: [
      {
        heading: 'Gestão de Utilizadores',
        text: 'Adicione membros da equipa, defina papéis (Administrador, Gestor, Auditor, Visualizador) e gerencie permissões de acesso a cada módulo. Os papéis garantem que cada utilizador acede apenas ao que necessita.',
      },
      {
        heading: 'Perfil da Organização',
        text: 'Configure o nome, logótipo, setor de atividade e frameworks de conformidade aplicáveis (ISO 27001, RGPD, NIS2, etc.). Estas configurações afetam os relatórios e avaliações de diagnóstico.',
      },
      {
        heading: 'Notificações e Integrações',
        text: 'Configure alertas por email para eventos importantes como tarefas em atraso, riscos críticos e políticas expiradas. As integrações permitem sincronizar com outras ferramentas da organização.',
      },
    ],
    tips: [
      'Mantenha pelo menos dois administradores para evitar bloqueios de acesso.',
      'Reveja os acessos de utilizadores quando colaboradores saem da organização.',
      'Configure notificações de prazos com antecedência suficiente para ação.',
    ],
  },

  default: {
    title: 'Ajuda — iComply',
    description:
      'Bem-vindo ao iComply, a plataforma de gestão de conformidade da sua organização. Aqui encontrará ajuda contextual para cada módulo.',
    sections: [
      {
        heading: 'Navegação',
        text: 'Use o menu lateral para navegar entre os diferentes módulos. O painel principal oferece uma visão geral do estado de conformidade. Pode colapsar o menu para ter mais espaço de trabalho.',
      },
      {
        heading: 'Paleta de Comandos',
        text: 'Prima Ctrl+K (ou Cmd+K no Mac) para abrir a paleta de comandos e navegar rapidamente para qualquer secção da aplicação. É a forma mais rápida de aceder a qualquer funcionalidade.',
      },
      {
        heading: 'Suporte',
        text: 'Se encontrar algum problema ou tiver sugestões de melhoria, contacte a nossa equipa de suporte através de suporte@icomply.pt. Respondemos em horário útil, geralmente em menos de 24 horas.',
      },
    ],
    tips: [
      'Use o botão "?" em cada página para obter ajuda específica sobre essa funcionalidade.',
      'A paleta de comandos (Ctrl+K) é a forma mais rápida de navegar na aplicação.',
      'Os relatórios automáticos poupam tempo na comunicação com a gestão.',
    ],
  },
};
