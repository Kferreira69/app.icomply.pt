'use client';

import { useState } from 'react';
import {
  GraduationCap, Play, Clock, Search, BookOpen,
  Shield, AlertTriangle, FileText, CheckSquare, BarChart2,
  Users, Settings, ShieldCheck, Activity, Database,
  Zap, FolderOpen, Eye, Globe, HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// ── Data ─────────────────────────────────────────────────────

interface Video {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: string;
  level: 'Iniciante' | 'Intermédio' | 'Avançado';
  topics: string[];
}

const VIDEOS: Video[] = [
  {
    id: 'v01',
    title: 'Primeiros Passos com o iComply',
    description: 'Visão geral da plataforma, navegação, configuração inicial da organização e criação do primeiro utilizador.',
    duration: '8 min',
    category: 'Introdução',
    level: 'Iniciante',
    topics: ['Dashboard', 'Perfil', 'Organização'],
  },
  {
    id: 'v02',
    title: 'Gestão de Riscos — Criar e Avaliar Riscos',
    description: 'Como criar riscos, definir probabilidade e impacto, atribuir responsáveis e monitorizar o mapa de riscos.',
    duration: '10 min',
    category: 'Riscos',
    level: 'Iniciante',
    topics: ['Registo de riscos', 'Mapa de calor', 'Avaliação'],
  },
  {
    id: 'v03',
    title: 'Gestão de Riscos — Tratamento e Planos de Acção',
    description: 'Definir estratégias de tratamento (aceitar, mitigar, transferir, eliminar) e criar planos de acção associados.',
    duration: '9 min',
    category: 'Riscos',
    level: 'Intermédio',
    topics: ['Tratamento', 'CAPA', 'Monitorização'],
  },
  {
    id: 'v04',
    title: 'Gestão Documental — Políticas e Procedimentos',
    description: 'Criar, versionar e publicar políticas. Gerir o ciclo de revisão e obter aprovações.',
    duration: '8 min',
    category: 'Documentos',
    level: 'Iniciante',
    topics: ['Políticas', 'Versões', 'Aprovações'],
  },
  {
    id: 'v05',
    title: 'Auditorias Internas — Planeamento e Execução',
    description: 'Criar um plano de auditoria, atribuir auditores, registar constatações e emitir o relatório final.',
    duration: '12 min',
    category: 'Auditorias',
    level: 'Intermédio',
    topics: ['Plano de auditoria', 'Constatações', 'Relatório'],
  },
  {
    id: 'v06',
    title: 'RGPD — ROPA e Avaliações de Impacto (AIPD)',
    description: 'Registar actividades de tratamento, gerir pedidos de titulares e conduzir avaliações de impacto.',
    duration: '11 min',
    category: 'RGPD',
    level: 'Intermédio',
    topics: ['ROPA', 'AIPD', 'Pedidos de titulares'],
  },
  {
    id: 'v07',
    title: 'Gestão de Tarefas e Dependências',
    description: 'Criar tarefas, definir dependências, usar a vista Kanban e o Gantt para acompanhar o progresso.',
    duration: '9 min',
    category: 'Tarefas',
    level: 'Iniciante',
    topics: ['Kanban', 'Gantt', 'Dependências'],
  },
  {
    id: 'v08',
    title: 'Gestão de Evidências e Recolha Automática',
    description: 'Carregar evidências manualmente, configurar integrações automáticas e mapear evidências a controlos.',
    duration: '10 min',
    category: 'Evidências',
    level: 'Intermédio',
    topics: ['Upload', 'Integrações', 'Controlos'],
  },
  {
    id: 'v09',
    title: 'Conformidade NIS2 — Do Diagnóstico à Implementação',
    description: 'Realizar o diagnóstico NIS2, priorizar requisitos e acompanhar o plano de implementação.',
    duration: '13 min',
    category: 'NIS2',
    level: 'Avançado',
    topics: ['Diagnóstico', 'Requisitos', 'Relatório NIS2'],
  },
  {
    id: 'v10',
    title: 'ISO 27001 — Gestão de Controlos e Declaração de Aplicabilidade',
    description: 'Gerir os controlos do Anexo A, documentar a Declaração de Aplicabilidade (SoA) e preparar a auditoria.',
    duration: '14 min',
    category: 'ISO 27001',
    level: 'Avançado',
    topics: ['SoA', 'Anexo A', 'Auditoria de certificação'],
  },
  {
    id: 'v11',
    title: 'Dashboard Executivo — Personalizar e Interpretar Métricas',
    description: 'Configurar widgets, interpretar indicadores-chave e partilhar relatórios com a gestão de topo.',
    duration: '7 min',
    category: 'Dashboard',
    level: 'Iniciante',
    topics: ['Widgets', 'KPIs', 'Relatórios'],
  },
  {
    id: 'v12',
    title: 'Motor de Automações — Criar Fluxos de Trabalho',
    description: 'Criar regras de automação baseadas em eventos, condições e acções para reduzir trabalho manual.',
    duration: '11 min',
    category: 'Automações',
    level: 'Avançado',
    topics: ['Regras', 'Triggers', 'Acções automáticas'],
  },
  {
    id: 'v13',
    title: 'Portal de Auditores Externos — Colaboração Segura',
    description: 'Configurar o portal de auditores externos, partilhar evidências e gerir acessos temporários.',
    duration: '8 min',
    category: 'Auditorias',
    level: 'Intermédio',
    topics: ['Portal externo', 'Partilha', 'Acessos'],
  },
  {
    id: 'v14',
    title: 'Formação de Colaboradores — Módulos e Questionários',
    description: 'Criar módulos de formação, atribuir a colaboradores e monitorizar a taxa de conclusão.',
    duration: '9 min',
    category: 'Formação',
    level: 'Intermédio',
    topics: ['Módulos', 'Questionários', 'Certificados'],
  },
  {
    id: 'v15',
    title: 'iGuard — Monitorização de Dispositivos',
    description: 'Instalar o agente iGuard, interpretar o score de conformidade dos dispositivos e gerir alertas.',
    duration: '8 min',
    category: 'iGuard',
    level: 'Iniciante',
    topics: ['Instalação', 'Score', 'Alertas'],
  },
  {
    id: 'v16',
    title: 'Integration Hub — Ligar Ferramentas Externas',
    description: 'Configurar integrações com IAM, HRIS, MDM e outras ferramentas via Truto.',
    duration: '10 min',
    category: 'Integrações',
    level: 'Avançado',
    topics: ['Truto', 'IAM', 'HRIS', 'MDM'],
  },
  {
    id: 'v17',
    title: 'DORA — Registo de Informação e Incidentes TIC',
    description: 'Preencher o Registo de Informação DORA, reportar incidentes TIC e gerir prestadores críticos.',
    duration: '12 min',
    category: 'DORA',
    level: 'Avançado',
    topics: ['RoI', 'Incidentes TIC', 'Terceiros críticos'],
  },
  {
    id: 'v18',
    title: 'Gestão de Utilizadores, Papéis e Permissões',
    description: 'Criar utilizadores, definir papéis (RBAC), gerir convites e configurar SSO.',
    duration: '8 min',
    category: 'Administração',
    level: 'Intermédio',
    topics: ['RBAC', 'Convites', 'SSO'],
  },
  {
    id: 'v19',
    title: 'Regulatory Intelligence — Acompanhar Alterações Regulatórias',
    description: 'Usar o feed regulatório para monitorizar novas regulamentações e avaliar o seu impacto.',
    duration: '7 min',
    category: 'Inteligência Regulatória',
    level: 'Intermédio',
    topics: ['Feed', 'Alertas', 'Impacto'],
  },
  {
    id: 'v20',
    title: 'Relatórios para o Órgão de Gestão',
    description: 'Gerar relatórios executivos, preparar atas de gestão e documentar decisões do Conselho.',
    duration: '9 min',
    category: 'Relatórios',
    level: 'Avançado',
    topics: ['Board reports', 'Atas', 'KPIs executivos'],
  },
];

const CATEGORIES = [
  'Todos',
  ...Array.from(new Set(VIDEOS.map(v => v.category))),
];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'Introdução':              GraduationCap,
  'Riscos':                  AlertTriangle,
  'Documentos':              FileText,
  'Auditorias':              Shield,
  'RGPD':                    Eye,
  'Tarefas':                 CheckSquare,
  'Evidências':              Database,
  'NIS2':                    ShieldCheck,
  'ISO 27001':               BookOpen,
  'Dashboard':               BarChart2,
  'Automações':              Zap,
  'Formação':                Users,
  'iGuard':                  ShieldCheck,
  'Integrações':             Globe,
  'DORA':                    FolderOpen,
  'Administração':           Settings,
  'Inteligência Regulatória': Activity,
  'Relatórios':              FileText,
};

