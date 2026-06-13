'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { orgApi, tasksApi, risksApi, reportsApi, policiesApi, gdprApi, auditLogsApi, evidenceApi, auditsApi } from '@/lib/api';
import {
  FolderOpen, CheckSquare, AlertTriangle, FileText,
  Clock, AlertCircle, Target, BookOpen, ShieldCheck,
  TrendingUp, TrendingDown, Activity, ChevronRight,
  Circle, CheckCircle2, XCircle, BarChart3, Bell, Zap, Grid3x3,
  Settings, Calendar, Shield, X,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { cn, formatDate, getRiskColor, getStatusColor, getPriorityColor, formatRelative } from '@/lib/utils';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { format, formatDistanceToNow, differenceInDays, isValid } from 'date-fns';
import { pt } from 'date-fns/locale';
import { TaskDetailPanel } from '@/components/tasks/task-detail-panel';
import { HelpButton } from '@/components/help/HelpButton';

// ── Widget Config ─────────────────────────────────────────────

const WIDGET_KEYS = [
  'scoreGeral',
  'riscos',
  'tarefas',
  'projetos',
  'evolucaoScore',
  'mapaRiscos',
  'tarefasStatus',
  'evidenciasExpirar',
  'proximasAuditorias',
  'riscosPorFramework',
] as const;

type WidgetKey = (typeof WIDGET_KEYS)[number];

const WIDGET_LABELS: Record<WidgetKey, string> = {
  scoreGeral:          'Score Geral',
  riscos:              'Riscos',
  tarefas:             'Tarefas',
  projetos:            'Projetos',
  evolucaoScore:       'Evolução do Score',
  mapaRiscos:          'Mapa de Riscos',
  tarefasStatus:       'Tarefas por Status',
  evidenciasExpirar:   'Evidências a Expirar',
  proximasAuditorias:  'Próximas Auditorias',
  riscosPorFramework:  'Riscos por Framework',
};

const DEFAULT_CONFIG: Record<WidgetKey, boolean> = {
  scoreGeral:          true,
  riscos:              true,
  tarefas:             true,
  projetos:            true,
  evolucaoScore:       true,
  mapaRiscos:          true,
  tarefasStatus:       true,
  evidenciasExpirar:   false,
  proximasAuditorias:  false,
  riscosPorFramework:  false,
};

const LS_KEY = 'icomply-dashboard-widgets';

function loadConfig(): Record<WidgetKey, boolean> {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    // Merge with defaults so new keys always have a value
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return DEFAULT_CONFIG;
  }
}

// ── Compliance Score Ring ─────────────────────────────────────
function ComplianceScoreRing({ score, label }: { score: number; label: string }) {
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
        <tspan x="65" dy="20" fontSize="10" fill="#6b7280">{label}</tspan>
      </text>
    </svg>
  );
}

// ── KPI Card ──────────────────────────────────────────────────
function KpiCard({ title, value, icon: Icon, color, sub, href, trend, vsLastMonth }: any) {
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
          {Math.abs(trend)} {vsLastMonth}
        </div>
      )}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

