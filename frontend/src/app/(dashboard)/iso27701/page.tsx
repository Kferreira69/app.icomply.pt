'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { iso27701Api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Eye, CheckCircle2, XCircle, AlertCircle, Circle, MinusCircle, Pencil, X,
  Globe, Share2, Plus, Trash2, CheckCircle, AlertTriangle,
} from 'lucide-react';

// ── Status configs ────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  NOT_STARTED:    { label: 'Não Iniciado',  color: 'text-gray-500',   bg: 'bg-gray-100',   icon: Circle },
  PLANNED:        { label: 'Planeado',      color: 'text-blue-500',   bg: 'bg-blue-100',   icon: Circle },
  IN_PROGRESS:    { label: 'Em Curso',      color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertCircle },
  IMPLEMENTED:    { label: 'Implementado',  color: 'text-green-600',  bg: 'bg-green-100',  icon: CheckCircle2 },
  VERIFIED:       { label: 'Verificado',    color: 'text-purple-600', bg: 'bg-purple-100', icon: CheckCircle2 },
  NOT_APPLICABLE: { label: 'N/A',           color: 'text-gray-300',   bg: 'bg-gray-50',    icon: MinusCircle },
};

const APPLICABLE_TO: Record<string, { label: string; color: string }> = {
  CONTROLLER: { label: 'Responsável',    color: 'text-purple-600' },
  PROCESSOR:  { label: 'Subcontratante', color: 'text-blue-600' },
  BOTH:       { label: 'Ambos',          color: 'text-gray-600' },
};

const TRANSFER_MECHANISM: Record<string, string> = {
  SCC:               'Cláusulas Contratuais Padrão',
  BCR:               'Regras Vinculativas da Empresa',
  ADEQUACY_DECISION: 'Decisão de Adequação',
  DEROGATION:        'Derrogação (Art. 49)',
};

const TRANSFER_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE:     { label: 'Ativa',     color: 'text-green-700',  bg: 'bg-green-100' },
  SUSPENDED:  { label: 'Suspensa',  color: 'text-yellow-700', bg: 'bg-yellow-100' },
  TERMINATED: { label: 'Terminada', color: 'text-gray-500',   bg: 'bg-gray-100' },
};

const SUB_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  APPROVED:   { label: 'Aprovado',  color: 'text-green-700',  bg: 'bg-green-100' },
  PENDING:    { label: 'Pendente',  color: 'text-yellow-700', bg: 'bg-yellow-100' },
  TERMINATED: { label: 'Terminado', color: 'text-gray-500',   bg: 'bg-gray-100' },
};

// EU adequate countries (simplified list)
const EU_ADEQUATE = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE',
  'IS','LI','NO','CH','GB','AD','AR','CA','FO','GG','IL','IM','JP','JE','NZ','UY'];

// ── Types ─────────────────────────────────────────────────────

interface DataTransfer {
  id: string;
  destinationCountry: string;
  destinationOrg: string;
  mechanism: string;
  dataCategories: string;
  status: string;
  reviewDate: string;
  notes?: string;
}

interface SubProcessor {
  id: string;
  subProcessorName: string;
  country: string;
  service: string;
  dataShared: string;
  dpaInPlace: boolean;
  lastAuditDate: string;
  status: string;
  notes?: string;
}

// ── localStorage helpers ──────────────────────────────────────

function useLocalStorage<T>(key: string, initial: T[]): [T[], (v: T[]) => void] {
  const [state, setState] = useState<T[]>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch { return initial; }
  });
  const set = (v: T[]) => {
    setState(v);
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  };
  return [state, set];
}

// ── Controls EditModal ────────────────────────────────────────

