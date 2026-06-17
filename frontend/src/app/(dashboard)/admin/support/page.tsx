'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Headphones, RefreshCw, Send,
  Building2, User, Tag, Flag, Lock, X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

// ── Labels & colours ──────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em Progresso',
  WAITING_USER: 'Aguarda Cliente',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
};
const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  WAITING_USER: 'bg-purple-100 text-purple-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-500',
};
const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'text-gray-500',
  MEDIUM: 'text-blue-600',
  HIGH: 'text-orange-600',
  URGENT: 'text-red-600',
};
const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', URGENT: 'Urgente',
};
const CAT_LABELS: Record<string, string> = {
  ONBOARDING: 'Onboarding',
  TECHNICAL_ISSUE: 'Problema Técnico',
  BILLING: 'Faturação',
  FEATURE_REQUEST: 'Sugestão',
  BUG_REPORT: 'Bug',
  SECURITY: 'Segurança',
  OTHER: 'Outro',
};

const STATUS_TABS = [
  { key: '', label: 'Todos' },
  { key: 'OPEN', label: 'Abertos' },
  { key: 'IN_PROGRESS', label: 'Em Progresso' },
  { key: 'WAITING_USER', label: 'Aguarda Cliente' },
  { key: 'RESOLVED', label: 'Resolvidos' },
  { key: 'CLOSED', label: 'Fechados' },
];

// ── Types ─────────────────────────────────────────────────────

type Reply = {
  id: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  author: { firstName: string; lastName: string; role: string };
};

type Ticket = {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  user: { firstName: string; lastName: string; email: string };
  organization: { name: string };
  assignedTo?: { firstName: string; lastName: string };
  _count: { replies: number };
  replies?: Reply[];
};

type Stats = {
  open: number;
  inProgress: number;
  waitingUser: number;
  resolved: number;
  total: number;
};

// ── Helpers ───────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d));
}

// ── Page ──────────────────────────────────────────────────────

