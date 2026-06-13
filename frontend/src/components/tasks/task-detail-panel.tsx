'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  X, MessageSquare, CheckSquare, Plus, Clock,
  User, Flag, Calendar, Send, Loader2, ChevronRight,
  Circle, CheckCircle2,
} from 'lucide-react';
import { TaskDependenciesPanel } from '@/components/tasks/task-dependencies-panel';
import { TimeTracker } from '@/components/time-tracking/TimeTracker';
import { format, formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useAuthStore } from '@/store/auth-store';

const PRIORITY_STYLES: Record<string, { color: string; label: string }> = {
  LOW:      { color: 'text-gray-500',  label: 'Baixa' },
  MEDIUM:   { color: 'text-blue-600',  label: 'Média' },
  HIGH:     { color: 'text-orange-600',label: 'Alta' },
  CRITICAL: { color: 'text-red-600',   label: 'Crítica' },
};

const STATUS_LABELS: Record<string, string> = {
  TODO:        'A Fazer',
  IN_PROGRESS: 'Em Curso',
  IN_REVIEW:   'Em Revisão',
  DONE:        'Concluída',
  CANCELLED:   'Cancelada',
};

interface TaskDetailPanelProps {
  taskId: string;
  onClose: () => void;
  onStatusChange?: (taskId: string, status: string) => void;
}

