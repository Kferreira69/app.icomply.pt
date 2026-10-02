// Help-centre content (FAQ + knowledge-base articles) — shared by the Help page and the global search.
import {
AlertTriangle, BarChart3, CheckCircle2, Database, FileText, Globe, Laptop, Recycle, Settings, Target
 } from 'lucide-react';

// ── FAQ ───────────────────────────────────────────────────────
export const FAQ = [
  {
    q: 'Como começo a usar o iComply?',
    a: 'Acede a Diagnóstico → preenche o questionário de maturidade → o sistema gera automaticamente um plano de acção com tarefas prioritárias.',
  },
  {
    q: 'Como adiciono utilizadores à minha organização?',
    a: 'Vai a Definições → Utilizadores → Convidar utilizador. O convite é enviado por email com instruções de acesso.',
  },
  {
    q: 'O que é o iGuard?',
    a: 'iGuard é o agente de conformidade de dispositivos. Monitoriza endpoints e servidores em tempo real, verificando encriptação, antivírus, actualizações e firewall.',
  },
  {
    q: 'Como exporto relatórios para a administração?',
    a: 'Em Relatórios → Board Reports podes gerar PDFs executivos com o score de conformidade, riscos e progresso por framework.',
  },
  {
    q: 'Os meus dados estão seguros?',
    a: 'Sim. Todos os dados são armazenados em servidores na União Europeia, com encriptação em repouso e em trânsito (TLS 1.3). O iComply é conforme com o RGPD.',
  },
  {
    q: 'Posso usar o iComply para múltiplas empresas?',
    a: 'Sim. O iComply suporta multi-tenant — cada organização tem os seus dados completamente isolados.',
  },
  {
    q: 'Como funciona o mapa de riscos?',
    a: 'O mapa de riscos 5×5 cruza Probabilidade × Impacto de cada risco registado. Os riscos críticos (vermelho) requerem plano de tratamento imediato.',
  },
  {
    q: 'Posso personalizar os frameworks de conformidade?',
    a: 'Sim. O iComply suporta ISO 27001, NIS2, RGPD, SOC2 e frameworks personalizados. Contacta o suporte para configurar frameworks específicos do teu sector.',
  },
  {
    q: 'O iComply cobre a ISO 14001 (gestão ambiental)?',
    a: 'Sim, dentro do domínio ESG & Sustentabilidade. O módulo ISO 14001 (Gestão Ambiental) inclui a checklist das cláusulas 4 a 10, o registo de aspetos e impactos ambientais com avaliação de significância, os objetivos e metas ambientais e o registo de requisitos legais com avaliação do cumprimento. Os documentos (manual, procedimentos, registos) guardam-se na Gestão Documental.',
  },
  {
    q: 'Onde guardo o Manual da Qualidade e os procedimentos?',
    a: 'Na Gestão Documental (menu Gerir → Políticas & Relatórios): escolhe a norma (por exemplo, ISO 9001), a cláusula e carrega o ficheiro Word ou PDF. Cada documento tem versões e fluxo de aprovação.',
  },
];

