'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { orgApi, tasksApi, risksApi, reportsApi, policiesApi, gdprApi, auditLogsApi } from '@/lib/api';
import {
  FolderOpen, CheckSquare, AlertTriangle, FileText,
  Clock, AlertCircle, Target, BookOpen, ShieldCheck,
  TrendingUp, TrendingDown, Activity, ChevronRight,
  Circle, CheckCircle2, XCircle, BarChart3,
} from 'lucide-react';
import { cn, formatDate, getRiskColor, getStatusColor, getPriorityColor, formatRelative } from '@/lib/utils';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { format, formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { TaskDetailPanel } from '@/components/tasks/task-detail-panel';

// ── Compliance Score Ring ─────────────────────────────────────
function ComplianceScoreRing({ score }: { score: number }) {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#16a34a' : score >= 60 ? '#ca8a04' : '#dc2626';

  return (
    <svg width="130" height="130" viewBox="0 0 130 130">
      <circle cx="65" cy="65" r={r} stroke="#e5e7eb" strokeWidth="10" fill="none" />
      <circle
        cx="65" cy="65" r={r}
        stroke={color} strokeWidth="10" fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 65 65)"
        style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
      />
      <text x="65" y="65" textAnchor="middle" dominantBaseline="middle">
        <tspan x="65" dy="-6" fontSize="26" fontWeight="bold" fill={color}>{score}%</tspan>
        <tspan x="65" dy="20" fontSize="10" fill="#6b7280">Conformidade</tspan>
      </text>
    </svg>
  );
}