// ── My Tasks Widget ───────────────────────────────────────────
function MyTasksWidget({ onOpenDetail }: { onOpenDetail: (id: string) => void }) {
  const { user } = useAuthStore();
  const t = useTranslations('dashboard');

  const { data } = useQuery({
    queryKey: ['tasks', 'mine'],
    queryFn: () => tasksApi.list({ assigneeId: user?.id, limit: 10 }).then(r => r.data),
    enabled: !!user?.id,
  });

  const tasks = data?.data ?? [];
  const active = tasks.filter((task: any) => task.status !== 'DONE' && task.status !== 'CANCELLED');

  const STATUS_DOT: Record<string, string> = {
    TODO:        'bg-gray-300',
    IN_PROGRESS: 'bg-blue-500',
    IN_REVIEW:   'bg-purple-500',
    DONE:        'bg-green-500',
    CANCELLED:   'bg-gray-200',
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-blue-600" /> {t('myWork')}
        </h3>
        <Link href="/tasks" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
          {t('viewAll')} <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {active.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-400 mb-2" />
          <p className="text-sm text-gray-500">{t('allUpToDate')}</p>
          <p className="text-xs text-gray-400">{t('noTasksAssigned')}</p>
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
  const t = useTranslations('dashboard');

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
      task: t('entity.task'),
      risk: t('entity.risk'),
      project: t('entity.project'),
      policy: t('entity.policy'),
      dpia: t('entity.dpia'),
      breach: t('entity.breach'),
      audit: t('entity.audit'),
      capa: t('entity.capa'),
      evidence: t('entity.evidence'),
      user: t('entity.user'),
    };
    return map[entity?.toLowerCase()] ?? entity;
  };

  const actionLabel = (action: string) => {
    if (action?.toLowerCase() === 'create') return t('action.created');
    if (action?.toLowerCase() === 'update') return t('action.updated');
    return t('action.deleted');
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-600" /> {t('recentActivity')}
        </h3>
      </div>

      {logs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-6">
          <p className="text-sm text-gray-400">{t('noActivity')}</p>
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

// ── Risk Heatmap Summary ──────────────────────────────────────
function RiskSummary() {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');

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
          <AlertTriangle className="w-4 h-4 text-orange-500" /> {t('risksByLevel')}
        </h3>
        <Link href="/risks" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
          {t('viewMap')} <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-2">
        {[
          { label: t('criticalHigh'), count: high.length, color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
          { label: tCommon('medium'), count: medium.length, color: 'bg-orange-400', text: 'text-orange-700', bg: 'bg-orange-50' },
          { label: tCommon('low'), count: low.length, color: 'bg-green-400', text: 'text-green-700', bg: 'bg-green-50' },
        ].map(r => (
          <div key={r.label} className={cn('flex items-center gap-3 px-3 py-2 rounded-lg', r.bg)}>
            <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', r.color)} />
            <span className={cn('text-xs font-medium flex-1', r.text)}>{r.label}</span>
            <span className={cn('text-sm font-bold', r.text)}>{r.count}</span>
          </div>
        ))}
        {list.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">{t('noRisksRegistered')}</p>
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
  const t = useTranslations('dashboard');

  const modules = [
    {
      label: t('moduleLabel.policies'),
      icon: BookOpen,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      href: '/policies',
      stat: policyStats?.byStatus?.APPROVED ?? 0,
      total: policyStats?.total ?? 0,
      statLabel: t('moduleStat.approved'),
    },
    {
      label: t('moduleLabel.gdpr'),
      icon: ShieldCheck,
      color: 'text-green-600',
      bg: 'bg-green-50',
      href: '/gdpr',
      stat: gdprStats?.activities?.active ?? 0,
      total: gdprStats?.activities?.total ?? 0,
      statLabel: t('moduleStat.activities'),
    },
    {
      label: t('moduleLabel.audits'),
      icon: Target,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      href: '/audits',
      stat: summary?.auditsCompleted ?? 0,
      total: summary?.totalAudits ?? 0,
      statLabel: t('moduleStat.completed'),
    },
    {
      label: t('moduleLabel.capa'),
      icon: AlertCircle,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      href: '/capa',
      stat: summary?.openCapas ?? 0,
      total: summary?.totalCapas ?? 0,
      statLabel: t('moduleStat.open'),
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-gray-500" /> {t('moduleStatus')}
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

// ── Maturity Score ────────────────────────────────────────────
function MaturityWidget({ maturityScores, overallMaturity }: { maturityScores: any[]; overallMaturity: number }) {
  if (!maturityScores?.length) return null;
  const LEVEL_LABELS = ['Não iniciado', 'Inicial', 'Desenvolvimento', 'Definido', 'Gerido', 'Optimizado'];
  const LEVEL_COLORS = ['#9CA3AF', '#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#10B981'];
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Maturidade de Conformidade</h3>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold" style={{ color: LEVEL_COLORS[Math.round(overallMaturity)] }}>
            {overallMaturity.toFixed(1)}
          </span>
          <span className="text-xs text-gray-500">/5 — {LEVEL_LABELS[Math.round(overallMaturity)]}</span>
        </div>
      </div>
      <div className="space-y-2">
        {maturityScores.map(d => (
          <div key={d.domain} className="flex items-center gap-3">
            <span className="text-xs text-gray-600 w-24 flex-shrink-0 truncate">{d.domain}</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${(d.maturity / 5) * 100}%`, backgroundColor: LEVEL_COLORS[d.maturity] }} />
            </div>
            <span className="text-xs font-medium w-4 text-right" style={{ color: LEVEL_COLORS[d.maturity] }}>{d.maturity}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Smart Alerts ──────────────────────────────────────────────
function SmartAlerts({ alerts }: { alerts: any[] }) {
  if (!alerts?.length) return null;
  const SEVERITY_STYLE = {
    critical: 'bg-red-50 border-red-200 text-red-700',
    high:     'bg-orange-50 border-orange-200 text-orange-700',
    medium:   'bg-yellow-50 border-yellow-200 text-yellow-700',
  };
  const SEVERITY_DOT = {
    critical: 'bg-red-500',
    high:     'bg-orange-500',
    medium:   'bg-yellow-500',
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Bell className="w-4 h-4 text-gray-500" /> Alertas de Conformidade
        <span className="ml-auto text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{alerts.length}</span>
      </h3>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {alerts.map((alert, i) => (
          <Link key={i} href={alert.href}
            className={cn('flex items-center gap-3 px-3 py-2 rounded-xl border text-sm transition-colors hover:opacity-90', SEVERITY_STYLE[alert.severity as keyof typeof SEVERITY_STYLE])}>
            <div className={cn('w-2 h-2 rounded-full flex-shrink-0', SEVERITY_DOT[alert.severity as keyof typeof SEVERITY_DOT])} />
            <span className="flex-1 truncate">{alert.message}</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Domain Compliance Scores ───────────────────────────────────
function DomainScores({ scores }: { scores: any[] }) {
  if (!scores?.length) return null;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Zap className="w-4 h-4 text-gray-500" /> Score por Framework
      </h3>
      <div className="space-y-3">
        {scores.map(d => (
          <div key={d.domain}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-700">{d.domain}</span>
              <span className={cn('text-xs font-bold', d.score >= 80 ? 'text-green-600' : d.score >= 60 ? 'text-yellow-600' : d.score > 0 ? 'text-red-500' : 'text-gray-400')}>
                {d.score > 0 ? `${d.score}%` : '—'}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${d.score}%`, backgroundColor: d.score >= 80 ? '#16a34a' : d.score >= 60 ? '#ca8a04' : '#dc2626' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Score Trend Chart ─────────────────────────────────────────
const SCORE_TREND = [
  { month: 'Jan', score: 62 },
  { month: 'Fev', score: 68 },
  { month: 'Mar', score: 71 },
  { month: 'Abr', score: 75 },
  { month: 'Mai', score: 80 },
  { month: 'Jun', score: 87 },
];

function ScoreTrendChart() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-blue-600" /> Evolução do Score
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={SCORE_TREND} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
            formatter={(value: number) => [`${value}%`, 'Score']}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Risk Heatmap 5×5 ─────────────────────────────────────────
interface RiskCell {
  likelihood: number;
  impact: number;
  count: number;
}

function cellColor(likelihood: number, impact: number): string {
  const score = likelihood * impact;
  if (score >= 15) return '#fee2e2';
  if (score >= 10) return '#ffedd5';
  if (score >= 5)  return '#fef9c3';
  return '#dcfce7';
}

function cellTextColor(likelihood: number, impact: number): string {
  const score = likelihood * impact;
  if (score >= 15) return '#991b1b';
  if (score >= 10) return '#9a3412';
  if (score >= 5)  return '#854d0e';
  return '#166534';
}

function RiskHeatmap({ riskList }: { riskList: Array<{ likelihood?: number; impact?: number; inherentScore?: number }> }) {
  // Build a 5×5 count matrix from real data when likelihood/impact exist
  const matrix: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));

  if (riskList.length > 0 && riskList.some(r => r.likelihood != null && r.impact != null)) {
    riskList.forEach(r => {
      const l = Math.min(Math.max(Math.round(r.likelihood ?? 0), 1), 5);
      const i = Math.min(Math.max(Math.round(r.impact ?? 0), 1), 5);
      matrix[l - 1][i - 1] += 1;
    });
  } else {
    // Seed with representative example data
    const seed: RiskCell[] = [
      { likelihood: 5, impact: 5, count: 2 },
      { likelihood: 4, impact: 5, count: 1 },
      { likelihood: 5, impact: 4, count: 1 },
      { likelihood: 3, impact: 4, count: 3 },
      { likelihood: 4, impact: 3, count: 2 },
      { likelihood: 2, impact: 3, count: 4 },
      { likelihood: 3, impact: 2, count: 2 },
      { likelihood: 1, impact: 2, count: 3 },
      { likelihood: 2, impact: 1, count: 2 },
      { likelihood: 1, impact: 1, count: 5 },
    ];
    seed.forEach(({ likelihood: l, impact: i, count }) => {
      matrix[l - 1][i - 1] = count;
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Grid3x3 className="w-4 h-4 text-orange-500" /> Mapa de Riscos
      </h3>
      <div className="flex gap-2">
        {/* Y-axis label */}
        <div className="flex flex-col items-center justify-between py-1" style={{ width: 14 }}>
          <span className="text-[9px] text-gray-400 leading-none">Alta</span>
          <span className="text-[9px] text-gray-500 font-medium whitespace-nowrap" style={{ writingMode: 'vertical-rl' as const, transform: 'rotate(180deg)', fontSize: 9 }}>Probabilidade</span>
          <span className="text-[9px] text-gray-400 leading-none">Baixa</span>
        </div>
        {/* Grid */}
        <div className="flex-1">
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gridTemplateRows: 'repeat(5, 1fr)' }}>
            {/* Rows from top (likelihood=5) down to (likelihood=1) */}
            {Array.from({ length: 25 }, (_, idx) => {
              const rowIdx = Math.floor(idx / 5);
              const colIdx = idx % 5;
              const likelihood = 5 - rowIdx;
              const impact = colIdx + 1;
              const count = matrix[likelihood - 1][impact - 1];
              const bg = cellColor(likelihood, impact);
              const textCol = cellTextColor(likelihood, impact);
              return (
                <div
                  key={`${likelihood}-${impact}`}
                  className="rounded flex items-center justify-center aspect-square text-[10px] font-bold transition-transform hover:scale-105"
                  style={{ backgroundColor: bg, color: textCol, minHeight: 28 }}
                  title={`P${likelihood} × I${impact} = ${likelihood * impact}`}
                >
                  {count > 0 ? count : ''}
                </div>
              );
            })}
          </div>
          {/* X-axis */}
          <div className="flex justify-between mt-1 px-0">
            <span className="text-[9px] text-gray-400">Baixo</span>
            <span className="text-[9px] text-gray-500 font-medium">Impacto</span>
            <span className="text-[9px] text-gray-400">Alto</span>
          </div>
        </div>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        {[
          { label: 'Baixo', color: '#dcfce7' },
          { label: 'Médio', color: '#fef9c3' },
          { label: 'Alto',  color: '#ffedd5' },
          { label: 'Crítico', color: '#fee2e2' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-gray-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tasks by Status Bar Chart ─────────────────────────────────
interface TaskStatusBar {
  status: string;
  label: string;
  count: number;
  fill: string;
}

function TasksByStatusChart({ dashData }: { dashData: any }) {
  const taskStats: Record<string, number> = dashData?.tasks?.byStatus ?? {};

  const bars: TaskStatusBar[] = [
    { status: 'TODO',        label: 'Por fazer',  count: Number(taskStats['TODO']        ?? 0) || 0, fill: '#9ca3af' },
    { status: 'IN_PROGRESS', label: 'Em curso',   count: Number(taskStats['IN_PROGRESS'] ?? 0) || 0, fill: '#3b82f6' },
    { status: 'DONE',        label: 'Concluído',  count: Number(taskStats['DONE']        ?? 0) || 0, fill: '#22c55e' },
    { status: 'OVERDUE',     label: 'Atrasado',   count: Number(taskStats['OVERDUE']     ?? dashData?.tasks?.overdue ?? 0) || 0, fill: '#ef4444' },
  ];

  const maxCount = Math.max(...bars.map(b => b.count), 1);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-indigo-600" /> Tarefas por Estado
      </h3>
      <div className="space-y-3">
        {bars.map((bar) => (
          <div key={bar.status} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-16 shrink-0 text-right">{bar.label}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: maxCount > 0 ? `${(bar.count / maxCount) * 100}%` : '0%',
                  backgroundColor: bar.fill,
                  minWidth: bar.count > 0 ? '4px' : '0px',
                }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-700 w-6 text-right shrink-0">{bar.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Quick Actions ─────────────────────────────────────────────
function QuickActions() {
  const t = useTranslations('dashboard');

  const actions = [
    { href: '/diagnostic',  label: t('quickAction.diagnostic'),    icon: Target,      color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100' },
    { href: '/risks',       label: t('quickAction.registerRisk'),  icon: AlertTriangle, color: 'bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-100' },
    { href: '/policies',    label: t('quickAction.newPolicy'),     icon: BookOpen,    color: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-100' },
    { href: '/gdpr',        label: t('quickAction.ropaGdpr'),      icon: ShieldCheck, color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-100' },
    { href: '/evidence',    label: t('quickAction.evidence'),      icon: FileText,    color: 'bg-pink-50 text-pink-700 hover:bg-pink-100 border-pink-100' },
    { href: '/reports',     label: t('quickAction.report'),        icon: BarChart3,   color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100' },
  ];
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('quickActions')}</h3>
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

// ── Widget A: Evidências a Expirar ────────────────────────────
function EvidenciasExpirarWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['evidence', 'expiring'],
    queryFn: () => evidenceApi.list({ expiringInDays: 30, limit: 5 }).then(r => r.data),
  });

  const items: any[] = data?.data ?? data ?? [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-gray-900">Evidências a Expirar</h3>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center py-6">
          <div className="animate-spin w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
          <CheckCircle2 className="w-7 h-7 text-green-400 mb-2" />
          <p className="text-sm text-gray-500">Sem evidências a expirar nos próximos 30 dias</p>
        </div>
      ) : (
        <div className="space-y-2 flex-1">
          {items.map((ev: any) => {
            const expiryDate = ev.expiryDate ?? ev.validUntil ?? ev.expiredAt;
            const daysLeft = expiryDate ? differenceInDays(new Date(expiryDate), new Date()) : null;
            const urgentColor =
              daysLeft === null ? 'text-gray-400'
              : daysLeft <= 7   ? 'text-red-600 font-semibold'
              :                   'text-amber-600';
            return (
              <Link
                key={ev.id}
                href="/evidence"
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-amber-50 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-800 truncate">{ev.fileName ?? ev.title ?? ev.name ?? 'Evidência'}</p>
                  {expiryDate && isValid(new Date(expiryDate)) && (
                    <p className="text-[10px] text-gray-400">{format(new Date(expiryDate), "dd/MM/yyyy")}</p>
                  )}
                </div>
                {daysLeft !== null && (
                  <span className={cn('text-xs shrink-0', urgentColor)}>
                    {daysLeft <= 0 ? 'Expirado' : `${daysLeft}d`}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Widget B: Próximas Auditorias ─────────────────────────────
const AUDIT_STATUS_BADGE: Record<string, string> = {
  PLANNED:     'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED:   'bg-green-100 text-green-700',
  CANCELLED:   'bg-gray-100 text-gray-500',
};

function ProximasAuditoriasWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['audits', 'upcoming'],
    queryFn: () => auditsApi.list({ upcoming: true, limit: 5 }).then(r => r.data),
  });

  const items: any[] = data?.data ?? data ?? [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-purple-500" />
        <h3 className="text-sm font-semibold text-gray-900">Próximas Auditorias</h3>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center py-6">
          <div className="animate-spin w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
          <Calendar className="w-7 h-7 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">Sem auditorias agendadas</p>
        </div>
      ) : (
        <div className="space-y-2 flex-1">
          {items.map((audit: any) => {
            const auditDate = audit.scheduledDate ?? audit.startDate ?? audit.plannedDate;
            const statusKey = audit.status ?? 'PLANNED';
            const badgeClass = AUDIT_STATUS_BADGE[statusKey] ?? 'bg-gray-100 text-gray-500';
            const frameworkName = audit.framework?.name ?? audit.frameworkName ?? audit.project?.framework?.name ?? '';
            return (
              <Link
                key={audit.id}
                href="/audits"
                className="flex items-start gap-2 p-2 rounded-lg hover:bg-purple-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-800 truncate font-medium">{audit.name ?? audit.title ?? 'Auditoria'}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {frameworkName && (
                      <span className="text-[10px] text-gray-400 truncate">{frameworkName}</span>
                    )}
                    {auditDate && isValid(new Date(auditDate)) && (
                      <span className="text-[10px] text-gray-400">{format(new Date(auditDate), 'dd/MM/yyyy')}</span>
                    )}
                  </div>
                </div>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0', badgeClass)}>
                  {statusKey}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Widget C: Riscos por Framework ────────────────────────────
function RiscosPorFrameworkWidget({ riskList }: { riskList: any[] }) {
  // Group risks by framework name
  const countMap: Record<string, number> = {};
  riskList.forEach((r: any) => {
    const fw =
      r.project?.framework?.name ??
      r.framework?.name ??
      r.frameworkName ??
      r.project?.frameworkName ??
      'Sem Framework';
    countMap[fw] = (countMap[fw] ?? 0) + 1;
  });

  const chartData = Object.entries(countMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const maxRisks = Math.max(...chartData.map(d => d.count), 1);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#84cc16'];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-4 h-4 text-blue-600" />
        <h3 className="text-sm font-semibold text-gray-900">Riscos por Framework</h3>
      </div>

      {chartData.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
          <Shield className="w-7 h-7 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">Sem dados de risco disponíveis</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 16, left: 4, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, maxRisks]}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              width={90}
            />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
              formatter={(value: number) => [value, 'Riscos']}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Widget Config Panel ───────────────────────────────────────
function WidgetConfigPanel({
  config,
  onChange,
  onClose,
}: {
  config: Record<WidgetKey, boolean>;
  onChange: (key: WidgetKey, value: boolean) => void;
  onClose: () => void;
}) {
  const existingWidgets: WidgetKey[] = [
    'scoreGeral', 'riscos', 'tarefas', 'projetos',
    'evolucaoScore', 'mapaRiscos', 'tarefasStatus',
  ];
  const newWidgets: WidgetKey[] = ['evidenciasExpirar', 'proximasAuditorias', 'riscosPorFramework'];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-5 mb-5 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Settings className="w-4 h-4 text-gray-500" /> Personalizar Dashboard
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          aria-label="Fechar painel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Existing widgets */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Widgets existentes</p>
          <div className="space-y-2">
            {existingWidgets.map(key => (
              <label key={key} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={config[key]}
                  onChange={e => onChange(key, e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                  {WIDGET_LABELS[key]}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* New widgets */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Novos widgets</p>
          <div className="space-y-2">
            {newWidgets.map(key => (
              <label key={key} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={config[key]}
                  onChange={e => onChange(key, e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                  {WIDGET_LABELS[key]}
                </span>
                <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">novo</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        As preferências são guardadas automaticamente no seu navegador.
      </p>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuthStore();
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [widgetConfig, setWidgetConfig] = useState<Record<WidgetKey, boolean>>(DEFAULT_CONFIG);
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');

  // Load widget config from localStorage on mount
  useEffect(() => {
    setWidgetConfig(loadConfig());
  }, []);

  const handleWidgetToggle = (key: WidgetKey, value: boolean) => {
    setWidgetConfig(prev => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      } catch { /* noop */ }
      return next;
    });
  };

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

  const { data: riskListData } = useQuery({
    queryKey: ['risks', 'list', {}],
    queryFn: () => risksApi.list({ limit: 200 }).then(r => r.data),
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
    if (h < 12) return t('greeting.morning');
    if (h < 19) return t('greeting.afternoon');
    return t('greeting.evening');
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
            {t('complianceSummary')} — {format(new Date(), "EEEE, d 'de' MMMM", { locale: pt })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {openBreaches > 0 && (
            <Link href="/gdpr" className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-xl hover:bg-red-100 transition-colors">
              <AlertTriangle className="w-4 h-4" />
              {openBreaches === 1 ? t('openBreaches', { count: openBreaches }) : t('openBreachesPlural', { count: openBreaches })}
            </Link>
          )}
          <button
            onClick={() => setConfigOpen(v => !v)}
            className={cn(
              'flex items-center gap-2 text-sm px-4 py-2 rounded-xl border transition-colors',
              configOpen
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
            )}
            aria-label="Personalizar dashboard"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Personalizar</span>
          </button>
        </div>
      </div>

      {/* Widget config panel */}
      {configOpen && (
        <WidgetConfigPanel
          config={widgetConfig}
          onChange={handleWidgetToggle}
          onClose={() => setConfigOpen(false)}
        />
      )}

      {/* Top row: Score + KPIs */}
      {(widgetConfig.scoreGeral || widgetConfig.projetos || widgetConfig.tarefas || widgetConfig.riscos) && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Compliance ring */}
          {widgetConfig.scoreGeral && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-2">
              <ComplianceScoreRing score={complianceScore} label={t('complianceScore')} />
              <p className="text-xs text-gray-400 text-center">{t('avgActiveProjects')}</p>
            </div>
          )}

          {/* KPIs 2×2 */}
          <div className={cn(
            'grid grid-cols-2 md:grid-cols-4 gap-4',
            widgetConfig.scoreGeral ? 'lg:col-span-4' : 'lg:col-span-5',
          )}>
            {widgetConfig.projetos && (
              <KpiCard
                title={t('kpi.activeProjects')}
                value={activeProjects}
                icon={FolderOpen}
                color="bg-blue-100 text-blue-600"
                sub={`${dashData?.projects?.total ?? 0} ${tCommon('total')}`}
                href="/projects"
                vsLastMonth={t('vsLastMonth')}
              />
            )}
            {widgetConfig.tarefas && (
              <KpiCard
                title={t('kpi.overdueTasks')}
                value={overdueTasks}
                icon={Clock}
                color={overdueTasks > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}
                sub={overdueTasks > 0 ? t('kpiSub.needAttention') : t('kpiSub.allUpToDate')}
                href="/tasks"
                vsLastMonth={t('vsLastMonth')}
              />
            )}
            {widgetConfig.riscos && (
              <KpiCard
                title={t('kpi.openRisks')}
                value={openRisks}
                icon={AlertTriangle}
                color={highRisks > 0 ? 'bg-orange-100 text-orange-600' : 'bg-yellow-100 text-yellow-600'}
                sub={`${highRisks} alto/crítico${highRisks !== 1 ? 's' : ''}`}
                href="/risks"
                vsLastMonth={t('vsLastMonth')}
              />
            )}
            <KpiCard
              title={t('kpi.approvedPolicies')}
              value={policyStats?.byStatus?.APPROVED ?? 0}
              icon={BookOpen}
              color="bg-green-100 text-green-600"
              sub={`${policyStats?.total ?? 0} ${tCommon('total')}`}
              href="/policies"
              vsLastMonth={t('vsLastMonth')}
            />
            <KpiCard
              title={t('kpi.ropaActivities')}
              value={gdprStats?.activities?.active ?? 0}
              icon={ShieldCheck}
              color="bg-purple-100 text-purple-600"
              sub={t('kpiSub.activeArt30')}
              href="/gdpr"
              vsLastMonth={t('vsLastMonth')}
            />
            <KpiCard
              title={t('kpi.pendingEvidence')}
              value={pendingEvidence}
              icon={FileText}
              color="bg-pink-100 text-pink-600"
              href="/evidence"
              vsLastMonth={t('vsLastMonth')}
            />
            <KpiCard
              title={t('kpi.openCapa')}
              value={summary?.openCapas ?? 0}
              icon={AlertCircle}
              color="bg-red-100 text-red-600"
              href="/capa"
              vsLastMonth={t('vsLastMonth')}
            />
            <KpiCard
              title={t('kpi.completedAudits')}
              value={summary?.auditsCompleted ?? 0}
              icon={Target}
              color="bg-indigo-100 text-indigo-600"
              href="/audits"
              vsLastMonth={t('vsLastMonth')}
            />
          </div>
        </div>
      )}

      {/* Alerts + Domain Scores + Maturity row */}
      {((dashData?.alerts?.length ?? 0) > 0 || (dashData?.domainScores?.length ?? 0) > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SmartAlerts alerts={dashData?.alerts ?? []} />
          <DomainScores scores={dashData?.domainScores ?? []} />
          <MaturityWidget maturityScores={dashData?.maturityScores ?? []} overallMaturity={dashData?.overallMaturity ?? 0} />
        </div>
      )}

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {widgetConfig.tarefas && <MyTasksWidget onOpenDetail={setDetailTaskId} />}
        {widgetConfig.riscos && <RiskSummary />}
        <QuickActions />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ModuleStatus policyStats={policyStats} gdprStats={gdprStats} dashData={dashData} summary={summary} />
        <ActivityFeed />
      </div>

      {/* Analytics row: Score Trend + Risk Heatmap */}
      {(widgetConfig.evolucaoScore || widgetConfig.mapaRiscos) && (
        <div className="grid grid-cols-3 gap-6 mt-6">
          {widgetConfig.evolucaoScore && (
            <div className={widgetConfig.mapaRiscos ? 'col-span-2' : 'col-span-3'}>
              <ScoreTrendChart />
            </div>
          )}
          {widgetConfig.mapaRiscos && (
            <div className={widgetConfig.evolucaoScore ? 'col-span-1' : 'col-span-3'}>
              <RiskHeatmap riskList={riskListData?.data ?? []} />
            </div>
          )}
        </div>
      )}

      {/* Tasks by Status full-width */}
      {widgetConfig.tarefasStatus && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-3">
            <TasksByStatusChart dashData={dashData} />
          </div>
        </div>
      )}

      {/* New widgets row */}
      {(widgetConfig.evidenciasExpirar || widgetConfig.proximasAuditorias || widgetConfig.riscosPorFramework) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {widgetConfig.evidenciasExpirar && <EvidenciasExpirarWidget />}
          {widgetConfig.proximasAuditorias && <ProximasAuditoriasWidget />}
          {widgetConfig.riscosPorFramework && (
            <RiscosPorFrameworkWidget riskList={riskListData?.data ?? []} />
          )}
        </div>
      )}

      {/* Task detail panel */}
      {detailTaskId && (
        <TaskDetailPanel
          taskId={detailTaskId}
          onClose={() => setDetailTaskId(null)}
        />
      )}
      <HelpButton page="dashboard" />
    </div>
  );
}
