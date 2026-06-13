'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientHubApi } from '@/lib/api';
import {
  Building2, Plus, AlertTriangle, CheckCircle, Clock, Loader2, X,
  ExternalLink, TrendingUp, Search, ArrowUpDown, ArrowUp, ArrowDown,
  Download, BarChart2, LayoutGrid, List, FileText, ChevronRight,
  ShieldAlert, Activity, Users, Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// ── Types ──────────────────────────────────────────────────────────────────

interface ClientOrg {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  plan: string | null;
  overdueTasks: number;
  highRisks: number;
  openCapas: number;
  health: 'GOOD' | 'ATTENTION' | 'CRITICAL';
  role: string;
}

interface HubDashboard {
  clients: ClientOrg[];
  total: number;
  critical: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const HEALTH_CONFIG = {
  GOOD:      { color: 'bg-green-100 text-green-700',   dot: 'bg-green-500',           ring: 'stroke-green-500',   label: 'Conforme'  },
  ATTENTION: { color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500',           ring: 'stroke-yellow-500',  label: 'Atenção'   },
  CRITICAL:  { color: 'bg-red-100 text-red-700',       dot: 'bg-red-500 animate-pulse', ring: 'stroke-red-500',    label: 'Crítico'   },
};

type SortField = 'name' | 'score' | 'activity';
type SortDir   = 'asc' | 'desc';
type ViewMode  = 'grid' | 'table';
type ActiveTab = 'portfolio' | 'comparison';

const INP = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none';

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Derive a 0-100 compliance score from alert counts.
 * alertScore = overdueTasks*2 + highRisks*3 + openCapas (mirrors backend logic).
 * We map 0→100, 5→60, 10→30, ≥15→0.
 */
function deriveScore(c: ClientOrg): number {
  const alertScore = c.overdueTasks * 2 + c.highRisks * 3 + c.openCapas;
  const score = Math.max(0, Math.round(100 - alertScore * 6));
  return Math.min(100, score);
}

function scoreColor(score: number) {
  if (score >= 80) return { text: 'text-green-600', ring: '#22c55e', bg: 'bg-green-50' };
  if (score >= 50) return { text: 'text-amber-600', ring: '#f59e0b', bg: 'bg-amber-50' };
  return { text: 'text-red-600', ring: '#ef4444', bg: 'bg-red-50' };
}

/** SVG ring gauge – r=14, circumference≈87.96 */
function ScoreRing({ score }: { score: number }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const { ring, text } = scoreColor(score);
  return (
    <div className="relative w-10 h-10 flex-shrink-0">
      <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <circle cx="18" cy="18" r={r} fill="none" stroke={ring} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className={cn('absolute inset-0 flex items-center justify-center text-[9px] font-black', text)}>
        {score}
      </span>
    </div>
  );
}

/** Export clients to CSV */
function exportCsv(clients: ClientOrg[]) {
  const headers = ['Cliente', 'Score', 'Riscos Altos', 'Tarefas Atrasadas', 'CAPAs Abertos', 'Estado'];
  const rows = clients.map(c => [
    c.name,
    deriveScore(c),
    c.highRisks,
    c.overdueTasks,
    c.openCapas,
    HEALTH_CONFIG[c.health].label,
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `client-hub-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Sub-components ─────────────────────────────────────────────────────────

function PortfolioStats({ data }: { data: HubDashboard }) {
  const clients = data.clients;
  const avgScore = clients.length
    ? Math.round(clients.reduce((s, c) => s + deriveScore(c), 0) / clients.length)
    : 0;
  const conformes = clients.filter(c => deriveScore(c) >= 80).length;
  const criticalAlerts = clients.reduce((s, c) => s + c.highRisks, 0);

  const stats = [
    { label: 'Total Clientes',         value: data.total,        icon: Users,       color: 'text-cyan-600',  bg: 'bg-cyan-50' },
    { label: 'Score Médio',            value: `${avgScore}%`,    icon: Target,      color: 'text-blue-600',  bg: 'bg-blue-50' },
    { label: 'Clientes em Conformidade', value: conformes,       icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Alertas Críticos',       value: criticalAlerts,    icon: ShieldAlert, color: 'text-red-600',   bg: 'bg-red-50' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map(s => (
        <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', s.bg)}>
              <s.icon className={cn('w-5 h-5', s.color)} />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400 leading-tight">{s.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ClientCard({
  client,
  onRemove,
  onAddTask,
}: {
  client: ClientOrg;
  onRemove: (id: string) => void;
  onAddTask: (client: ClientOrg) => void;
}) {
  const health = HEALTH_CONFIG[client.health] || HEALTH_CONFIG.GOOD;
  const score  = deriveScore(client);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group flex flex-col">
      <div className="p-5 flex-1">
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center text-cyan-700 font-black text-lg flex-shrink-0">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate max-w-[140px]">{client.name}</p>
              <p className="text-xs text-gray-400">{client.industry || 'Indústria N/A'}</p>
            </div>
          </div>
          <ScoreRing score={score} />
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-1.5 mb-4">
          <div className={cn('w-2 h-2 rounded-full flex-shrink-0', health.dot)} />
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', health.color)}>{health.label}</span>
          <span className="text-xs text-gray-300 mx-1">·</span>
          <span className="text-xs text-gray-400">{client.plan || 'FREE'}</span>
        </div>

        {/* Alert stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Tarefas atrasadas', value: client.overdueTasks, color: client.overdueTasks > 0 ? 'text-red-600'    : 'text-gray-700' },
            { label: 'Riscos altos',      value: client.highRisks,    color: client.highRisks    > 0 ? 'text-orange-600' : 'text-gray-700' },
            { label: 'CAPAs abertos',     value: client.openCapas,    color: client.openCapas    > 0 ? 'text-amber-600'  : 'text-gray-700' },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-xl py-2">
              <p className={cn('text-xl font-black', s.color)}>{s.value}</p>
              <p className="text-[10px] text-gray-400 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer actions */}
      <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-1">
        <button
          onClick={() => onRemove(client.id)}
          title="Remover cliente"
          className="p-1.5 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1" />
        <button
          onClick={() => onAddTask(client)}
          className="flex items-center gap-1 text-xs text-gray-500 font-medium hover:text-gray-700 px-2 py-1.5 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <Plus className="w-3 h-3" /> Tarefa
        </button>
        <button
          onClick={() => alert(`Relatório rápido para "${client.name}" — funcionalidade disponível em breve.`)}
          className="flex items-center gap-1 text-xs text-gray-500 font-medium hover:text-gray-700 px-2 py-1.5 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <FileText className="w-3 h-3" /> Relatório
        </button>
        <Link
          href={`/dashboard`}
          className="flex items-center gap-1 text-xs text-cyan-600 font-semibold hover:underline px-2 py-1.5"
        >
          Ver <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

function SortButton({
  field, current, dir, onClick, children,
}: {
  field: SortField; current: SortField; dir: SortDir;
  onClick: (f: SortField) => void; children: React.ReactNode;
}) {
  const active = current === field;
  return (
    <button
      onClick={() => onClick(field)}
      className={cn(
        'flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors',
        active
          ? 'bg-cyan-50 border-cyan-200 text-cyan-700'
          : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50',
      )}
    >
      {children}
      {active ? (
        dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  );
}

function ComparisonTable({ clients }: { clients: ClientOrg[] }) {
  const [sortField, setSortField] = useState<'name' | 'score' | 'highRisks' | 'overdueTasks' | 'openCapas'>('score');
  const [sortDir,   setSortDir]   = useState<SortDir>('desc');

  const sorted = useMemo(() => {
    return [...clients].sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;
      if (sortField === 'name')         { av = a.name;         bv = b.name; }
      else if (sortField === 'score')   { av = deriveScore(a); bv = deriveScore(b); }
      else                              { av = (a as any)[sortField]; bv = (b as any)[sortField]; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }, [clients, sortField, sortDir]);

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  }

  function ColHeader({ field, children }: { field: typeof sortField; children: React.ReactNode }) {
    const active = sortField === field;
    return (
      <th
        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 cursor-pointer select-none hover:text-gray-700 whitespace-nowrap"
        onClick={() => toggleSort(field)}
      >
        <span className="flex items-center gap-1">
          {children}
          {active
            ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)
            : <ArrowUpDown className="w-3 h-3 opacity-30" />}
        </span>
      </th>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-12 text-gray-400">
        <BarChart2 className="w-10 h-10 text-gray-200 mb-3" />
        <p className="font-medium">Sem clientes para comparar</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-cyan-600" /> Comparação de Clientes
        </h2>
        <button
          onClick={() => exportCsv(clients)}
          className="flex items-center gap-1.5 text-xs text-gray-600 font-medium border border-gray-200 rounded-xl px-3 py-1.5 hover:bg-gray-50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Exportar CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <ColHeader field="name">Cliente</ColHeader>
              <ColHeader field="score">Score</ColHeader>
              <ColHeader field="highRisks">Riscos Altos</ColHeader>
              <ColHeader field="overdueTasks">Tarefas Abertas</ColHeader>
              <ColHeader field="openCapas">Evidências / CAPAs</ColHeader>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map(client => {
              const score  = deriveScore(client);
              const sc     = scoreColor(score);
              const health = HEALTH_CONFIG[client.health];
              return (
                <tr key={client.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center text-cyan-700 font-bold text-sm flex-shrink-0">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-xs">{client.name}</p>
                        <p className="text-[10px] text-gray-400">{client.industry || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: sc.ring }} />
                      </div>
                      <span className={cn('text-xs font-bold', sc.text)}>{score}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-sm font-bold', client.highRisks > 0 ? 'text-orange-600' : 'text-gray-400')}>
                      {client.highRisks}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-sm font-bold', client.overdueTasks > 0 ? 'text-red-600' : 'text-gray-400')}>
                      {client.overdueTasks}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-sm font-bold', client.openCapas > 0 ? 'text-amber-600' : 'text-gray-400')}>
                      {client.openCapas}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', health.dot)} />
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', health.color)}>
                        {health.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href="/dashboard" className="text-xs text-cyan-600 font-medium hover:underline flex items-center gap-1">
                      Ver dashboard <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActivityFeed({ clients }: { clients: ClientOrg[] }) {
  // Generate synthetic recent activity entries from the alert data we have.
  // In a future iteration this can be replaced by a real /client-hub/activity endpoint.
  const activities = useMemo(() => {
    const items: { clientName: string; text: string; type: 'risk' | 'task' | 'capa' | 'ok' }[] = [];
    clients.forEach(c => {
      if (c.highRisks   > 0) items.push({ clientName: c.name, text: `${c.highRisks} risco(s) alto(s) ativo(s)`,      type: 'risk' });
      if (c.overdueTasks > 0) items.push({ clientName: c.name, text: `${c.overdueTasks} tarefa(s) em atraso`,          type: 'task' });
      if (c.openCapas   > 0) items.push({ clientName: c.name, text: `${c.openCapas} CAPA(s) em aberto`,               type: 'capa' });
      if (c.health === 'GOOD') items.push({ clientName: c.name, text: 'Todos os indicadores conformes',                type: 'ok' });
    });
    return items.slice(0, 12);
  }, [clients]);

  const typeIcon = {
    risk: <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />,
    task: <Clock         className="w-3.5 h-3.5 text-red-500"    />,
    capa: <FileText      className="w-3.5 h-3.5 text-amber-500"  />,
    ok:   <CheckCircle   className="w-3.5 h-3.5 text-green-500"  />,
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-600" /> Visão Geral de Atividade
        </h2>
        <span className="text-xs text-gray-400">Todos os clientes</span>
      </div>
      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
          <CheckCircle className="w-8 h-8 text-green-200 mb-2" />
          <p className="text-sm font-medium">Sem alertas ativos</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {activities.map((item, i) => (
            <li key={i} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors">
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                {typeIcon[item.type]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-700 leading-snug">
                  <span className="font-semibold text-cyan-700 bg-cyan-50 rounded px-1 py-0.5 mr-1">{item.clientName}</span>
                  {item.text}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddTaskModal({ client, onClose }: { client: ClientOrg; onClose: () => void }) {
  const [title,    setTitle]    = useState('');
  const [dueDate,  setDueDate]  = useState('');
  const [priority, setPriority] = useState('MEDIUM');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Adicionar Tarefa</h2>
            <p className="text-xs text-gray-400 mt-0.5">Para: <span className="font-semibold text-cyan-700">{client.name}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Título da tarefa</label>
            <input className={INP} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Rever política de privacidade" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Data limite</label>
              <input type="date" className={INP} value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Prioridade</label>
              <select className={INP} value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="CRITICAL">Crítica</option>
              </select>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
            A criação de tarefas directamente a partir do hub ficará disponível na próxima versão. Por agora, aceda ao dashboard do cliente.
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <Link
              href="/dashboard"
              className="flex-1 flex items-center justify-center gap-2 bg-cyan-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-cyan-700"
            >
              Ir para dashboard <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function ClientHubPage() {
  const qc = useQueryClient();

  // ── State ──
  const [showAdd,   setShowAdd]   = useState(false);
  const [addForm,   setAddForm]   = useState({ clientSlug: '', clientName: '', role: 'MANAGER' });
  const [search,    setSearch]    = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir,   setSortDir]   = useState<SortDir>('asc');
  const [viewMode,  setViewMode]  = useState<ViewMode>('grid');
  const [activeTab, setActiveTab] = useState<ActiveTab>('portfolio');
  const [taskClient, setTaskClient] = useState<ClientOrg | null>(null);

  // ── Data ──
  const { data, isLoading } = useQuery<HubDashboard>({
    queryKey: ['client-hub'],
    queryFn: () => clientHubApi.getDashboard().then(r => r.data),
  });

  const addMutation = useMutation({
    mutationFn: (d: any) => clientHubApi.addClient(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-hub'] });
      setShowAdd(false);
      setAddForm({ clientSlug: '', clientName: '', role: 'MANAGER' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => clientHubApi.removeClient(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-hub'] }),
  });

  // ── Derived ──
  const allClients: ClientOrg[] = data?.clients || [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allClients.filter(c =>
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.industry || '').toLowerCase().includes(q),
    );
  }, [allClients, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: number | string = '';
      let bv: number | string = '';
      if (sortField === 'name')     { av = a.name;         bv = b.name; }
      if (sortField === 'score')    { av = deriveScore(a); bv = deriveScore(b); }
      if (sortField === 'activity') {
        av = a.overdueTasks + a.highRisks + a.openCapas;
        bv = b.overdueTasks + b.highRisks + b.openCapas;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDir]);

  const toggleSort = useCallback((field: SortField) => {
    setSortField(f => {
      if (f === field) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return f; }
      setSortDir('asc');
      return field;
    });
  }, []);

  // ── Render ──
  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-cyan-600 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-cyan-300" />
              <span className="text-cyan-200 text-xs font-medium uppercase tracking-widest">Hub Multi-Cliente</span>
            </div>
            <h1 className="text-2xl font-bold">Client Hub</h1>
            <p className="text-cyan-200 text-sm mt-1">Gerir todos os clientes a partir de um único dashboard de consultoria</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-white text-cyan-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-cyan-50 transition-colors"
          >
            <Plus className="w-4 h-4" /> Novo Cliente
          </button>
        </div>
      </div>

      {/* ── Portfolio stats ─────────────────────────────────────── */}
      {data && <PortfolioStats data={data} />}

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([
          { id: 'portfolio',  label: 'Portfólio',   icon: LayoutGrid },
          { id: 'comparison', label: 'Comparação',  icon: BarChart2  },
        ] as { id: ActiveTab; label: string; icon: any }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ── Portfolio tab ──────────────────────────────────────── */}
      {activeTab === 'portfolio' && (
        <>
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none"
                placeholder="Pesquisar cliente ou indústria…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <SortButton field="name"     current={sortField} dir={sortDir} onClick={toggleSort}>Nome</SortButton>
              <SortButton field="score"    current={sortField} dir={sortDir} onClick={toggleSort}>Score</SortButton>
              <SortButton field="activity" current={sortField} dir={sortDir} onClick={toggleSort}>Alertas</SortButton>
            </div>

            {/* View mode */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              <button onClick={() => setViewMode('grid')} className={cn('p-1.5 rounded-lg', viewMode === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600')}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('table')} className={cn('p-1.5 rounded-lg', viewMode === 'table' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600')}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
            </div>
          ) : allClients.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16">
              <Building2 className="w-12 h-12 text-gray-200 mb-4" />
              <p className="text-gray-500 font-medium">Sem clientes no hub</p>
              <p className="text-gray-400 text-sm mt-1">Adicione organizações cliente para gestão centralizada</p>
              <button
                onClick={() => setShowAdd(true)}
                className="mt-4 flex items-center gap-2 bg-cyan-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-cyan-700"
              >
                <Plus className="w-4 h-4" /> Adicionar primeiro cliente
              </button>
            </div>
          ) : sorted.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-12">
              <Search className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium">Nenhum cliente encontrado</p>
              <p className="text-gray-400 text-sm mt-1">Tente alterar os critérios de pesquisa</p>
            </div>
          ) : (
            <div className="flex gap-6">
              {/* Main content */}
              <div className="flex-1 min-w-0">
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {sorted.map(client => (
                      <ClientCard
                        key={client.id}
                        client={client}
                        onRemove={id => removeMutation.mutate(id)}
                        onAddTask={setTaskClient}
                      />
                    ))}
                  </div>
                ) : (
                  /* Inline table view inside portfolio tab */
                  <ComparisonTable clients={sorted} />
                )}
              </div>

              {/* Activity feed sidebar — only shown on large screens */}
              <div className="hidden xl:block w-72 flex-shrink-0">
                <ActivityFeed clients={allClients} />
              </div>
            </div>
          )}

          {/* Activity feed — mobile / below-xl fallback */}
          {!isLoading && allClients.length > 0 && (
            <div className="xl:hidden">
              <ActivityFeed clients={allClients} />
            </div>
          )}
        </>
      )}

      {/* ── Comparison tab ─────────────────────────────────────── */}
      {activeTab === 'comparison' && (
        <ComparisonTable clients={allClients} />
      )}

      {/* ── Add client modal ───────────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Adicionar Cliente</h2>
              <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                Introduza o slug ou nome da organização cliente. A organização deve já existir na plataforma.
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Slug da organização</label>
                <input
                  className={INP}
                  value={addForm.clientSlug}
                  onChange={e => setAddForm(p => ({ ...p, clientSlug: e.target.value }))}
                  placeholder="ex: empresa-cliente-lda"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ou nome da organização</label>
                <input
                  className={INP}
                  value={addForm.clientName}
                  onChange={e => setAddForm(p => ({ ...p, clientName: e.target.value }))}
                  placeholder="Ex: Empresa Cliente Lda"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Papel</label>
                <select
                  className={INP}
                  value={addForm.role}
                  onChange={e => setAddForm(p => ({ ...p, role: e.target.value }))}
                >
                  <option value="MANAGER">Gestor</option>
                  <option value="AUDITOR">Auditor</option>
                  <option value="VIEWER">Visualizador</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
                <button
                  onClick={() => addMutation.mutate(addForm)}
                  disabled={(!addForm.clientSlug && !addForm.clientName) || addMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-cyan-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-cyan-700"
                >
                  {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Adicionar
                </button>
              </div>
              {addMutation.isError && (
                <p className="text-xs text-red-600 text-center">Organização não encontrada. Verifique o slug ou nome.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add task modal ─────────────────────────────────────── */}
      {taskClient && (
        <AddTaskModal client={taskClient} onClose={() => setTaskClient(null)} />
      )}
    </div>
  );
}
