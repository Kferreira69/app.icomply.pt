'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import {
  Mail, BookOpen, MessageCircle, FileText,
  ChevronRight, ExternalLink, Phone, Clock,
  Play, CheckCircle2, ArrowRight, Shield,
  Users, BarChart3, AlertTriangle, Target,
  Search, X, Laptop, Settings, Key, Database,
  Lock, HelpCircle, Layers, Globe,
} from 'lucide-react';

// ── FAQ ───────────────────────────────────────────────────────
const FAQ = [
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
];

// ── Getting Started steps ─────────────────────────────────────
const STEPS = [
  {
    icon: Target,
    color: 'bg-blue-100 text-blue-700',
    title: 'Diagnóstico inicial',
    desc: 'Preenche o questionário de maturidade para obter o teu score de conformidade e identificar lacunas.',
    href: '/diagnostic',
    cta: 'Fazer diagnóstico',
  },
  {
    icon: AlertTriangle,
    color: 'bg-orange-100 text-orange-700',
    title: 'Regista os teus riscos',
    desc: 'Cria um registo de riscos com probabilidade, impacto e planos de tratamento.',
    href: '/risks',
    cta: 'Ver riscos',
  },
  {
    icon: FileText,
    color: 'bg-green-100 text-green-700',
    title: 'Políticas de segurança',
    desc: 'Cria e aprova as políticas internas da tua organização.',
    href: '/policies',
    cta: 'Ver políticas',
  },
  {
    icon: Shield,
    color: 'bg-purple-100 text-purple-700',
    title: 'Instala o iGuard',
    desc: 'Monitoriza os dispositivos da equipa em tempo real.',
    href: '/iguard/install',
    cta: 'Instalar agente',
  },
  {
    icon: Users,
    color: 'bg-pink-100 text-pink-700',
    title: 'Convida a tua equipa',
    desc: 'Adiciona utilizadores e atribui permissões por função.',
    href: '/settings',
    cta: 'Gerir utilizadores',
  },
  {
    icon: BarChart3,
    color: 'bg-indigo-100 text-indigo-700',
    title: 'Gera relatórios',
    desc: 'Exporta relatórios para a administração e auditores.',
    href: '/reports',
    cta: 'Ver relatórios',
  },
];

// ── Video guides ──────────────────────────────────────────────
const VIDEOS = [
  { title: 'Introdução ao iComply', duration: '3:42', thumb: null, id: 1 },
  { title: 'Como fazer um diagnóstico de conformidade', duration: '5:15', thumb: null, id: 2 },
  { title: 'Gestão de riscos — passo a passo', duration: '6:30', thumb: null, id: 3 },
  { title: 'Instalar o iGuard em macOS', duration: '2:50', thumb: null, id: 4 },
  { title: 'Instalar o iGuard em Windows', duration: '3:10', thumb: null, id: 5 },
  { title: 'Board Reports — relatórios executivos', duration: '4:20', thumb: null, id: 6 },
];

const RESOURCES = [
  { label: 'Documentação técnica iGuard', href: '/docs/iguard', icon: FileText, external: false },
  { label: 'Documentação da API REST', href: '/docs/api', icon: BookOpen, external: false },
  { label: 'Academia iComply (20 vídeos)', href: '/academy', icon: BookOpen, external: false },
  { label: 'Trust Center público', href: '/trust', icon: Shield, external: false },
];

