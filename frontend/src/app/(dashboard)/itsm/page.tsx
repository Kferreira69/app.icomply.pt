'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { itsmApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Settings, AlertCircle, Bug, Plus, Pencil, X,
  CheckCircle2, Clock, AlertTriangle, Circle, MinusCircle,
  GitMerge, ArrowUpCircle,
} from 'lucide-react';
import { format } from 'date-fns';

// ── Config ────────────────────────────────────────────────────

const CHANGE_TYPES = { STANDARD: 'Padrão', NORMAL: 'Normal', EMERGENCY: 'Emergência', MAJOR: 'Major' };
const CHANGE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:          { label: 'Rascunho',       color: 'text-gray-600',   bg: 'bg-gray-100' },
  SUBMITTED:      { label: 'Submetido',      color: 'text-blue-600',   bg: 'bg-blue-100' },
  UNDER_REVIEW:   { label: 'Em Análise',     color: 'text-yellow-600', bg: 'bg-yellow-100' },
  CAB_APPROVED:   { label: 'Aprovado CAB',   color: 'text-green-600',  bg: 'bg-green-100' },
  IMPLEMENTING:   { label: 'Implementando',  color: 'text-purple-600', bg: 'bg-purple-100' },
  COMPLETED:      { label: 'Concluído',      color: 'text-green-700',  bg: 'bg-green-50' },
  REJECTED:       { label: 'Rejeitado',      color: 'text-red-600',    bg: 'bg-red-100' },
  CANCELLED:      { label: 'Cancelado',      color: 'text-gray-400',   bg: 'bg-gray-50' },
};
const INCIDENT_PRIORITY: Record<string, { label: string; color: string; bg: string }> = {
  P1: { label: 'P1 — Crítico',  color: 'text-red-700',    bg: 'bg-red-100' },
  P2: { label: 'P2 — Alto',     color: 'text-orange-600', bg: 'bg-orange-100' },
  P3: { label: 'P3 — Médio',    color: 'text-yellow-600', bg: 'bg-yellow-100' },
  P4: { label: 'P4 — Baixo',    color: 'text-gray-500',   bg: 'bg-gray-100' },
};
const INCIDENT_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  NEW:          { label: 'Novo',         color: 'text-blue-600',   bg: 'bg-blue-100' },
  ASSIGNED:     { label: 'Atribuído',    color: 'text-purple-600', bg: 'bg-purple-100' },
  IN_PROGRESS:  { label: 'Em Curso',     color: 'text-yellow-600', bg: 'bg-yellow-100' },
  RESOLVED:     { label: 'Resolvido',    color: 'text-green-600',  bg: 'bg-green-100' },
  CLOSED:       { label: 'Fechado',      color: 'text-gray-500',   bg: 'bg-gray-50' },
  CANCELLED:    { label: 'Cancelado',    color: 'text-gray-400',   bg: 'bg-gray-50' },
};
const PROBLEM_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  NEW:                     { label: 'Novo',                  color: 'text-blue-600',   bg: 'bg-blue-100' },
  UNDER_INVESTIGATION:     { label: 'Investigação',          color: 'text-yellow-600', bg: 'bg-yellow-100' },
  ROOT_CAUSE_IDENTIFIED:   { label: 'Causa Identificada',    color: 'text-orange-600', bg: 'bg-orange-100' },
  KNOWN_ERROR:             { label: 'Erro Conhecido',        color: 'text-red-600',    bg: 'bg-red-100' },
  RESOLVED:                { label: 'Resolvido',             color: 'text-green-600',  bg: 'bg-green-100' },
  CLOSED:                  { label: 'Fechado',               color: 'text-gray-500',   bg: 'bg-gray-50' },
};
const INCIDENT_CATEGORIES = ['HARDWARE', 'SOFTWARE', 'NETWORK', 'SECURITY', 'SERVICE', 'OTHER'];

// ── Modals ────────────────────────────────────────────────────

