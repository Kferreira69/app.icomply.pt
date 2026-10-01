'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import {
  Mail, BookOpen, MessageCircle, FileText,
  ChevronRight, ExternalLink, Phone, Clock,
  Play, CheckCircle2, ArrowRight, Shield,
  Users, BarChart3, AlertTriangle, Target,
  Search, X, Laptop, Settings, Key, Database,
  Lock, HelpCircle, Layers, Globe,
  Headphones, Send, RefreshCw, ArrowLeft,
  AlertCircle, Paperclip, FileSpreadsheet,
} from 'lucide-react';
import { api } from '@/lib/api';
import { FAQ, KB_CATEGORIES } from '@/lib/content/help-kb';


// ── Getting Started steps ─────────────────────────────────────
const STEPS = [
  {
    icon: Target,
    color: 'bg-blue-100 text-blue-700',
    title: 'Diagnóstico inicial',
    desc: 'Preenche o questionário de maturidade para obter o teu score de conformidade e identificar lacunas.',
    href: '/diagnostic',
    cta: 'Fazer diagnóstico',
  },
  {
    icon: AlertTriangle,
    color: 'bg-orange-100 text-orange-700',
    title: 'Regista os teus riscos',
    desc: 'Cria um registo de riscos com probabilidade, impacto e planos de tratamento.',
    href: '/risks',
    cta: 'Ver riscos',
  },
  {
    icon: FileText,
    color: 'bg-green-100 text-green-700',
    title: 'Políticas de segurança',
    desc: 'Cria e aprova as políticas internas da tua organização.',
    href: '/policies',
    cta: 'Ver políticas',
  },
  {
    icon: Shield,
    color: 'bg-purple-100 text-purple-700',
    title: 'Instala o iGuard',
    desc: 'Monitoriza os dispositivos da equipa em tempo real.',
    href: '/iguard/install',
    cta: 'Instalar agente',
  },
  {
    icon: Users,
    color: 'bg-pink-100 text-pink-700',
    title: 'Convida a tua equipa',
    desc: 'Adiciona utilizadores e atribui permissões por função.',
    href: '/settings',
    cta: 'Gerir utilizadores',
  },
  {
    icon: BarChart3,
    color: 'bg-indigo-100 text-indigo-700',
    title: 'Gera relatórios',
    desc: 'Exporta relatórios para a administração e auditores.',
    href: '/reports',
    cta: 'Ver relatórios',
  },
];

// ── Video guides ──────────────────────────────────────────────
const VIDEOS = [
  { title: 'Introdução ao iComply', duration: '3:42', thumb: null, id: 1 },
  { title: 'Como fazer um diagnóstico de conformidade', duration: '5:15', thumb: null, id: 2 },
  { title: 'Gestão de riscos — passo a passo', duration: '6:30', thumb: null, id: 3 },
  { title: 'Instalar o iGuard em macOS', duration: '2:50', thumb: null, id: 4 },
  { title: 'Instalar o iGuard em Windows', duration: '3:10', thumb: null, id: 5 },
  { title: 'Board Reports — relatórios executivos', duration: '4:20', thumb: null, id: 6 },
];

const RESOURCES = [
  { label: 'Documentação técnica iGuard', href: '/docs/iguard', icon: FileText, external: false },
  { label: 'Documentação da API REST', href: '/docs/api', icon: BookOpen, external: false },
  { label: 'Academia iComply (20 vídeos)', href: '/academy', icon: BookOpen, external: false },
  { label: 'Trust Center público', href: '/trust', icon: Shield, external: false },
];

// ── Support Tickets ───────────────────────────────────────────

const TICKET_CAT_LABELS: Record<string, string> = {
  ONBOARDING: 'Onboarding', TECHNICAL_ISSUE: 'Problema Técnico',
  BILLING: 'Faturação', FEATURE_REQUEST: 'Sugestão de Funcionalidade',
  BUG_REPORT: 'Reportar Bug', SECURITY: 'Segurança', OTHER: 'Outro',
};
const TICKET_PRI_LABELS: Record<string, string> = {
  LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', URGENT: 'Urgente',
};
const TICKET_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberto', IN_PROGRESS: 'Em Progresso',
  WAITING_USER: 'Aguarda Resposta', RESOLVED: 'Resolvido', CLOSED: 'Fechado',
};
const TICKET_STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  WAITING_USER: 'bg-orange-100 text-orange-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
};

type TicketAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

