'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  orgApi, tasksApi, risksApi, reportsApi, policiesApi, gdprApi,
  auditLogsApi, evidenceApi, auditsApi, capaApi,
} from '@/lib/api';
import {
  AlertTriangle, AlertCircle, Activity, ChevronRight, CheckCircle2, XCircle,
  TrendingUp, TrendingDown, BarChart3, Calendar, Shield, Target, BookOpen,
  ShieldCheck, FileText, Clock, Plus, CheckSquare, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { format, formatDistanceToNow, differenceInDays, isValid, addDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { TaskDetailPanel } from '@/components/tasks/task-detail-panel';
import { HelpButton } from '@/components/help/HelpButton';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';

// ─────────────────────────────────────────────────────────────────
// SECTION 1 — KPI Strip
// ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  trend?: number;
  href?: string;
}

function KpiCard({ title, value, sub, icon: Icon, iconBg, iconColor, trend, href }: KpiCardProps) {
  const inner = (
    <div className={cn(
      'bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 transition-all',
      href && 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer',
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-500 truncate">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1 leading-none">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1.5 leading-tight">{sub}</p>}
        </div>
        <div className={cn('p-2.5 rounded-xl shrink-0', iconBg)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={cn(
          'flex items-center gap-1 text-xs font-medium',
          trend > 0 ? 'text-red-500' : trend < 0 ? 'text-green-600' : 'text-gray-400',
        )}>
          {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : null}
          {trend !== 0 ? `${trend > 0 ? '+' : ''}${trend} vs mês anterior` : 'Sem variação'}
        </div>
      )}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function KpiStrip({ dashData, summary, riskList, capaList, auditList }: {
  dashData: any;
  summary: any;
  riskList: any[];
  capaList: any[];
  auditList: any[];
}) {
  const complianceScore = summary?.complianceScore ?? dashData?.complianceScore ?? 0;
  const openRisks = dashData?.risks?.open ?? riskList.filter((r: any) => r.status !== 'CLOSED').length;
  const criticalRisks = riskList.filter((r: any) => r.level === 'CRITICAL').length;
  const activeAudits = auditList.filter((a: any) => a.status === 'IN_PROGRESS').length;
  const pendingCapas = capaList.filter((c: any) => c.status !== 'CLOSED' && c.status !== 'COMPLETED').length;

  const now = new Date();
  const in30 = addDays(now, 30);
  const upcoming = [
    ...riskList.filter((r: any) => r.reviewDate && isValid(new Date(r.reviewDate)) && new Date(r.reviewDate) <= in30 && new Date(r.reviewDate) >= now),
    ...capaList.filter((c: any) => c.dueDate && isValid(new Date(c.dueDate)) && new Date(c.dueDate) <= in30 && new Date(c.dueDate) >= now),
    ...auditList.filter((a: any) => a.scheduledDate && isValid(new Date(a.scheduledDate)) && new Date(a.scheduledDate) <= in30 && new Date(a.scheduledDate) >= now),
  ];
  const upcomingDeadlines = upcoming.length;
  const criticalIncidents = dashData?.incidents?.critical ?? 0;

  const scoreColor =
    complianceScore >= 80 ? { bg: 'bg-green-100', icon: 'text-green-600' } :
    complianceScore >= 60 ? { bg: 'bg-yellow-100', icon: 'text-yellow-600' } :
    { bg: 'bg-red-100', icon: 'text-red-600' };

  const kpis: KpiCardProps[] = [
    {
      title: 'Pontuação de Conformidade',
      value: `${complianceScore}%`,
      sub: complianceScore >= 80 ? 'Em conformidade' : complianceScore >= 60 ? 'Atenção necessária' : 'Nível crítico',
      icon: ShieldCheck,
      iconBg: scoreColor.bg,
      iconColor: scoreColor.icon,
      href: '/reports',
    },
    {
      title: 'Riscos Abertos',
      value: openRisks,
      sub: criticalRisks > 0 ? `${criticalRisks} crítico${criticalRisks !== 1 ? 's' : ''}` : 'Nenhum crítico',
      icon: AlertTriangle,
      iconBg: criticalRisks > 0 ? 'bg-red-100' : 'bg-orange-100',
      iconColor: criticalRisks > 0 ? 'text-red-600' : 'text-orange-600',
      href: '/risks',
    },
    {
      title: 'Auditorias Ativas',
      value: activeAudits,
      sub: `${auditList.length} total`,
      icon: Target,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      href: '/audits',
    },
    {
      title: 'CAPAs Pendentes',
      value: pendingCapas,
      sub: pendingCapas > 0 ? 'Requer seguimento' : 'Tudo resolvido',
      icon: AlertCircle,
      iconBg: pendingCapas > 0 ? 'bg-amber-100' : 'bg-green-100',
      iconColor: pendingCapas > 0 ? 'text-amber-600' : 'text-green-600',
      href: '/capa',
    },
    {
      title: 'Prazos Próximos (30d)',
      value: upcomingDeadlines,
      sub: 'Itens nos próximos 30 dias',
      icon: Clock,
      iconBg: upcomingDeadlines > 5 ? 'bg-orange-100' : 'bg-blue-100',
      iconColor: upcomingDeadlines > 5 ? 'text-orange-600' : 'text-blue-600',
    },
    {
      title: 'Incidentes Críticos',
      value: criticalIncidents,
      sub: criticalIncidents > 0 ? 'Requer ação imediata' : 'Nenhum ativo',
      icon: Zap,
      iconBg: criticalIncidents > 0 ? 'bg-red-100' : 'bg-gray-100',
      iconColor: criticalIncidents > 0 ? 'text-red-600' : 'text-gray-500',
      href: '/gdpr',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
      {kpis.map((kpi) => <KpiCard key={kpi.title} {...kpi} />)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SECTION 2 — Framework Coverage Grid
// ─────────────────────────────────────────────────────────────────

interface FrameworkItem {
  name: string;
  key: string;
  score: number;
  iconColor: string;
  iconBg: string;
}

const FRAMEWORKS: FrameworkItem[] = [
  { name: 'GDPR',         key: 'GDPR',        score: 0, iconColor: 'text-blue-600',   iconBg: 'bg-blue-50'   },
  { name: 'NIS2',         key: 'NIS2',        score: 0, iconColor: 'text-indigo-600', iconBg: 'bg-indigo-50' },
  { name: 'DORA',         key: 'DORA',        score: 0, iconColor: 'text-violet-600', iconBg: 'bg-violet-50' },
  { name: 'ISO 27001',    key: 'ISO27001',    score: 0, iconColor: 'text-green-600',  iconBg: 'bg-green-50'  },
  { name: 'SOC 2',        key: 'SOC2',        score: 0, iconColor: 'text-cyan-600',   iconBg: 'bg-cyan-50'   },
  { name: 'AML',          key: 'AML',         score: 0, iconColor: 'text-rose-600',   iconBg: 'bg-rose-50'   },
  { name: 'CIS Controls', key: 'CIS',         score: 0, iconColor: 'text-orange-600', iconBg: 'bg-orange-50' },
  { name: 'ISO 27701',    key: 'ISO27701',    score: 0, iconColor: 'text-teal-600',   iconBg: 'bg-teal-50'   },
];

function FrameworkChip({ score }: { score: number }) {
  if (score >= 80) return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Em Conformidade</span>;
  if (score >= 50) return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Em Risco</span>;
  if (score > 0)   return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Crítico</span>;
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Sem dados</span>;
}

function FrameworkGrid({ domainScores }: { domainScores: any[] }) {
  const enriched = FRAMEWORKS.map(fw => {
    const match = domainScores.find(d =>
      d.domain?.toLowerCase().includes(fw.key.toLowerCase()) ||
      fw.key.toLowerCase().includes(d.domain?.toLowerCase())
    );
    return { ...fw, score: match?.score ?? 0 };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" /> Cobertura por Framework
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
        {enriched.map(fw => (
          <div key={fw.key} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className={cn('p-1.5 rounded-lg', fw.iconBg)}>
                <Shield className={cn('w-3.5 h-3.5', fw.iconColor)} />
              </div>
              <span className="text-xs font-semibold text-gray-800 leading-tight">{fw.name}</span>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className={cn('text-lg font-bold', fw.score >= 80 ? 'text-green-600' : fw.score >= 50 ? 'text-yellow-600' : fw.score > 0 ? 'text-red-600' : 'text-gray-300')}>
                  {fw.score > 0 ? `${fw.score}%` : '—'}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${fw.score}%`,
                    backgroundColor: fw.score >= 80 ? '#16a34a' : fw.score >= 50 ? '#ca8a04' : fw.score > 0 ? '#dc2626' : '#e5e7eb',
                  }}
                />
              </div>
            </div>
            <FrameworkChip score={fw.score} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SECTION 3 — Charts
// ─────────────────────────────────────────────────────────────────

const TREND_FALLBACK = [
  { month: 'Jan', score: 58 },
  { month: 'Fev', score: 63 },
  { month: 'Mar', score: 67 },
  { month: 'Abr', score: 72 },
  { month: 'Mai', score: 78 },
  { month: 'Jun', score: 84 },
];

const RISK_SEVERITY_FALLBACK = [
  { label: 'Crítico',  count: 0, fill: '#dc2626' },
  { label: 'Alto',     count: 0, fill: '#ea580c' },
  { label: 'Médio',    count: 0, fill: '#ca8a04' },
  { label: 'Baixo',    count: 0, fill: '#16a34a' },
];

function ComplianceTrendChart({ trendData }: { trendData: typeof TREND_FALLBACK }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-blue-600" /> Evolução de Conformidade — 6 Meses
      </h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trendData} margin={{ top: 5, right: 16, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              formatter={(value: number) => [`${value}%`, 'Score']}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#1d4ed8' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RiskSeverityChart({ riskList }: { riskList: any[] }) {
  const counts = RISK_SEVERITY_FALLBACK.map(item => ({
    ...item,
    count:
      item.label === 'Crítico' ? riskList.filter((r: any) => r.level === 'CRITICAL').length :
      item.label === 'Alto'    ? riskList.filter((r: any) => r.level === 'HIGH').length :
      item.label === 'Médio'   ? riskList.filter((r: any) => r.level === 'MEDIUM').length :
      riskList.filter((r: any) => r.level === 'LOW').length,
  }));

  const total = counts.reduce((s, c) => s + c.count, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-orange-500" /> Riscos por Severidade
      </h3>
      {total === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-400 mb-2" />
          <p className="text-sm text-gray-400">Nenhum risco registado</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={counts} margin={{ top: 0, right: 8, left: -28, bottom: 0 }} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                formatter={(value: number) => [value, 'Riscos']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {counts.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {counts.map(c => (
              <div key={c.label} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.fill }} />
                <span className="text-xs text-gray-600 flex-1">{c.label}</span>
                <span className="text-xs font-semibold text-gray-800">{c.count}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SECTION 4 — Three-column activity row
// ─────────────────────────────────────────────────────────────────

function RecentActivity() {
  const { data } = useQuery({
    queryKey: ['audit-logs', 'recent'],
    queryFn: () => auditLogsApi.list({ limit: 8 }).then(r => r.data),
  });
  const logs: any[] = data?.data ?? data ?? [];

  const ACTION_ICON: Record<string, React.ElementType> = {
    CREATE: CheckCircle2,
    UPDATE: Activity,
    DELETE: XCircle,
  };
  const ACTION_COLOR: Record<string, string> = {
    CREATE: 'text-green-500',
    UPDATE: 'text-blue-500',
    DELETE: 'text-red-400',
  };
  const entityLabel = (entity: string) => {
    const map: Record<string, string> = {
      task: 'Tarefa', risk: 'Risco', project: 'Projeto', policy: 'Política',
      dpia: 'DPIA', breach: 'Incidente', audit: 'Auditoria', capa: 'CAPA',
      evidence: 'Evidência', user: 'Utilizador',
    };
    return map[entity?.toLowerCase()] ?? entity;
  };
  const actionLabel = (action: string) => {
    if (action?.toLowerCase() === 'create') return 'criou';
    if (action?.toLowerCase() === 'update') return 'atualizou';
    return 'apagou';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Activity className="w-4 h-4 text-purple-600" /> Atividade Recente
      </h3>
      {logs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-6">
          <p className="text-sm text-gray-400">Sem atividade recente</p>
        </div>
      ) : (
        <div className="space-y-3 flex-1">
          {logs.slice(0, 8).map((log: any, i: number) => {
            const Icon = ACTION_ICON[log.action] ?? Activity;
            const color = ACTION_COLOR[log.action] ?? 'text-gray-400';
            return (
              <div key={log.id ?? i} className="flex items-start gap-2.5">
                <Icon className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', color)} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 leading-snug">
                    <span className="font-medium">{log.user?.firstName ?? 'Sistema'}</span>
                    {' '}{actionLabel(log.action)}{' '}
                    <span className="font-medium">{entityLabel(log.entity)}</span>
                    {log.entityName && <span className="text-gray-500"> — {log.entityName}</span>}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {log.createdAt ? formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: pt }) : ''}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MyOpenTasks({ onOpenDetail }: { onOpenDetail: (id: string) => void }) {
  const { user } = useAuthStore();
  const { data } = useQuery({
    queryKey: ['tasks', 'mine-dashboard'],
    queryFn: () => tasksApi.list({ assigneeId: user?.id, limit: 10 }).then(r => r.data),
    enabled: !!user?.id,
  });
  const tasks: any[] = data?.data ?? [];
  const active = tasks.filter((t: any) => t.status !== 'DONE' && t.status !== 'CANCELLED');

  const STATUS_DOT: Record<string, string> = {
    TODO:        'bg-gray-300',
    IN_PROGRESS: 'bg-blue-500',
    IN_REVIEW:   'bg-purple-500',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-blue-600" /> As Minhas Tarefas
        </h3>
        <Link href="/tasks" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
          Ver tudo <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      {active.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-400 mb-2" />
          <p className="text-sm text-gray-500">Em dia — sem tarefas abertas</p>
        </div>
      ) : (
        <div className="space-y-1 flex-1">
          {active.slice(0, 5).map((task: any) => {
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
            return (
              <button
                key={task.id}
                onClick={() => onOpenDetail(task.id)}
                className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left group"
              >
                <span className={cn('w-2 h-2 rounded-full shrink-0', STATUS_DOT[task.status] ?? 'bg-gray-300')} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-800 truncate group-hover:text-blue-600 transition-colors">{task.title}</p>
                  <p className="text-[10px] text-gray-400 truncate">{task.project?.name}</p>
                </div>
                {task.dueDate && (
                  <span className={cn('text-[10px] shrink-0', isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400')}>
                    {format(new Date(task.dueDate), 'dd/MM')}
                    {isOverdue && ' ⚠'}
                  </span>
                )}
              </button>
            );
          })}
          {active.length > 5 && (
            <Link href="/tasks" className="block text-center text-xs text-gray-400 hover:text-blue-600 pt-1 transition-colors">
              + {active.length - 5} mais
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function UpcomingDeadlines({ riskList, capaList, auditList }: { riskList: any[]; capaList: any[]; auditList: any[] }) {
  const now = new Date();
  const in14 = addDays(now, 14);

  type DeadlineItem = { label: string; type: string; date: Date; href: string; daysLeft: number };

  const items: DeadlineItem[] = [
    ...riskList
      .filter((r: any) => r.reviewDate && isValid(new Date(r.reviewDate)) && new Date(r.reviewDate) >= now && new Date(r.reviewDate) <= in14)
      .map((r: any) => ({
        label: r.title ?? 'Risco',
        type: 'Risco',
        date: new Date(r.reviewDate),
        href: '/risks',
        daysLeft: differenceInDays(new Date(r.reviewDate), now),
      })),
    ...capaList
      .filter((c: any) => c.dueDate && isValid(new Date(c.dueDate)) && new Date(c.dueDate) >= now && new Date(c.dueDate) <= in14)
      .map((c: any) => ({
        label: c.title ?? 'CAPA',
        type: 'CAPA',
        date: new Date(c.dueDate),
        href: '/capa',
        daysLeft: differenceInDays(new Date(c.dueDate), now),
      })),
    ...auditList
      .filter((a: any) => a.scheduledDate && isValid(new Date(a.scheduledDate)) && new Date(a.scheduledDate) >= now && new Date(a.scheduledDate) <= in14)
      .map((a: any) => ({
        label: a.name ?? a.title ?? 'Auditoria',
        type: 'Auditoria',
        date: new Date(a.scheduledDate),
        href: '/audits',
        daysLeft: differenceInDays(new Date(a.scheduledDate), now),
      })),
  ].sort((a, b) => a.daysLeft - b.daysLeft);

  const TYPE_COLOR: Record<string, string> = {
    Risco: 'bg-orange-100 text-orange-700',
    CAPA:  'bg-amber-100 text-amber-700',
    Auditoria: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-orange-500" /> Prazos dos Próximos 14 Dias
      </h3>
      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-400 mb-2" />
          <p className="text-sm text-gray-500">Sem prazos nos próximos 14 dias</p>
        </div>
      ) : (
        <div className="space-y-2 flex-1">
          {items.map((item, i) => (
            <Link key={i} href={item.href} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors group">
              <div className="flex flex-col items-center justify-center w-9 h-9 bg-gray-50 rounded-lg shrink-0 border border-gray-100">
                <span className="text-[10px] text-gray-400 leading-none">{format(item.date, 'MMM', { locale: pt })}</span>
                <span className="text-sm font-bold text-gray-700 leading-none">{format(item.date, 'dd')}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-800 truncate group-hover:text-blue-600">{item.label}</p>
                <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', TYPE_COLOR[item.type] ?? 'bg-gray-100 text-gray-500')}>
                  {item.type}
                </span>
              </div>
              <span className={cn('text-xs font-semibold shrink-0', item.daysLeft <= 3 ? 'text-red-500' : item.daysLeft <= 7 ? 'text-orange-500' : 'text-gray-400')}>
                {item.daysLeft === 0 ? 'Hoje' : `${item.daysLeft}d`}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SECTION 5 — Quick Actions
// ─────────────────────────────────────────────────────────────────

function QuickActionsStrip() {
  const actions = [
    { href: '/risks?new=1',    label: '+ Novo Risco',     icon: AlertTriangle, color: 'bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-100' },
    { href: '/audits?new=1',   label: '+ Nova Auditoria', icon: Target,        color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-100' },
    { href: '/capa?new=1',     label: '+ Nova CAPA',      icon: AlertCircle,   color: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-100'    },
    { href: '/evidence?new=1', label: '+ Nova Evidência', icon: FileText,      color: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-100'   },
  ];
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {actions.map(({ href, label, icon: Icon, color }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'flex items-center gap-2 px-5 py-3 rounded-xl border font-medium text-sm transition-colors',
            color,
          )}
        >
          <Plus className="w-4 h-4" />
          {label}
        </Link>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  // ── Data fetching ───────────────────────────────────────────────
  const { data: dashData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => orgApi.dashboard().then(r => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: () => reportsApi.summary().then(r => r.data),
  });

  const { data: riskListData } = useQuery({
    queryKey: ['risks', 'list', {}],
    queryFn: () => risksApi.list({ limit: 200 }).then(r => r.data),
  });

  const { data: capaListData } = useQuery({
    queryKey: ['capa', 'list', {}],
    queryFn: () => capaApi.list({ limit: 100 }).then(r => r.data),
  });

  const { data: auditListData } = useQuery({
    queryKey: ['audits', 'list', {}],
    queryFn: () => auditsApi.list({ limit: 100 }).then(r => r.data),
  });

  const riskList: any[] = riskListData?.data ?? [];
  const capaList: any[] = capaListData?.data ?? [];
  const auditList: any[] = auditListData?.data ?? [];
  const domainScores: any[] = dashData?.domainScores ?? [];

  // Build compliance trend from domainScores history or use fallback
  const trendData: typeof TREND_FALLBACK = dashData?.scoreTrend ?? TREND_FALLBACK;

  // Greeting
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 19) return 'Boa tarde';
    return 'Boa noite';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting()}{user?.firstName ? `, ${user.firstName}` : ''}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Dashboard Executivo — {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: pt })}
          </p>
        </div>
      </div>

      {/* ── Section 1: KPI Strip ───────────────────────────── */}
      <KpiStrip
        dashData={dashData}
        summary={summary}
        riskList={riskList}
        capaList={capaList}
        auditList={auditList}
      />

      {/* ── Section 2: Framework Coverage Grid ────────────── */}
      <FrameworkGrid domainScores={domainScores} />

      {/* ── Section 3: Charts ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ComplianceTrendChart trendData={trendData} />
        </div>
        <div className="lg:col-span-1">
          <RiskSeverityChart riskList={riskList} />
        </div>
      </div>

      {/* ── Section 4: Three-column activity row ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RecentActivity />
        <MyOpenTasks onOpenDetail={setDetailTaskId} />
        <UpcomingDeadlines riskList={riskList} capaList={capaList} auditList={auditList} />
      </div>

      {/* ── Section 5: Quick Actions ───────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">Ações Rápidas</p>
        <QuickActionsStrip />
      </div>

      {/* Task detail panel */}
      {detailTaskId && (
        <TaskDetailPanel taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />
      )}

      <HelpButton page="dashboard" />
    </div>
  );
}
