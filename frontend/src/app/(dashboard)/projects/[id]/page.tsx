'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, tasksApi, risksApi, evidenceApi } from '@/lib/api';
import {
  ArrowLeft, CheckSquare, AlertTriangle, FileText, Loader2,
  Plus, Calendar, Target, TrendingUp, BarChart2,
} from 'lucide-react';
import { cn, formatDate, getStatusColor, getPriorityColor, getRiskColor, isOverdue } from '@/lib/utils';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { GanttChart, type GanttItem } from '@/components/gantt/GanttChart';

const STATUS_LABELS: Record<string, string> = {
  TODO: 'A Fazer', IN_PROGRESS: 'Em Curso', IN_REVIEW: 'Em Revisão', DONE: 'Concluído', CANCELLED: 'Cancelado',
};

const TASK_COLORS: Record<string, string> = {
  TODO:        'bg-gray-400',
  IN_PROGRESS: 'bg-blue-500',
  IN_REVIEW:   'bg-amber-500',
  DONE:        'bg-green-500',
  CANCELLED:   'bg-red-400',
};

const TASK_PROGRESS: Record<string, number> = {
  TODO: 0, IN_PROGRESS: 40, IN_REVIEW: 75, DONE: 100, CANCELLED: 0,
};

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2.5 text-sm font-medium rounded-lg transition-colors',
        active ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100',
      )}
    >
      {children}
    </button>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<'tasks' | 'risks' | 'evidence' | 'gantt'>('tasks');
  const qc = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.getOne(id).then(r => r.data),
  });

  const { data: tasksData } = useQuery({
    queryKey: ['tasks', { projectId: id }],
    queryFn: () => tasksApi.list({ projectId: id, limit: 100 }).then(r => r.data),
    enabled: tab === 'tasks' || tab === 'gantt',
  });

  const { data: risksData } = useQuery({
    queryKey: ['risks', { projectId: id }],
    queryFn: () => risksApi.list({ projectId: id, limit: 100 }).then(r => r.data),
    enabled: tab === 'risks',
  });

  const { data: evidenceData } = useQuery({
    queryKey: ['evidence', { projectId: id }],
    queryFn: () => evidenceApi.list({ projectId: id, limit: 100 }).then(r => r.data),
    enabled: tab === 'evidence',
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) => tasksApi.update(taskId, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', { projectId: id }] }),
  });

  const ganttItems = useMemo((): GanttItem[] => {
    return (tasksData?.data || []).map((t: any) => {
      const start = t.startDate ? new Date(t.startDate) : new Date(t.createdAt);
      const endRaw = t.dueDate ? new Date(t.dueDate) : null;
      const end = endRaw ?? new Date(start.getTime() + 7 * 86400000);
      const safeEnd = end > start ? end : new Date(start.getTime() + 86400000);
      return {
        id:       t.id,
        name:     t.title,
        subtitle: t.assignee ? t.assignee.name || `${t.assignee.firstName} ${t.assignee.lastName}` : undefined,
        start,
        end:      safeEnd,
        progress: TASK_PROGRESS[t.status] ?? 0,
        color:    TASK_COLORS[t.status]   ?? 'bg-gray-400',
        indent:   false,
      };
    });
  }, [tasksData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) return null;

  const score = project.complianceScore ?? 0;
  const tasks = tasksData?.data || [];
  const risks = risksData?.data || [];
  const evidence = evidenceData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/projects" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', getStatusColor(project.status))}>
                {project.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {project.framework?.name || 'Sem framework'}
              {project.dueDate && <> · Prazo: {formatDate(project.dueDate)}</>}
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {/* Compliance score ring */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
              <circle cx="28" cy="28" r="22" fill="none" stroke="#F3F4F6" strokeWidth="6" />
              <circle
                cx="28" cy="28" r="22" fill="none"
                stroke={score >= 80 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444'}
                strokeWidth="6"
                strokeDasharray={`${(score / 100) * 138.2} 138.2`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900">{score}%</span>
          </div>
          <div>
            <p className="text-xs text-gray-500">Conformidade</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">
              {score >= 80 ? 'Bom' : score >= 50 ? 'Em progresso' : 'Atenção necessária'}
            </p>
          </div>
        </div>

        {[
          { icon: CheckSquare, label: 'Tarefas', value: project._count?.tasks ?? 0, color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: AlertTriangle, label: 'Riscos', value: project._count?.risks ?? 0, color: 'text-orange-600', bg: 'bg-orange-50' },
          { icon: FileText, label: 'Evidências', value: project._count?.evidences ?? 0, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', c.bg)}>
              <c.icon className={cn('w-5 h-5', c.color)} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{c.value}</p>
              <p className="text-xs text-gray-500">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Description */}
      {project.description && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm text-gray-600">{project.description}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-1 p-2 border-b border-gray-100">
          <TabButton active={tab === 'tasks'} onClick={() => setTab('tasks')}>
            <div className="flex items-center gap-1.5"><CheckSquare className="w-3.5 h-3.5" /> Tarefas</div>
          </TabButton>
          <TabButton active={tab === 'gantt'} onClick={() => setTab('gantt')}>
            <div className="flex items-center gap-1.5"><BarChart2 className="w-3.5 h-3.5" /> Gantt</div>
          </TabButton>
          <TabButton active={tab === 'risks'} onClick={() => setTab('risks')}>
            <div className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Riscos</div>
          </TabButton>
          <TabButton active={tab === 'evidence'} onClick={() => setTab('evidence')}>
            <div className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Evidências</div>
          </TabButton>
        </div>

        {/* Tasks Tab */}
        {tab === 'tasks' && (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Tarefa', 'Estado', 'Prioridade', 'Responsável', 'Prazo'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-sm text-gray-400">Sem tarefas</td></tr>
              ) : tasks.map((t: any) => (
                <tr key={t.id} className={cn('border-b border-gray-100 hover:bg-gray-50', isOverdue(t.dueDate) && t.status !== 'DONE' && 'bg-red-50/30')}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{t.title}</td>
                  <td className="px-4 py-3">
                    <select
                      value={t.status}
                      onChange={e => updateTaskMutation.mutate({ taskId: t.id, status: e.target.value })}
                      className={cn('text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer', getStatusColor(t.status))}
                    >
                      {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-1 rounded-full font-medium', getPriorityColor(t.priority))}>{t.priority}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs flex items-center gap-1', isOverdue(t.dueDate) && t.status !== 'DONE' ? 'text-red-600' : 'text-gray-500')}>
                      <Calendar className="w-3 h-3" />{formatDate(t.dueDate)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Gantt Tab */}
        {tab === 'gantt' && (
          <div className="p-4">
            <GanttChart
              items={ganttItems}
              emptyMessage="Sem tarefas com datas configuradas"
            />
          </div>
        )}

        {/* Risks Tab */}
        {tab === 'risks' && (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Risco', 'Categoria', 'Nível', 'Score', 'Estado'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {risks.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-sm text-gray-400">Sem riscos</td></tr>
              ) : risks.map((r: any) => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.title}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.category || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-1 rounded-full font-medium', getRiskColor(r.inherentScore))}>
                      {r.riskLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-700">{r.inherentScore}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-1 rounded-full font-medium', getStatusColor(r.status))}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Evidence Tab */}
        {tab === 'evidence' && (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Ficheiro', 'Estado', 'Carregado por', 'Data'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {evidence.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-10 text-sm text-gray-400">Sem evidências</td></tr>
              ) : evidence.map((e: any) => (
                <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{e.fileName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-1 rounded-full font-medium', getStatusColor(e.status))}>{e.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {e.uploadedBy ? `${e.uploadedBy.firstName} ${e.uploadedBy.lastName}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(e.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