const LEVEL_COLORS: Record<string, string> = {
  'Iniciante':    'bg-green-100 text-green-700',
  'Intermédio':   'bg-blue-100 text-blue-700',
  'Avançado':     'bg-purple-100 text-purple-700',
};

// ── Component ─────────────────────────────────────────────────

export default function AcademyPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [activeLevel, setActiveLevel] = useState<string | null>(null);

  const filtered = VIDEOS.filter(v => {
    if (activeCategory !== 'Todos' && v.category !== activeCategory) return false;
    if (activeLevel && v.level !== activeLevel) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        v.title.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.topics.some(t => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalMinutes = VIDEOS.reduce((acc, v) => acc + parseInt(v.duration), 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ── Header ───────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Centro de Formação iComply</h1>
              <p className="text-indigo-200 text-sm">Domine a plataforma com vídeos curtos e objectivos</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 mt-6 text-sm">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-indigo-300" />
              <span><strong className="text-white">{VIDEOS.length}</strong> <span className="text-indigo-200">vídeos</span></span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-300" />
              <span><strong className="text-white">~{totalMinutes} min</strong> <span className="text-indigo-200">de conteúdo</span></span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-300" />
              <span><strong className="text-white">{CATEGORIES.length - 1}</strong> <span className="text-indigo-200">áreas temáticas</span></span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* ── Search + filters ─────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar vídeos…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            {(['Iniciante', 'Intermédio', 'Avançado'] as const).map(level => (
              <button
                key={level}
                onClick={() => setActiveLevel(activeLevel === level ? null : level)}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-medium border transition-all',
                  activeLevel === level
                    ? LEVEL_COLORS[level] + ' border-transparent'
                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* ── Category pills ───────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                activeCategory === cat
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-indigo-300 hover:text-indigo-600'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Results count ────────────────────────────── */}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {filtered.length} {filtered.length === 1 ? 'vídeo' : 'vídeos'} encontrado{filtered.length !== 1 ? 's' : ''}
        </p>

        {/* ── Video grid ───────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <HelpCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Nenhum vídeo encontrado para os filtros seleccionados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(video => {
              const Icon = CATEGORY_ICONS[video.category] ?? BookOpen;
              return (
                <div
                  key={video.id}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden group"
                >
                  {/* Thumbnail placeholder */}
                  <div className="aspect-video bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 flex items-center justify-center relative">
                    <div className="w-12 h-12 rounded-full bg-indigo-600/90 flex items-center justify-center group-hover:scale-110 transition-transform cursor-pointer shadow-lg">
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    </div>
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-mono">
                      <Clock className="w-2.5 h-2.5" />
                      {video.duration}
                    </div>
                    <div className="absolute top-2 left-2">
                      <div className="w-7 h-7 rounded-lg bg-white/80 dark:bg-gray-900/80 flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5 text-indigo-600" />
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                        {video.category}
                      </span>
                      <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded-full', LEVEL_COLORS[video.level])}>
                        {video.level}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug mb-2">
                      {video.title}
                    </h3>

                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed flex-1">
                      {video.description}
                    </p>

                    {/* Topics */}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {video.topics.map(t => (
                        <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Coming soon / support ────────────────────── */}
        <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900 p-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 mb-1">
              Precisa de ajuda adicional?
            </h3>
            <p className="text-xs text-indigo-700 dark:text-indigo-300 mb-3">
              A nossa equipa de sucesso do cliente está disponível para sessões personalizadas de onboarding e formação.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href="mailto:support@icomply.pt"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors"
              >
                Contactar Suporte
              </a>
              <Link
                href="/help"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-indigo-900/40 hover:bg-indigo-50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-medium transition-colors"
              >
                Centro de Ajuda
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