export default function AdminSupportPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [stats, setStats] = useState<Stats | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const [statsRes, ticketsRes] = await Promise.all([
        api.get('/support-tickets/stats'),
        api.get(`/support-tickets?${params}`),
      ]);
      setStats(statsRes.data);
      setTickets(ticketsRes.data.data ?? []);
    } catch {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, router]);

  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN') router.push('/dashboard');
    else load();
  }, [user, load, router]);

  const openTicket = async (ticket: Ticket) => {
    const { data } = await api.get(`/support-tickets/${ticket.id}`);
    setSelectedTicket(data);
    setReplyBody('');
    setIsInternal(false);
  };

  const sendReply = async () => {
    if (!selectedTicket || !replyBody.trim()) return;
    setSendingReply(true);
    try {
      await api.post(`/support-tickets/${selectedTicket.id}/replies`, {
        body: replyBody,
        isInternal,
      });
      const { data } = await api.get(`/support-tickets/${selectedTicket.id}`);
      setSelectedTicket(data);
      setReplyBody('');
      load();
    } finally {
      setSendingReply(false);
    }
  };

  const updateStatus = async (status: string) => {
    if (!selectedTicket) return;
    setUpdatingStatus(true);
    try {
      await api.patch(`/support-tickets/${selectedTicket.id}`, { status });
      const { data } = await api.get(`/support-tickets/${selectedTicket.id}`);
      setSelectedTicket(data);
      load();
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left: ticket list */}
      <div className={`flex flex-col ${selectedTicket ? 'w-1/2 border-r border-gray-100' : 'w-full'} overflow-hidden`}>

        {/* Header */}
        <div className="p-6 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Headphones className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Suporte — Backoffice</h1>
                <p className="text-xs text-gray-500">Gestão de tickets de clientes</p>
              </div>
            </div>
            <button
              onClick={load}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Abertos', value: stats.open, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Em Progresso', value: stats.inProgress, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Aguarda Cliente', value: stats.waitingUser, color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: 'Resolvidos', value: stats.resolved, color: 'text-green-600', bg: 'bg-green-50' },
              ].map(s => (
                <div key={s.label} className={`rounded-xl p-3 ${s.bg}`}>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-1 flex-wrap">
            {STATUS_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setStatusFilter(t.key)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === t.key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400">A carregar...</div>
          ) : tickets.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">Nenhum ticket encontrado.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
                <tr>
                  {['Nº', 'Organização / Utilizador', 'Assunto', 'Prioridade', 'Estado', 'Resp.', 'Data'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tickets.map(t => (
                  <tr
                    key={t.id}
                    onClick={() => openTicket(t)}
                    className={`cursor-pointer hover:bg-gray-50 transition-colors ${selectedTicket?.id === t.id ? 'bg-indigo-50' : ''}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{t.ticketNumber}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-gray-700">{t.organization?.name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{t.user?.email}</p>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="truncate text-gray-800">{t.subject}</p>
                      <p className="text-xs text-gray-400">{CAT_LABELS[t.category] ?? t.category}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${PRIORITY_COLORS[t.priority] ?? 'text-gray-500'}`}>
                        {PRIORITY_LABELS[t.priority] ?? t.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABELS[t.status] ?? t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{t._count?.replies ?? 0}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right: ticket detail panel */}
      {selectedTicket && (
        <div className="w-1/2 flex flex-col overflow-hidden border-l border-gray-100">

          {/* Panel header */}
          <div className="p-4 border-b border-gray-100 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-gray-400">{selectedTicket.ticketNumber}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[selectedTicket.status] ?? ''}`}>
                    {STATUS_LABELS[selectedTicket.status]}
                  </span>
                </div>
                <h2 className="text-sm font-semibold text-gray-900 truncate">{selectedTicket.subject}</h2>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Building2 className="w-3 h-3" />{selectedTicket.organization?.name}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <User className="w-3 h-3" />{selectedTicket.user?.firstName} {selectedTicket.user?.lastName}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Tag className="w-3 h-3" />{CAT_LABELS[selectedTicket.category]}
                  </span>
                  <span className={`flex items-center gap-1 text-xs font-semibold ${PRIORITY_COLORS[selectedTicket.priority]}`}>
                    <Flag className="w-3 h-3" />{PRIORITY_LABELS[selectedTicket.priority]}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Status actions */}
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 flex-wrap shrink-0 bg-gray-50">
            <span className="text-xs text-gray-500 mr-1">Alterar:</span>
            {(['IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED'] as const).map(s => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                disabled={updatingStatus || selectedTicket.status === s}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-40 ${
                  selectedTicket.status === s
                    ? STATUS_COLORS[s] + ' border-transparent font-medium'
                    : 'border-gray-200 hover:bg-white bg-transparent'
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {/* Description */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
            <p className="text-xs font-medium text-gray-500 mb-1.5">Descrição original</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedTicket.description}</p>
            <p className="text-xs text-gray-400 mt-2">{fmtDate(selectedTicket.createdAt)}</p>
          </div>

          {/* Reply thread */}
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {(selectedTicket.replies ?? []).length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Sem respostas ainda.</p>
            ) : (
              (selectedTicket.replies ?? []).map(r => (
                <div
                  key={r.id}
                  className={`rounded-xl p-3 text-sm ${
                    r.isInternal
                      ? 'bg-yellow-50 border border-yellow-200'
                      : r.author.role === 'SUPER_ADMIN'
                      ? 'bg-indigo-50 border border-indigo-100'
                      : 'bg-white border border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="font-semibold text-xs text-gray-700">
                      {r.author.firstName} {r.author.lastName}
                    </span>
                    {r.author.role === 'SUPER_ADMIN' && (
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">
                        Suporte iComply
                      </span>
                    )}
                    {r.isInternal && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Nota Interna
                      </span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">{fmtDate(r.createdAt)}</span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{r.body}</p>
                </div>
              ))
            )}
          </div>

          {/* Reply form */}
          <div className="p-4 border-t border-gray-100 shrink-0 space-y-2">
            <textarea
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
              placeholder={isInternal ? 'Nota interna (não visível pelo cliente)...' : 'Escreve a resposta ao cliente...'}
              rows={3}
              className={`w-full text-sm border rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isInternal ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-white'
              }`}
            />
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={e => setIsInternal(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Lock className="w-3.5 h-3.5 text-yellow-600" />
                Nota interna (só equipa de suporte)
              </label>
              <button
                onClick={sendReply}
                disabled={sendingReply || !replyBody.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                {sendingReply ? 'A enviar...' : isInternal ? 'Guardar Nota' : 'Enviar Resposta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
