'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Play, Square, Plus, Trash2, Clock, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────

interface TimeEntry {
  id: string;
  taskId: string;
  userId: string;
  description?: string;
  startedAt: string;
  endedAt?: string | null;
  durationMinutes?: number | null;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

function formatEntryDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── timeTrackingApi ───────────────────────────────────────────

const timeTrackingApi = {
  startTimer: (taskId: string, description?: string) =>
    api.post<TimeEntry>('/time-tracking/start', { taskId, description }),
  stopTimer: (id: string) =>
    api.patch<TimeEntry>(`/time-tracking/${id}/stop`),
  getTaskEntries: (taskId: string) =>
    api.get<TimeEntry[]>(`/time-tracking/task/${taskId}`),
  createManual: (body: { taskId: string; startedAt: string; endedAt: string; description?: string }) =>
    api.post<TimeEntry>('/time-tracking/manual', body),
  deleteEntry: (id: string) =>
    api.delete(`/time-tracking/${id}`),
};

// ── Component ─────────────────────────────────────────────────

interface TimeTrackerProps {
  taskId: string;
}

export function TimeTracker({ taskId }: TimeTrackerProps) {
  const qc = useQueryClient();
  const [elapsed, setElapsed] = useState(0);
  const [activeDescription, setActiveDescription] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [manualStart, setManualStart] = useState('');
  const [manualEnd, setManualEnd] = useState('');
  const [manualDesc, setManualDesc] = useState('');

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['time-entries', taskId],
    queryFn: () => timeTrackingApi.getTaskEntries(taskId).then(r => {
      // API may return array directly or wrapped
      const raw = r.data as any;
      return Array.isArray(raw) ? raw : (raw?.data ?? []);
    }),
  });

  const activeEntry: TimeEntry | undefined = (entries as TimeEntry[]).find(
    (e) => !e.endedAt,
  );

  // Elapsed ticker
  useEffect(() => {
    if (!activeEntry) { setElapsed(0); return; }
    const calcElapsed = () =>
      Math.floor((Date.now() - new Date(activeEntry.startedAt).getTime()) / 1000);
    setElapsed(calcElapsed());
    const id = setInterval(() => setElapsed(calcElapsed()), 1000);
    return () => clearInterval(id);
  }, [activeEntry?.id, activeEntry?.startedAt]);

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['time-entries', taskId] });
  }, [qc, taskId]);

  const startMutation = useMutation({
    mutationFn: () => timeTrackingApi.startTimer(taskId, activeDescription || undefined),
    onSuccess: () => { setActiveDescription(''); invalidate(); },
  });

  const stopMutation = useMutation({
    mutationFn: () => timeTrackingApi.stopTimer(activeEntry!.id),
    onSuccess: () => invalidate(),
  });

  const manualMutation = useMutation({
    mutationFn: () => timeTrackingApi.createManual({
      taskId,
      startedAt: new Date(manualStart).toISOString(),
      endedAt: new Date(manualEnd).toISOString(),
      description: manualDesc || undefined,
    }),
    onSuccess: () => {
      setManualStart('');
      setManualEnd('');
      setManualDesc('');
      setShowManual(false);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => timeTrackingApi.deleteEntry(id),
    onSuccess: () => invalidate(),
  });

  // Compute summaries
  const completedEntries = (entries as TimeEntry[]).filter(e => e.endedAt && e.durationMinutes != null);
  const todayMinutes = completedEntries
    .filter(e => isToday(e.startedAt))
    .reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);
  const totalMinutes = completedEntries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);
  const recentEntries = [...completedEntries]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 5);

  const manualValid = manualStart && manualEnd && new Date(manualEnd) > new Date(manualStart);

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-4 bg-white">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-gray-500" />
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Controlo de Tempo</h3>
      </div>

      {/* Timer controls */}
      {isLoading ? (
        <div className="flex justify-center py-2">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : activeEntry ? (
        <div className="space-y-3">
          {/* Elapsed display */}
          <div className="flex items-center justify-between">
            <span className="font-mono text-2xl font-bold text-gray-900 tabular-nums">
              {formatElapsed(elapsed)}
            </span>
            <button
              onClick={() => stopMutation.mutate()}
              disabled={stopMutation.isPending}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
            >
              {stopMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Square className="w-4 h-4 fill-white" />}
              Parar
            </button>
          </div>
          <input
            type="text"
            placeholder="Descrição (opcional)..."
            value={activeDescription}
            onChange={e => setActiveDescription(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => startMutation.mutate()}
            disabled={startMutation.isPending}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          >
            {startMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Play className="w-4 h-4 fill-white" />}
            Iniciar timer
          </button>
          <button
            onClick={() => setShowManual(p => !p)}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Entrada manual
            {showManual ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Manual entry form */}
      {showManual && !activeEntry && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Entrada Manual</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Início *</label>
              <input
                type="datetime-local"
                value={manualStart}
                onChange={e => setManualStart(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fim *</label>
              <input
                type="datetime-local"
                value={manualEnd}
                onChange={e => setManualEnd(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          <input
            type="text"
            placeholder="Descrição (opcional)..."
            value={manualDesc}
            onChange={e => setManualDesc(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setShowManual(false); setManualStart(''); setManualEnd(''); setManualDesc(''); }}
              className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => manualMutation.mutate()}
              disabled={!manualValid || manualMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {manualMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Summaries */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 rounded-lg px-3 py-2">
          <p className="text-xs text-blue-500 font-medium">Hoje</p>
          <p className="text-base font-bold text-blue-700">{formatMinutes(todayMinutes)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-500 font-medium">Total</p>
          <p className="text-base font-bold text-gray-700">{formatMinutes(totalMinutes)}</p>
        </div>
      </div>

      {/* Recent entries */}
      {recentEntries.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Entradas recentes</p>
          {recentEntries.map(entry => (
            <div key={entry.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-700">
                    {formatMinutes(entry.durationMinutes!)}
                  </span>
                  <span className="text-xs text-gray-400">{formatEntryDate(entry.startedAt)}</span>
                </div>
                {entry.description && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">{entry.description}</p>
                )}
              </div>
              <button
                onClick={() => deleteMutation.mutate(entry.id)}
                disabled={deleteMutation.isPending}
                className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                title="Eliminar"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
