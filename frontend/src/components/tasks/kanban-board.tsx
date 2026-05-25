'use client';

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { Calendar, Pencil, AlertCircle, MessageSquare, CheckSquare as SubtaskIcon } from 'lucide-react';
import { cn, formatDate, getPriorityColor, isOverdue } from '@/lib/utils';

// ── Column definitions ────────────────────────────────────────

const COLUMNS = [
  { id: 'TODO',        label: 'A Fazer',     color: 'bg-gray-100 text-gray-700',  dot: 'bg-gray-400' },
  { id: 'IN_PROGRESS', label: 'Em Curso',    color: 'bg-blue-50 text-blue-700',   dot: 'bg-blue-500' },
  { id: 'IN_REVIEW',  label: 'Em Revisão',  color: 'bg-purple-50 text-purple-700', dot: 'bg-purple-500' },
  { id: 'DONE',       label: 'Concluído',   color: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  { id: 'CANCELLED',  label: 'Cancelado',   color: 'bg-gray-50 text-gray-400',   dot: 'bg-gray-300' },
] as const;

// ── Task Card ─────────────────────────────────────────────────

function TaskCard({
  task,
  onEdit,
  onOpenDetail,
  isDragging = false,
}: {
  task: any;
  onEdit: (task: any) => void;
  onOpenDetail?: (taskId: string) => void;
  isDragging?: boolean;
}) {
  const overdue = isOverdue(task.dueDate) && task.status !== 'DONE';

  return (
    <div
      className={cn(
        'bg-white rounded-xl border shadow-sm p-3 space-y-2 transition-all select-none',
        isDragging
          ? 'shadow-xl border-primary/40 rotate-1 opacity-90 scale-105'
          : 'border-gray-100 hover:border-primary/30 hover:shadow-md',
        overdue && 'border-l-4 border-l-red-400',
      )}
    >
      {/* Title + edit */}
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onOpenDetail?.(task.id); }}
          className="text-sm font-medium text-gray-900 leading-snug line-clamp-2 text-left hover:text-blue-600 transition-colors"
        >
          {task.title}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(task); }}
          className="p-1 text-gray-300 hover:text-primary rounded flex-shrink-0 transition-colors"
          title="Editar"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Project */}
      {task.project?.name && (
        <p className="text-xs text-gray-400 truncate">{task.project.name}</p>
      )}

      {/* Priority + Due date */}
      <div className="flex items-center justify-between">
        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold', getPriorityColor(task.priority))}>
          {task.priority}
        </span>
        {task.dueDate && (
          <div className={cn('flex items-center gap-1 text-[11px]', overdue ? 'text-red-600 font-semibold' : 'text-gray-400')}>
            {overdue && <AlertCircle className="w-3 h-3" />}
            <Calendar className="w-3 h-3" />
            {formatDate(task.dueDate)}
          </div>
        )}
      </div>

      {/* Assignee */}
      {task.assignee && (
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
            {task.assignee.firstName?.[0]}{task.assignee.lastName?.[0]}
          </div>
          <span className="text-[11px] text-gray-500 truncate">
            {task.assignee.firstName} {task.assignee.lastName}
          </span>
        </div>
      )}

      {/* Badges: comments, subtasks, evidences */}
      {(task._count?.comments > 0 || task._count?.subtasks > 0 || task._count?.evidences > 0) && (
        <div className="flex gap-1 flex-wrap">
          {task._count?.comments > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded">
              <MessageSquare className="w-2.5 h-2.5" />{task._count.comments}
            </span>
          )}
          {task._count?.subtasks > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded">
              <SubtaskIcon className="w-2.5 h-2.5" />{task._count.subtasks}
            </span>
          )}
          {task._count?.evidences > 0 && (
            <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
              {task._count.evidences} ev.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Draggable card wrapper ─────────────────────────────────────

function DraggableTaskCard({ task, onEdit, onOpenDetail }: { task: any; onEdit: (task: any) => void; onOpenDetail?: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.35 : 1, cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      <TaskCard task={task} onEdit={onEdit} onOpenDetail={onOpenDetail} />
    </div>
  );
}

// ── Droppable column ──────────────────────────────────────────

function KanbanColumn({
  column,
  tasks,
  onEdit,
  onOpenDetail,
}: {
  column: typeof COLUMNS[number];
  tasks: any[];
  onEdit: (task: any) => void;
  onOpenDetail?: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex flex-col flex-shrink-0 w-72">
      {/* Column header */}
      <div className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3', column.color)}>
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', column.dot)} />
        <span className="text-sm font-semibold flex-1">{column.label}</span>
        <span className="text-xs font-medium bg-white/60 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 space-y-2.5 min-h-[200px] rounded-xl p-2 transition-colors',
          isOver ? 'bg-primary/5 ring-2 ring-primary/30 ring-dashed' : 'bg-gray-50/50',
        )}
      >
        {tasks.map(task => (
          <DraggableTaskCard key={task.id} task={task} onEdit={onEdit} onOpenDetail={onOpenDetail} />
        ))}
        {tasks.length === 0 && !isOver && (
          <div className="flex items-center justify-center h-20 text-xs text-gray-300 italic">
            Sem tarefas
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main KanbanBoard ──────────────────────────────────────────

export function KanbanBoard({
  tasks,
  onStatusChange,
  onEdit,
  onOpenDetail,
}: {
  tasks: any[];
  onStatusChange: (id: string, status: string) => void;
  onEdit: (task: any) => void;
  onOpenDetail?: (taskId: string) => void;
}) {
  const [activeTask, setActiveTask] = useState<any | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const tasksByColumn = COLUMNS.reduce(
    (acc, col) => {
      acc[col.id] = tasks.filter(t => t.status === col.id);
      return acc;
    },
    {} as Record<string, any[]>,
  );

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;
    const task = tasks.find(t => t.id === taskId);

    if (task && task.status !== newStatus && COLUMNS.some(c => c.id === newStatus)) {
      onStatusChange(taskId, newStatus);
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1">
        {COLUMNS.map(col => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={tasksByColumn[col.id] ?? []}
            onEdit={onEdit}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>

      {/* Drag overlay — floating ghost card */}
      <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
        {activeTask ? <TaskCard task={activeTask} onEdit={onEdit} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
