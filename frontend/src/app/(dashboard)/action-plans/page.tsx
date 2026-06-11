'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { actionPlansApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';
import {
  GanttChart, Plus, Loader2, ChevronDown, ChevronUp,
  CheckCircle2, Clock, AlertCircle, XCircle, Circle,
  Calendar, User, MoreHorizontal, Trash2, Edit2, Play,
} from 'lucide-react';

const PLAN_STATUS = {
  DRAFT:     { label: 'Rascunho',    color: 'text-gray-500',   bg: 'bg-gray-100' },
  ACTIVE:    { label: 'Ativo',       color: 'text-blue-600',   bg: 'bg-blue-100' },
  COMPLETED: { label: 'Concluído',   color: 'text-green-600',  bg: 'bg-green-100' },
  CANCELLED: { label: 'Cancelado',   color: 'text-red-500',    bg: 'bg-red-100' },
};

const TASK_STATUS = {
  TODO:        { label: 'Por fazer',  color: 'text-gray-400',   icon: <Circle className="w-3.5 h-3.5" /> },
  IN_PROGRESS: { label: 'Em curso',   color: 'text-blue-500',   icon: <Play className="w-3.5 h-3.5" /> },
  DONE:        { label: 'Feito',      color: 'text-green-500',  icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  BLOCKED:     { label: 'Bloqueado',  color: 'text-red-500',    icon: <XCircle className="w-3.5 h-3.5" /> },
};

function GanttBar({ task, planStart, planEnd }: { task: any; planStart: Date; planEnd: Date }) {
  const total = planEnd.getTime() - planStart.getTime();
  if (total <= 0 || !task.startDate || !task.dueDate) return null;

  const left = Math.max(0, (new Date(task.startDate).getTime() - planStart.getTime()) / total) * 100;
  const width = Math.min(100 - left, (new Date(task.dueDate).getTime() - new Date(task.startDate).getTime()) / total * 100);
  const isOverdue = task.status !== 'DONE' && new Date(task.dueDate) < new Date();

  return (
    <div className="relative h-5 w-full">
      <div className="absolute inset-y-0 flex items-center" style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}>
        <div className={cn('h-4 rounded-full w-full min-w-[4px]',
          task.status === 'DONE' ? 'bg-green-400' :
          isOverdue ? 'bg-red-400' :
          task.status === 'IN_PROGRESS' ? 'bg-blue-400' : 'bg-gray-300')} />
      </div>
    </div>
  );
}