function ChangeModal({ initial, onClose, onSave }: { initial?: any; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    changeType: initial?.changeType ?? 'NORMAL',
    priority: initial?.priority ?? 'MEDIUM',
    status: initial?.status ?? 'DRAFT',
    riskLevel: initial?.riskLevel ?? 'MEDIUM',
    scheduledAt: initial?.scheduledAt ? initial.scheduledAt.slice(0, 10) : '',
    rollbackPlan: initial?.rollbackPlan ?? '',
    testPlan: initial?.testPlan ?? '',
    notes: initial?.notes ?? '',
  });
  const s = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-base font-semibold">{initial ? 'Editar Change' : 'Nova Change Request'}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.title} onChange={e => s('title', e.target.value)} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={3} value={form.description} onChange={e => s('description', e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.changeType} onChange={e => s('changeType', e.target.value)}>
                {Object.entries(CHANGE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.priority} onChange={e => s('priority', e.target.value)}>
                {['LOW','MEDIUM','HIGH','CRITICAL'].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Risco</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.riskLevel} onChange={e => s('riskLevel', e.target.value)}>
                {['LOW','MEDIUM','HIGH'].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
          </div>
          {initial && <div><label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => s('status', e.target.value)}>
              {Object.entries(CHANGE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>}
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Data Agendada</label>
            <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.scheduledAt} onChange={e => s('scheduledAt', e.target.value)} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Plano de Rollback</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.rollbackPlan} onChange={e => s('rollbackPlan', e.target.value)} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Plano de Teste</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.testPlan} onChange={e => s('testPlan', e.target.value)} /></div>
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={!form.title || !form.description} onClick={() => onSave({ ...form, scheduledAt: form.scheduledAt || undefined, rollbackPlan: form.rollbackPlan || undefined, testPlan: form.testPlan || undefined, notes: form.notes || undefined })}>Guardar</Button>
        </div>
      </div>
    </div>
  );
}

function IncidentModal({ initial, onClose, onSave }: { initial?: any; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    category: initial?.category ?? 'SOFTWARE',
    priority: initial?.priority ?? 'P3',
    severity: initial?.severity ?? 'MEDIUM',
    status: initial?.status ?? 'NEW',
    affectedSystem: initial?.affectedSystem ?? '',
    affectedUsers: initial?.affectedUsers ?? '',
    resolution: initial?.resolution ?? '',
  });
  const s = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-base font-semibold">{initial ? 'Editar Incidente' : 'Registar Incidente'}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.title} onChange={e => s('title', e.target.value)} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={3} value={form.description} onChange={e => s('description', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.category} onChange={e => s('category', e.target.value)}>
                {INCIDENT_CATEGORIES.map(v => <option key={v} value={v}>{v}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.priority} onChange={e => s('priority', e.target.value)}>
                {Object.entries(INCIDENT_PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
          </div>
          {initial && <div><label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => s('status', e.target.value)}>
              {Object.entries(INCIDENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Sistema Afetado</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.affectedSystem} onChange={e => s('affectedSystem', e.target.value)} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Utilizadores Afetados</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.affectedUsers} onChange={e => s('affectedUsers', e.target.value)} /></div>
          </div>
          {initial && <div><label className="block text-sm font-medium text-gray-700 mb-1">Resolução</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.resolution} onChange={e => s('resolution', e.target.value)} /></div>}
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={!form.title || !form.description} onClick={() => onSave({ ...form, affectedSystem: form.affectedSystem || undefined, affectedUsers: form.affectedUsers ? parseInt(form.affectedUsers) : undefined, resolution: form.resolution || undefined })}>Guardar</Button>
        </div>
      </div>
    </div>
  );
}

