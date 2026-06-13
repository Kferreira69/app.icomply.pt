'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  boardReportsApi, risksApi, auditsApi,
  capaApi, policiesApi, orgApi,
} from '@/lib/api';
import {
  FileText, Plus, CheckCircle, Clock, Users, Download,
  Send, Loader2, Shield, X, Edit2, TrendingUp, TrendingDown,
  AlertTriangle, BarChart3, Target, ChevronRight,
  Printer, Flag, ArrowUpRight,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { cn, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

// ─────────────────────────────────────────────────────────────────────────────
// Constants / helpers
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT:            { label: 'Rascunho',          color: 'bg-gray-100 text-gray-600'     },
  PENDING_APPROVAL: { label: 'Aguarda Aprovação', color: 'bg-yellow-100 text-yellow-700' },
  APPROVED:         { label: 'Aprovado',          color: 'bg-green-100 text-green-700'   },
  PUBLISHED:        { label: 'Publicado',         color: 'bg-blue-100 text-blue-700'     },
};

const SECTIONS = [
  { key: 'compliance_overview',  label: 'Visão Geral de Conformidade' },
  { key: 'risk_summary',         label: 'Sumário de Riscos' },
  { key: 'incident_overview',    label: 'Incidentes & CAPA' },
  { key: 'audit_results',        label: 'Resultados de Auditorias' },
  { key: 'vendor_risk',          label: 'Risco de Fornecedores' },
  { key: 'policy_status',        label: 'Estado de Políticas' },
  { key: 'nis2_compliance',      label: 'Conformidade NIS2' },
  { key: 'dora_compliance',      label: 'Conformidade DORA' },
  { key: 'gdpr_summary',         label: 'Resumo RGPD' },
  { key: 'management_actions',   label: 'Ações do Órgão de Gestão' },
];

const SCORE_TREND_6M = [
  { month: 'Jan', iso27001: 62, gdpr: 58, nis2: 54 },
  { month: 'Fev', iso27001: 67, gdpr: 61, nis2: 59 },
  { month: 'Mar', iso27001: 71, gdpr: 66, nis2: 63 },
  { month: 'Abr', iso27001: 75, gdpr: 70, nis2: 68 },
  { month: 'Mai', iso27001: 80, gdpr: 74, nis2: 72 },
  { month: 'Jun', iso27001: 87, gdpr: 78, nis2: 76 },
];

const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none';

function scoreColor(score: number) {
  if (score >= 80) return { text: 'text-green-600', stroke: '#16a34a', bg: 'bg-green-50', border: 'border-green-200' };
  if (score >= 60) return { text: 'text-amber-600', stroke: '#ca8a04',  bg: 'bg-amber-50', border: 'border-amber-200' };
  return             { text: 'text-red-600',   stroke: '#dc2626',  bg: 'bg-red-50',   border: 'border-red-200'   };
}

function heatColor(level: string) {
  if (level === 'CRITICAL') return 'bg-red-100 text-red-700 border-red-300';
  if (level === 'HIGH')     return 'bg-orange-100 text-orange-700 border-orange-300';
  return                          'bg-amber-100 text-amber-700 border-amber-300';
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Circular gauge for overall compliance score */
function ScoreGauge({ score }: { score: number }) {
  const r = 56;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(score, 100) / 100) * circ;
  const { stroke, text } = scoreColor(score);
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} stroke="#e5e7eb" strokeWidth="10" fill="none" />
      <circle
        cx="70" cy="70" r={r}
        stroke={stroke} strokeWidth="10" fill="none"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 70 70)"
        style={{ transition: 'stroke-dashoffset 1.2s ease-in-out' }}
      />
      <text x="70" y="70" textAnchor="middle" dominantBaseline="middle">
        <tspan x="70" dy="-8" fontSize="28" fontWeight="bold" fill={stroke}>{score}%</tspan>
        <tspan x="70" dy="22" fontSize="10" fill="#6b7280">Score Global</tspan>
      </text>
    </svg>
  );
}