// ── Knowledge Base ────────────────────────────────────────────
export const KB_CATEGORIES = [
  {
    id: 'primeiros-passos',
    label: 'Primeiros Passos',
    icon: Target,
    color: 'bg-blue-100 text-blue-700',
    articles: [
      {
        title: 'Como criar a minha conta e configurar a organização',
        body: 'Após registares a tua conta, acede a Definições → Organização e preenche o nome, setor de atividade, número de colaboradores e país. Estes dados são usados para personalizar os frameworks de conformidade sugeridos e o score no Trust Center público.',
      },
      {
        title: 'Qual é o primeiro passo depois de entrar no iComply?',
        body: 'Recomendamos começar pelo Diagnóstico Rápido (menu lateral). O questionário de maturidade demora ~15 minutos e gera automaticamente: um score de conformidade inicial, um plano de ação com tarefas prioritárias, e uma lista de lacunas por framework (ISO 27001, GDPR, NIS2).',
      },
      {
        title: 'Como convidar colaboradores e definir permissões',
        body: 'Vai a Definições → Utilizadores → Convidar utilizador. Podes atribuir os seguintes papéis:\n• Admin — acesso total, gestão de utilizadores e configurações\n• Compliance Manager — gestão de riscos, tarefas, políticas e relatórios\n• Auditor (apenas leitura) — visualiza tudo mas não edita\n\nO convite é enviado por email e expira ao fim de 7 dias.',
      },
      {
        title: 'Como funciona o score de conformidade?',
        body: 'O score é calculado com base nos controlos ISO 27001 Annex A marcados como Implementado (100%) ou Parcialmente Implementado (50%). A fórmula é: (Σ pesos dos controlos implementados) / (total de controlos aplicáveis) × 100. Controlos marcados como Não Aplicável não entram no denominador.',
      },
      {
        title: 'Posso importar dados de um sistema anterior?',
        body: 'Sim. O iComply aceita importação via Excel (.xlsx) para Tarefas, Riscos e Controlos. Vai a Definições → Importar dados e descarrega o template correspondente. Preenche com os teus dados e faz upload. O sistema processa de forma assíncrona e envia notificação quando termina.',
      },
      {
        title: 'Como pesquisar em todo o programa (Ctrl+K)',
        body: 'Prime Ctrl+K (Cmd+K no Mac) ou clica em "Pesquisar" no topo e escreve 2 ou mais letras. A pesquisa ignora acentos e maiúsculas, encontra qualquer palavra dentro do conteúdo (títulos, descrições, texto das políticas, nomes de ficheiros) e tolera pequenos erros de escrita.\n\nOs resultados aparecem por prioridade:\n• Correspondência exata — contêm todas as palavras\n• Correspondência parcial — contêm algumas das palavras\n• Relacionados — o mesmo assunto com outras palavras (por exemplo, "formação" sugere o Centro de Formação, vídeos e ajuda)\n\n"Ver todos os resultados" abre uma página com filtros por tipo. Só aparecem registos dos módulos a que tens acesso. Ao abrir um resultado, a página faz scroll até ao item e destaca-o.',
      },
    ],
  },
  {
    id: 'riscos',
    label: 'Gestão de Riscos',
    icon: AlertTriangle,
    color: 'bg-orange-100 text-orange-700',
    articles: [
      {
        title: 'Como criar e avaliar um risco',
        body: 'Em Riscos → Novo Risco, preenche: nome, categoria, descrição, probabilidade (Raro a Quase Certo) e impacto (Negligível a Catastrófico). O sistema calcula automaticamente o nível de risco (CRITICAL/HIGH/MEDIUM/LOW) com base na matriz P×I. Atribui um owner e define prazo de revisão.',
      },
      {
        title: 'Como funciona a matriz de riscos 5×5',
        body: 'A heatmap no Dashboard mostra todos os riscos posicionados por Probabilidade (eixo Y) e Impacto (eixo X). A cor indica o nível:\n• Vermelho (CRITICAL): score ≥ 20\n• Laranja (HIGH): score ≥ 12\n• Amarelo (MEDIUM): score ≥ 6\n• Verde (LOW): score < 6\n\nClica em qualquer risco no mapa para ver os detalhes.',
      },
      {
        title: 'O que é um plano de tratamento de risco?',
        body: 'Para cada risco, podes definir como vai ser tratado:\n• Mitigar — reduzir a probabilidade ou impacto com ações concretas\n• Aceitar — documentar a decisão de aceitar o risco residual\n• Transferir — transferir o risco para terceiros (ex: seguro, subcontratante)\n• Evitar — eliminar a atividade que gera o risco\n\nClica em "Adicionar Tratamento" na linha do risco para preencher o formulário CAPA.',
      },
      {
        title: 'Como ver riscos sem plano de tratamento',
        body: 'Na página de Riscos, usa o toggle "Sem tratamento" (ícone de ficheiro com ponto de interrogação) para filtrar apenas os riscos que ainda não têm plano de tratamento definido. Podes também ordenar por nível (clica no cabeçalho da coluna) para tratar os CRITICAL primeiro.',
      },
      {
        title: 'Posso exportar o registo de riscos?',
        body: 'Sim. Em Relatórios → Gerar Relatório, seleciona "Registo de Riscos" e o formato Excel. O ficheiro inclui todas as colunas: nome, categoria, probabilidade, impacto, nível, plano de tratamento, owner e prazo. Podes também agendar um envio automático semanal por email.',
      },
    ],
  },
  {
    id: 'tarefas',
    label: 'Tarefas & Projetos',
    icon: CheckCircle2,
    color: 'bg-green-100 text-green-700',
    articles: [
      {
        title: 'Como criar e atribuir tarefas de compliance',
        body: 'Em Tarefas → Nova Tarefa, define título, descrição, prioridade (CRITICAL/HIGH/MEDIUM/LOW), responsável, prazo e projeto associado. A tarefa aparece automaticamente no dashboard do responsável e gera uma notificação por email.',
      },
      {
        title: 'Como usar a vista Kanban vs Lista',
        body: 'Na página de Tarefas, alterna entre vista de Lista (tabela com todos os detalhes) e Kanban (colunas por estado: A Fazer / Em Progresso / Em Revisão / Concluído). O Kanban é ideal para acompanhar o progresso em reuniões de equipa. Arrasta tarefas entre colunas para atualizar o estado.',
      },
      {
        title: 'Como usar bulk actions (ações em massa)',
        body: 'Seleciona múltiplas tarefas usando as checkboxes à esquerda de cada linha. Uma barra de ações aparece na parte inferior com:\n• Alterar estado — muda o estado de todas as tarefas selecionadas\n• Reatribuir — muda o responsável\n• Limpar seleção — deseleciona tudo\n\nIsso é especialmente útil após reuniões de revisão quando precisas de atualizar vários itens de uma vez.',
      },
      {
        title: 'O que são dependências de tarefas?',
        body: 'Podes marcar que uma tarefa só pode começar depois de outra estar concluída. No detalhe da tarefa, vai a "Dependências" e adiciona as tarefas predecessoras. No Gantt, as dependências aparecem como setas entre as barras. O sistema avisa se uma tarefa dependente está em atraso.',
      },
      {
        title: 'Como registar tempo gasto numa tarefa',
        body: 'Abre o detalhe de uma tarefa e clica em "Iniciar timer". O timer corre enquanto trabalhas e para automaticamente quando clicas em "Parar". Podes também adicionar tempo manualmente em "Registar horas". Em Relatórios → Tempo, vês o resumo por tarefa, projeto e colaborador.',
      },
    ],
  },
  {
    id: 'politicas-evidencias',
    label: 'Políticas & Evidências',
    icon: FileText,
    color: 'bg-indigo-100 text-indigo-700',
    articles: [
      {
        title: 'Como criar e aprovar uma política de segurança',
        body: 'Em Políticas → Nova Política, preenche título, categoria, conteúdo e versão. Guarda como Rascunho e submete para revisão quando estiver pronta. Um utilizador com papel Admin pode então aprovar. As políticas aprovadas ficam visíveis no Trust Center público (se configurado).',
      },
      {
        title: 'Como fazer upload de evidências',
        body: 'Em Evidências → Nova Evidência, escolhe o tipo (Documento, Screenshot, Log, Relatório, Certificado, Contrato), associa a um ou mais controlos ISO 27001 e faz upload do ficheiro. Formatos suportados: PDF, DOCX, XLSX, PNG, JPG (máx 50 MB por ficheiro).',
      },
      {
        title: 'Como ligar evidências a controlos ISO 27001',
        body: 'Cada evidência pode ser associada a múltiplos controlos Annex A. Na criação da evidência, usa o campo "Controlos relacionados" e pesquisa pelo código (ex: A.8.5) ou descrição. Isto alimenta o Gap Analysis — em Controlos podes ver quais têm evidência suficiente e quais precisam de mais documentação.',
      },
      {
        title: 'O que é a análise de lacunas de evidências?',
        body: 'Em Evidências → Gap Analysis, o sistema mostra para cada controlo ISO 27001 se tem evidência associada (✓) ou não (⚠). Os controlos sem evidência são listados como prioridades de recolha. Este relatório é fundamental para preparar uma auditoria de certificação.',
      },
      {
        title: 'Como anexar documentos Word ou PDF a uma política',
        body: 'Abre a política (ícone de olho) e, na secção Anexos, adiciona o ficheiro (PDF, Word, Excel, PowerPoint, imagens… até 25 MB). Cada anexo guarda o seu histórico de versões (1.0, 1.1…) com nota de alteração, e podes descarregar qualquer versão.\n\nRegras de controlo: alterar os anexos de uma política Em Revisão ou Aprovada devolve-a a Rascunho para nova aprovação; quem carregou o último ficheiro não pode aprovar a política (separação de funções); políticas arquivadas ficam só de leitura.',
      },
      {
        title: 'O que é a Gestão Documental e como a uso',
        body: 'A Gestão Documental guarda os documentos controlados de cada sistema de gestão (informação documentada, cláusula 7.5): manuais, procedimentos, instruções de trabalho, formulários e registos. Encontras em Gerir → Políticas & Relatórios → Gestão Documental, ou nos menus de Qualidade e Ambiente.\n\n1. Escolhe a norma no seletor (ISO 9001, 14001, 45001, 27001, 22301, 37001, 27701, 42001, 22000, 13485, 20000-1, 27018, 27036, NIST AI RMF, ISO 23894 ou Geral)\n2. Clica em "Novo documento": indica a cláusula (4, 5.3, 7.5, 8.2…), o código, o título, o tipo e carrega o ficheiro\n3. Os documentos aparecem agrupados por cláusula, com o histórico de versões\n4. Fluxo: Rascunho → Em revisão → Aprovado → Obsoleto. Uma nova versão volta a Rascunho; quem carregou a versão não a pode aprovar\n\nCada pessoa só vê e altera os documentos das normas a que o seu perfil dá acesso.',
      },
      {
        title: 'Como partilhar o mesmo documento entre várias normas',
        body: 'Um procedimento comum a várias normas — por exemplo, o controlo de documentos (cláusula 7.5) usado na ISO 9001 e na ISO 14001 — guarda-se uma só vez. Ao criar o documento, escolhe a norma principal e, em "Aplica-se também a", as outras normas. Num documento existente usa o ícone Partilhar.\n\nO documento continua a ter um só ficheiro, um só histórico de versões e uma só aprovação, e aparece na lista de cada norma (nas outras com a etiqueta "Partilhado de…"). Quem lê qualquer uma das normas pode vê-lo e descarregá-lo; só a equipa da norma principal o pode alterar, aprovar ou eliminar. Para partilhar com uma norma precisas de permissão de escrita nela. Cada página de norma (ISO 27001, 45001, 22301, 37001, 27701, 42001…) tem um atalho para os seus documentos.',
      },
    ],
  },
  {
    id: 'ambiente-iso14001',
    label: 'ESG · ISO 14001 (Gestão Ambiental)',
    icon: Recycle,
    color: 'bg-lime-100 text-lime-700',
    articles: [
      {
        title: 'O que cobre o módulo ISO 14001 (Gestão Ambiental)',
        body: 'A ISO 14001 faz parte do domínio ESG & Sustentabilidade (menu Conformidade → ESG & Sustentabilidade). Enquanto o módulo ESG reporta métricas (CSRD, GRI), este módulo gere o Sistema de Gestão Ambiental (SGA) com quatro separadores:\n• Requisitos ISO 14001 — checklist das cláusulas 4 a 10 com estado, evidência e score\n• Aspetos e Impactos — registo dos aspetos ambientais e avaliação da significância (6.1.2)\n• Objetivos e Metas — objetivos mensuráveis com indicador, meta, prazo e progresso (6.2)\n• Requisitos Legais — leis, licenças e outros requisitos, com avaliação do cumprimento (6.1.3 e 9.1.2)\n\nA política ambiental escreve-se em Políticas e o manual, procedimentos e registos guardam-se na Gestão Documental (norma ISO 14001).',
      },
      {
        title: 'Como registar aspetos e impactos ambientais e saber quais são significativos',
        body: 'Em Ambiente → Aspetos e Impactos → Novo aspeto, indica a atividade (ex.: Produção), o aspeto ambiental (ex.: Consumo de energia elétrica), o impacto (ex.: Esgotamento de recursos), a condição (normal, anormal ou emergência) e a fase do ciclo de vida.\n\nAvalia a severidade e a probabilidade de 1 a 5. A significância é severidade × probabilidade (máx. 25): o aspeto é Significativo a partir de 12 pontos, ou numa emergência com severidade 4 ou mais. Os aspetos significativos devem ter controlos operacionais (8.1) e originar objetivos ambientais (6.2).',
      },
      {
        title: 'Como definir objetivos ambientais e acompanhar o progresso',
        body: 'Em Ambiente → Objetivos e Metas → Novo objetivo, descreve o objetivo (ex.: Reduzir o consumo de eletricidade em 10%) e indica o indicador, a unidade, o valor de partida, a meta e o prazo. Vai atualizando o valor atual: a barra de progresso mede o caminho entre o valor de partida e a meta, quer o objetivo seja aumentar ou reduzir. Objetivos fora de prazo ficam destacados no resumo.',
      },
      {
        title: 'Como ligar um objetivo ambiental a uma métrica ESG',
        body: 'Para medir uma vez e reportar duas, liga o objetivo à métrica do módulo ESG (CSRD/GRI) que o mede — por exemplo, o consumo de energia. Em Ambiente → Objetivos e Metas, abre o objetivo e escolhe a métrica em "Métrica ESG". Daí em diante o valor atual do objetivo é o valor atual da métrica, e o progresso acompanha-o.\n\nSe a lista de métricas estiver vazia, abre ESG & Sustentabilidade e usa "Inicializar métricas CSRD/GRI". Só vês as métricas se o teu perfil tiver acesso ao módulo ESG; quem não tem acesso vê o valor guardado no objetivo.',
      },
      {
        title: 'Como manter o registo de requisitos legais e avaliar o cumprimento',
        body: 'Em Ambiente → Requisitos Legais regista cada lei, licença ou outro requisito aplicável (fonte, categoria, o que é exigido e onde se aplica). Avalia o cumprimento — Cumpre, Cumpre em parte ou Não cumpre — e define a data da próxima avaliação. Ao avaliar, a data da última avaliação fica registada. Avaliações em atraso e requisitos por avaliar são sinalizados no topo da página.',
      },
    ],
  },
  {
    id: 'normas-checklists',
    label: 'Normas ISO e referenciais (checklists)',
    icon: Recycle,
    color: 'bg-blue-100 text-blue-700',
    articles: [
      {
        title: 'Que normas têm checklist própria e onde as encontro',
        body: 'Além dos módulos dedicados, há checklists completas para sete normas, cada uma no domínio onde faz sentido:\n• ISO 22000 (segurança alimentar) e ISO 13485 (dispositivos médicos) — Qualidade e Operações\n• ISO/IEC 20000-1 (gestão de serviços de TI) — Segurança\n• ISO/IEC 27018 (dados pessoais na cloud) — Privacidade\n• ISO/IEC 27036 (segurança na cadeia de fornecimento) — Terceiros\n• NIST AI RMF e ISO/IEC 23894 (risco de IA) — Governança de IA\n\nSó vês as normas dos domínios a que o teu perfil dá acesso.',
      },
      {
        title: 'Como trabalhar uma checklist de norma',
        body: 'Abre a norma no menu do domínio. Na primeira visita a lista de requisitos é criada para a tua organização. Para cada requisito indica o estado (Não implementado, Parcial, Implementado, Não aplicável), a evidência, notas, o responsável e o prazo. O score no topo mede o progresso e atualiza-se sozinho; ao marcar um requisito como implementado fica registada a data de conclusão.\n\nOs documentos da norma (manual, procedimentos, registos) guardam-se na Gestão Documental, escolhendo a mesma norma. Perfis só de leitura, como o auditor externo, veem a checklist mas não a alteram.',
      },
    ],
  },
  {
    id: 'verificacao-identidade',
    label: 'Verificação de Identidade (KYC · KYB · Sanções)',
    icon: Recycle,
    color: 'bg-violet-100 text-violet-700',
    articles: [
      {
        title: 'Como funciona a Verificação de Identidade (manual e automática)',
        body: 'Em Ética → Verificação de Identidade registas pedidos para pessoas, empresas e rastreio de sanções/PEP. O módulo funciona sempre, sem depender de nenhum fornecedor:\n• Modo manual (sem custos adicionais): o pedido fica registado e uma pessoa decide — Aprovar ou Rejeitar — indicando a fundamentação (diligências feitas, listas consultadas). O nº do documento é guardado mascarado.\n• Modo automático: um fornecedor especializado faz a verificação. Só é usado quando o fornecedor está ligado à plataforma E um administrador da tua organização aceitou as condições comerciais (taxa de arranque única + preço por verificação). Até lá os pedidos seguem em modo manual, sem custos surpresa.\n\nO add-on de Verificação de Identidade tem de estar ativo na tua licença.',
      },
      {
        title: 'Como aceitar as condições comerciais da verificação automática',
        body: 'Quando a Contemporary Constellation propõe condições para a tua organização, aparecem no cartão do modo em Verificação de Identidade: taxa de arranque (única) e preço pay-as-you-go por funcionalidade (pessoas, empresas, sanções). Um administrador revê e clica em "Aceitar condições". Se as condições forem revistas, é preciso aceitar a nova versão. Cada verificação automática guarda o preço em vigor e o consumo do mês é mostrado no mesmo cartão. As verificações manuais nunca têm custo.',
      },
    ],
  },
  {
    id: 'relatorios',
    label: 'Relatórios & Board',
    icon: BarChart3,
    color: 'bg-purple-100 text-purple-700',
    articles: [
      {
        title: 'Como gerar um Board Report para a administração',
        body: 'Em Relatórios → Board Reports, seleciona o período e clica "Gerar Pack". O relatório inclui: score de conformidade, evolução histórica, top riscos HIGH/CRITICAL, progresso por framework, itens de ação pendentes e referências normativas (NIS2 Art.20, DORA Art.5). Exporta em PDF para impressão ou apresentação digital.',
      },
      {
        title: 'Como agendar relatórios automáticos',
        body: 'Em Relatórios → Agendamentos → Novo Agendamento, define: tipo de relatório, frequência (diário/semanal/mensal), formato (PDF ou Excel) e destinatários por email. Os relatórios são gerados automaticamente e enviados no horário configurado sem necessitar de acção manual.',
      },
      {
        title: 'Onde vejo o histórico de relatórios gerados?',
        body: 'Em Relatórios → Histórico encontras todos os relatórios gerados com data, tipo e formato. Clica em qualquer relatório para fazer o download. Os relatórios são mantidos por 12 meses.',
      },
      {
        title: 'Como usar o endpoint GET /reports/kpis',
        body: 'Para integrações personalizadas, o endpoint GET /api/v1/reports/kpis retorna um snapshot unificado: {complianceScore, riskCounts: {critical, high, medium, low, total}, openTasks, evidenceCoverage}. Requer autenticação JWT. Ideal para dashboards personalizados ou integrações com PowerBI/Tableau.',
      },
    ],
  },
  {
    id: 'iguard',
    label: 'iGuard',
    icon: Laptop,
    color: 'bg-teal-100 text-teal-700',
    articles: [
      {
        title: 'O que é o iGuard e para que serve?',
        body: 'iGuard é o agente de conformidade de endpoints do iComply. Após instalação nos dispositivos da equipa, monitoriza em tempo real: encriptação de disco, screen lock, antivírus ativo, versão de sistema operativo e estado da firewall. Os resultados aparecem no dashboard de iGuard com alertas automáticos para dispositivos não conformes.',
      },
      {
        title: 'Como instalar o iGuard em macOS',
        body: '1. Vai a iGuard → Instalar Agente\n2. Descarrega o ficheiro para macOS (Apple Silicon ou Intel)\n3. Abre o Terminal e corre: chmod +x iguard-darwin-arm64 && sudo ./iguard-darwin-arm64\n4. Introduz o token de organização quando solicitado\n5. O dispositivo aparece no dashboard em 30 segundos\n\nO iGuard não requer privilégios de root permanentes — apenas na instalação inicial.',
      },
      {
        title: 'Como instalar o iGuard em Windows',
        body: '1. Vai a iGuard → Instalar Agente\n2. Descarrega iguard-windows-amd64.exe\n3. Clica com botão direito → "Executar como administrador"\n4. Introduz o token de organização quando solicitado\n5. O agente instala-se como serviço Windows e inicia automaticamente\n\nNota: o SmartScreen pode mostrar aviso na primeira execução — clica "Mais informações" → "Executar mesmo assim".',
      },
      {
        title: 'O que significa um dispositivo "Não Conforme"?',
        body: 'Um dispositivo está não conforme quando falha um ou mais dos seguintes controlos (mapeados para ISO 27001 A.8.1 e A.8.7):\n• Sem encriptação de disco (BitLocker/FileVault)\n• Screen lock inativo ou prazo > 5 minutos\n• Antivírus não instalado ou desatualizado\n• Sistema operativo com patches em atraso há mais de 30 dias\n\nO owner do dispositivo recebe uma notificação com instruções de remediação.',
      },
      {
        title: 'Como remover um dispositivo do iGuard',
        body: 'No dashboard de iGuard, clica no dispositivo → "Remover endpoint". O agente deve também ser desinstalado manualmente no dispositivo:\n• macOS: sudo ./iguard-darwin-arm64 --uninstall\n• Windows: Painel de Controlo → Programas → iGuard → Desinstalar\n• Linux: sudo systemctl stop iguard && sudo ./iguard-linux-amd64 --uninstall',
      },
    ],
  },
  {
    id: 'gdpr-nis2',
    label: 'GDPR & NIS2',
    icon: Globe,
    color: 'bg-rose-100 text-rose-700',
    articles: [
      {
        title: 'Como gerir atividades de tratamento de dados (ROPA)',
        body: 'Em GDPR → ROPA (Registo de Atividades de Processamento), cria uma entrada por cada tratamento de dados pessoais. Para cada atividade define: finalidade, base legal (contrato, obrigação legal, consentimento, interesse legítimo), categorias de dados, prazo de retenção, e subprocessadores. O ROPA é obrigatório pelo Art. 30 do RGPD para organizações com ≥250 colaboradores ou tratamentos de alto risco.',
      },
      {
        title: 'Como fazer uma DPIA (Avaliação de Impacto)',
        body: 'Para tratamentos de dados de alto risco (videovigilância, scoring, dados sensíveis em larga escala), o RGPD exige uma DPIA antes do início do tratamento. Em Tarefas, cria uma tarefa tipo "DPIA" e usa o template incluído que guia os 9 passos obrigatórios: descrição, necessidade, proporcionalidade, riscos, medidas, consulta ao DPO, aprovação.',
      },
      {
        title: 'Como responder a um pedido de exercício de direitos (DSAR)',
        body: 'Em GDPR → Pedidos de Direitos, regista o pedido com data de receção. O sistema calcula automaticamente o prazo de resposta (30 dias, extensível a 3 meses). Atribui o pedido ao DPO ou responsável. Após conclusão, regista a resposta dada. O histórico completo fica auditável.',
      },
      {
        title: 'Como mapear os controlos NIS2 no iComply',
        body: 'O iComply tem os 10 grupos de medidas do Art. 21 da Diretiva NIS2 pré-carregados:\n1. Políticas de análise de risco\n2. Gestão de incidentes\n3. Continuidade do negócio\n4. Segurança da cadeia de fornecimento\n5. Segurança na aquisição de sistemas\n6. Avaliação de eficácia\n7. Higiene cibernética e formação\n8. Criptografia\n9. Segurança de RH e controlo de acessos\n10. Autenticação multi-fator\n\nEm Conformidade → NIS2, podes marcar o estado de cada medida e adicionar evidências.',
      },
    ],
  },
  {
    id: 'admin',
    label: 'Administração',
    icon: Settings,
    color: 'bg-gray-100 text-gray-700',
    articles: [
      {
        title: 'Como saber que há um novo pedido de suporte e quem lhe responde',
        body: 'Quando um utilizador abre um pedido em Ajuda → Suporte, a equipa de suporte recebe de imediato um email com o resumo (assunto, organização, autor, categoria, prioridade e o início do texto) e um botão que abre o pedido já pronto a responder. O mesmo acontece quando o cliente responde. Quem abriu o pedido recebe um email quando o suporte responde (as notas internas nunca são enviadas) e quando o pedido é resolvido, com ligação direta ao pedido.\n\nOs avisos vão para o endereço configurado em SUPPORT_NOTIFY_EMAIL (por exemplo, a caixa de suporte partilhada); se não houver, para os utilizadores com o perfil Agente de Suporte e, na falta destes, para os super-administradores da plataforma. Em Suporte · Tickets, o menu mostra quantos pedidos aguardam resposta.',
      },
      {
        title: 'O que é o perfil Agente de Suporte',
        body: 'É um perfil só para atender pedidos de suporte: vê todos os pedidos, responde, escreve notas internas e atribui/fecha pedidos, mas não tem acesso a nenhum módulo da plataforma nem aos dados dos clientes fora dos pedidos. Só um super-administrador da plataforma o pode criar (Definições → Utilizadores → Convidar → Agente de Suporte), e só funciona na organização da plataforma — um utilizador criado noutra organização com este perfil não vê pedidos de ninguém.',
      },
      {
        title: 'Como configurar o SSO (Single Sign-On)',
        body: 'Em Definições → Segurança → SSO, configura a integração com o teu Identity Provider (Azure AD, Google Workspace, Okta). Precisas de: Client ID, Client Secret e URL de discovery do IdP. Após guardar, os utilizadores da organização podem autenticar com as credenciais corporativas. O SSO está disponível nos planos Professional e Enterprise.',
      },
      {
        title: 'Como ativar a autenticação de dois fatores (2FA)',
        body: 'Em Definições → Segurança → Autenticação, ativa "Exigir 2FA para todos os utilizadores". Os utilizadores recebem email com instruções para configurar um autenticador TOTP (Google Authenticator, Authy, 1Password). Administradores podem forçar a ativação e ver quais utilizadores ainda não configuraram o 2FA.',
      },
      {
        title: 'Como personalizar o Trust Center público',
        body: 'Em Definições → Trust Center, configura o que é visível publicamente na página /trust da tua organização: score de conformidade, frameworks ativos, políticas aprovadas, última auditoria. Podes também adicionar uma mensagem personalizada e o logotipo da empresa. O link público pode ser partilhado com clientes, parceiros e auditores.',
      },
      {
        title: 'Como ver os logs de auditoria (Audit Trail)',
        body: 'Em Definições → Logs de Auditoria, vês o histórico completo de ações: login, criação/edição/eliminação de riscos, aprovação de políticas, download de relatórios. Cada entrada inclui utilizador, timestamp, endereço IP e user-agent. Podes filtrar por utilizador, tipo de ação ou período. Os logs são imutáveis e retidos por 12 meses.',
      },
    ],
  },
  {
    id: 'api',
    label: 'API & Integrações',
    icon: Database,
    color: 'bg-yellow-100 text-yellow-700',
    articles: [
      {
        title: 'Como obter um token de API',
        body: 'Em Definições → API → Novo Token, cria um token de acesso com as permissões necessárias (leitura, escrita, ou ambas). O token é mostrado apenas uma vez — guarda-o em segurança. Para autenticar: adiciona o header Authorization: Bearer {token} em todos os pedidos à API.',
      },
      {
        title: 'Onde está a documentação da API REST?',
        body: 'A documentação completa com todos os endpoints, parâmetros e exemplos está disponível em /docs/api dentro do iComply. A documentação Swagger interativa permite testar endpoints diretamente no browser com o teu token de API.',
      },
      {
        title: 'Como integrar evidências automaticamente (GitHub, AWS, Azure)',
        body: 'Em Definições → Integrações → Nova Integração, seleciona o provider:\n• GitHub — importa audit logs de repositórios\n• AWS CloudTrail — importa logs de atividade AWS\n• Azure AD — importa logs de autenticação e acessos\n• GCP Audit — importa logs de atividade Google Cloud\n\nConfigura as credenciais de cada provider e define a frequência de sincronização (horária, diária). As evidências são importadas automaticamente e associadas aos controlos correspondentes.',
      },
      {
        title: 'Como configurar webhooks para notificações externas',
        body: 'Em Definições → Webhooks, regista a URL de destino e seleciona os eventos que pretendes receber (novo risco HIGH, tarefa em atraso, dispositivo não conforme, etc.). O iComply envia um POST com payload JSON para a tua URL em tempo real. Ideal para integrar com Slack, Teams, Jira ou sistemas internos.',
      },
    ],
  },
];
