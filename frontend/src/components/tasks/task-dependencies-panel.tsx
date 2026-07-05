'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '@/lib/api';
import { X, Plus, Loader2, Link2, ArrowRight } from 'lucide-react';
import { getStatusColor } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────

interface DependencyTask {
  id: string;
  title: string;
  status: string;
  assignee?: {
    firstName: string;
    lastName: string;
  } | null;
}

interface TaskWithDeps {
  id: string;
  // Raw shape returned by GET /tasks/:id — join-table rows, not flat tasks
  dependsOn?: Array<{ blockingTask: DependencyTask }>;
  blockedFor?: Array<{ dependentTask: DependencyTask }>;
}

interface Props {
  task: TaskWithDeps;
}

// ── Status label map (PT) ────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  TODO:        'A Fazer',
  IN_PROGRESS: 'Em Curso',
  IN_REVIEW:   'Em Revisão',
  DONE:        'Concluída',
  CANCELLED:   'Cancelada',
};

// ── Dependency row ───────────────────────────────────────────────

function DepRow({
  dep,
  taskId,
  canRemove,
}: {
  dep: DependencyTask;
  taskId: string;
  canRemove: boolean;
}) {
  const qc = useQueryClient();

  const removeMutation = useMutation({
    mutationFn: () => tasksApi.removeDependency(taskId, dep.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 group">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 truncate leading-tight">{dep.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getStatusColor(dep.status)}`}>
            {STATUS_LABELS[dep.status] ?? dep.status}
          </span>
          {dep.assignee && (
            <span className="text-xs text-gray-400 truncate">
              {dep.assignee.firstName} {dep.assignee.lastName}
            </span>
          )}
        </div>
      </div>
      {canRemove && (
        <button
          onClick={() => removeMutation.mutate()}
          disabled={removeMutation.isPending}
          className="shrink-0 p-1 text-gray-300 hover:text-red-500 rounded transition-colors opacity-0 group-hover:opacity-100"
          title="Remover dependência"
        >
          {removeMutation.isPending
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <X className="w-3.5 h-3.5" />
          }
        </button>
      )}
    </div>
  );
}

// ── Add dependency combobox ──────────────────────────────────────

function AddDependencyInput({ taskId }: { taskId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: searchResults, isFetching } = useQuery({
    queryKey: ['tasks-search', search],
    queryFn: () =>
      tasksApi.list({ search, limit: 20 }).then((r) => r.data?.data ?? []),
    enabled: search.length >= 1,
    staleTime: 10_000,
  });

  const addMutation = useMutation({
    mutationFn: (blockingTaskId: string) =>
      tasksApi.addDependency(taskId, blockingTaskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      setSearch('');
      setOpen(false);
    },
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Filter out the current task from results
  const filtered = (searchResults ?? []).filter((t: any) => t.id !== taskId);

  return (
    <div className="mt-2 relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            placeholder="Pesquisar tarefa para adicionar..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => search.length >= 1 && setOpen(true)}
          />
          {isFetching && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-gray-400" />
          )}
        </div>
      </div>

      {open && filtered.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto"
        >
          {filtered.map((t: any) => (
            <button
              key={t.id}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                addMutation.mutate(t.id);
              }}
              disabled={addMutation.isPending}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">{t.title}</p>
                {t.project?.name && (
                  <p className="text-xs text-gray-400 truncate">{t.project.name}</p>
                )}
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${getStatusColor(t.status)}`}>
                {STATUS_LABELS[t.status] ?? t.status}
              </span>
            </button>
          ))}
        </div>
      )}

      {open && search.length >= 1 && !isFetching && filtered.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50"
        >
          <p className="px-3 py-3 text-sm text-gray-400 text-center">Nenhuma tarefa encontrada</p>
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────

export function TaskDependenciesPanel({ task }: Props) {
  const [addingDep, setAddingDep] = useState(false);

  const dependsOn: DependencyTask[] = (task.dependsOn ?? []).map(d => d.blockingTask).filter(Boolean);
  const blockedFor: DependencyTask[] = (task.blockedFor ?? []).map(d => d.dependentTask).filter(Boolean);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5" />
          Dependências
        </h3>
        <button
          onClick={() => setAddingDep((v) => !v)}
          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
        >
          <Plus className="w-3 h-3" /> Adicionar
        </button>
      </div>

      {/* Bloqueada por */}
      <div className="mb-3">
        <p className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1">
          <ArrowRight className="w-3 h-3 rotate-180 text-orange-400" />
          Bloqueada por
        </p>
        {dependsOn.length === 0 ? (
          <p className="text-xs text-gray-400 italic pl-2">Nenhuma</p>
        ) : (
          <div className="space-y-0.5">
            {dependsOn.map((dep) => (
              <DepRow
                key={dep.id}
                dep={dep}
                taskId={task.id}
                canRemove={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bloqueia */}
      <div className="mb-2">
        <p className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1">
          <ArrowRight className="w-3 h-3 text-blue-400" />
          Bloqueia
        </p>
        {blockedFor.length === 0 ? (
          <p className="text-xs text-gray-400 italic pl-2">Nenhuma</p>
        ) : (
          <div className="space-y-0.5">
            {blockedFor.map((dep) => (
              <DepRow
                key={dep.id}
                dep={dep}
                taskId={task.id}
                canRemove={false}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add input */}
      {addingDep && (
        <div className="border-t border-gray-100 pt-2">
          <p className="text-xs text-gray-500 mb-1">
            Selecione uma tarefa que <strong>bloqueia</strong> esta:
          </p>
          <AddDependencyInput taskId={task.id} />
          <button
            onClick={() => setAddingDep(false)}
            className="mt-2 text-xs text-gray-400 hover:text-gray-600"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