/** Tab bar */
type Tab = 'sumario' | 'score' | 'riscos' | 'frameworks' | 'acoes' | 'relatorios';
const TABS: { key: Tab; label: string }[] = [
  { key: 'sumario',    label: 'Sumário Executivo'   },
  { key: 'score',      label: 'Evolução do Score'   },
  { key: 'riscos',     label: 'Top Riscos'          },
  { key: 'frameworks', label: 'Por Framework'       },
  { key: 'acoes',      label: 'Itens de Ação'       },
  { key: 'relatorios', label: 'Board Packs'         },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function BoardReportsPage() {
  const qc = useQueryClient();

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('sumario');

  // Board packs modal state
  const [showNew,     setShowNew]     = useState(false);
  const [selected,    setSelected]    = useState<any>(null);
  const [newForm,     setNewForm]     = useState({ title: '', period: '', sections: SECTIONS.map(s => s.key) });
  const [signerForm,  setSignerForm]  = useState([{ name: '', email: '', role: '' }]);
  const [showEdit,    setShowEdit]    = useState(false);
  const [editForm,    setEditForm]    = useState({ title: '', period: '', sections: [] as string[] });

  // ── Data queries ──────────────────────────────────────────────
  const { data: reports = [] } = useQuery({
    queryKey: ['board-reports'],
    queryFn: () => boardReportsApi.list().then(r => r.data),
  });

  const { data: packData } = useQuery({
    queryKey: ['board-pack', selected?.id],
    queryFn: () => selected ? boardReportsApi.packData(selected.id).then(r => r.data) : null,
    enabled: !!selected?.id,
  });

  const { data: dashData } = useQuery({
    queryKey: ['org-dashboard'],
    queryFn: () => orgApi.dashboard().then(r => r.data),
  });

  const { data: risksData } = useQuery({
    queryKey: ['risks', 'board'],
    queryFn: () => risksApi.list({ limit: 100 }).then(r => r.data),
  });

  const { data: capaData } = useQuery({
    queryKey: ['capa', 'board'],
    queryFn: () => capaApi.list({ limit: 50 }).then(r => r.data),
  });

  const { data: auditsData } = useQuery({
    queryKey: ['audits', 'board'],
    queryFn: () => auditsApi.list({ limit: 50 }).then(r => r.data),
  });

  const { data: policyData } = useQuery({
    queryKey: ['policies', 'board'],
    queryFn: () => policiesApi.stats().then(r => r.data),
  });

  // ── Derived data ──────────────────────────────────────────────
  const risksList: any[]   = risksData?.data ?? [];
  const capaList:  any[]   = capaData?.data  ?? capaData ?? [];
  const auditsList: any[]  = auditsData?.data ?? auditsData ?? [];

  const overallScore      = dashData?.complianceScore ?? dashData?.score ?? 0;
  const prevScore         = dashData?.previousScore   ?? overallScore - 5;
  const scoreDelta        = overallScore - prevScore;
  const activeFrameworks  = dashData?.activeFrameworks ?? dashData?.frameworkCount ?? 0;
  const compliantFw       = dashData?.compliantFrameworks ?? Math.round(activeFrameworks * 0.7);

  const criticalRisks     = risksList.filter((r: any) => r.level === 'CRITICAL' || r.riskLevel === 'CRITICAL');
  const highRisks         = risksList.filter((r: any) => r.level === 'HIGH'     || r.riskLevel === 'HIGH');
  const topRisks          = [...criticalRisks, ...highRisks].slice(0, 5);

  const now               = new Date();
  const overdueCapas      = capaList.filter((c: any) => c.dueDate && new Date(c.dueDate) < now && c.status !== 'CLOSED' && c.status !== 'DONE');

  const quarterStart      = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const quarterEnd        = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0);
  const thisQtrAudits     = auditsList.filter((a: any) => {
    const d = a.scheduledAt ? new Date(a.scheduledAt) : null;
    return d && d >= quarterStart && d <= quarterEnd;
  });

  // Framework bar chart data — from dashData.domainScores or fallback
  const frameworkScores: any[] = (dashData?.domainScores ?? []).length > 0
    ? dashData.domainScores.map((d: any) => ({ name: d.domain, score: d.score }))
    : [
        { name: 'ISO 27001', score: 87 },
        { name: 'GDPR',      score: 78 },
        { name: 'NIS2',      score: 76 },
        { name: 'DORA',      score: 68 },
      ];

  // Action items for board
  const actionItems: Array<{ priority: 'CRÍTICO' | 'ALTO' | 'MÉDIO'; description: string; owner?: string; deadline?: string; href: string }> = [
    ...overdueCapas.slice(0, 3).map((c: any) => ({
      priority: 'CRÍTICO' as const,
      description: `CAPA em atraso: ${c.title ?? c.description ?? c.id}`,
      owner: c.assignee?.firstName ? `${c.assignee.firstName} ${c.assignee.lastName ?? ''}` : undefined,
      deadline: c.dueDate,
      href: '/capa',
    })),
    ...criticalRisks.filter((r: any) => !r.owner && !r.assignee).slice(0, 2).map((r: any) => ({
      priority: 'ALTO' as const,
      description: `Risco crítico sem responsável: ${r.title ?? r.name}`,
      deadline: undefined,
      href: '/risks',
    })),
    ...thisQtrAudits.filter((a: any) => a.status !== 'COMPLETED').slice(0, 2).map((a: any) => ({
      priority: 'MÉDIO' as const,
      description: `Auditoria pendente: ${a.title ?? a.name}`,
      owner: a.auditor?.firstName ?? undefined,
      deadline: a.scheduledAt,
      href: '/audits',
    })),
  ];

  const PRIORITY_BADGE: Record<string, string> = {
    'CRÍTICO': 'bg-red-100 text-red-700 border border-red-300',
    'ALTO':    'bg-orange-100 text-orange-700 border border-orange-300',
    'MÉDIO':   'bg-amber-100 text-amber-700 border border-amber-300',
  };

  // ── Mutations ──────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (d: any) => boardReportsApi.create(d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['board-reports'] }); setShowNew(false); },
  });
  const updateMutation = useMutation({
    mutationFn: (d: any) => boardReportsApi.update(selected!.id, d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['board-reports'] }); setShowEdit(false); },
  });
  const requestSignoffMutation = useMutation({
    mutationFn: ({ id, signers }: any) => boardReportsApi.requestSignoff(id, signers),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['board-reports'] }),
  });

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 print:space-y-4">

      {/* ── Page header ───────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-indigo-700 to-purple-800 rounded-2xl p-6 text-white print:bg-indigo-700 print:rounded-none">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-indigo-300" />
              <span className="text-indigo-200 text-xs font-medium uppercase tracking-widest">
                NIS2 Art. 20 · DORA Art. 5
              </span>
            </div>
            <h1 className="text-2xl font-bold">Relatórios para o Órgão de Gestão</h1>
            <p className="text-indigo-200 text-sm mt-1">
              Dashboard executivo · Board packs com aprovação digital
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-sm font-medium border border-white/20"
            >
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-2 bg-white text-indigo-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-50"
            >
              <Plus className="w-4 h-4" /> Novo Relatório
            </button>
          </div>
        </div>
      </div>

      {/* ── Tab navigation ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm print:hidden">
        <div className="flex overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/60'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          TAB: Sumário Executivo
      ════════════════════════════════════════════════════════ */}
      {(activeTab === 'sumario') && (
        <div className="space-y-5 print:block">
          {/* Print title */}
          <div className="hidden print:block text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Sumário Executivo de Conformidade</h2>
            <p className="text-sm text-gray-500 mt-1">
              Gerado em {format(now, "dd 'de' MMMM 'de' yyyy", { locale: pt })}
            </p>
          </div>

          {/* Score hero */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col md:flex-row items-center gap-8">
            <div className="flex flex-col items-center gap-2">
              <ScoreGauge score={overallScore} />
              <div className={cn(
                'flex items-center gap-1.5 text-sm font-semibold',
                scoreDelta >= 0 ? 'text-green-600' : 'text-red-500',
              )}>
                {scoreDelta >= 0
                  ? <TrendingUp className="w-4 h-4" />
                  : <TrendingDown className="w-4 h-4" />}
                {scoreDelta >= 0 ? '+' : ''}{scoreDelta}% vs mês anterior
              </div>
            </div>

            {/* Top-line KPIs */}
            <div className="flex-1 grid grid-cols-2 gap-4 w-full">
              {[
                {
                  label: 'Frameworks ativos',
                  value: `${compliantFw} / ${activeFrameworks}`,
                  sub: 'em conformidade',
                  icon: Shield,
                  color: 'bg-indigo-50 text-indigo-600',
                },
                {
                  label: 'Riscos críticos abertos',
                  value: criticalRisks.length,
                  sub: `+ ${highRisks.length} elevados`,
                  icon: AlertTriangle,
                  color: 'bg-red-50 text-red-600',
                },
                {
                  label: 'CAPAs em atraso',
                  value: overdueCapas.length,
                  sub: `de ${capaList.length} totais`,
                  icon: Clock,
                  color: 'bg-orange-50 text-orange-600',
                },
                {
                  label: 'Auditorias este trimestre',
                  value: thisQtrAudits.length,
                  sub: `${thisQtrAudits.filter((a: any) => a.status === 'COMPLETED').length} concluídas`,
                  icon: Target,
                  color: 'bg-green-50 text-green-600',
                },
              ].map(kpi => {
                const Icon = kpi.icon;
                return (
                  <div key={kpi.label} className="bg-gray-50 rounded-xl p-4 flex items-start gap-3">
                    <div className={cn('p-2 rounded-lg flex-shrink-0', kpi.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-gray-900">{kpi.value}</p>
                      <p className="text-xs font-medium text-gray-700 mt-0.5">{kpi.label}</p>
                      <p className="text-xs text-gray-400">{kpi.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick stats from pack data */}
          {(packData) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Riscos Alto', value: packData.stats?.risks ?? 0, color: 'text-red-600', bg: 'bg-red-50' },
                { label: 'CAPAs Abertos', value: packData.stats?.openCapas ?? 0, color: 'text-orange-600', bg: 'bg-orange-50' },
                { label: 'Evidências Expirando', value: packData.stats?.evidenceExpiring ?? 0, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Auditorias Concluídas', value: packData.stats?.completedAudits ?? 0, color: 'text-green-600', bg: 'bg-green-50' },
              ].map(s => (
                <div key={s.label} className={cn('rounded-xl p-4 text-center', s.bg)}>
                  <p className={cn('text-3xl font-black', s.color)}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Policy stats */}
          {policyData && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" /> Estado das Políticas
              </h3>
              <div className="flex flex-wrap gap-3">
                {[
                  { label: 'Aprovadas',   value: policyData.byStatus?.APPROVED ?? 0,   color: 'text-green-600',  bg: 'bg-green-50'  },
                  { label: 'Em revisão',  value: policyData.byStatus?.IN_REVIEW ?? 0,  color: 'text-amber-600',  bg: 'bg-amber-50'  },
                  { label: 'Rascunho',    value: policyData.byStatus?.DRAFT ?? 0,       color: 'text-gray-600',   bg: 'bg-gray-50'   },
                  { label: 'Arquivadas',  value: policyData.byStatus?.ARCHIVED ?? 0,    color: 'text-red-600',    bg: 'bg-red-50'    },
                ].map(s => (
                  <div key={s.label} className={cn('rounded-xl px-4 py-3 flex items-center gap-2', s.bg)}>
                    <span className={cn('text-xl font-black', s.color)}>{s.value}</span>
                    <span className="text-xs text-gray-500">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB: Evolução do Score
      ════════════════════════════════════════════════════════ */}
      {(activeTab === 'score') && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Evolução do Score de Conformidade
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Últimos 6 meses · por framework</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap justify-end">
                {[
                  { key: 'iso27001', label: 'ISO 27001', color: '#2563eb' },
                  { key: 'gdpr',     label: 'GDPR',      color: '#16a34a' },
                  { key: 'nis2',     label: 'NIS2',       color: '#7c3aed' },
                ].map(fw => (
                  <div key={fw.key} className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 rounded" style={{ backgroundColor: fw.color }} />
                    <span className="text-xs text-gray-500">{fw.label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 rounded border-t-2 border-dashed border-red-400" />
                  <span className="text-xs text-gray-500">Limite 80%</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={SCORE_TREND_6M} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip
                  contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,.1)' }}
                  formatter={(v: number, name: string) => [`${v}%`, name === 'iso27001' ? 'ISO 27001' : name.toUpperCase()]}
                />
                <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: '80%', position: 'right', fontSize: 10, fill: '#ef4444' }} />
                <Line type="monotone" dataKey="iso27001" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="gdpr"     stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4, fill: '#16a34a', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="nis2"     stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 4, fill: '#7c3aed', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Domain scores horizontal bars */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" /> Score Atual por Framework
            </h3>
            <div className="space-y-4">
              {frameworkScores.map((fw: any) => {
                const { text, stroke } = scoreColor(fw.score);
                return (
                  <div key={fw.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-700">{fw.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-sm font-bold', text)}>{fw.score}%</span>
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium border',
                          fw.score >= 80 ? 'bg-green-50 text-green-700 border-green-200'
                            : fw.score >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-red-50 text-red-700 border-red-200',
                        )}>
                          {fw.score >= 80 ? 'Conforme' : fw.score >= 50 ? 'Parcial' : 'Não conforme'}
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(fw.score, 100)}%`, backgroundColor: stroke }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB: Top Riscos
      ════════════════════════════════════════════════════════ */}
      {(activeTab === 'riscos') && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" /> Top 5 Riscos para o Conselho
                </h3>
                {(criticalRisks.length + highRisks.length) > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {criticalRisks.length + highRisks.length} riscos críticos/elevados requerem atenção da gestão de topo
                  </p>
                )}
              </div>
              <Link href="/risks" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                Ver todos <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {topRisks.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle className="w-10 h-10 text-green-300 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Sem riscos críticos ou elevados registados</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {/* Table header */}
                <div className="grid grid-cols-12 gap-3 px-6 py-2.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <div className="col-span-1">Nível</div>
                  <div className="col-span-4">Risco</div>
                  <div className="col-span-1 text-center">Prob.</div>
                  <div className="col-span-1 text-center">Impacto</div>
                  <div className="col-span-3">Responsável</div>
                  <div className="col-span-2">Estado</div>
                </div>
                {topRisks.map((risk: any, i: number) => {
                  const level = risk.level ?? risk.riskLevel ?? 'HIGH';
                  return (
                    <div key={risk.id ?? i} className="grid grid-cols-12 gap-3 px-6 py-4 items-center hover:bg-gray-50 transition-colors">
                      <div className="col-span-1">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border', heatColor(level))}>
                          {level === 'CRITICAL' ? '🔴' : '🟠'}
                        </span>
                      </div>
                      <div className="col-span-4">
                        <p className="text-sm font-semibold text-gray-900 line-clamp-1">{risk.title ?? risk.name}</p>
                        {risk.category && <p className="text-xs text-gray-400 mt-0.5">{risk.category}</p>}
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="text-sm font-bold text-gray-700">{risk.likelihood ?? '—'}</span>
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="text-sm font-bold text-gray-700">{risk.impact ?? '—'}</span>
                      </div>
                      <div className="col-span-3">
                        <span className="text-xs text-gray-600">
                          {risk.owner ?? risk.assignee?.firstName
                            ? `${risk.assignee?.firstName ?? risk.owner} ${risk.assignee?.lastName ?? ''}`.trim()
                            : <span className="text-red-500 font-medium">Sem responsável</span>}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium',
                          risk.treatmentStatus === 'MITIGATED' ? 'bg-green-100 text-green-700' :
                          risk.treatmentStatus === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700',
                        )}>
                          {risk.treatmentStatus === 'MITIGATED' ? 'Mitigado'
                           : risk.treatmentStatus === 'IN_PROGRESS' ? 'Em curso'
                           : 'Pendente'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB: Conformidade por Framework
      ════════════════════════════════════════════════════════ */}
      {(activeTab === 'frameworks') && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" /> Conformidade por Framework
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={frameworkScores}
                layout="vertical"
                margin={{ top: 0, right: 60, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#374151' }} tickLine={false} axisLine={false} width={80} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                  formatter={(v: number) => [`${v}%`, 'Score']}
                />
                <ReferenceLine x={80} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5} />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={28}>
                  {frameworkScores.map((fw: any, i: number) => (
                    <Cell
                      key={i}
                      fill={fw.score >= 80 ? '#16a34a' : fw.score >= 50 ? '#ca8a04' : '#dc2626'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Framework detail cards */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {frameworkScores.map((fw: any) => {
                const { text, bg, border, stroke } = scoreColor(fw.score);
                return (
                  <div key={fw.name} className={cn('rounded-xl p-4 border flex items-center gap-4', bg, border)}>
                    <div className={cn('text-3xl font-black', text)}>{fw.score}%</div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{fw.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${fw.score}%`, backgroundColor: stroke }} />
                        </div>
                        <span className={cn('text-xs font-bold', text)}>
                          {fw.score >= 80 ? 'Conforme' : fw.score >= 50 ? 'Parcial' : 'Não conforme'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB: Itens de Ação para o Conselho
      ════════════════════════════════════════════════════════ */}
      {(activeTab === 'acoes') && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Flag className="w-5 h-5 text-orange-500" /> Itens de Ação para Decisão do Conselho
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {actionItems.length} {actionItems.length === 1 ? 'item requer' : 'itens requerem'} atenção ou decisão executiva
              </p>
            </div>

            {actionItems.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle className="w-10 h-10 text-green-300 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Sem itens de ação pendentes para o Conselho</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {actionItems.map((item, i) => (
                  <div key={i} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                    <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold mt-0.5 shrink-0', PRIORITY_BADGE[item.priority])}>
                      {item.priority}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{item.description}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {item.owner && (
                          <span className="text-xs text-gray-500">
                            <Users className="w-3 h-3 inline mr-0.5" />
                            {item.owner}
                          </span>
                        )}
                        {item.deadline && (
                          <span className={cn(
                            'text-xs font-medium',
                            new Date(item.deadline) < now ? 'text-red-500' : 'text-gray-500',
                          )}>
                            <Clock className="w-3 h-3 inline mr-0.5" />
                            {format(new Date(item.deadline), 'dd/MM/yyyy')}
                            {new Date(item.deadline) < now && ' ⚠ Vencido'}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      href={item.href}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium shrink-0 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      Delegar <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Generate board pack CTA */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-6 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h4 className="font-bold text-indigo-900 flex items-center gap-2">
                <Download className="w-5 h-5" /> Gerar Relatório para o Conselho
              </h4>
              <p className="text-sm text-indigo-700/80 mt-0.5">
                Crie um board pack PDF com todos os dados acima, aprovação digital e rastreio de assinaturas.
              </p>
            </div>
            <button
              onClick={() => { setActiveTab('relatorios'); setShowNew(true); }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 shrink-0"
            >
              <Plus className="w-4 h-4" /> Novo Board Pack
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB: Board Packs / Relatórios
      ════════════════════════════════════════════════════════ */}
      {(activeTab === 'relatorios') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* List */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">Board Packs</p>
            {(reports as any[]).length === 0 ? (
              <div className="bg-white rounded-2xl border p-8 text-center">
                <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Sem relatórios</p>
              </div>
            ) : (reports as any[]).map((r: any) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className={cn(
                  'w-full text-left bg-white rounded-2xl border shadow-sm p-4 transition-all hover:shadow-md',
                  selected?.id === r.id ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-gray-100',
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{r.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{r.period}</p>
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_CONFIG[r.status]?.color || '')}>
                    {STATUS_CONFIG[r.status]?.label}
                  </span>
                </div>
                {r.signoffs?.length > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {r.signoffs.filter((s: any) => s.signedAt).length}/{r.signoffs.length} assinaturas
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Detail */}
          {selected ? (
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gray-50 border-b px-5 py-4 flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">{selected.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{selected.period}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold', STATUS_CONFIG[selected.status]?.color || '')}>
                    {STATUS_CONFIG[selected.status]?.label}
                  </span>
                  {selected.status === 'DRAFT' && (
                    <button
                      onClick={() => { setEditForm({ title: selected.title, period: selected.period, sections: selected.sections ?? [] }); setShowEdit(true); }}
                      className="flex items-center gap-1.5 text-xs text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-xl font-medium"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </button>
                  )}
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Pack data stats */}
                {packData && (
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Riscos Alto',          value: packData.stats?.risks ?? 0,             color: 'text-red-600 bg-red-50'     },
                      { label: 'CAPAs Abertos',         value: packData.stats?.openCapas ?? 0,         color: 'text-orange-600 bg-orange-50' },
                      { label: 'Evidências Expirando',  value: packData.stats?.evidenceExpiring ?? 0,  color: 'text-amber-600 bg-amber-50'  },
                      { label: 'Auditorias Concluídas', value: packData.stats?.completedAudits ?? 0,   color: 'text-green-600 bg-green-50'  },
                    ].map(s => (
                      <div key={s.label} className={cn('rounded-xl p-3 text-center', s.color.split(' ')[1])}>
                        <p className={cn('text-2xl font-black', s.color.split(' ')[0])}>{s.value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Signoffs */}
                {selected.signoffs?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assinaturas</p>
                    <div className="space-y-2">
                      {selected.signoffs.map((s: any) => (
                        <div
                          key={s.id}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-xl',
                            s.signedAt ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-200',
                          )}
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                            s.signedAt ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600',
                          )}>
                            {s.signedAt ? '✓' : s.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                            <p className="text-xs text-gray-500">{s.role} · {s.email}</p>
                          </div>
                          {s.signedAt
                            ? <span className="text-xs text-green-600 font-medium">{formatDate(s.signedAt)}</span>
                            : <span className="text-xs text-gray-400">Pendente</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Request signoff */}
                {selected.status === 'DRAFT' && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-indigo-900">Solicitar aprovação do Órgão de Gestão</p>
                    {signerForm.map((signer, i) => (
                      <div key={i} className="grid grid-cols-3 gap-2">
                        <input className={inp} value={signer.name}  onChange={e => setSignerForm(p => p.map((s, j) => j === i ? { ...s, name: e.target.value }  : s))} placeholder="Nome"  />
                        <input className={inp} value={signer.email} onChange={e => setSignerForm(p => p.map((s, j) => j === i ? { ...s, email: e.target.value } : s))} placeholder="Email" />
                        <input className={inp} value={signer.role}  onChange={e => setSignerForm(p => p.map((s, j) => j === i ? { ...s, role: e.target.value }  : s))} placeholder="Cargo" />
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSignerForm(p => [...p, { name: '', email: '', role: '' }])}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        + Adicionar signatário
                      </button>
                      <button
                        onClick={() => requestSignoffMutation.mutate({ id: selected.id, signers: signerForm.filter(s => s.name && s.email) })}
                        disabled={requestSignoffMutation.isPending}
                        className="ml-auto flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-semibold"
                      >
                        {requestSignoffMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Enviar para aprovação
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center py-20">
              <div className="text-center">
                <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Selecione um relatório</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          PRINT-ONLY: full summary (score + risks + frameworks)
      ════════════════════════════════════════════════════════ */}
      <div className="hidden print:block space-y-8 mt-8">
        <div className="page-break-inside-avoid">
          <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">Top Riscos</h2>
          {topRisks.length === 0 ? (
            <p className="text-sm text-gray-400">Sem riscos críticos ou elevados.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Nível</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Risco</th>
                  <th className="text-center py-2 px-3 font-semibold text-gray-600">Prob.</th>
                  <th className="text-center py-2 px-3 font-semibold text-gray-600">Impacto</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Responsável</th>
                </tr>
              </thead>
              <tbody>
                {topRisks.map((risk: any, i: number) => (
                  <tr key={i} className="border-b">
                    <td className="py-2 px-3">{risk.level ?? risk.riskLevel}</td>
                    <td className="py-2 px-3 font-medium">{risk.title ?? risk.name}</td>
                    <td className="py-2 px-3 text-center">{risk.likelihood ?? '—'}</td>
                    <td className="py-2 px-3 text-center">{risk.impact ?? '—'}</td>
                    <td className="py-2 px-3 text-gray-500">{risk.assignee?.firstName ?? risk.owner ?? 'Sem responsável'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="page-break-inside-avoid">
          <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">Conformidade por Framework</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-2 px-3 font-semibold text-gray-600">Framework</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-600">Score</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-600">Estado</th>
              </tr>
            </thead>
            <tbody>
              {frameworkScores.map((fw: any) => (
                <tr key={fw.name} className="border-b">
                  <td className="py-2 px-3 font-medium">{fw.name}</td>
                  <td className="py-2 px-3 text-right">{fw.score}%</td>
                  <td className="py-2 px-3 text-right">
                    {fw.score >= 80 ? 'Conforme' : fw.score >= 50 ? 'Parcial' : 'Não conforme'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="page-break-inside-avoid">
          <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">Itens de Ação</h2>
          {actionItems.length === 0 ? (
            <p className="text-sm text-gray-400">Sem itens de ação pendentes.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Prioridade</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Descrição</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Responsável</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Prazo</th>
                </tr>
              </thead>
              <tbody>
                {actionItems.map((item, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2 px-3">{item.priority}</td>
                    <td className="py-2 px-3">{item.description}</td>
                    <td className="py-2 px-3 text-gray-500">{item.owner ?? '—'}</td>
                    <td className="py-2 px-3 text-gray-500">
                      {item.deadline ? format(new Date(item.deadline), 'dd/MM/yyyy') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center pt-4 border-t">
          iComply · Confidencial · Gerado em {format(now, "dd/MM/yyyy 'às' HH:mm")}
        </p>
      </div>

      {/* ════════════════════════════════════════════════════════
          MODALS
      ════════════════════════════════════════════════════════ */}

      {/* Edit modal */}
      {showEdit && selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Editar Relatório</h2>
              <button onClick={() => setShowEdit(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Título</label>
                <input className={inp} value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Período</label>
                <input className={inp} value={editForm.period} onChange={e => setEditForm(p => ({ ...p, period: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Secções a incluir</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {SECTIONS.map(s => (
                    <label
                      key={s.key}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-xs transition-colors',
                        editForm.sections.includes(s.key)
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                          : 'bg-gray-50 border-gray-200 text-gray-600',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={editForm.sections.includes(s.key)}
                        onChange={e => setEditForm(p => ({
                          ...p,
                          sections: e.target.checked ? [...p.sections, s.key] : p.sections.filter((x: string) => x !== s.key),
                        }))}
                        className="w-3.5 h-3.5"
                      />
                      {s.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowEdit(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
                <button
                  onClick={() => updateMutation.mutate(editForm)}
                  disabled={!editForm.title || updateMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Guardar alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New report modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Novo Board Pack</h2>
              <button onClick={() => setShowNew(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Título</label>
                <input className={inp} value={newForm.title} onChange={e => setNewForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Relatório Trimestral Q3 2025" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Período</label>
                <input className={inp} value={newForm.period} onChange={e => setNewForm(p => ({ ...p, period: e.target.value }))} placeholder="Ex: Q3 2025" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Secções a incluir</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {SECTIONS.map(s => (
                    <label
                      key={s.key}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-xs transition-colors',
                        newForm.sections.includes(s.key)
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                          : 'bg-gray-50 border-gray-200 text-gray-600',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={newForm.sections.includes(s.key)}
                        onChange={e => setNewForm(p => ({
                          ...p,
                          sections: e.target.checked ? [...p.sections, s.key] : p.sections.filter(x => x !== s.key),
                        }))}
                        className="w-3.5 h-3.5"
                      />
                      {s.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowNew(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
                <button
                  onClick={() => createMutation.mutate({ ...newForm })}
                  disabled={!newForm.title || createMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  Criar Relatório
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
