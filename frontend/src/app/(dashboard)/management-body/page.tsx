'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { managementBodyApi } from '@/lib/api';
import {
  Users, Plus, CheckCircle, Clock, AlertTriangle, Shield, Loader2, X,
  ChevronDown, Calendar, FileText, ListChecks, UserCheck, Edit2, Ban,
  Video, MapPin, Trash2, ChevronLeft, ChevronRight, Filter, RefreshCw,
  Circle, CheckSquare, AlertCircle,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

type MeetingType = 'ORDINARIA' | 'EXTRAORDINARIA' | 'COMISSAO';
type MeetingStatus = 'AGENDADA' | 'EM_CURSO' | 'CONCLUIDA' | 'CANCELADA';
type DecisionStatus = 'PENDENTE' | 'EM_CURSO' | 'CONCLUIDA';
type AttendanceStatus = 'PRESENTE' | 'AUSENTE' | 'REMOTO';

interface DecisionItem {
  id: string;
  text: string;
  responsible: string;
  deadline: string;
  status: DecisionStatus;
  meetingId: string;
  meetingTitle: string;
}

interface AttendeeRecord {
  name: string;
  email?: string;
  status: AttendanceStatus;
}

interface AgendaItem {
  id: string;
  text: string;
  discussed: boolean;
}

interface Meeting {
  id: string;
  title: string;
  date: string; // ISO
  type: MeetingType;
  location?: string;
  videoUrl?: string;
  status: MeetingStatus;
  agenda: AgendaItem[];
  minutes?: string;
  minutesSavedAt?: string;
  decisions: DecisionItem[];
  attendees: AttendeeRecord[];
  invitedNames: string[];
  notes?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  ORDINARIA: 'Reunião Ordinária',
  EXTRAORDINARIA: 'Reunião Extraordinária',
  COMISSAO: 'Comissão',
};

const MEETING_TYPE_COLORS: Record<MeetingType, string> = {
  ORDINARIA: 'bg-blue-100 text-blue-700',
  EXTRAORDINARIA: 'bg-orange-100 text-orange-700',
  COMISSAO: 'bg-violet-100 text-violet-700',
};

const STATUS_LABELS: Record<MeetingStatus, string> = {
  AGENDADA: 'Agendada',
  EM_CURSO: 'Em curso',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

const STATUS_COLORS: Record<MeetingStatus, string> = {
  AGENDADA: 'bg-sky-100 text-sky-700',
  EM_CURSO: 'bg-amber-100 text-amber-700',
  CONCLUIDA: 'bg-green-100 text-green-700',
  CANCELADA: 'bg-red-100 text-red-700',
};

const DEC_STATUS_LABELS: Record<DecisionStatus, string> = {
  PENDENTE: 'Pendente',
  EM_CURSO: 'Em curso',
  CONCLUIDA: 'Concluída',
};

const DEC_STATUS_COLORS: Record<DecisionStatus, string> = {
  PENDENTE: 'bg-amber-100 text-amber-700',
  EM_CURSO: 'bg-blue-100 text-blue-700',
  CONCLUIDA: 'bg-green-100 text-green-700',
};

const MEETING_DOT_COLORS: Record<MeetingType, string> = {
  ORDINARIA: '#3b82f6',
  EXTRAORDINARIA: '#f97316',
  COMISSAO: '#8b5cf6',
};

const ACTION_TYPES = ['APPROVAL', 'AWARENESS', 'TRAINING', 'REVIEW', 'SIGN_OFF'];
const ACTION_LABELS: Record<string, string> = {
  APPROVAL: 'Aprovação',
  AWARENESS: 'Tomada de Consciência',
  TRAINING: 'Formação',
  REVIEW: 'Revisão',
  SIGN_OFF: 'Assinatura',
};
const FRAMEWORKS = ['NIS2', 'DORA', 'GDPR', 'ISO_27001', 'AI_ACT', 'ESG'];

const QUORUM_RATIO = 0.5; // simple majority required

// ─── localStorage helpers ─────────────────────────────────────────────────────

const LS_KEY = 'icomply_meetings_v1';

function loadMeetings(): Meeting[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveMeetings(meetings: Meeting[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(meetings));
}

function useMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    setMeetings(loadMeetings());
  }, []);

  const persist = useCallback((updated: Meeting[]) => {
    setMeetings(updated);
    saveMeetings(updated);
  }, []);

  const upsertMeeting = useCallback((m: Meeting) => {
    const current = loadMeetings();
    const idx = current.findIndex(x => x.id === m.id);
    const updated = idx >= 0 ? current.map(x => x.id === m.id ? m : x) : [...current, m];
    persist(updated);
  }, [persist]);

  const removeMeeting = useCallback((id: string) => {
    persist(loadMeetings().filter(x => x.id !== id));
  }, [persist]);

  return { meetings, upsertMeeting, removeMeeting, refresh: () => setMeetings(loadMeetings()) };
}