function ProblemModal({ initial, onClose, onSave }: { initial?: any; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    priority: initial?.priority ?? 'MEDIUM',
    status: initial?.status ?? 'NEW',
    affectedSystem: initial?.affectedSystem ?? '',
    rootCause: initial?.rootCause ?? '',
    workaround: initial?.workaround ?? '',
    resolution: initial?.resolution ?? '',
  });
  const s = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-base font-semibold">{initial ? 'Editar Problema' : 'Registar Problema'}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.title} onChange={e => s('title', e.target.value)} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={3} value={form.description} onChange={e => s('description', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.priority} onChange={e => s('priority', e.target.value)}>
                {['LOW','MEDIUM','HIGH','CRITICAL'].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
            {initial && <div><label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => s('status', e.target.value)}>
                {Object.entries(PROBLEM_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>}
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Sistema Afetado</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.affectedSystem} onChange={e => s('affectedSystem', e.target.value)} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Causa Raiz</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.rootCause} onChange={e => s('rootCause', e.target.value)} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Workaround</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.workaround} onChange={e => s('workaround', e.target.value)} /></div>
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={!form.title || !form.description} onClick={() => onSave({ ...form, affectedSystem: form.affectedSystem || undefined, rootCause: form.rootCause || undefined, workaround: form.workaround || undefined, resolution: form.resolution || undefined })}>Guardar</Button>
        </div>
      </div>
    </div>
  );
}

// ── Row components ────────────────────────────────────────────

function ChangeRow({ item, onEdit }: { item: any; onEdit: () => void }) {
  const st = CHANGE_STATUS[item.status] || CHANGE_STATUS.DRAFT;
  return (
    <tr className="hover:bg-gray-50 group">
      <td className="px-4 py-3 text-xs font-mono text-gray-500">{item.changeId}</td>
      <td className="px-4 py-3"><p className="text-sm font-medium text-gray-900">{item.title}</p><p className="text-xs text-gray-500">{CHANGE_TYPES[item.changeType as keyof typeof CHANGE_TYPES] || item.changeType}</p></td>
      <td className="px-4 py-3 text-xs text-gray-500">{item.scheduledAt ? format(new Date(item.scheduledAt), 'dd/MM/yyyy') : '—'}</td>
      <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${st.bg} ${st.color}`}>{st.label}</span></td>
      <td className="px-4 py-3 text-right"><button onClick={onEdit} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded text-gray-400"><Pencil className="w-3.5 h-3.5" /></button></td>
    </tr>
  );
}

function IncidentRow({ item, onEdit }: { item: any; onEdit: () => void }) {
  const pr = INCIDENT_PRIORITY[item.priority] || INCIDENT_PRIORITY.P3;
  const st = INCIDENT_STATUS[item.status] || INCIDENT_STATUS.NEW;
  return (
    <tr className="hover:bg-gray-50 group">
      <td className="px-4 py-3 text-xs font-mono text-gray-500">{item.incidentId}</td>
      <td className="px-4 py-3"><p className="text-sm font-medium text-gray-900">{item.title}</p><p className="text-xs text-gray-500">{item.category}{item.affectedSystem ? ` · ${item.affectedSystem}` : ''}</p></td>
      <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-semibold ${pr.bg} ${pr.color}`}>{pr.label}</span></td>
      <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${st.bg} ${st.color}`}>{st.label}</span></td>
      <td className="px-4 py-3 text-xs text-gray-500">{format(new Date(item.createdAt), 'dd/MM/yy HH:mm')}</td>
      <td className="px-4 py-3 text-right"><button onClick={onEdit} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded text-gray-400"><Pencil className="w-3.5 h-3.5" /></button></td>
    </tr>
  );
}

function ProblemRow({ item, onEdit }: { item: any; onEdit: () => void }) {
  const st = PROBLEM_STATUS[item.status] || PROBLEM_STATUS.NEW;
  return (
    <tr className="hover:bg-gray-50 group">
      <td className="px-4 py-3 text-xs font-mono text-gray-500">{item.problemId}</td>
      <td className="px-4 py-3"><p className="text-sm font-medium text-gray-900">{item.title}</p>{item.affectedSystem && <p className="text-xs text-gray-500">{item.affectedSystem}</p>}</td>
      <td className="px-4 py-3 text-xs font-medium text-gray-600">{item.priority}</td>
      <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${st.bg} ${st.color}`}>{st.label}</span></td>
      <td className="px-4 py-3 text-xs text-gray-500">{format(new Date(item.createdAt), 'dd/MM/yy')}</td>
      <td className="px-4 py-3 text-right"><button onClick={onEdit} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded text-gray-400"><Pencil className="w-3.5 h-3.5" /></button></td>
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────