function EditModal({ control, onClose, onSave }: { control: any; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    status: control.status,
    applicable: control.applicable,
    justification: control.justification ?? '',
    implementationNotes: control.implementationNotes ?? '',
    owner: control.owner ?? '',
  });
  const s = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex items-start justify-between">
          <div>
            <span className="text-xs font-mono text-gray-400">{control.controlCode} · {control.clause}</span>
            <h2 className="text-sm font-semibold text-gray-900 mt-0.5 max-w-md">{control.title}</h2>
            <span className={`text-xs font-medium ${APPLICABLE_TO[control.applicableTo]?.color ?? 'text-gray-500'}`}>
              {APPLICABLE_TO[control.applicableTo]?.label ?? control.applicableTo}
            </span>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          {control.description && <p className="text-xs text-gray-500 bg-gray-50 rounded p-3">{control.description}</p>}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3 cursor-pointer">
              <input type="checkbox" checked={form.applicable} onChange={e => s('applicable', e.target.checked)} className="rounded" />
              Aplicável à organização
            </label>
            {!form.applicable && (
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Justificação N/A</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.justification} onChange={e => s('justification', e.target.value)} /></div>
            )}
          </div>
          {form.applicable && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'NOT_APPLICABLE').map(([k, v]) => { const Icon = v.icon; return (
                    <button key={k} onClick={() => s('status', k)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all ${form.status === k ? `${v.bg} border-current font-medium ${v.color}` : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      <Icon className={`w-3.5 h-3.5 ${form.status === k ? v.color : 'text-gray-400'}`} />{v.label}
                    </button>); })}
                </div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Notas de Implementação</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={3} value={form.implementationNotes} onChange={e => s('implementationNotes', e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Responsável</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.owner} onChange={e => s('owner', e.target.value)} /></div>
            </>
          )}
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={() => onSave({ status: form.applicable ? form.status : 'NOT_APPLICABLE', applicable: form.applicable, justification: form.justification || null, implementationNotes: form.implementationNotes || null, owner: form.owner || null })}>Guardar</Button>
        </div>
      </div>
    </div>
  );
}

// ── Transfer Modal ────────────────────────────────────────────

const EMPTY_TRANSFER: Omit<DataTransfer, 'id'> = {
  destinationCountry: '', destinationOrg: '', mechanism: 'SCC',
  dataCategories: '', status: 'ACTIVE', reviewDate: '', notes: '',
};