type TicketReply = {
  id: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  author: { firstName: string; lastName: string; role: string };
  attachments?: TicketAttachment[];
};

type TicketDetail = {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  replies?: TicketReply[];
  attachments?: TicketAttachment[];
};

function fmtDate(d: string) {
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d));
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TICKET_STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {TICKET_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function AttachmentZone({ attachments, onAdd, onRemove }: {
  attachments: File[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onAdd(files);
  };

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-3 text-center text-xs text-gray-400 cursor-pointer transition-colors ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
        onClick={() => document.getElementById('attachment-input')?.click()}
      >
        <Paperclip className="w-4 h-4 mx-auto mb-1" />
        Arrasta ficheiros aqui ou clica para selecionar · Imagens, PDFs, documentos
        <input
          id="attachment-input"
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
          className="hidden"
          onChange={e => { const f = Array.from(e.target.files || []); if (f.length) onAdd(f); e.target.value = ''; }}
        />
      </div>
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {attachments.map((f, i) => (
            <div key={i} className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1 text-xs">
              {f.type.startsWith('image/') ? (
                <img src={URL.createObjectURL(f)} className="w-8 h-8 object-cover rounded" alt="" />
              ) : (
                <FileSpreadsheet className="w-3 h-3 text-gray-500" />
              )}
              <span className="max-w-[100px] truncate">{f.name}</span>
              <button onClick={() => onRemove(i)} className="text-gray-400 hover:text-red-500 ml-1">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AttachmentList({ attachments, ticketId }: { attachments?: TicketAttachment[]; ticketId: string }) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {attachments.map(att => (
        <a
          key={att.id}
          href={`/api/v1/support-tickets/attachments/${att.id}/download`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded"
        >
          <Paperclip className="w-3 h-3" /> {att.fileName}
        </a>
      ))}
    </div>
  );
}

const uploadAttachments = async (ticketId: string, files: File[], replyId?: string) => {
  for (const file of files) {
    const formData = new FormData();
    formData.append('file', file);
    await api.post(
      `/support-tickets/${ticketId}/attachments${replyId ? `?replyId=${replyId}` : ''}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  }
};

const handlePaste = (e: React.ClipboardEvent, onAdd: (files: File[]) => void) => {
  const items = Array.from(e.clipboardData.items);
  const imageItems = items.filter(item => item.type.startsWith('image/'));
  if (imageItems.length > 0) {
    e.preventDefault();
    const files = imageItems.map(item => item.getAsFile()).filter(Boolean) as File[];
    onAdd(files);
  }
};

function TicketDetailView({
  ticket,
  onBack,
}: {
  ticket: TicketDetail;
  onBack: () => void;
}) {
  const [replyBody, setReplyBody] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [detail, setDetail] = useState<TicketDetail>(ticket);

  const sendReply = async () => {
    if (!replyBody.trim()) return;
    setSending(true);
    try {
      const { data: reply } = await api.post(`/support-tickets/${detail.id}/replies`, {
        body: replyBody,
        isInternal: false,
      });
      if (replyAttachments.length > 0) {
        await uploadAttachments(detail.id, replyAttachments, reply.id);
      }
      const { data } = await api.get(`/support-tickets/${detail.id}`);
      setDetail(data);
      setReplyBody('');
      setReplyAttachments([]);
    } finally {
      setSending(false);
    }
  };

  const visibleReplies = (detail.replies ?? []).filter(r => !r.isInternal);

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar aos pedidos
      </button>

      {/* Ticket header */}
      <div className="border border-gray-100 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-gray-400">Pedido {detail.ticketNumber}</span>
            <StatusBadge status={detail.status} />
          </div>
          <span className="text-xs text-gray-400">{fmtDate(detail.createdAt)}</span>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">{detail.subject}</h3>
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3 flex-wrap">
            <span>Categoria: <span className="font-medium text-gray-700">{TICKET_CAT_LABELS[detail.category] ?? detail.category}</span></span>
            <span>Prioridade: <span className="font-medium text-gray-700">{TICKET_PRI_LABELS[detail.priority] ?? detail.priority}</span></span>
          </div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Descrição</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg p-3">
            {detail.description}
          </p>
          <AttachmentList attachments={detail.attachments} ticketId={detail.id} />
        </div>
      </div>

      {/* Conversation thread */}
      {visibleReplies.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs font-medium text-gray-400 px-2">Conversa</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {visibleReplies.map(r => {
            const isSupport = r.author.role === 'SUPER_ADMIN';
            return (
              <div
                key={r.id}
                className={`rounded-xl p-3.5 border-l-4 ${
                  isSupport
                    ? 'bg-blue-50 border-l-blue-400'
                    : 'bg-gray-50 border-l-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${isSupport ? 'bg-blue-500' : 'bg-gray-400'}`}>
                    {r.author.firstName[0]}
                  </div>
                  <span className="text-xs font-semibold text-gray-800">
                    {isSupport ? 'Suporte iComply' : `${r.author.firstName} ${r.author.lastName}`}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">{fmtDate(r.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{r.body}</p>
                <AttachmentList attachments={r.attachments} ticketId={detail.id} />
              </div>
            );
          })}
        </div>
      )}

      {/* Reply form */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs font-medium text-gray-400 px-2">Responder</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>
        <textarea
          value={replyBody}
          onChange={e => setReplyBody(e.target.value)}
          onPaste={e => handlePaste(e, files => setReplyAttachments(prev => [...prev, ...files]))}
          placeholder="A tua resposta..."
          rows={4}
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
        <AttachmentZone
          attachments={replyAttachments}
          onAdd={files => setReplyAttachments(prev => [...prev, ...files])}
          onRemove={i => setReplyAttachments(prev => prev.filter((_, idx) => idx !== i))}
        />
        <button
          onClick={sendReply}
          disabled={sending || !replyBody.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
          {sending ? 'A enviar...' : 'Enviar Resposta'}
        </button>
      </div>
    </div>
  );
}

function SupportSection() {
  const [tab, setTab] = useState<'form' | 'tickets'>('form');
  const [category, setCategory] = useState('OTHER');
  const [priority, setPriority] = useState('MEDIUM');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [ticketAttachments, setTicketAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ ticketNumber: string } | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const submitTicket = async () => {
    if (!subject.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post('/support-tickets', { category, priority, subject, description });
      if (data?.id) {
        if (ticketAttachments.length > 0) {
          await uploadAttachments(data.id, ticketAttachments);
        }
        setSubmitted({ ticketNumber: data.ticketNumber });
        setSubject(''); setDescription(''); setCategory('OTHER'); setPriority('MEDIUM');
        setTicketAttachments([]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const { data } = await api.get('/support-tickets');
      setTickets(data.data ?? []);
    } finally {
      setLoadingTickets(false);
    }
  };

  const switchToTickets = () => {
    setTab('tickets');
    setSelectedTicket(null);
    loadTickets();
  };

  const openTicketDetail = async (t: any) => {
    setLoadingDetail(true);
    try {
      const { data } = await api.get(`/support-tickets/${t.id}`);
      setSelectedTicket(data);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
          <Headphones className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Suporte Técnico</h2>
          <p className="text-xs text-gray-500">Abre um ticket e respondemos em menos de 4 horas úteis.</p>
        </div>
      </div>

      {/* Tab switcher — hidden when viewing ticket detail */}
      {!selectedTicket && (
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-5 w-fit">
          <button
            onClick={() => setTab('form')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'form' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-800'}`}
          >
            Abrir Ticket
          </button>
          <button
            onClick={switchToTickets}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'tickets' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-800'}`}
          >
            Os Meus Tickets
          </button>
        </div>
      )}

      {/* Ticket detail view */}
      {selectedTicket && (
        <TicketDetailView
          ticket={selectedTicket}
          onBack={() => setSelectedTicket(null)}
        />
      )}

      {/* Form tab */}
      {!selectedTicket && tab === 'form' && (
        <div className="space-y-4 max-w-2xl">
          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Pedido enviado com sucesso!</p>
                <p className="text-sm text-gray-500 mt-1">
                  O teu ticket{' '}
                  <span className="font-mono font-semibold text-indigo-600">{submitted.ticketNumber}</span>{' '}
                  foi criado. Responderemos por email em breve.
                </p>
              </div>
              <div className="flex gap-4 mt-2">
                <button onClick={() => setSubmitted(null)} className="text-sm text-indigo-600 hover:underline">
                  Abrir outro ticket
                </button>
                <button onClick={switchToTickets} className="text-sm text-gray-500 hover:underline">
                  Ver os meus tickets
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Categoria</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(TICKET_CAT_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Prioridade</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(TICKET_PRI_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Assunto</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Descreve o problema em poucas palavras..."
                  maxLength={200}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Descrição detalhada</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  onPaste={e => handlePaste(e, files => setTicketAttachments(prev => [...prev, ...files]))}
                  placeholder="Explica o que aconteceu, passos para reproduzir, capturas de ecrã relevantes..."
                  rows={5}
                  maxLength={5000}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                <p className="text-xs text-gray-400 text-right mt-1">{description.length}/5000</p>
              </div>
              <AttachmentZone
                attachments={ticketAttachments}
                onAdd={files => setTicketAttachments(prev => [...prev, ...files])}
                onRemove={i => setTicketAttachments(prev => prev.filter((_, idx) => idx !== i))}
              />
              <button
                onClick={submitTicket}
                disabled={submitting || !subject.trim() || !description.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'A enviar...' : 'Enviar Pedido'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Tickets tab */}
      {!selectedTicket && tab === 'tickets' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={loadTickets} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700">
              <RefreshCw className={`w-3.5 h-3.5 ${loadingTickets ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
          {loadingTickets ? (
            <div className="py-8 text-center text-sm text-gray-400">A carregar tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500">Ainda não tens tickets de suporte.</p>
              <button onClick={() => setTab('form')} className="mt-3 text-sm text-indigo-600 hover:underline">
                Abrir o primeiro ticket
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => openTicketDetail(t)}
                  disabled={loadingDetail}
                  className="w-full flex items-center gap-4 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 hover:border-indigo-100 transition-colors text-left cursor-pointer disabled:opacity-60"
                >
                  <span className="font-mono text-xs text-gray-400 w-12 shrink-0">{t.ticketNumber}</span>
                  <span className="text-sm text-gray-800 flex-1 truncate">{t.subject}</span>
                  <span className="text-xs text-gray-500 shrink-0 hidden sm:block">{TICKET_CAT_LABELS[t.category] ?? t.category}</span>
                  <StatusBadge status={t.status} />
                  <span className="text-xs text-gray-400 shrink-0">{t._count?.replies ?? 0} resp.</span>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ── Article Accordion ──────────────────────────────────────────
function ArticleItem({ title, body }: { title: string; body: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-3.5 text-left gap-4"
      >
        <span className="text-sm text-gray-700 leading-snug">{title}</span>
        <ChevronRight className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="pb-4 pr-4">
          {body.split('\n').map((line, i) => (
            <p key={i} className={`text-sm text-gray-600 leading-relaxed ${line === '' ? 'mt-2' : ''}`}>
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Knowledge Base Section ─────────────────────────────────────
function KnowledgeBase() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q && !activeCategory) return KB_CATEGORIES;
    return KB_CATEGORIES
      .filter(cat => !activeCategory || cat.id === activeCategory)
      .map(cat => ({
        ...cat,
        articles: q
          ? cat.articles.filter(a =>
              a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q)
            )
          : cat.articles,
      }))
      .filter(cat => cat.articles.length > 0);
  }, [search, activeCategory]);

  const totalResults = filtered.reduce((n, c) => n + c.articles.length, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Artigos de Ajuda</h2>
        <p className="text-sm text-gray-500 mt-0.5">Guias detalhados para cada funcionalidade do iComply.</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Pesquisar artigos... (ex: exportar relatório, instalar iGuard, DPIA)"
          value={search}
          onChange={e => { setSearch(e.target.value); setActiveCategory(null); }}
          className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category pills */}
      {!search && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !activeCategory ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas as categorias
          </button>
          {KB_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                {cat.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Results */}
      {search && (
        <p className="text-xs text-gray-500">
          {totalResults === 0 ? 'Nenhum artigo encontrado.' : `${totalResults} artigo${totalResults !== 1 ? 's' : ''} encontrado${totalResults !== 1 ? 's' : ''}`}
        </p>
      )}

      {/* Articles */}
      <div className="space-y-4">
        {filtered.map(cat => {
          const Icon = cat.icon;
          return (
            <div key={cat.id}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${cat.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{cat.label}</span>
                <span className="text-xs text-gray-400">· {cat.articles.length} artigo{cat.articles.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="ml-8 border border-gray-100 rounded-xl px-4 divide-y divide-gray-100">
                {cat.articles.map((a, i) => <ArticleItem key={i} title={a.title} body={a.body} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── FAQ Accordion ─────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-4 text-left gap-4"
      >
        <span className="text-sm font-medium text-gray-800">{q}</span>
        <ChevronRight className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && <p className="pb-4 text-sm text-gray-600 leading-relaxed">{a}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function HelpPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 py-2">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Centro de Ajuda</h1>
        <p className="text-gray-500 mt-1">Guias, vídeos e suporte para tirar o máximo do iComply.</p>
      </div>

      {/* Contact cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a href="mailto:support@icomply.pt"
          className="flex flex-col gap-3 p-5 bg-blue-50 border border-blue-100 rounded-2xl hover:bg-blue-100 transition-colors">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-blue-900">Email de Suporte</p>
            <p className="text-xs text-blue-700 mt-0.5">support@icomply.pt</p>
            <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Resposta em até 4h úteis
            </p>
          </div>
        </a>
        <a href="https://wa.me/351917599852" target="_blank" rel="noopener noreferrer"
          className="flex flex-col gap-3 p-5 bg-green-50 border border-green-100 rounded-2xl hover:bg-green-100 transition-colors">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-green-900">WhatsApp / Chat</p>
            <p className="text-xs text-green-700 mt-0.5">+351 917 599 852</p>
            <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Seg–Sex, 9h–18h
            </p>
          </div>
        </a>
        <a href="tel:+351210210039"
          className="flex flex-col gap-3 p-5 bg-purple-50 border border-purple-100 rounded-2xl hover:bg-purple-100 transition-colors">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
            <Phone className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-purple-900">Telefone</p>
            <p className="text-xs text-purple-700 mt-0.5">+351 210 210 039</p>
            <p className="text-xs text-purple-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Seg–Sex, 9h–18h
            </p>
          </div>
        </a>
      </div>

      {/* Getting started */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Primeiros passos</h2>
        <p className="text-sm text-gray-500 mb-5">Segue estes 6 passos para configurar o iComply na tua organização.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Link key={step.href} href={step.href}
                className="flex flex-col gap-3 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${step.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-medium text-gray-400">PASSO {i + 1}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">{step.title}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{step.desc}</p>
                </div>
                <span className="text-xs text-blue-600 flex items-center gap-1 mt-auto font-medium">
                  {step.cta} <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Video guides */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Guias em vídeo</h2>
            <p className="text-sm text-gray-500">Tutoriais passo a passo da Academia iComply.</p>
          </div>
          <Link href="/academy" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            Ver todos <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {VIDEOS.map(v => (
            <Link key={v.id} href="/academy"
              className="group flex flex-col gap-2 rounded-xl overflow-hidden border border-gray-100 hover:shadow-sm transition-all">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 aspect-video flex items-center justify-center relative">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <Play className="w-5 h-5 text-white fill-white" />
                </div>
                <span className="absolute bottom-2 right-2 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded font-mono">{v.duration}</span>
              </div>
              <div className="p-3">
                <p className="text-xs font-medium text-gray-800 leading-snug group-hover:text-blue-700 transition-colors">{v.title}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">Perguntas Frequentes</h2>
        <div>
          {FAQ.map((item, i) => <FaqItem key={i} q={item.q} a={item.a} />)}
        </div>
      </div>

      {/* Knowledge Base */}
      <KnowledgeBase />

      {/* Bridge banner — KB → Support */}
      <div className="flex items-center gap-4 px-5 py-4 bg-amber-50 border border-amber-200 rounded-2xl">
        <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
          <AlertCircle className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900">Não encontraste o que precisavas?</p>
          <p className="text-xs text-amber-700 mt-0.5">Abre um pedido de assistência e a nossa equipa responde-te em menos de 4 horas úteis.</p>
        </div>
      </div>

      {/* Support Tickets */}
      <SupportSection />

      {/* Resources */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Recursos adicionais</h2>
        <div className="space-y-2">
          {RESOURCES.map((r) => {
            const Icon = r.icon;
            const content = (
              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-gray-600" />
                </div>
                <span className="text-sm text-gray-700 flex-1">{r.label}</span>
                <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
              </div>
            );
            return r.external
              ? <a key={r.label} href={r.href} target="_blank" rel="noopener noreferrer">{content}</a>
              : <Link key={r.label} href={r.href}>{content}</Link>;
          })}
        </div>
      </div>

      {/* Checklist CTA */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-white">
          <p className="font-semibold text-lg">Precisas de ajuda personalizada?</p>
          <p className="text-blue-100 text-sm mt-1">A nossa equipa faz sessões de onboarding individuais — gratuitas no primeiro mês.</p>
        </div>
        <a href="mailto:support@icomply.pt?subject=Pedido%20de%20Onboarding"
          className="shrink-0 inline-flex items-center gap-2 bg-white text-blue-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors">
          <CheckCircle2 className="w-4 h-4" /> Agendar onboarding
        </a>
      </div>
    </div>
  );
}