function TaskRow({ task, planId, planStart, planEnd, orgUsers }: {
  task: any; planId: string; planStart: Date; planEnd: Date; orgUsers: any[];
}) {
  const qc = useQueryClient();
  const sm = TASK_STATUS[task.status as keyof typeof TASK_STATUS];

  const updateMutation = useMutation({
    mutationFn: (data: any) => actionPlansApi.updateTask(planId, task.id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['action-plan', planId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => actionPlansApi.removeTask(planId, task.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['action-plan', planId] }),
  });

  return (
    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_2fr_auto] gap-2 items-center py-2 px-3 hover:bg-gray-50 rounded-lg text-sm">
      <span className="truncate text-gray-800 font-medium">{task.title}</span>
      <select value={task.status} onChange={e => updateMutation.mutate({ status: e.target.value })}
        className={cn('text-xs border-0 rounded-lg px-2 py-1 font-medium focus:outline-none cursor-pointer', sm.color, sm.bg.replace('text-', 'bg-').replace('-600', '-50').replace('-500', '-50').replace('-400', '-50'))}>
        {Object.entries(TASK_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      <div className="flex items-center gap-1 text-xs text-gray-400">
        <input type="number" min={0} max={100} value={task.progress}
          onChange={e => updateMutation.mutate({ progress: Number(e.target.value) })}
          className="w-12 border border-gray-200 rounded px-1.5 py-0.5 text-center focus:outline-none" />
        <span>%</span>
      </div>
      <span className="text-xs text-gray-500 truncate">
        {task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-PT') : '—'}
      </span>
      <GanttBar task={task} planStart={planStart} planEnd={planEnd} />
      <button onClick={() => deleteMutation.mutate()} className="p-1 hover:bg-red-50 rounded text-red-400">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function PlanCard({ plan }: { plan: any }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const ps = PLAN_STATUS[plan.status as keyof typeof PLAN_STATUS];

  const doneTasks = plan.tasks?.filter((t: any) => t.status === 'DONE').length ?? 0;
  const totalTasks = plan.tasks?.length ?? 0;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const planStart = plan.startDate ? new Date(plan.startDate) : new Date();
  const planEnd = plan.endDate ? new Date(plan.endDate) : new Date(planStart.getTime() + 30 * 24 * 3600 * 1000);

  const addTaskMutation = useMutation({
    mutationFn: () => actionPlansApi.createTask(plan.id, { title: newTaskTitle }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['action-plan', plan.id] }); qc.invalidateQueries({ queryKey: ['action-plans'] }); setNewTaskTitle(''); setAddingTask(false); },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => actionPlansApi.update(plan.id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['action-plans'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => actionPlansApi.remove(plan.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['action-plans'] }),
  });

  const { data: fullPlan } = useQuery({
    queryKey: ['action-plan', plan.id],
    queryFn: () => actionPlansApi.get(plan.id).then(r => r.data),
    enabled: expanded,
  });

  const tasks = fullPlan?.tasks ?? plan.tasks ?? [];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-800 text-sm">{plan.title}</h3>
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', ps.color, ps.bg)}>{ps.label}</span>
            </div>
            {plan.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{plan.description}</p>}
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{doneTasks}/{totalTasks} tarefas</span>
              {plan.startDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(plan.startDate).toLocaleDateString('pt-PT')}</span>}
              {plan.owner && <span className="flex items-center gap-1"><User className="w-3 h-3" />{plan.owner.firstName} {plan.owner.lastName}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {plan.status === 'DRAFT' && (
              <button onClick={() => updateMutation.mutate({ status: 'ACTIVE' })}
                className="text-[11px] font-semibold text-blue-600 hover:bg-blue-50 px-2.5 py-1 rounded-lg">
                Ativar
              </button>
            )}
            {plan.status === 'ACTIVE' && (
              <button onClick={() => updateMutation.mutate({ status: 'COMPLETED' })}
                className="text-[11px] font-semibold text-green-600 hover:bg-green-50 px-2.5 py-1 rounded-lg">
                Concluir
              </button>
            )}
            <button onClick={() => { if (confirm('Eliminar plano?')) deleteMutation.mutate(); }}
              className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            <button onClick={() => setExpanded(e => !e)} className="p-1.5 hover:bg-gray-100 rounded-lg">
              {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
            <span>Progresso</span><span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-50 bg-gray-50/30 px-4 py-3 space-y-1">
          {/* Column headers */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_2fr_auto] gap-2 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
            <span>Tarefa</span><span>Estado</span><span>Progresso</span><span>Prazo</span><span>Gantt</span><span></span>
          </div>

          {tasks.map((t: any) => (
            <TaskRow key={t.id} task={t} planId={plan.id} planStart={planStart} planEnd={planEnd} orgUsers={[]} />
          ))}

          {addingTask ? (
            <div className="flex items-center gap-2 px-3 py-2">
              <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newTaskTitle.trim()) addTaskMutation.mutate(); if (e.key === 'Escape') setAddingTask(false); }}
                autoFocus placeholder="Título da tarefa..."
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30" />
              <button onClick={() => newTaskTitle.trim() && addTaskMutation.mutate()}
                disabled={!newTaskTitle.trim() || addTaskMutation.isPending}
                className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg disabled:opacity-40">
                {addTaskMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Adicionar'}
              </button>
              <button onClick={() => setAddingTask(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
            </div>
          ) : (
            <button onClick={() => setAddingTask(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-primary font-semibold hover:bg-primary/5 rounded-lg w-full">
              <Plus className="w-3.5 h-3.5" /> Adicionar tarefa
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function NewPlanModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [title, setTitle]       = useState('');
  const [desc, setDesc]         = useState('');
  const [startDate, setStart]   = useState('');
  const [endDate, setEnd]       = useState('');

  const mutation = useMutation({
    mutationFn: () => actionPlansApi.create({ title, description: desc || undefined, startDate: startDate || undefined, endDate: endDate || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['action-plans'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-base font-bold text-gray-800">Novo Plano de Ação</h2>
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">Título *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} autoFocus
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Ex: Plano de Remediação GDPR" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">Descrição</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Data início</label>
            <input type="date" value={startDate} onChange={e => setStart(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Data fim</label>
            <input type="date" value={endDate} onChange={e => setEnd(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
          <button onClick={() => mutation.mutate()} disabled={!title.trim() || mutation.isPending}
            className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-xl disabled:opacity-40 hover:opacity-90 flex items-center gap-1.5">
            {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Criar plano
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ActionPlansPage() {
  const [showNew, setShowNew]   = useState(false);
  const [filter, setFilter]     = useState<string>('');

  const { data: summary } = useQuery({
    queryKey: ['action-plans-summary'],
    queryFn: () => actionPlansApi.getSummary().then(r => r.data),
  });

  const { data: plans, isLoading } = useQuery({
    queryKey: ['action-plans', filter],
    queryFn: () => actionPlansApi.list(filter || undefined).then(r => r.data),
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <GanttChart className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Planos de Ação</h1>
            <p className="text-sm text-gray-500">Timeline e Gantt de planos GRC</p>
          </div>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:opacity-90">
          <Plus className="w-4 h-4" /> Novo plano
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total',      value: summary?.total ?? 0,                        color: 'text-gray-600',  bg: 'bg-gray-50' },
          { label: 'Ativos',     value: summary?.byStatus?.ACTIVE ?? 0,             color: 'text-blue-600',  bg: 'bg-blue-50' },
          { label: 'Concluídos', value: summary?.byStatus?.COMPLETED ?? 0,          color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Tarefas em atraso', value: summary?.overdueTasks ?? 0,          color: 'text-red-600',   bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl p-3 border border-transparent', s.bg)}>
            <p className={cn('text-xs font-medium mb-0.5', s.color)}>{s.label}</p>
            <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: '',          label: 'Todos' },
          { key: 'ACTIVE',    label: 'Ativos' },
          { key: 'DRAFT',     label: 'Rascunhos' },
          { key: 'COMPLETED', label: 'Concluídos' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              filter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : (plans ?? []).length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <GanttChart className="w-12 h-12 text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">Nenhum plano de ação</p>
          <button onClick={() => setShowNew(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:opacity-90">
            <Plus className="w-4 h-4" /> Criar plano
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {(plans ?? []).map((p: any) => <PlanCard key={p.id} plan={p} />)}
        </div>
      )}

      {showNew && <NewPlanModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