export function TaskDetailPanel({ taskId, onClose, onStatusChange }: TaskDetailPanelProps) {
  const qc = useQueryClient();
  const { user: me } = useAuthStore();
  const [comment, setComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => tasksApi.get(taskId).then(r => r.data),
    refetchInterval: 5000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['task', taskId] });
    qc.invalidateQueries({ queryKey: ['tasks'] });
  };

  const commentMutation = useMutation({
    mutationFn: (content: string) => tasksApi.addComment(taskId, content),
    onSuccess: () => { setComment(''); invalidate(); },
  });

  const subtaskMutation = useMutation({
    mutationFn: (title: string) => tasksApi.create({
      title,
      projectId: task?.projectId,
      parentId: taskId,
      status: 'TODO',
      priority: 'MEDIUM',
    }),
    onSuccess: () => { setNewSubtask(''); setAddingSubtask(false); invalidate(); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tasksApi.update(id, { status }),
    onSuccess: () => invalidate(),
  });

  const toggleSubtaskDone = (subtask: any) => {
    const next = subtask.status === 'DONE' ? 'TODO' : 'DONE';
    statusMutation.mutate({ id: subtask.id, status: next });
  };

  if (isLoading) {
    return (
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl border-l z-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!task) return null;

  const prio = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.MEDIUM;
  const doneSubtasks = task.subtasks?.filter((s: any) => s.status === 'DONE').length ?? 0;
  const totalSubtasks = task.subtasks?.length ?? 0;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl border-l z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-500">{task.project?.name}</span>
              {task.parent && (
                <>
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500 truncate max-w-[140px]">{task.parent?.title ?? 'Tarefa pai'}</span>
                </>
              )}
            </div>
            <h2 className="text-base font-semibold text-gray-900 leading-snug">{task.title}</h2>
          </div>
          <button onClick={onClose} className="shrink-0 p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Meta bar */}
          <div className="px-5 py-3 border-b bg-gray-50 grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-400 text-xs block">Estado</span>
              <select
                className="text-sm font-medium text-gray-700 bg-transparent border-0 p-0 focus:ring-0 cursor-pointer"
                value={task.status}
                onChange={e => {
                  statusMutation.mutate({ id: task.id, status: e.target.value });
                  onStatusChange?.(task.id, e.target.value);
                }}
              >
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <span className="text-gray-400 text-xs block">Prioridade</span>
              <span className={`font-medium ${prio.color}`}>{prio.label}</span>
            </div>
            <div>
              <span className="text-gray-400 text-xs block">Responsável</span>
              <span className="font-medium text-gray-700">
                {task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : '—'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 text-xs block">Prazo</span>
              <span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                {task.dueDate ? format(new Date(task.dueDate), 'dd/MM/yyyy') : '—'}
                {isOverdue && ' ⚠'}
              </span>
            </div>
          </div>

          <div className="px-5 py-4 space-y-6">
            {/* Description */}
            {task.description && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Descrição</h3>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            {/* Time Tracker */}
            <TimeTracker taskId={taskId} />

            {/* Subtasks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5" />
                  Subtarefas
                  {totalSubtasks > 0 && (
                    <span className="text-gray-500 font-normal">{doneSubtasks}/{totalSubtasks}</span>
                  )}
                </h3>
                <button
                  onClick={() => setAddingSubtask(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> Adicionar
                </button>
              </div>

              {/* Progress bar */}
              {totalSubtasks > 0 && (
                <div className="h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-300"
                    style={{ width: `${totalSubtasks > 0 ? (doneSubtasks / totalSubtasks) * 100 : 0}%` }}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                {task.subtasks?.map((sub: any) => (
                  <label key={sub.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-gray-50 cursor-pointer group">
                    <button onClick={() => toggleSubtaskDone(sub)} className="shrink-0">
                      {sub.status === 'DONE'
                        ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                        : <Circle className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />
                      }
                    </button>
                    <span className={`text-sm flex-1 ${sub.status === 'DONE' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {sub.title}
                    </span>
                  </label>
                ))}
              </div>

              {addingSubtask && (
                <div className="mt-2 flex gap-2">
                  <input
                    autoFocus
                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
                    placeholder="Título da subtarefa..."
                    value={newSubtask}
                    onChange={e => setNewSubtask(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newSubtask.trim()) subtaskMutation.mutate(newSubtask.trim());
                      if (e.key === 'Escape') { setAddingSubtask(false); setNewSubtask(''); }
                    }}
                  />
                  <Button
                    size="sm"
                    disabled={!newSubtask.trim() || subtaskMutation.isPending}
                    onClick={() => newSubtask.trim() && subtaskMutation.mutate(newSubtask.trim())}
                  >
                    {subtaskMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'OK'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setAddingSubtask(false); setNewSubtask(''); }}>
                    Cancelar
                  </Button>
                </div>
              )}

              {totalSubtasks === 0 && !addingSubtask && (
                <p className="text-xs text-gray-400 italic">Sem subtarefas. Clique em + Adicionar para criar.</p>
              )}
            </div>

            {/* Dependencies */}
            <div>
              <TaskDependenciesPanel task={task} />
            </div>

            {/* Comments */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Comentários ({task.comments?.length ?? 0})
              </h3>

              <div className="space-y-3 mb-4">
                {task.comments?.length === 0 && (
                  <p className="text-xs text-gray-400 italic">Sem comentários ainda. Seja o primeiro!</p>
                )}
                {task.comments?.map((c: any) => (
                  <div key={c.id} className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0">
                      {c.user.firstName[0]}{c.user.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-gray-800">
                          {c.user.firstName} {c.user.lastName}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: pt })}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap">
                        {c.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Comment input */}
              <div className="flex gap-2 items-end">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0">
                  {me?.firstName?.[0]}{me?.lastName?.[0]}
                </div>
                <div className="flex-1">
                  <textarea
                    ref={commentRef}
                    rows={2}
                    className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Escreva um comentário... (Enter para enviar, Shift+Enter para nova linha)"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (comment.trim()) commentMutation.mutate(comment.trim());
                      }
                    }}
                  />
                  <div className="flex justify-end mt-1.5">
                    <Button
                      size="sm"
                      disabled={!comment.trim() || commentMutation.isPending}
                      onClick={() => comment.trim() && commentMutation.mutate(comment.trim())}
                      className="gap-1.5"
                    >
                      {commentMutation.isPending
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Send className="w-3 h-3" />
                      }
                      Enviar
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Evidences */}
            {task.evidences?.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Evidências</h3>
                <div className="space-y-1">
                  {task.evidences.map((ev: any) => (
                    <div key={ev.id} className="text-sm text-gray-700 flex items-center gap-2 py-1">
                      <CheckSquare className="w-3.5 h-3.5 text-gray-400" />
                      {ev.title ?? ev.fileName}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