const TABS = [
  { id: 'changes',   label: 'Change Management', icon: GitMerge },
  { id: 'incidents', label: 'Incident Management', icon: AlertCircle },
  { id: 'problems',  label: 'Problem Management', icon: Bug },
];

export default function ItsmPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('incidents');
  const [editItem, setEditItem] = useState<any>(null);
  const [showModal, setShowModal] = useState<string | null>(null);

  const { data: dashboard } = useQuery({ queryKey: ['itsm-dashboard'], queryFn: () => itsmApi.dashboard().then(r => r.data) });
  const { data: changes = [] } = useQuery({ queryKey: ['itsm-changes'], queryFn: () => itsmApi.listChanges().then(r => r.data), enabled: tab === 'changes' });
  const { data: incidents = [] } = useQuery({ queryKey: ['itsm-incidents'], queryFn: () => itsmApi.listIncidents().then(r => r.data), enabled: tab === 'incidents' });
  const { data: problems = [] } = useQuery({ queryKey: ['itsm-problems'], queryFn: () => itsmApi.listProblems().then(r => r.data), enabled: tab === 'problems' });

  const createChangeMut = useMutation({ mutationFn: (d: any) => itsmApi.createChange(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['itsm-changes'] }); qc.invalidateQueries({ queryKey: ['itsm-dashboard'] }); setShowModal(null); } });
  const updateChangeMut = useMutation({ mutationFn: ({ id, data }: any) => itsmApi.updateChange(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['itsm-changes'] }); setEditItem(null); } });
  const createIncidentMut = useMutation({ mutationFn: (d: any) => itsmApi.createIncident(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['itsm-incidents'] }); qc.invalidateQueries({ queryKey: ['itsm-dashboard'] }); setShowModal(null); } });
  const updateIncidentMut = useMutation({ mutationFn: ({ id, data }: any) => itsmApi.updateIncident(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['itsm-incidents'] }); setEditItem(null); } });
  const createProblemMut = useMutation({ mutationFn: (d: any) => itsmApi.createProblem(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['itsm-problems'] }); qc.invalidateQueries({ queryKey: ['itsm-dashboard'] }); setShowModal(null); } });
  const updateProblemMut = useMutation({ mutationFn: ({ id, data }: any) => itsmApi.updateProblem(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['itsm-problems'] }); setEditItem(null); } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-600 rounded-xl flex items-center justify-center"><Settings className="w-5 h-5 text-white" /></div>
          <div><h1 className="text-2xl font-bold text-gray-900">IT Service Management</h1><p className="text-sm text-gray-500">ITIL v4 · Change · Incident · Problem Management</p></div>
        </div>
        <Button onClick={() => setShowModal(tab)}>
          <Plus className="w-4 h-4 mr-1.5" />
          {tab === 'changes' ? 'Nova Change' : tab === 'incidents' ? 'Novo Incidente' : 'Novo Problema'}
        </Button>
      </div>

      {/* Stats */}
      {dashboard && (
        <div className="grid grid-cols-6 gap-3">
          <div className="bg-sky-50 rounded-xl p-3 text-center"><div className="text-xs text-sky-600 font-medium mb-1">Changes Open</div><div className="text-2xl font-bold text-sky-700">{dashboard.changes?.open ?? 0}</div></div>
          <div className="bg-green-50 rounded-xl p-3 text-center"><div className="text-xs text-green-600 font-medium mb-1">Changes Done</div><div className="text-2xl font-bold text-green-700">{dashboard.changes?.closed ?? 0}</div></div>
          <div className="bg-red-50 rounded-xl p-3 text-center"><div className="text-xs text-red-600 font-medium mb-1">Incidents P1/P2</div><div className="text-2xl font-bold text-red-700">{(dashboard.incidents?.p1 ?? 0) + (dashboard.incidents?.p2 ?? 0)}</div></div>
          <div className="bg-orange-50 rounded-xl p-3 text-center"><div className="text-xs text-orange-600 font-medium mb-1">Incidents Open</div><div className="text-2xl font-bold text-orange-700">{dashboard.incidents?.open ?? 0}</div></div>
          <div className="bg-purple-50 rounded-xl p-3 text-center"><div className="text-xs text-purple-600 font-medium mb-1">Problems Open</div><div className="text-2xl font-bold text-purple-700">{dashboard.problems?.open ?? 0}</div></div>
          <div className="bg-yellow-50 rounded-xl p-3 text-center"><div className="text-xs text-yellow-600 font-medium mb-1">Known Errors</div><div className="text-2xl font-bold text-yellow-700">{dashboard.problems?.knownErrors ?? 0}</div></div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => { const Icon = t.icon; return (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-sky-600 text-sky-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Icon className="w-4 h-4" />{t.label}
          </button>); })}
      </div>

      {/* Changes */}
      {tab === 'changes' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          {(changes as any[]).length === 0 ? (
            <div className="text-center py-12 text-gray-400"><GitMerge className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Nenhuma change request. Clique em "Nova Change" para começar.</p></div>
          ) : (
            <table className="w-full"><thead className="bg-gray-50 border-b"><tr>
              {['ID','Título / Tipo','Agendado','Estado',''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}
            </tr></thead><tbody className="divide-y divide-gray-100">
              {(changes as any[]).map((item: any) => <ChangeRow key={item.id} item={item} onEdit={() => setEditItem({ type: 'change', item })} />)}
            </tbody></table>
          )}
        </div>
      )}

      {/* Incidents */}
      {tab === 'incidents' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          {(incidents as any[]).length === 0 ? (
            <div className="text-center py-12 text-gray-400"><AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Nenhum incidente registado.</p></div>
          ) : (
            <table className="w-full"><thead className="bg-gray-50 border-b"><tr>
              {['ID','Título / Sistema','Prioridade','Estado','Criado',''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}
            </tr></thead><tbody className="divide-y divide-gray-100">
              {(incidents as any[]).map((item: any) => <IncidentRow key={item.id} item={item} onEdit={() => setEditItem({ type: 'incident', item })} />)}
            </tbody></table>
          )}
        </div>
      )}

      {/* Problems */}
      {tab === 'problems' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          {(problems as any[]).length === 0 ? (
            <div className="text-center py-12 text-gray-400"><Bug className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Nenhum problema registado.</p></div>
          ) : (
            <table className="w-full"><thead className="bg-gray-50 border-b"><tr>
              {['ID','Título','Prioridade','Estado','Criado',''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}
            </tr></thead><tbody className="divide-y divide-gray-100">
              {(problems as any[]).map((item: any) => <ProblemRow key={item.id} item={item} onEdit={() => setEditItem({ type: 'problem', item })} />)}
            </tbody></table>
          )}
        </div>
      )}

      {/* Create Modals */}
      {showModal === 'changes' && <ChangeModal onClose={() => setShowModal(null)} onSave={d => createChangeMut.mutate(d)} />}
      {showModal === 'incidents' && <IncidentModal onClose={() => setShowModal(null)} onSave={d => createIncidentMut.mutate(d)} />}
      {showModal === 'problems' && <ProblemModal onClose={() => setShowModal(null)} onSave={d => createProblemMut.mutate(d)} />}

      {/* Edit Modals */}
      {editItem?.type === 'change' && <ChangeModal initial={editItem.item} onClose={() => setEditItem(null)} onSave={d => updateChangeMut.mutate({ id: editItem.item.id, data: d })} />}
      {editItem?.type === 'incident' && <IncidentModal initial={editItem.item} onClose={() => setEditItem(null)} onSave={d => updateIncidentMut.mutate({ id: editItem.item.id, data: d })} />}
      {editItem?.type === 'problem' && <ProblemModal initial={editItem.item} onClose={() => setEditItem(null)} onSave={d => updateProblemMut.mutate({ id: editItem.item.id, data: d })} />}
    </div>
  );
}