// ── Knowledge Base ────────────────────────────────────────────
const KB_CATEGORIES = [
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

// ── Article Accordion ──────────────────────────────────────────
function ArticleItem({ title, body }: { title: string; body: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-3.5 text-left gap-4"
      >
        <span className="text-sm text-gray-700 leading-snug">{title}</span>
        <ChevronRight className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="pb-4 pr-4">
          {body.split('\n').map((line, i) => (
            <p key={i} className={`text-sm text-gray-600 leading-relaxed ${line === '' ? 'mt-2' : ''}`}>
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Knowledge Base Section ─────────────────────────────────────
function KnowledgeBase() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q && !activeCategory) return KB_CATEGORIES;
    return KB_CATEGORIES
      .filter(cat => !activeCategory || cat.id === activeCategory)
      .map(cat => ({
        ...cat,
        articles: q
          ? cat.articles.filter(a =>
              a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q)
            )
          : cat.articles,
      }))
      .filter(cat => cat.articles.length > 0);
  }, [search, activeCategory]);

  const totalResults = filtered.reduce((n, c) => n + c.articles.length, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Artigos de Ajuda</h2>
        <p className="text-sm text-gray-500 mt-0.5">Guias detalhados para cada funcionalidade do iComply.</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Pesquisar artigos... (ex: exportar relatório, instalar iGuard, DPIA)"
          value={search}
          onChange={e => { setSearch(e.target.value); setActiveCategory(null); }}
          className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category pills */}
      {!search && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !activeCategory ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas as categorias
          </button>
          {KB_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                {cat.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Results */}
      {search && (
        <p className="text-xs text-gray-500">
          {totalResults === 0 ? 'Nenhum artigo encontrado.' : `${totalResults} artigo${totalResults !== 1 ? 's' : ''} encontrado${totalResults !== 1 ? 's' : ''}`}
        </p>
      )}

      {/* Articles */}
      <div className="space-y-4">
        {filtered.map(cat => {
          const Icon = cat.icon;
          return (
            <div key={cat.id}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${cat.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{cat.label}</span>
                <span className="text-xs text-gray-400">· {cat.articles.length} artigo{cat.articles.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="ml-8 border border-gray-100 rounded-xl px-4 divide-y divide-gray-100">
                {cat.articles.map((a, i) => <ArticleItem key={i} title={a.title} body={a.body} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── FAQ Accordion ─────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-4 text-left gap-4"
      >
        <span className="text-sm font-medium text-gray-800">{q}</span>
        <ChevronRight className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && <p className="pb-4 text-sm text-gray-600 leading-relaxed">{a}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function HelpPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 py-2">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Centro de Ajuda</h1>
        <p className="text-gray-500 mt-1">Guias, vídeos e suporte para tirar o máximo do iComply.</p>
      </div>

      {/* Contact cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a href="mailto:support@icomply.pt"
          className="flex flex-col gap-3 p-5 bg-blue-50 border border-blue-100 rounded-2xl hover:bg-blue-100 transition-colors">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-blue-900">Email de Suporte</p>
            <p className="text-xs text-blue-700 mt-0.5">support@icomply.pt</p>
            <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Resposta em até 4h úteis
            </p>
          </div>
        </a>
        <a href="https://wa.me/351917599852" target="_blank" rel="noopener noreferrer"
          className="flex flex-col gap-3 p-5 bg-green-50 border border-green-100 rounded-2xl hover:bg-green-100 transition-colors">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-green-900">WhatsApp / Chat</p>
            <p className="text-xs text-green-700 mt-0.5">+351 917 599 852</p>
            <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Seg–Sex, 9h–18h
            </p>
          </div>
        </a>
        <a href="tel:+351210210039"
          className="flex flex-col gap-3 p-5 bg-purple-50 border border-purple-100 rounded-2xl hover:bg-purple-100 transition-colors">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
            <Phone className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-purple-900">Telefone</p>
            <p className="text-xs text-purple-700 mt-0.5">+351 210 210 039</p>
            <p className="text-xs text-purple-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Seg–Sex, 9h–18h
            </p>
          </div>
        </a>
      </div>

      {/* Getting started */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Primeiros passos</h2>
        <p className="text-sm text-gray-500 mb-5">Segue estes 6 passos para configurar o iComply na tua organização.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Link key={step.href} href={step.href}
                className="flex flex-col gap-3 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${step.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-medium text-gray-400">PASSO {i + 1}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">{step.title}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{step.desc}</p>
                </div>
                <span className="text-xs text-blue-600 flex items-center gap-1 mt-auto font-medium">
                  {step.cta} <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Video guides */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Guias em vídeo</h2>
            <p className="text-sm text-gray-500">Tutoriais passo a passo da Academia iComply.</p>
          </div>
          <Link href="/academy" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            Ver todos <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {VIDEOS.map(v => (
            <Link key={v.id} href="/academy"
              className="group flex flex-col gap-2 rounded-xl overflow-hidden border border-gray-100 hover:shadow-sm transition-all">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 aspect-video flex items-center justify-center relative">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <Play className="w-5 h-5 text-white fill-white" />
                </div>
                <span className="absolute bottom-2 right-2 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded font-mono">{v.duration}</span>
              </div>
              <div className="p-3">
                <p className="text-xs font-medium text-gray-800 leading-snug group-hover:text-blue-700 transition-colors">{v.title}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">Perguntas Frequentes</h2>
        <div>
          {FAQ.map((item, i) => <FaqItem key={i} q={item.q} a={item.a} />)}
        </div>
      </div>

      {/* Knowledge Base */}
      <KnowledgeBase />

      {/* Resources */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Recursos adicionais</h2>
        <div className="space-y-2">
          {RESOURCES.map((r) => {
            const Icon = r.icon;
            const content = (
              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-gray-600" />
                </div>
                <span className="text-sm text-gray-700 flex-1">{r.label}</span>
                <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
              </div>
            );
            return r.external
              ? <a key={r.label} href={r.href} target="_blank" rel="noopener noreferrer">{content}</a>
              : <Link key={r.label} href={r.href}>{content}</Link>;
          })}
        </div>
      </div>

      {/* Checklist CTA */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-white">
          <p className="font-semibold text-lg">Precisas de ajuda personalizada?</p>
          <p className="text-blue-100 text-sm mt-1">A nossa equipa faz sessões de onboarding individuais — gratuitas no primeiro mês.</p>
        </div>
        <a href="mailto:support@icomply.pt?subject=Pedido%20de%20Onboarding"
          className="shrink-0 inline-flex items-center gap-2 bg-white text-blue-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors">
          <CheckCircle2 className="w-4 h-4" /> Agendar onboarding
        </a>
      </div>
    </div>
  );
}
