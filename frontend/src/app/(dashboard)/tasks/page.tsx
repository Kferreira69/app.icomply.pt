'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi, projectsApi } from '@/lib/api';
import { Plus, Search, CheckSquare, Loader2, Calendar, Pencil, LayoutGrid, List, MessageSquare } from 'lucide-react';
import { TaskDetailPanel } from '@/components/tasks/task-detail-panel';
import { cn, formatDate, getStatusColor, getPriorityColor, isOverdue, cleanFormData } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { KanbanBoard } from '@/components/tasks/kanban-board';

const STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'];
const STATUS_LABELS: Record<string, string> = {
  TODO: 'A Fazer', IN_PROGRESS: 'Em Curso', IN_REVIEW: 'Em Revisão', DONE: 'Concluído', CANCELLED: 'Cancelado',
};

// ── List row ──────────────────────────────────────────────────

function TaskRow({ task, onStatusChange, onEdit, onOpenDetail }: {
  task: any;
  onStatusChange: (id: string, status: string) => void;
  onEdit: (task: any) => void;
  onOpenDetail: (taskId: string) => void;
}) {
  return (
    <tr className={cn('border-b border-gray-100 hover:bg-gray-50 transition-colors', isOverdue(task.dueDate) && task.status !== 'DONE' && 'bg-red-50/30')}>
      <td className="px-4 py-3">
        <div>
          <button
            onClick={() => onOpenDetail(task.id)}
            className="text-sm font-medium text-gray-900 hover:text-blue-600 text-left transition-colors"
          >
            {task.title}
          </button>
          <p className="text-xs text-gray-400">{task.project?.name}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <select
          value={task.status}
          onChange={e => onStatusChange(task.id, e.target.value)}
          className={cn('text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer', getStatusColor(task.status))}
        >
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </td>
      <td className="px-4 py-3">
        <span className={cn('text-xs px-2 py-1 rounded-full font-medium', getPriorityColor(task.priority))}>
          {task.priority}
        </span>
      </td>
      <td className="px-4 py-3">
        {task.assignee ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs text-white">
              {task.assignee.firstName?.[0]}{task.assignee.lastName?.[0]}
            </div>
            <span className="text-xs text-gray-600">{task.assignee.firstName} {task.assignee.lastName}</span>
          </div>
        ) : <span className="text-xs text-gray-400">—</span>}
      </td>
      <td className="px-4 py-3">
        <div className={cn('flex items-center gap-1 text-xs', isOverdue(task.dueDate) && task.status !== 'DONE' ? 'text-red-600 font-medium' : 'text-gray-500')}>
          <Calendar className="w-3.5 h-3.5" />
          {formatDate(task.dueDate)}
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          {task._count?.comments > 0 && (
            <button onClick={() => onOpenDetail(task.id)} className="flex items-center gap-0.5 bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded hover:bg-blue-50 hover:text-blue-600 transition-colors">
              <MessageSquare className="w-3 h-3" />{task._count.comments}
            </button>
          )}
          {task._count?.subtasks > 0 && (
            <button onClick={() => onOpenDetail(task.id)} className="flex items-center gap-0.5 bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded hover:bg-blue-50 hover:text-blue-600 transition-colors">
              <CheckSquare className="w-3 h-3" />{task._count.subtasks}
            </button>
          )}
          <button onClick={() => onEdit(task)} className="p-1 text-gray-300 hover:text-primary rounded transition-colors" title="Editar">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Edit modal ────────────────────────────────────────────────

function EditTaskModal({ task, onClose }: { task: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'MEDIUM',
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => tasksApi.update(task.id, cleanFormData(data)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Editar Tarefa</h3>
        <form onSubmit={handleSubmit(d => updateMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input {...register('title', { required: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea {...register('description')} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
              <select {...register('priority')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prazo</label>
              <input {...register('dueDate')} type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </div>
          {updateMutation.isError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">Erro ao guardar. Tente novamente.</p>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={updateMutation.isPending} className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
              {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function TasksPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [showNew, setShowNew] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', { status: statusFilter }],
    queryFn: () => tasksApi.list({ status: statusFilter || undefined, limit: 200 }).then(r => r.data),
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list({ limit: 100 }).then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => tasksApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => tasksApi.create(cleanFormData(data)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setShowNew(false); },
  });

  const { register, handleSubmit, reset } = useForm();

  const tasks = (data?.data || []).filter((t: any) =>
    !search || t.title.toLowerCase().includes(search.toLowerCase()),
  );

  const overdueCount = tasks.filter((t: any) => isOverdue(t.dueDate) && t.status !== 'DONE').length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar tarefas..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          {/* Status filter (hidden in kanban — kanban shows all) */}
          {view === 'list' && (
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="">Todos os estados</option>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
              {overdueCount} em atraso
            </span>
          )}

          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('list')}
              className={cn('p-1.5 rounded-md transition-all', view === 'list' ? 'bg-white shadow text-primary' : 'text-gray-400 hover:text-gray-600')}
              title="Vista Lista"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('kanban')}
              className={cn('p-1.5 rounded-md transition-all', view === 'kanban' ? 'bg-white shadow text-primary' : 'text-gray-400 hover:text-gray-600')}
              title="Vista Kanban"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => { reset(); setShowNew(true); }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> Nova Tarefa
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-5 gap-3">
        {STATUSES.map(s => {
          const count = (data?.data || []).filter((t: any) => t.status === s).length;
          return (
            <button
              key={s}
              onClick={() => { setStatusFilter(s === statusFilter ? '' : s); setView('list'); }}
              className={cn(
                'bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center transition-all hover:border-primary/30',
                statusFilter === s && 'border-primary bg-primary/5',
              )}
            >
              <p className="text-xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500 mt-0.5">{STATUS_LABELS[s]}</p>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : view === 'kanban' ? (
        <KanbanBoard
          tasks={tasks}
          onStatusChange={(id, status) => updateMutation.mutate({ id, status })}
          onEdit={setEditingTask}
          onOpenDetail={setDetailTaskId}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Tarefa', 'Estado', 'Prioridade', 'Responsável', 'Prazo', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <CheckSquare className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Nenhuma tarefa encontrada</p>
                  </td>
                </tr>
              ) : tasks.map((t: any) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onStatusChange={(id, status) => updateMutation.mutate({ id, status })}
                  onEdit={setEditingTask}
                  onOpenDetail={setDetailTaskId}
                />
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
            {tasks.length} tarefa{tasks.length !== 1 ? 's' : ''} · {data?.total ?? 0} total
          </div>
        </div>
      )}

      {/* Task detail panel */}
      {detailTaskId && (
        <TaskDetailPanel
          taskId={detailTaskId}
          onClose={() => setDetailTaskId(null)}
          onStatusChange={(id, status) => updateMutation.mutate({ id, status })}
        />
      )}

      {/* Edit modal */}
      {editingTask && <EditTaskModal task={editingTask} onClose={() => setEditingTask(null)} />}

      {/* Create modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Nova Tarefa</h3>
            <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Projeto *</label>
                <select {...register('projectId', { required: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
                  <option value="">Selecionar projeto...</option>
                  {projects?.data?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                <input {...register('title', { required: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Título da tarefa..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea {...register('description')} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
                  <select {...register('priority')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
                    {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prazo</label>
                  <input {...register('dueDate')} type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
              </div>
              {createMutation.isError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  Erro ao criar tarefa. Verifique os campos e tente novamente.
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNew(false)} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={createMutation.isPending} className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
