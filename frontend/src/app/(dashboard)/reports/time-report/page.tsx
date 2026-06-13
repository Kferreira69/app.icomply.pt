'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Clock, Loader2, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react';

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
  task?: {
    title: string;
    project?: { id: string; name: string };
  };
}

interface MyEntriesResponse {
  data: TimeEntry[];
  total: number;
  page: number;
  limit: number;
}

interface ProjectReport {
  projectId: string;
  projectName: string;
  totalMinutes: number;
  entriesCount: number;
}

// ── Helpers ───────────────────────────────────────────────────

function formatMinutes(mins: number): string {
  if (!mins || mins <= 0) return '0m';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function getWeekRange(offset = 0): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function getMonthRange(offset = 0): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function formatDateDisplay(d: Date): string {
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatEntryDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── API ───────────────────────────────────────────────────────

const timeTrackingApi = {
  getMyEntries: (page: number, limit: number) =>
    api.get<MyEntriesResponse>('/time-tracking/my', { params: { page, limit } }),
  getProjectReport: (projectId: string) =>
    api.get<ProjectReport>(`/time-tracking/project/${projectId}/report`),
};

// ── Page ──────────────────────────────────────────────────────

type RangeType = 'week' | 'month' | 'custom';

const PAGE_LIMIT = 20;

export default function TimeReportPage() {
  const [rangeType, setRangeType] = useState<RangeType>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [page, setPage] = useState(1);

  // Fetch all entries (up to 500) so we can compute totals and project breakdown
  const { data: allData, isLoading: allLoading } = useQuery({
    queryKey: ['time-entries-my-all'],
    queryFn: () => timeTrackingApi.getMyEntries(1, 500).then(r => {
      const raw = r.data as any;
      return Array.isArray(raw) ? raw : (raw?.data ?? []);
    }),
  });

  const { data: pageData, isLoading: pageLoading } = useQuery({
    queryKey: ['time-entries-my', page],
    queryFn: () => timeTrackingApi.getMyEntries(page, PAGE_LIMIT).then(r => r.data),
  });

  // Resolve date range
  const range = useMemo<{ start: Date; end: Date } | null>(() => {
    if (rangeType === 'week') return getWeekRange(weekOffset);
    if (rangeType === 'month') return getMonthRange(monthOffset);
    if (customStart && customEnd) {
      return { start: new Date(customStart + 'T00:00:00'), end: new Date(customEnd + 'T23:59:59') };
    }
    return null;
  }, [rangeType, weekOffset, monthOffset, customStart, customEnd]);

  const allEntries: TimeEntry[] = Array.isArray(allData) ? allData : [];

  // Filter entries in range
  const filteredEntries = useMemo(() => {
    if (!range) return allEntries;
    return allEntries.filter(e => {
      const d = new Date(e.startedAt);
      return d >= range.start && d <= range.end;
    });
  }, [allEntries, range]);

  const completedFiltered = filteredEntries.filter(e => e.endedAt && e.durationMinutes != null);
  const totalMinutesFiltered = completedFiltered.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);

  // Project breakdown from filtered entries
  const projectBreakdown = useMemo(() => {
    const map: Record<string, { name: string; minutes: number; count: number }> = {};
    completedFiltered.forEach(e => {
      const pid = e.task?.project?.id ?? 'unknown';
      const pname = e.task?.project?.name ?? 'Sem projeto';
      if (!map[pid]) map[pid] = { name: pname, minutes: 0, count: 0 };
      map[pid].minutes += e.durationMinutes ?? 0;
      map[pid].count += 1;
    });
    return Object.entries(map)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);
  }, [completedFiltered]);

  // Pagination of filtered entries (client-side slice for filtered, or raw paged for "all")
  const paginatedEntries = useMemo(() => {
    const start = (page - 1) * PAGE_LIMIT;
    return completedFiltered.slice(start, start + PAGE_LIMIT);
  }, [completedFiltered, page]);

  const totalPages = Math.max(1, Math.ceil(completedFiltered.length / PAGE_LIMIT));

  const isLoading = allLoading || pageLoading;

  // Label for current range
  const rangeLabel = useMemo(() => {
    if (!range) return 'Período personalizado';
    return `${formatDateDisplay(range.start)} – ${formatDateDisplay(range.end)}`;
  }, [range]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Relatório de Tempo</h1>
            <p className="text-sm text-gray-500">{rangeLabel}</p>
          </div>
        </div>
        {/* Total badge */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-2.5 text-center">
          <p className="text-xs text-blue-500 font-medium">Total no período</p>
          <p className="text-2xl font-bold text-blue-700">{formatMinutes(totalMinutesFiltered)}</p>
        </div>
      </div>

      {/* Range filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-4">
        {/* Type selector */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
          {(['week', 'month', 'custom'] as RangeType[]).map(type => (
            <button
              key={type}
              onClick={() => { setRangeType(type); setPage(1); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${rangeType === type ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {type === 'week' ? 'Esta semana' : type === 'month' ? 'Este mês' : 'Personalizado'}
            </button>
          ))}
        </div>

        {/* Week nav */}
        {rangeType === 'week' && (
          <div className="flex items-center gap-2">
            <button onClick={() => { setWeekOffset(p => p - 1); setPage(1); }} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <span className="text-sm text-gray-600 min-w-[200px] text-center">{rangeLabel}</span>
            <button onClick={() => { setWeekOffset(p => p + 1); setPage(1); }} disabled={weekOffset >= 0} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40">
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        )}

        {/* Month nav */}
        {rangeType === 'month' && (
          <div className="flex items-center gap-2">
            <button onClick={() => { setMonthOffset(p => p - 1); setPage(1); }} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <span className="text-sm text-gray-600 min-w-[160px] text-center">{rangeLabel}</span>
            <button onClick={() => { setMonthOffset(p => p + 1); setPage(1); }} disabled={monthOffset >= 0} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40">
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        )}

        {/* Custom range */}
        {rangeType === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={e => { setCustomStart(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <span className="text-gray-400 text-sm">até</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => { setCustomEnd(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        )}
      </div>

      {/* Project breakdown */}
      {projectBreakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-gray-500" /> Top projetos por tempo
          </h2>
          <div className="space-y-3">
            {projectBreakdown.map(proj => {
              const pct = totalMinutesFiltered > 0 ? Math.round((proj.minutes / totalMinutesFiltered) * 100) : 0;
              return (
                <div key={proj.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{proj.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{proj.count} entradas</span>
                      <span className="text-sm font-semibold text-gray-900">{formatMinutes(proj.minutes)}</span>
                      <span className="text-xs text-blue-500 font-medium w-10 text-right">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Entries table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="text-sm font-semibold text-gray-700">
            Entradas de tempo
            {completedFiltered.length > 0 && (
              <span className="ml-2 text-gray-400 font-normal">({completedFiltered.length})</span>
            )}
          </h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-gray-400" />
          </div>
        ) : paginatedEntries.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Clock className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Sem entradas de tempo no período selecionado.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tarefa</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Projeto</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Duração</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEntries.map(entry => (
                    <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {formatEntryDate(entry.startedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-800">
                          {entry.task?.title ?? <span className="text-gray-400 italic">—</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">
                          {entry.task?.project?.name ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatMinutes(entry.durationMinutes ?? 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                        {entry.description ?? <span className="italic text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-100">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Total no período
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">
                      {formatMinutes(totalMinutesFiltered)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Página {page} de {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