function TransferModal({ transfer, onClose, onSave }: { transfer: Partial<DataTransfer> | null; onClose: () => void; onSave: (d: Omit<DataTransfer, 'id'>) => void }) {
  const [form, setForm] = useState<Omit<DataTransfer, 'id'>>(transfer ? { ...EMPTY_TRANSFER, ...transfer } : { ...EMPTY_TRANSFER });
  const s = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{transfer && (transfer as any).id ? 'Editar Transferência' : 'Nova Transferência Internacional'}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">País Destino <span className="text-red-500">*</span></label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="ex: EUA, Brasil" value={form.destinationCountry} onChange={e => s('destinationCountry', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organização Destinatária <span className="text-red-500">*</span></label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="ex: AWS Inc." value={form.destinationOrg} onChange={e => s('destinationOrg', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mecanismo de Transferência</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.mechanism} onChange={e => s('mechanism', e.target.value)}>
              {Object.entries(TRANSFER_MECHANISM).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dados Transferidos</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} placeholder="ex: Dados de colaboradores, logs de acesso" value={form.dataCategories} onChange={e => s('dataCategories', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => s('status', e.target.value)}>
                {Object.entries(TRANSFER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Revisão Periódica</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.reviewDate} onChange={e => s('reviewDate', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.notes ?? ''} onChange={e => s('notes', e.target.value)} />
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={!form.destinationCountry || !form.destinationOrg} onClick={() => onSave(form)}>Guardar</Button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-processor Modal ───────────────────────────────────────

const EMPTY_SUB: Omit<SubProcessor, 'id'> = {
  subProcessorName: '', country: '', service: '', dataShared: '',
  dpaInPlace: false, lastAuditDate: '', status: 'APPROVED', notes: '',
};

function SubProcessorModal({ sub, onClose, onSave }: { sub: Partial<SubProcessor> | null; onClose: () => void; onSave: (d: Omit<SubProcessor, 'id'>) => void }) {
  const [form, setForm] = useState<Omit<SubProcessor, 'id'>>(sub ? { ...EMPTY_SUB, ...sub } : { ...EMPTY_SUB });
  const s = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{sub && (sub as any).id ? 'Editar Sub-processador' : 'Novo Sub-processador'}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome <span className="text-red-500">*</span></label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="ex: Google LLC" value={form.subProcessorName} onChange={e => s('subProcessorName', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">País <span className="text-red-500">*</span></label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="ex: EUA, IE" value={form.country} onChange={e => s('country', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Serviço Prestado <span className="text-red-500">*</span></label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="ex: Alojamento de e-mail" value={form.service} onChange={e => s('service', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dados Partilhados</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} placeholder="ex: E-mail, nome, empresa" value={form.dataShared} onChange={e => s('dataShared', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => s('status', e.target.value)}>
                {Object.entries(SUB_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Último Audit</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.lastAuditDate} onChange={e => s('lastAuditDate', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.dpaInPlace} onChange={e => s('dpaInPlace', e.target.checked)} className="rounded" />
              Contrato DPA em vigor
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.notes ?? ''} onChange={e => s('notes', e.target.value)} />
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={!form.subProcessorName || !form.country || !form.service} onClick={() => onSave(form)}>Guardar</Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

type Tab = 'controls' | 'transfers' | 'subprocessors';

export default function Iso27701Page() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('controls');
  const [editControl, setEditControl] = useState<any>(null);
  const [filterApplicableTo, setFilterApplicableTo] = useState<string>('ALL');

  // Transfers state
  const [transfers, setTransfers] = useLocalStorage<DataTransfer>('iso27701_transfers', []);
  const [editTransfer, setEditTransfer] = useState<DataTransfer | null>(null);
  const [addTransfer, setAddTransfer] = useState(false);

  // Sub-processors state
  const [subs, setSubs] = useLocalStorage<SubProcessor>('iso27701_subprocessors', []);
  const [editSub, setEditSub] = useState<SubProcessor | null>(null);
  const [addSub, setAddSub] = useState(false);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['iso27701-dashboard'],
    queryFn: () => iso27701Api.dashboard().then(r => r.data),
  });

  const updateMut = useMutation({
    mutationFn: ({ code, data }: { code: string; data: any }) => iso27701Api.updateControl(code, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['iso27701-dashboard'] }); setEditControl(null); },
  });

  const allControls = dashboard?.controls ?? [];
  const filtered = filterApplicableTo === 'ALL' ? allControls : allControls.filter((c: any) => c.applicableTo === filterApplicableTo || c.applicableTo === 'BOTH');
  const annexA = filtered.filter((c: any) => c.clause === 'Annex A');
  const annexB = filtered.filter((c: any) => c.clause === 'Annex B');

  // Transfer helpers
  const saveTransfer = (data: Omit<DataTransfer, 'id'>) => {
    if (editTransfer) {
      setTransfers(transfers.map(t => t.id === editTransfer.id ? { ...data, id: editTransfer.id } : t));
      setEditTransfer(null);
    } else {
      setTransfers([...transfers, { ...data, id: crypto.randomUUID() }]);
      setAddTransfer(false);
    }
  };
  const deleteTransfer = (id: string) => setTransfers(transfers.filter(t => t.id !== id));

  // Sub-processor helpers
  const saveSub = (data: Omit<SubProcessor, 'id'>) => {
    if (editSub) {
      setSubs(subs.map(s => s.id === editSub.id ? { ...data, id: editSub.id } : s));
      setEditSub(null);
    } else {
      setSubs([...subs, { ...data, id: crypto.randomUUID() }]);
      setAddSub(false);
    }
  };
  const deleteSub = (id: string) => setSubs(subs.filter(s => s.id !== id));

  // Transfer KPIs
  const activeTransfers = transfers.filter(t => t.status === 'ACTIVE').length;
  const nonAdequateTransfers = transfers.filter(t => {
    const code = t.destinationCountry.trim().toUpperCase();
    return t.status === 'ACTIVE' && !EU_ADEQUATE.includes(code) && t.mechanism !== 'ADEQUACY_DECISION';
  }).length;
  const reviewDueTransfers = transfers.filter(t => {
    if (!t.reviewDate) return false;
    return new Date(t.reviewDate) <= new Date();
  }).length;

  // Sub-processor KPIs
  const approvedSubs = subs.filter(s => s.status === 'APPROVED').length;
  const noDpaSubs = subs.filter(s => s.status !== 'TERMINATED' && !s.dpaInPlace).length;
  const nonEuSubs = subs.filter(s => {
    const code = s.country.trim().toUpperCase();
    return s.status !== 'TERMINATED' && !EU_ADEQUATE.includes(code);
  }).length;

  function ControlRow({ c }: { c: any }) {
    const st = STATUS_CONFIG[c.status] || STATUS_CONFIG.NOT_STARTED;
    const StatusIcon = st.icon;
    const at = APPLICABLE_TO[c.applicableTo] || { label: c.applicableTo, color: 'text-gray-500' };
    return (
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 group border-b border-gray-100 last:border-0">
        <span className="text-xs font-mono text-gray-500 w-20 flex-shrink-0">{c.controlCode}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
          {c.implementationNotes && <p className="text-xs text-gray-500 truncate">{c.implementationNotes}</p>}
        </div>
        <span className={`text-xs font-medium flex-shrink-0 ${at.color}`}>{at.label}</span>
        <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium flex-shrink-0 ${st.bg} ${st.color}`}>
          <StatusIcon className="w-3 h-3" />{st.label}
        </span>
        <button onClick={() => setEditControl(c)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded text-gray-400 flex-shrink-0">
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center"><Eye className="w-5 h-5 text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ISO 27701 — PIMS</h1>
            <p className="text-sm text-gray-500">Privacy Information Management System · Extensão ao ISO 27001</p>
          </div>
        </div>
        {activeTab === 'controls' && (
          <div className="flex gap-2">
            {['ALL','CONTROLLER','PROCESSOR'].map(f => (
              <button key={f} onClick={() => setFilterApplicableTo(f)} className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${filterApplicableTo === f ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}>
                {f === 'ALL' ? 'Todos' : APPLICABLE_TO[f]?.label}
              </button>
            ))}
          </div>
        )}
        {activeTab === 'transfers' && (
          <Button size="sm" onClick={() => setAddTransfer(true)}><Plus className="w-4 h-4 mr-1" />Nova Transferência</Button>
        )}
        {activeTab === 'subprocessors' && (
          <Button size="sm" onClick={() => setAddSub(true)}><Plus className="w-4 h-4 mr-1" />Novo Sub-processador</Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { id: 'controls',      label: 'Controlos ISO 27701', icon: Eye },
          { id: 'transfers',     label: 'Transferências Internacionais', icon: Globe },
          { id: 'subprocessors', label: 'Sub-processadores', icon: Share2 },
        ] as { id: Tab; label: string; icon: React.ElementType }[]).map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === tab.id ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Icon className="w-4 h-4" />{tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Controlos ── */}
      {activeTab === 'controls' && (
        <>
          {isLoading ? <div className="text-center py-16 text-gray-400">A carregar...</div> : !dashboard ? null : (
            <>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-purple-50 rounded-xl p-4"><div className="text-xs font-medium text-purple-600 uppercase mb-2">Score</div><div className="text-3xl font-bold text-purple-700">{dashboard.score ?? 0}%</div></div>
                <div className="bg-green-50 rounded-xl p-4"><div className="text-xs font-medium text-green-600 uppercase mb-2">Implementados</div><div className="text-3xl font-bold text-green-700">{(dashboard.byStatus?.IMPLEMENTED ?? 0) + (dashboard.byStatus?.VERIFIED ?? 0)}</div></div>
                <div className="bg-yellow-50 rounded-xl p-4"><div className="text-xs font-medium text-yellow-600 uppercase mb-2">Em Curso</div><div className="text-3xl font-bold text-yellow-700">{dashboard.byStatus?.IN_PROGRESS ?? 0}</div></div>
                <div className="bg-gray-50 rounded-xl p-4"><div className="text-xs font-medium text-gray-600 uppercase mb-2">Total Controlos</div><div className="text-3xl font-bold text-gray-700">{dashboard.total ?? 0}</div></div>
              </div>

              {annexA.length > 0 && (
                <div className="bg-white rounded-xl border overflow-hidden">
                  <div className="px-4 py-3 bg-purple-50 border-b">
                    <span className="text-sm font-semibold text-purple-700">Annex A — Controlos para Responsáveis pelo Tratamento (PII Controller)</span>
                    <span className="text-xs text-purple-500 ml-2">({annexA.length} controlos)</span>
                  </div>
                  <div>{annexA.map((c: any) => <ControlRow key={c.id} c={c} />)}</div>
                </div>
              )}

              {annexB.length > 0 && (
                <div className="bg-white rounded-xl border overflow-hidden">
                  <div className="px-4 py-3 bg-blue-50 border-b">
                    <span className="text-sm font-semibold text-blue-700">Annex B — Controlos para Subcontratantes de Dados (PII Processor)</span>
                    <span className="text-xs text-blue-500 ml-2">({annexB.length} controlos)</span>
                  </div>
                  <div>{annexB.map((c: any) => <ControlRow key={c.id} c={c} />)}</div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Tab: Transferências Internacionais ── */}
      {activeTab === 'transfers' && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-xl p-4">
              <div className="text-xs font-medium text-green-600 uppercase mb-2">Transferências Ativas</div>
              <div className="text-3xl font-bold text-green-700">{activeTransfers}</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <div className="text-xs font-medium text-amber-600 uppercase mb-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />Países Sem Adequação</div>
              <div className="text-3xl font-bold text-amber-700">{nonAdequateTransfers}</div>
              <div className="text-xs text-amber-500 mt-1">Requerem mecanismo alternativo</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-4">
              <div className="text-xs font-medium text-purple-600 uppercase mb-2">A Rever</div>
              <div className="text-3xl font-bold text-purple-700">{reviewDueTransfers}</div>
              <div className="text-xs text-purple-500 mt-1">Revisão vencida</div>
            </div>
          </div>

          {transfers.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center">
              <Globe className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">Nenhuma transferência registada</p>
              <p className="text-xs text-gray-400 mt-1">Registe as transferências internacionais de dados pessoais para fora do EEE.</p>
              <Button size="sm" className="mt-4" onClick={() => setAddTransfer(true)}><Plus className="w-4 h-4 mr-1" />Adicionar Transferência</Button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">País Destino</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Organização Destinatária</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Mecanismo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Dados Transferidos</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Revisão</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transfers.map(t => {
                    const st = TRANSFER_STATUS[t.status] ?? TRANSFER_STATUS.ACTIVE;
                    const isPast = t.reviewDate && new Date(t.reviewDate) <= new Date();
                    return (
                      <tr key={t.id} className="hover:bg-gray-50 group">
                        <td className="px-4 py-3 font-medium text-gray-900">{t.destinationCountry}</td>
                        <td className="px-4 py-3 text-gray-700">{t.destinationOrg}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                            {Object.entries(TRANSFER_MECHANISM).find(([k]) => k === t.mechanism)?.[0] ?? t.mechanism}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{t.dataCategories || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.bg} ${st.color}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {t.reviewDate ? (
                            <span className={isPast ? 'text-red-600 font-medium' : 'text-gray-500'}>
                              {new Date(t.reviewDate).toLocaleDateString('pt-PT')}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                            <button onClick={() => setEditTransfer(t)} className="p-1.5 hover:bg-gray-200 rounded text-gray-400"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteTransfer(t.id)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Tab: Sub-processadores ── */}
      {activeTab === 'subprocessors' && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-xl p-4">
              <div className="text-xs font-medium text-green-600 uppercase mb-2">Sub-processadores Aprovados</div>
              <div className="text-3xl font-bold text-green-700">{approvedSubs}</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4">
              <div className="text-xs font-medium text-red-600 uppercase mb-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />Sem DPA</div>
              <div className="text-3xl font-bold text-red-700">{noDpaSubs}</div>
              <div className="text-xs text-red-400 mt-1">Sem contrato de proteção de dados</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <div className="text-xs font-medium text-amber-600 uppercase mb-2">Fora da UE/EEE</div>
              <div className="text-3xl font-bold text-amber-700">{nonEuSubs}</div>
              <div className="text-xs text-amber-500 mt-1">Requer avaliação adicional</div>
            </div>
          </div>

          {subs.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center">
              <Share2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">Nenhum sub-processador registado</p>
              <p className="text-xs text-gray-400 mt-1">Registe os sub-processadores que tratam dados pessoais em nome da organização.</p>
              <Button size="sm" className="mt-4" onClick={() => setAddSub(true)}><Plus className="w-4 h-4 mr-1" />Adicionar Sub-processador</Button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Nome Sub-processador</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">País</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Serviço Prestado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Dados Partilhados</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Contrato DPA</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Último Audit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subs.map(s => {
                    const st = SUB_STATUS[s.status] ?? SUB_STATUS.APPROVED;
                    return (
                      <tr key={s.id} className="hover:bg-gray-50 group">
                        <td className="px-4 py-3 font-medium text-gray-900">{s.subProcessorName}</td>
                        <td className="px-4 py-3 text-gray-600">{s.country}</td>
                        <td className="px-4 py-3 text-gray-700">{s.service}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-[140px] truncate">{s.dataShared || '—'}</td>
                        <td className="px-4 py-3">
                          {s.dpaInPlace
                            ? <CheckCircle className="w-4 h-4 text-green-500" />
                            : <XCircle className="w-4 h-4 text-red-400" />}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {s.lastAuditDate ? new Date(s.lastAuditDate).toLocaleDateString('pt-PT') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.bg} ${st.color}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                            <button onClick={() => setEditSub(s)} className="p-1.5 hover:bg-gray-200 rounded text-gray-400"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteSub(s.id)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Modals ── */}
      {editControl && (
        <EditModal
          control={editControl}
          onClose={() => setEditControl(null)}
          onSave={d => updateMut.mutate({ code: editControl.controlCode, data: d })}
        />
      )}
      {(addTransfer || editTransfer) && (
        <TransferModal
          transfer={editTransfer}
          onClose={() => { setAddTransfer(false); setEditTransfer(null); }}
          onSave={saveTransfer}
        />
      )}
      {(addSub || editSub) && (
        <SubProcessorModal
          sub={editSub}
          onClose={() => { setAddSub(false); setEditSub(null); }}
          onSave={saveSub}
        />
      )}
    </div>
  );
}