// ── KPI Card ──────────────────────────────────────────────────
function KpiCard({ title, value, icon: Icon, color, sub, href, trend }: any) {
  const content = (
    <div className={cn(
      'bg-white rounded-2xl p-5 border border-gray-100 shadow-sm transition-all',
      href && 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer',
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 truncate">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1 leading-none">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
        </div>
        <div className={cn('p-2.5 rounded-xl shrink-0', color)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend !== undefined && (
        <div className={cn(
          'mt-3 flex items-center gap-1 text-xs font-medium',
          trend >= 0 ? 'text-red-500' : 'text-green-600',
        )}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(trend)} vs. mês anterior
        </div>
      )}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

// ── My Tasks Widget ───────────────────────────────────────────
function MyTasksWidget({ onOpenDetail }: { onOpenDetail: (id: string) => void }) {
  const { user } = useAuthStore();

  const { data } = useQuery({
    queryKey: ['tasks', 'mine'],
    queryFn: () => tasksApi.list({ assigneeId: user?.id, limit: 10 }).then(r => r.data),
    enabled: !!user?.id,
  });

  const tasks = data?.data ?? [];
  const active = tasks.filter((t: any) => t.status !== 'DONE' && t.status !== 'CANCELLED');

  const STATUS_DOT: Record<string, string> = {
    TODO:        'bg-gray-300',
    IN_PROGRESS: 'bg-blue-500',
    IN_REVIEW:   'bg-purple-500',
    DONE:        'bg-green-500',
    CANCELLED:   'bg-gray-200',
  };
  const STATUS_LABEL: Record<string, string> = {
    TODO: 'A Fazer', IN_PROGRESS: 'Em Curso', IN_REVIEW: 'Em Revisão', DONE: 'Concluída', CANCELLED: 'Cancelada',
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-blue-600" /> O Meu Trabalho
        </h3>
        <Link href="/tasks" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
          Ver todas <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {active.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-400 mb-2" />
          <p className="text-sm text-gray-500">Tudo em dia!</p>
          <p className="text-xs text-gray-400">Sem tarefas atribuídas.</p>
        </div>
      ) : (
        <div className="space-y-1 flex-1">
          {active.slice(0, 6).map((task: any) => {
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
            return (
              <button
                key={task.id}
                onClick={() => onOpenDetail(task.id)}
                className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left group"
              >
                <span className={cn('w-2 h-2 rounded-full shrink-0', STATUS_DOT[task.status] ?? 'bg-gray-300')} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate group-hover:text-blue-600 transition-colors">{task.title}</p>
                  <p className="text-xs text-gray-400 truncate">{task.project?.name}</p>
                </div>
                {task.dueDate && (
                  <span className={cn('text-xs shrink-0', isOverdue ? 'text-red-500 font-medium' : 'text-gray-400')}>
                    {format(new Date(task.dueDate), 'dd/MM')}
                    {isOverdue && ' ⚠'}
                  </span>
                )}
              </button>
            );
          })}
          {active.length > 6 && (
            <Link href="/tasks" className="block text-center text-xs text-gray-400 hover:text-blue-600 pt-1 transition-colors">
              + {active.length - 6} mais
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ── Recent Activity Feed ──────────────────────────────────────
function ActivityFeed() {
  const { data } = useQuery({
    queryKey: ['audit-logs', 'recent'],
    queryFn: () => auditLogsApi.list({ limit: 15 }).then(r => r.data),
  });

  const logs = data?.data ?? data ?? [];

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
      dpia: 'DPIA', breach: 'Violação', audit: 'Auditoria', capa: 'CAPA',
      evidence: 'Evidência', user: 'Utilizador',
    };
    return map[entity?.toLowerCase()] ?? entity;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-600" /> Atividade Recente
        </h3>
      </div>

      {logs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-6">
          <p className="text-sm text-gray-400">Sem atividade recente</p>
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-hidden">
          {logs.slice(0, 10).map((log: any, i: number) => {
            const Icon = ACTION_ICON[log.action] ?? Activity;
            const color = ACTION_COLOR[log.action] ?? 'text-gray-400';
            return (
              <div key={log.id ?? i} className="flex items-start gap-2.5">
                <Icon className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', color)} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 leading-snug">
                    <span className="font-medium">{log.user?.firstName ?? 'Sistema'}</span>
                    {' '}{log.action?.toLowerCase() === 'create' ? 'criou' : log.action?.toLowerCase() === 'update' ? 'atualizou' : 'eliminou'}{' '}
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

// ── Risk Heatmap Summary ──────────────────────────────────────
function RiskSummary() {
  const { data: risks } = useQuery({
    queryKey: ['risks', 'list', {}],
    queryFn: () => risksApi.list({ limit: 50 }).then(r => r.data),
  });

  const list = risks?.data ?? [];
  const high = list.filter((r: any) => r.level === 'HIGH' || r.level === 'CRITICAL');
  const medium = list.filter((r: any) => r.level === 'MEDIUM');
  const low = list.filter((r: any) => r.level === 'LOW');

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" /> Riscos por Nível
        </h3>
        <Link href="/risks" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
          Ver mapa <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-2">
        {[
          { label: 'Críticos / Altos', count: high.length, color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
          { label: 'Médios', count: medium.length, color: 'bg-orange-400', text: 'text-orange-700', bg: 'bg-orange-50' },
          { label: 'Baixos', count: low.length, color: 'bg-green-400', text: 'text-green-700', bg: 'bg-green-50' },
        ].map(r => (
          <div key={r.label} className={cn('flex items-center gap-3 px-3 py-2 rounded-lg', r.bg)}>
            <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', r.color)} />
            <span className={cn('text-xs font-medium flex-1', r.text)}>{r.label}</span>
            <span className={cn('text-sm font-bold', r.text)}>{r.count}</span>
          </div>
        ))}
        {list.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">Sem riscos registados</p>
        )}
      </div>
      {high.length > 0 && (
        <div className="mt-3 border-t pt-3 space-y-1">
          {high.slice(0, 3).map((r: any) => (
            <Link key={r.id} href="/risks" className="flex items-center gap-2 text-xs hover:bg-red-50 px-2 py-1 rounded transition-colors">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
              <span className="text-gray-700 truncate flex-1">{r.title}</span>
              <span className="text-red-600 font-semibold shrink-0">{r.inherentScore}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Module Status Grid ────────────────────────────────────────
function ModuleStatus({ policyStats, gdprStats, dashData, summary }: any) {
  const modules = [
    {
      label: 'Políticas',
      icon: BookOpen,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      href: '/policies',
      stat: policyStats?.byStatus?.APPROVED ?? 0,
      total: policyStats?.total ?? 0,
      statLabel: 'aprovadas',
    },
    {
      label: 'GDPR / ROPA',
      icon: ShieldCheck,
      color: 'text-green-600',
      bg: 'bg-green-50',
      href: '/gdpr',
      stat: gdprStats?.activities?.active ?? 0,
      total: gdprStats?.activities?.total ?? 0,
      statLabel: 'atividades',
    },
    {
      label: 'Auditorias',
      icon: Target,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      href: '/audits',
      stat: summary?.auditsCompleted ?? 0,
      total: summary?.totalAudits ?? 0,
      statLabel: 'concluídas',
    },
    {
      label: 'CAPA',
      icon: AlertCircle,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      href: '/capa',
      stat: summary?.openCapas ?? 0,
      total: summary?.totalCapas ?? 0,
      statLabel: 'em aberto',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-gray-500" /> Estado dos Módulos
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {modules.map(m => {
          const Icon = m.icon;
          const pct = m.total > 0 ? Math.round((m.stat / m.total) * 100) : 0;
          return (
            <Link key={m.label} href={m.href} className="flex flex-col gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
              <div className="flex items-center gap-2">
                <div className={cn('p-1.5 rounded-lg', m.bg)}>
                  <Icon className={cn('w-3.5 h-3.5', m.color)} />
                </div>
                <span className="text-xs font-medium text-gray-700">{m.label}</span>
              </div>
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className={cn('text-lg font-bold', m.color)}>{m.stat}</span>
                  <span className="text-[10px] text-gray-400">{m.statLabel}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', m.bg.replace('bg-', 'bg-').replace('-50', '-400'))} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── Quick Actions ─────────────────────────────────────────────
function QuickActions() {
  const actions = [
    { href: '/diagnostic',  label: 'Diagnóstico',      icon: Target,      color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100' },
    { href: '/risks',       label: 'Registar Risco',   icon: AlertTriangle, color: 'bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-100' },
    { href: '/policies',    label: 'Nova Política',    icon: BookOpen,    color: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-100' },
    { href: '/gdpr',        label: 'ROPA / GDPR',      icon: ShieldCheck, color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-100' },
    { href: '/evidence',    label: 'Evidência',        icon: FileText,    color: 'bg-pink-50 text-pink-700 hover:bg-pink-100 border-pink-100' },
    { href: '/reports',     label: 'Relatório',        icon: BarChart3,   color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100' },
  ];
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
      <div className="grid grid-cols-3 gap-2">
        {actions.map(({ href, label, icon: Icon, color }) => (
          <Link key={href} href={href} className={cn('flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors text-center', color)}>
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium leading-tight">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuthStore();
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  const { data: dashData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => orgApi.dashboard().then(r => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: () => reportsApi.summary().then(r => r.data),
  });

  const { data: policyStats } = useQuery({
    queryKey: ['policies', 'stats'],
    queryFn: () => policiesApi.stats().then(r => r.data),
  });

  const { data: gdprStats } = useQuery({
    queryKey: ['gdpr', 'dashboard'],
    queryFn: () => gdprApi.dashboard().then(r => r.data),
  });

  const complianceScore = summary?.complianceScore ?? 0;
  const overdueTasks = dashData?.tasks?.overdue ?? 0;
  const openRisks = dashData?.risks?.open ?? 0;
  const highRisks = dashData?.risks?.high ?? 0;
  const activeProjects = dashData?.projects?.active ?? 0;
  const pendingEvidence = dashData?.evidence?.pending ?? 0;
  const openBreaches = gdprStats?.breaches?.open ?? 0;

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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {greeting()}, {user?.firstName} 👋
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Resumo de conformidade — {format(new Date(), "EEEE, d 'de' MMMM", { locale: pt })}
          </p>
        </div>
        {openBreaches > 0 && (
          <Link href="/gdpr" className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-xl hover:bg-red-100 transition-colors">
            <AlertTriangle className="w-4 h-4" />
            {openBreaches} violação{openBreaches !== 1 ? 'ões' : ''} em aberto
          </Link>
        )}
      </div>

      {/* Top row: Score + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Compliance ring */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-2">
          <ComplianceScoreRing score={complianceScore} />
          <p className="text-xs text-gray-400 text-center">Média dos projetos ativos</p>
        </div>

        {/* KPIs 2×2 */}
        <div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            title="Projetos Ativos"
            value={activeProjects}
            icon={FolderOpen}
            color="bg-blue-100 text-blue-600"
            sub={`${dashData?.projects?.total ?? 0} total`}
            href="/projects"
          />
          <KpiCard
            title="Tarefas em Atraso"
            value={overdueTasks}
            icon={Clock}
            color={overdueTasks > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}
            sub={overdueTasks > 0 ? 'necessitam atenção' : 'tudo em dia!'}
            href="/tasks"
          />
          <KpiCard
            title="Riscos Abertos"
            value={openRisks}
            icon={AlertTriangle}
            color={highRisks > 0 ? 'bg-orange-100 text-orange-600' : 'bg-yellow-100 text-yellow-600'}
            sub={`${highRisks} alto/crítico${highRisks !== 1 ? 's' : ''}`}
            href="/risks"
          />
          <KpiCard
            title="Políticas Aprovadas"
            value={policyStats?.byStatus?.APPROVED ?? 0}
            icon={BookOpen}
            color="bg-green-100 text-green-600"
            sub={`${policyStats?.total ?? 0} total`}
            href="/policies"
          />
          <KpiCard
            title="ROPA — Atividades"
            value={gdprStats?.activities?.active ?? 0}
            icon={ShieldCheck}
            color="bg-purple-100 text-purple-600"
            sub="ativas (Art. 30)"
            href="/gdpr"
          />
          <KpiCard
            title="Evidências Pendentes"
            value={pendingEvidence}
            icon={FileText}
            color="bg-pink-100 text-pink-600"
            href="/evidence"
          />
          <KpiCard
            title="CAPA em Aberto"
            value={summary?.openCapas ?? 0}
            icon={AlertCircle}
            color="bg-red-100 text-red-600"
            href="/capa"
          />
          <KpiCard
            title="Auditorias Concluídas"
            value={summary?.auditsCompleted ?? 0}
            icon={Target}
            color="bg-indigo-100 text-indigo-600"
            href="/audits"
          />
        </div>
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MyTasksWidget onOpenDetail={setDetailTaskId} />
        <RiskSummary />
        <QuickActions />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ModuleStatus policyStats={policyStats} gdprStats={gdprStats} dashData={dashData} summary={summary} />
        <ActivityFeed />
      </div>

      {/* Task detail panel */}
      {detailTaskId && (
        <TaskDetailPanel
          taskId={detailTaskId}
          onClose={() => setDetailTaskId(null)}
        />
      )}
    </div>
  );
}
