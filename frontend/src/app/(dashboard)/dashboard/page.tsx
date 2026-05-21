'use client';

import { useQuery } from '@tanstack/react-query';
import { orgApi, tasksApi, risksApi, reportsApi } from '@/lib/api';
import {
  FolderOpen, CheckSquare, AlertTriangle, FileText,
  TrendingUp, Clock, AlertCircle, Target,
} from 'lucide-react';
import { cn, formatDate, getRiskColor, getRiskLabel, getStatusColor, formatRelative } from '@/lib/utils';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';

function KpiCard({ title, value, icon: Icon, color, trend, href }: any) {
  const content = (
    <div className={cn('bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow', href && 'cursor-pointer')}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && <p className="text-xs text-gray-500 mt-1">{trend}</p>}
        </div>
        <div className={cn('p-3 rounded-xl', color)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function ComplianceScoreRing({ score }: { score: number }) {
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#16a34a' : score >= 60 ? '#ca8a04' : '#dc2626';

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} stroke="#e5e7eb" strokeWidth="12" fill="none" />
        <circle
          cx="70" cy="70" r={r}
          stroke={color} strokeWidth="12" fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
        />
        <text x="70" y="70" textAnchor="middle" dominantBaseline="middle">
          <tspan x="70" dy="-8" fontSize="28" fontWeight="bold" fill={color}>{score}%</tspan>
          <tspan x="70" dy="22" fontSize="11" fill="#6b7280">Conformidade</tspan>
        </text>
      </svg>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: dashData, isLoading: loadingDash } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => orgApi.dashboard().then(r => r.data),
  });

  const { data: overdueTasks } = useQuery({
    queryKey: ['tasks', 'overdue'],
    queryFn: () => tasksApi.list({ overdue: true, limit: 5 }).then(r => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: () => reportsApi.summary().then(r => r.data),
  });

  const complianceScore = summary?.complianceScore ?? 0;
  const activeProjects = dashData?.projects?.active ?? 0;
  const totalProjects = dashData?.projects?.total ?? 0;
  const overdueCt = dashData?.tasks?.overdue ?? 0;
  const openRisks = dashData?.risks?.open ?? 0;
  const highRisks = dashData?.risks?.high ?? 0;
  const pendingEvidence = dashData?.evidence?.pending ?? 0;

  if (loadingDash) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Bom dia, {user?.firstName} 👋
        </h2>
        <p className="text-gray-500 mt-1">
          Aqui está o resumo de conformidade da sua organização.
        </p>
      </div>

      {/* Score + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Compliance Score */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex flex-col items-center justify-center">
          <ComplianceScoreRing score={complianceScore} />
          <p className="text-xs text-gray-500 mt-2">Média de todos os projetos</p>
        </div>

        {/* KPI Cards */}
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4">
          <KpiCard
            title="Projetos Ativos" value={activeProjects}
            icon={FolderOpen} color="bg-blue-100 text-blue-600"
            trend={`${totalProjects} total`} href="/projects"
          />
          <KpiCard
            title="Tarefas em Atraso" value={overdueCt}
            icon={Clock} color={overdueCt > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}
            href="/tasks?overdue=true"
          />
          <KpiCard
            title="Riscos Abertos" value={openRisks}
            icon={AlertTriangle} color={highRisks > 0 ? 'bg-orange-100 text-orange-600' : 'bg-yellow-100 text-yellow-600'}
            trend={`${highRisks} críticos/altos`} href="/risks"
          />
          <KpiCard
            title="Evidências Pendentes" value={pendingEvidence}
            icon={FileText} color="bg-purple-100 text-purple-600"
            href="/evidence"
          />
          <KpiCard
            title="Auditorias Concluídas" value={summary?.auditsCompleted ?? 0}
            icon={Target} color="bg-green-100 text-green-600"
            href="/audits"
          />
          <KpiCard
            title="CAPA em Aberto" value={summary?.openCapas ?? 0}
            icon={AlertCircle} color="bg-red-100 text-red-600"
            href="/capa"
          />
        </div>
      </div>

      {/* Quick actions + Overdue tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/diagnostic', label: 'Novo Diagnóstico', icon: Target, color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
              { href: '/projects', label: 'Novo Projeto', icon: FolderOpen, color: 'bg-green-50 text-green-700 hover:bg-green-100' },
              { href: '/risks', label: 'Registar Risco', icon: AlertTriangle, color: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
              { href: '/evidence', label: 'Carregar Evidência', icon: FileText, color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
            ].map(({ href, label, icon: Icon, color }) => (
              <Link
                key={href} href={href}
                className={cn('flex items-center gap-3 p-4 rounded-lg transition-colors', color)}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">Tarefas em Atraso</h3>
            <Link href="/tasks?overdue=true" className="text-sm text-primary hover:underline">
              Ver todas
            </Link>
          </div>
          {overdueTasks?.data?.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CheckSquare className="w-8 h-8 mx-auto mb-2 text-green-400" />
              <p className="text-sm">Sem tarefas em atraso 🎉</p>
            </div>
          ) : (
            <div className="space-y-3">
              {overdueTasks?.data?.slice(0, 5).map((task: any) => (
                <Link
                  key={task.id}
                  href={`/tasks`}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className={cn('px-2 py-0.5 rounded text-xs font-medium', getStatusColor(task.priority))}>
                    {task.priority}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                    <p className="text-xs text-gray-500">{task.project?.name}</p>
                  </div>
                  <p className="text-xs text-red-500 whitespace-nowrap">
                    {formatDate(task.dueDate)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