// ─── Shared input style ───────────────────────────────────────────────────────

const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none';

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn('px-2 py-0.5 rounded-lg text-xs font-semibold', className)}>{children}</span>;
}

// ─── Meeting Form Modal ───────────────────────────────────────────────────────

interface MeetingFormProps {
  initial?: Partial<Meeting>;
  members: any[];
  onSave: (m: Meeting) => void;
  onClose: () => void;
}

function MeetingFormModal({ initial, members, onSave, onClose }: MeetingFormProps) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    date: initial?.date ? initial.date.slice(0, 16) : '',
    type: (initial?.type ?? 'ORDINARIA') as MeetingType,
    location: initial?.location ?? '',
    videoUrl: initial?.videoUrl ?? '',
    agendaText: initial?.agenda?.map(a => a.text).join('\n') ?? '',
    invitedNames: initial?.invitedNames ?? ([] as string[]),
    notes: initial?.notes ?? '',
  });

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.title || !form.date) return;
    const now = Date.now().toString(36);
    const agendaItems: AgendaItem[] = form.agendaText
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map((text, i) => ({
        id: initial?.agenda?.[i]?.id ?? `${now}-${i}`,
        text,
        discussed: initial?.agenda?.[i]?.discussed ?? false,
      }));

    const meeting: Meeting = {
      id: initial?.id ?? `mtg-${now}`,
      title: form.title,
      date: new Date(form.date).toISOString(),
      type: form.type,
      location: form.location || undefined,
      videoUrl: form.videoUrl || undefined,
      status: initial?.status ?? 'AGENDADA',
      agenda: agendaItems,
      minutes: initial?.minutes,
      minutesSavedAt: initial?.minutesSavedAt,
      decisions: initial?.decisions ?? [],
      attendees: initial?.attendees ?? form.invitedNames.map(name => ({ name, status: 'AUSENTE' as AttendanceStatus })),
      invitedNames: form.invitedNames,
      notes: form.notes || undefined,
    };
    onSave(meeting);
  };

  const toggleInvite = (name: string) => {
    set('invitedNames', form.invitedNames.includes(name)
      ? form.invitedNames.filter(n => n !== name)
      : [...form.invitedNames, name]);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold">{initial?.id ? 'Editar Reunião' : 'Nova Reunião'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Título *</label>
            <input className={inp} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ex: Reunião trimestral de segurança" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Data e hora *</label>
              <input type="datetime-local" className={inp} value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo</label>
              <select className={inp} value={form.type} onChange={e => set('type', e.target.value as MeetingType)}>
                {(Object.keys(MEETING_TYPE_LABELS) as MeetingType[]).map(t => (
                  <option key={t} value={t}>{MEETING_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Localização</label>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input className={inp} value={form.location} onChange={e => set('location', e.target.value)} placeholder="Sala de reuniões / endereço" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Link de vídeo</label>
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input className={inp} value={form.videoUrl} onChange={e => set('videoUrl', e.target.value)} placeholder="https://meet.google.com/..." />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Agenda (um item por linha)</label>
            <textarea className={cn(inp, 'resize-none')} rows={4} value={form.agendaText} onChange={e => set('agendaText', e.target.value)} placeholder="1. Aprovação da ata anterior&#10;2. Relatório de segurança Q1&#10;3. Próximos passos" />
          </div>
          {members.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Membros convidados</label>
              <div className="flex flex-wrap gap-2">
                {members.map((m: any) => (
                  <button key={m.id} type="button" onClick={() => toggleInvite(m.name)}
                    className={cn('px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors', form.invitedNames.includes(m.name) ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300')}>
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notas</label>
            <textarea className={cn(inp, 'resize-none')} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={handleSave} disabled={!form.title || !form.date}
              className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-purple-700">
              {initial?.id ? 'Guardar alterações' : 'Criar reunião'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Meeting Detail Drawer ────────────────────────────────────────────────────

interface MeetingDetailProps {
  meeting: Meeting;
  onUpdate: (m: Meeting) => void;
  onClose: () => void;
}

function MeetingDetailDrawer({ meeting, onUpdate, onClose }: MeetingDetailProps) {
  const [tab, setTab] = useState<'agenda' | 'ata' | 'decisoes' | 'presenca'>('agenda');
  const [minutesDraft, setMinutesDraft] = useState(meeting.minutes ?? '');
  const [newDecision, setNewDecision] = useState({ text: '', responsible: '', deadline: '', status: 'PENDENTE' as DecisionStatus });
  const [showDecisionForm, setShowDecisionForm] = useState(false);

  const presentCount = meeting.attendees.filter(a => a.status === 'PRESENTE' || a.status === 'REMOTO').length;
  const totalInvited = meeting.attendees.length;
  const quorumRequired = Math.ceil(totalInvited * QUORUM_RATIO);
  const quorumMet = presentCount >= quorumRequired;

  const toggleAgendaItem = (id: string) => {
    onUpdate({
      ...meeting,
      agenda: meeting.agenda.map(a => a.id === id ? { ...a, discussed: !a.discussed } : a),
    });
  };

  const saveMinutes = () => {
    onUpdate({ ...meeting, minutes: minutesDraft, minutesSavedAt: new Date().toISOString() });
  };

  const addDecision = () => {
    if (!newDecision.text) return;
    const d: DecisionItem = {
      id: `dec-${Date.now().toString(36)}`,
      ...newDecision,
      meetingId: meeting.id,
      meetingTitle: meeting.title,
    };
    onUpdate({ ...meeting, decisions: [...meeting.decisions, d] });
    setNewDecision({ text: '', responsible: '', deadline: '', status: 'PENDENTE' });
    setShowDecisionForm(false);
  };

  const updateDecisionStatus = (id: string, status: DecisionStatus) => {
    onUpdate({ ...meeting, decisions: meeting.decisions.map(d => d.id === id ? { ...d, status } : d) });
  };

  const toggleAttendance = (idx: number, status: AttendanceStatus) => {
    const updated = meeting.attendees.map((a, i) => i === idx ? { ...a, status } : a);
    onUpdate({ ...meeting, attendees: updated });
  };

  const tabs: { key: typeof tab; label: string; icon: React.ReactNode }[] = [
    { key: 'agenda', label: 'Agenda', icon: <ListChecks className="w-4 h-4" /> },
    { key: 'ata', label: 'Ata', icon: <FileText className="w-4 h-4" /> },
    { key: 'decisoes', label: 'Decisões', icon: <CheckSquare className="w-4 h-4" /> },
    { key: 'presenca', label: 'Presença', icon: <UserCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full max-w-xl h-full overflow-y-auto flex flex-col shadow-2xl">
        {/* Header */}
        <div className="border-b px-6 py-4 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge className={MEETING_TYPE_COLORS[meeting.type]}>{MEETING_TYPE_LABELS[meeting.type]}</Badge>
                <Badge className={STATUS_COLORS[meeting.status]}>{STATUS_LABELS[meeting.status]}</Badge>
              </div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">{meeting.title}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {new Date(meeting.date).toLocaleString('pt-PT', { dateStyle: 'long', timeStyle: 'short' })}
              </p>
              {meeting.location && (
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{meeting.location}</p>
              )}
              {meeting.videoUrl && (
                <a href={meeting.videoUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-purple-600 hover:underline mt-1 flex items-center gap-1">
                  <Video className="w-3 h-3" />Entrar na reunião
                </a>
              )}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl flex-shrink-0"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b flex-shrink-0">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold border-b-2 transition-colors',
                tab === t.key ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-5 space-y-4 overflow-y-auto">

          {/* AGENDA */}
          {tab === 'agenda' && (
            <div className="space-y-3">
              {meeting.agenda.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Sem itens de agenda definidos.</p>
              ) : meeting.agenda.map((item, i) => (
                <div key={item.id}
                  className={cn('flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
                    item.discussed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 hover:border-purple-300')}
                  onClick={() => toggleAgendaItem(item.id)}>
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
                    item.discussed ? 'bg-green-500 text-white' : 'bg-white border border-gray-200 text-gray-500')}>
                    {item.discussed ? '✓' : i + 1}
                  </div>
                  <span className={cn('text-sm mt-0.5', item.discussed ? 'line-through text-gray-400' : 'text-gray-700')}>{item.text}</span>
                </div>
              ))}
              <p className="text-xs text-gray-400 text-center pt-2">Clique num item para marcar como discutido</p>
            </div>
          )}

          {/* ATA */}
          {tab === 'ata' && (
            <div className="space-y-4">
              {meeting.minutesSavedAt && (
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-xl">
                  <Clock className="w-3.5 h-3.5" />
                  Última gravação: {new Date(meeting.minutesSavedAt).toLocaleString('pt-PT')}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ata da reunião</label>
                <textarea
                  className={cn(inp, 'resize-none min-h-[280px]')}
                  value={minutesDraft}
                  onChange={e => setMinutesDraft(e.target.value)}
                  placeholder="Registe aqui os pontos discutidos, decisões tomadas e próximos passos..."
                />
              </div>
              <button onClick={saveMinutes} className="w-full bg-purple-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700">
                Guardar ata
              </button>
            </div>
          )}

          {/* DECISÕES */}
          {tab === 'decisoes' && (
            <div className="space-y-3">
              {meeting.decisions.length === 0 && !showDecisionForm && (
                <p className="text-sm text-gray-400 text-center py-6">Sem decisões registadas.</p>
              )}
              {meeting.decisions.map(dec => {
                const isOverdue = dec.status !== 'CONCLUIDA' && dec.deadline && new Date(dec.deadline) < new Date();
                return (
                  <div key={dec.id} className="border border-gray-100 rounded-xl p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-gray-800 font-medium flex-1">{dec.text}</p>
                      {isOverdue && <Badge className="bg-red-100 text-red-700 flex-shrink-0">Em atraso</Badge>}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
                      {dec.responsible && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{dec.responsible}</span>}
                      {dec.deadline && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(dec.deadline).toLocaleDateString('pt-PT')}</span>}
                      <select
                        value={dec.status}
                        onChange={e => updateDecisionStatus(dec.id, e.target.value as DecisionStatus)}
                        className={cn('px-2 py-0.5 rounded-lg text-xs font-semibold border-0 outline-none cursor-pointer', DEC_STATUS_COLORS[dec.status])}>
                        {(Object.keys(DEC_STATUS_LABELS) as DecisionStatus[]).map(s => (
                          <option key={s} value={s}>{DEC_STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
              {showDecisionForm && (
                <div className="border border-purple-200 rounded-xl p-4 space-y-3 bg-purple-50/50">
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1">Decisão *</label>
                    <textarea className={cn(inp, 'resize-none')} rows={2} value={newDecision.text} onChange={e => setNewDecision(p => ({ ...p, text: e.target.value }))} placeholder="Descreva a decisão tomada..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">Responsável</label>
                      <input className={inp} value={newDecision.responsible} onChange={e => setNewDecision(p => ({ ...p, responsible: e.target.value }))} placeholder="Nome" />
                    </div>
                    <div><label className="block text-xs font-semibold text-gray-600 mb-1">Prazo</label>
                      <input type="date" className={inp} value={newDecision.deadline} onChange={e => setNewDecision(p => ({ ...p, deadline: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowDecisionForm(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-xs text-gray-600">Cancelar</button>
                    <button onClick={addDecision} disabled={!newDecision.text} className="flex-1 bg-purple-600 text-white py-2 rounded-xl text-xs font-semibold disabled:opacity-50">Guardar</button>
                  </div>
                </div>
              )}
              {!showDecisionForm && (
                <button onClick={() => setShowDecisionForm(true)}
                  className="w-full flex items-center justify-center gap-2 border border-dashed border-purple-300 text-purple-600 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-50">
                  <Plus className="w-4 h-4" />Adicionar decisão
                </button>
              )}
            </div>
          )}

          {/* PRESENÇA */}
          {tab === 'presenca' && (
            <div className="space-y-4">
              {/* Quorum indicator */}
              <div className={cn('rounded-xl p-4 border', quorumMet ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200')}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Quórum</span>
                  {quorumMet
                    ? <Badge className="bg-green-100 text-green-700">Atingido</Badge>
                    : <Badge className="bg-amber-100 text-amber-700">Não atingido</Badge>}
                </div>
                <p className="text-xs text-gray-600">
                  {presentCount} presente{presentCount !== 1 ? 's' : ''} de {totalInvited} convidado{totalInvited !== 1 ? 's' : ''}
                  {' '}(mínimo: {quorumRequired})
                </p>
                {totalInvited > 0 && (
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', quorumMet ? 'bg-green-500' : 'bg-amber-400')}
                      style={{ width: `${Math.min(100, (presentCount / totalInvited) * 100)}%` }} />
                  </div>
                )}
              </div>

              {meeting.attendees.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Nenhum convidado registado.</p>
              ) : (
                <div className="space-y-2">
                  {meeting.attendees.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm flex-shrink-0">
                        {att.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="flex-1 text-sm font-medium text-gray-800">{att.name}</span>
                      <div className="flex gap-1">
                        {(['PRESENTE', 'REMOTO', 'AUSENTE'] as AttendanceStatus[]).map(s => (
                          <button key={s} onClick={() => toggleAttendance(idx, s)}
                            className={cn('px-2 py-1 rounded-lg text-xs font-medium transition-colors',
                              att.status === s
                                ? s === 'PRESENTE' ? 'bg-green-500 text-white' : s === 'REMOTO' ? 'bg-blue-500 text-white' : 'bg-red-400 text-white'
                                : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-400')}>
                            {s === 'PRESENTE' ? 'Presente' : s === 'REMOTO' ? 'Remoto' : 'Ausente'}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Compliance Calendar ──────────────────────────────────────────────────────

function ComplianceCalendar({ meetings }: { meetings: Meeting[] }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const prevMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Meetings indexed by day of month
  const byDay: Record<number, Meeting[]> = {};
  meetings.forEach(m => {
    const d = new Date(m.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      byDay[day] = [...(byDay[day] ?? []), m];
    }
  });

  const cells: (number | null)[] = [
    ...Array((firstDay + 6) % 7).fill(null), // Monday-start grid
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthLabel = viewDate.toLocaleString('pt-PT', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800 capitalize">{monthLabel}</h3>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-4 h-4 text-gray-500" /></button>
          <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronRight className="w-4 h-4 text-gray-500" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
          <div key={d} className="text-xs font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />;
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const dayMeetings = byDay[day] ?? [];
          return (
            <div key={idx}
              className={cn('flex flex-col items-center rounded-xl py-1.5 min-h-[44px]', isToday ? 'bg-purple-100' : 'hover:bg-gray-50')}>
              <span className={cn('text-xs font-medium', isToday ? 'text-purple-700 font-bold' : 'text-gray-600')}>{day}</span>
              {dayMeetings.length > 0 && (
                <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                  {dayMeetings.slice(0, 3).map((m, i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: MEETING_DOT_COLORS[m.type] }} title={m.title} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
        {(Object.entries(MEETING_TYPE_LABELS) as [MeetingType, string][]).map(([type, label]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: MEETING_DOT_COLORS[type] }} />
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Decisions Tracker ────────────────────────────────────────────────────────

function DecisionsTracker({ meetings, onMeetingUpdate }: { meetings: Meeting[]; onMeetingUpdate: (m: Meeting) => void }) {
  const [filterStatus, setFilterStatus] = useState<DecisionStatus | 'ALL'>('ALL');
  const [filterResponsible, setFilterResponsible] = useState('');

  const allDecisions = meetings.flatMap(m =>
    m.decisions.map(d => ({ ...d, meetingTitle: m.title, meetingDate: m.date }))
  );

  const filtered = allDecisions.filter(d => {
    if (filterStatus !== 'ALL' && d.status !== filterStatus) return false;
    if (filterResponsible && !d.responsible.toLowerCase().includes(filterResponsible.toLowerCase())) return false;
    return true;
  });

  const updateStatus = (meetingId: string, decisionId: string, status: DecisionStatus) => {
    const meeting = meetings.find(m => m.id === meetingId);
    if (!meeting) return;
    onMeetingUpdate({
      ...meeting,
      decisions: meeting.decisions.map(d => d.id === decisionId ? { ...d, status } : d),
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">Filtrar:</span>
        </div>
        <select className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}>
          <option value="ALL">Todos os estados</option>
          {(Object.keys(DEC_STATUS_LABELS) as DecisionStatus[]).map(s => (
            <option key={s} value={s}>{DEC_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <input className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          value={filterResponsible} onChange={e => setFilterResponsible(e.target.value)} placeholder="Responsável..." />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center py-14">
          <CheckCircle className="w-10 h-10 text-gray-200 mb-3" />
          <p className="text-gray-400 font-medium">Sem decisões {filterStatus !== 'ALL' ? `com estado "${DEC_STATUS_LABELS[filterStatus as DecisionStatus]}"` : 'registadas'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Decisão</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Reunião</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Responsável</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Prazo</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(dec => {
                const isOverdue = dec.status !== 'CONCLUIDA' && dec.deadline && new Date(dec.deadline) < new Date();
                return (
                  <tr key={dec.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        {isOverdue && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />}
                        <span className="text-gray-800 leading-snug">{dec.text}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {dec.meetingTitle}
                      <br />
                      <span className="text-gray-400">{new Date((dec as any).meetingDate).toLocaleDateString('pt-PT')}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{dec.responsible || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {dec.deadline
                        ? <span className={cn('text-xs', isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500')}>
                            {new Date(dec.deadline).toLocaleDateString('pt-PT')}
                            {isOverdue && ' ⚠'}
                          </span>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={dec.status}
                        onChange={e => updateStatus(dec.meetingId, dec.id, e.target.value as DecisionStatus)}
                        className={cn('px-2 py-1 rounded-lg text-xs font-semibold border-0 outline-none cursor-pointer', DEC_STATUS_COLORS[dec.status])}>
                        {(Object.keys(DEC_STATUS_LABELS) as DecisionStatus[]).map(s => (
                          <option key={s} value={s}>{DEC_STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Meeting Card ─────────────────────────────────────────────────────────────

interface MeetingCardProps {
  meeting: Meeting;
  onOpen: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

function MeetingCard({ meeting, onOpen, onEdit, onCancel, onDelete }: MeetingCardProps) {
  const presentCount = meeting.attendees.filter(a => a.status === 'PRESENTE' || a.status === 'REMOTO').length;
  const quorumRequired = Math.ceil(meeting.attendees.length * QUORUM_RATIO);
  const quorumMet = presentCount >= quorumRequired && meeting.attendees.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer group" onClick={onOpen}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge className={MEETING_TYPE_COLORS[meeting.type]}>{MEETING_TYPE_LABELS[meeting.type]}</Badge>
              <Badge className={STATUS_COLORS[meeting.status]}>{STATUS_LABELS[meeting.status]}</Badge>
            </div>
            <h3 className="font-bold text-gray-900 leading-snug">{meeting.title}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(meeting.date).toLocaleString('pt-PT', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
            {(meeting.location || meeting.videoUrl) && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                {meeting.videoUrl ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                {meeting.location || 'Videoconferência'}
              </p>
            )}
          </div>
          {/* Quorum + attendees */}
          {meeting.attendees.length > 0 && (
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-black text-gray-800">{meeting.attendees.length}</p>
              <p className="text-xs text-gray-400">convidados</p>
              {meeting.status === 'CONCLUIDA' && (
                <Badge className={quorumMet ? 'bg-green-100 text-green-700 mt-1' : 'bg-red-100 text-red-600 mt-1'}>
                  {quorumMet ? 'Quórum ✓' : 'Sem quórum'}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Quick info strip */}
        {(meeting.decisions.length > 0 || meeting.minutes) && (
          <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            {meeting.decisions.length > 0 && (
              <span className="flex items-center gap-1"><CheckSquare className="w-3.5 h-3.5" />{meeting.decisions.length} decisão{meeting.decisions.length !== 1 ? 'ões' : ''}</span>
            )}
            {meeting.minutes && (
              <span className="flex items-center gap-1 text-purple-600"><FileText className="w-3.5 h-3.5" />Ata disponível</span>
            )}
          </div>
        )}
      </div>

      {/* Actions bar */}
      <div className="border-t border-gray-100 px-5 py-2.5 flex items-center gap-2 bg-gray-50/60 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={e => e.stopPropagation()}>
        <button onClick={onOpen} className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium px-2 py-1 rounded-lg hover:bg-purple-50">
          <FileText className="w-3.5 h-3.5" />Ver detalhe
        </button>
        <button onClick={onEdit} className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 font-medium px-2 py-1 rounded-lg hover:bg-gray-100">
          <Edit2 className="w-3.5 h-3.5" />Editar
        </button>
        {meeting.status !== 'CANCELADA' && meeting.status !== 'CONCLUIDA' && (
          <button onClick={onCancel} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded-lg hover:bg-red-50">
            <Ban className="w-3.5 h-3.5" />Cancelar
          </button>
        )}
        <button onClick={onDelete} className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 font-medium px-2 py-1 rounded-lg hover:bg-red-50">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ManagementBodyPage() {
  const qc = useQueryClient();

  // Existing backend state
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddAction, setShowAddAction] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState({ name: '', title: '', email: '' });
  const [actionForm, setActionForm] = useState({ type: 'APPROVAL', title: '', description: '', framework: 'NIS2' });

  const { data: summary = [], isLoading } = useQuery({
    queryKey: ['management-body'],
    queryFn: () => managementBodyApi.getSummary().then(r => r.data),
  });

  const addMemberMutation = useMutation({
    mutationFn: (d: any) => managementBodyApi.addMember(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['management-body'] }); setShowAddMember(false); setMemberForm({ name: '', title: '', email: '' }); },
  });
  const addActionMutation = useMutation({
    mutationFn: ({ memberId, ...d }: any) => managementBodyApi.addAction(memberId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['management-body'] }); setShowAddAction(null); },
  });
  const ackMutation = useMutation({
    mutationFn: (id: string) => managementBodyApi.acknowledge(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['management-body'] }),
  });

  // Meetings state (localStorage)
  const { meetings, upsertMeeting, removeMeeting } = useMeetings();
  const [activeTab, setActiveTab] = useState<'membros' | 'reunioes' | 'decisoes' | 'calendario'>('membros');
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [openMeeting, setOpenMeeting] = useState<Meeting | null>(null);
  const [meetingFilterStatus, setMeetingFilterStatus] = useState<MeetingStatus | 'ALL'>('ALL');

  // Sync openMeeting when meetings change (e.g. drawer saves)
  useEffect(() => {
    if (openMeeting) {
      const updated = meetings.find(m => m.id === openMeeting.id);
      if (updated) setOpenMeeting(updated);
    }
  }, [meetings]);

  const handleCancelMeeting = (id: string) => {
    const m = meetings.find(x => x.id === id);
    if (m) upsertMeeting({ ...m, status: 'CANCELADA' });
  };

  const filteredMeetings = meetingFilterStatus === 'ALL' ? meetings : meetings.filter(m => m.status === meetingFilterStatus);
  const upcomingCount = meetings.filter(m => m.status === 'AGENDADA' && new Date(m.date) > new Date()).length;
  const openDecisionsCount = meetings.flatMap(m => m.decisions).filter(d => d.status !== 'CONCLUIDA').length;

  const totalCompliance = (summary as any[]).length > 0
    ? Math.round((summary as any[]).reduce((s: number, m: any) => s + m.complianceRate, 0) / (summary as any[]).length)
    : 0;

  const pageTabs = [
    { key: 'membros' as const, label: 'Membros', icon: <Users className="w-4 h-4" /> },
    { key: 'reunioes' as const, label: 'Reuniões', icon: <Calendar className="w-4 h-4" />, badge: upcomingCount || undefined },
    { key: 'decisoes' as const, label: 'Decisões', icon: <CheckSquare className="w-4 h-4" />, badge: openDecisionsCount || undefined },
    { key: 'calendario' as const, label: 'Calendário', icon: <Calendar className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-700 to-pink-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-purple-300" />
              <span className="text-purple-200 text-xs font-medium uppercase tracking-widest">NIS2 Art. 20 — Responsabilidade Pessoal</span>
            </div>
            <h1 className="text-2xl font-bold">Órgão de Gestão</h1>
            <p className="text-purple-200 text-sm mt-1">Membros, reuniões, atas e registo de decisões</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-4xl font-black">{totalCompliance}%</p>
              <p className="text-purple-200 text-xs">Conformidade</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black">{upcomingCount}</p>
              <p className="text-purple-200 text-xs">Reuniões agendadas</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black">{openDecisionsCount}</p>
              <p className="text-purple-200 text-xs">Decisões abertas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Page-level tabs */}
      <div className="flex gap-1 bg-gray-100/70 p-1 rounded-2xl">
        {pageTabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all relative',
              activeTab === t.key ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            {t.icon}{t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── MEMBROS TAB ─────────────────────────────────────────────── */}
      {activeTab === 'membros' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAddMember(true)} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-700">
              <Plus className="w-4 h-4" />Adicionar Membro
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>
          ) : (summary as any[]).length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16">
              <Users className="w-12 h-12 text-gray-200 mb-4" />
              <p className="text-gray-400 font-medium">Sem membros do órgão de gestão</p>
              <button onClick={() => setShowAddMember(true)} className="mt-4 flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700">
                <Plus className="w-4 h-4" />Adicionar primeiro membro
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {(summary as any[]).map((member: any) => (
                <div key={member.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-4 p-5 cursor-pointer" onClick={() => setExpandedMember(expandedMember === member.id ? null : member.id)}>
                    <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-lg flex-shrink-0">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-500">{member.title}</p>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-center">
                        <p className="text-xl font-black" style={{ color: member.complianceRate >= 80 ? '#16a34a' : member.complianceRate >= 50 ? '#d97706' : '#dc2626' }}>{member.complianceRate}%</p>
                        <p className="text-xs text-gray-400">Conformidade</p>
                      </div>
                      {member.pending > 0 && (
                        <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded-lg font-medium">
                          <Clock className="w-3.5 h-3.5" />{member.pending} pendentes
                        </span>
                      )}
                      {member.pending === 0 && member.totalActions > 0 && <CheckCircle className="w-5 h-5 text-green-500" />}
                      <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', expandedMember === member.id ? 'rotate-180' : '')} />
                    </div>
                  </div>
                  <div className="h-1 bg-gray-100">
                    <div className="h-full transition-all" style={{ width: `${member.complianceRate}%`, background: member.complianceRate >= 80 ? '#16a34a' : member.complianceRate >= 50 ? '#d97706' : '#dc2626' }} />
                  </div>
                  {expandedMember === member.id && (
                    <div className="border-t border-gray-100 p-5 space-y-3">
                      {member.actions?.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-2">Sem ações registadas</p>
                      ) : (
                        <div className="space-y-2">
                          {member.actions.map((action: any) => (
                            <div key={action.id} className={cn('flex items-center gap-3 p-3 rounded-xl', action.acknowledgedAt ? 'bg-green-50 border border-green-100' : 'bg-amber-50 border border-amber-200')}>
                              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0', action.acknowledgedAt ? 'bg-green-500 text-white' : 'bg-amber-400 text-white')}>
                                {action.acknowledgedAt ? '✓' : '!'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900">{action.title}</p>
                                <p className="text-xs text-gray-500">{ACTION_LABELS[action.type]} · {action.framework}</p>
                              </div>
                              {action.acknowledgedAt ? (
                                <span className="text-xs text-green-600">{formatDate(action.acknowledgedAt)}</span>
                              ) : (
                                <button onClick={() => ackMutation.mutate(action.id)} className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-amber-600">
                                  Reconhecer
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <button onClick={() => setShowAddAction(member.id)} className="w-full flex items-center justify-center gap-2 border border-dashed border-purple-300 text-purple-600 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-50 transition-colors">
                        <Plus className="w-4 h-4" />Adicionar ação / aprovação
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── REUNIÕES TAB ─────────────────────────────────────────────── */}
      {activeTab === 'reunioes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
              <AlertTriangle className="w-3.5 h-3.5" />dados locais — reuniões guardadas no browser
            </div>
            <div className="flex items-center gap-3">
              <select
                value={meetingFilterStatus}
                onChange={e => setMeetingFilterStatus(e.target.value as any)}
                className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500">
                <option value="ALL">Todos os estados</option>
                {(Object.keys(STATUS_LABELS) as MeetingStatus[]).map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              <button onClick={() => { setEditingMeeting(null); setShowMeetingForm(true); }}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-700">
                <Plus className="w-4 h-4" />Nova Reunião
              </button>
            </div>
          </div>

          {filteredMeetings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center py-16">
              <Calendar className="w-12 h-12 text-gray-200 mb-4" />
              <p className="text-gray-400 font-medium">Sem reuniões {meetingFilterStatus !== 'ALL' ? `com estado "${STATUS_LABELS[meetingFilterStatus as MeetingStatus]}"` : 'agendadas'}</p>
              <button onClick={() => { setEditingMeeting(null); setShowMeetingForm(true); }}
                className="mt-4 flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700">
                <Plus className="w-4 h-4" />Criar primeira reunião
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredMeetings
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map(m => (
                  <MeetingCard
                    key={m.id}
                    meeting={m}
                    onOpen={() => setOpenMeeting(m)}
                    onEdit={() => { setEditingMeeting(m); setShowMeetingForm(true); }}
                    onCancel={() => handleCancelMeeting(m.id)}
                    onDelete={() => removeMeeting(m.id)}
                  />
                ))}
            </div>
          )}
        </div>
      )}

      {/* ── DECISÕES TAB ─────────────────────────────────────────────── */}
      {activeTab === 'decisoes' && (
        <DecisionsTracker meetings={meetings} onMeetingUpdate={upsertMeeting} />
      )}

      {/* ── CALENDÁRIO TAB ─────────────────────────────────────────────── */}
      {activeTab === 'calendario' && (
        <ComplianceCalendar meetings={meetings} />
      )}

      {/* ── Meeting Form Modal ─────────────────────────────────────── */}
      {showMeetingForm && (
        <MeetingFormModal
          initial={editingMeeting ?? undefined}
          members={summary as any[]}
          onSave={m => { upsertMeeting(m); setShowMeetingForm(false); setEditingMeeting(null); }}
          onClose={() => { setShowMeetingForm(false); setEditingMeeting(null); }}
        />
      )}

      {/* ── Meeting Detail Drawer ──────────────────────────────────── */}
      {openMeeting && (
        <MeetingDetailDrawer
          meeting={openMeeting}
          onUpdate={m => { upsertMeeting(m); setOpenMeeting(m); }}
          onClose={() => setOpenMeeting(null)}
        />
      )}

      {/* ── Add Member Modal ───────────────────────────────────────── */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Adicionar Membro</h2>
              <button onClick={() => setShowAddMember(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: 'Nome completo *', key: 'name', ph: 'Ex: João Silva' },
                { label: 'Cargo *', key: 'title', ph: 'Ex: CEO, CFO, Membro do Conselho' },
                { label: 'Email', key: 'email', ph: 'joao.silva@empresa.pt' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{f.label}</label>
                  <input className={inp} value={(memberForm as any)[f.key]} onChange={e => setMemberForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.ph} />
                </div>
              ))}
              <div className="flex gap-3">
                <button onClick={() => setShowAddMember(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
                <button onClick={() => addMemberMutation.mutate(memberForm)} disabled={!memberForm.name || !memberForm.title || addMemberMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
                  {addMemberMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Action Modal ───────────────────────────────────────── */}
      {showAddAction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Adicionar Ação</h2>
              <button onClick={() => setShowAddAction(null)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo de Ação</label>
                <select className={inp} value={actionForm.type} onChange={e => setActionForm(p => ({ ...p, type: e.target.value }))}>
                  {ACTION_TYPES.map(t => <option key={t} value={t}>{ACTION_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Título *</label>
                <input className={inp} value={actionForm.title} onChange={e => setActionForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Aprovação da política de segurança NIS2" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Framework</label>
                <select className={inp} value={actionForm.framework} onChange={e => setActionForm(p => ({ ...p, framework: e.target.value }))}>
                  {FRAMEWORKS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Descrição</label>
                <textarea className={cn(inp, 'resize-none')} rows={2} value={actionForm.description} onChange={e => setActionForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAddAction(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
                <button onClick={() => addActionMutation.mutate({ memberId: showAddAction, ...actionForm })} disabled={!actionForm.title || addActionMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
                  {addActionMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
