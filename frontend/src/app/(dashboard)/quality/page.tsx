'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qualityApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck, Plus, Pencil, X, ClipboardList, AlertTriangle,
  XCircle, BarChart2,
} from 'lucide-react';
import { format } from 'date-fns';

// ── Config ────────────────────────────────────────────────────

const CONTROL_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  IMPLEMENTED:     { label: 'Implemented',    color: 'text-green-700',  bg: 'bg-green-100' },
  PARTIAL:         { label: 'Partial',        color: 'text-yellow-700', bg: 'bg-yellow-100' },
  NOT_ASSESSED:    { label: 'Not Assessed',   color: 'text-red-600',    bg: 'bg-red-100' },
  NOT_APPLICABLE:  { label: 'N/A',            color: 'text-gray-500',   bg: 'bg-gray-100' },
};

const CAPA_TYPE: Record<string, { label: string; color: string; bg: string }> = {
  CORRECTIVE:  { label: 'Corrective',  color: 'text-orange-700', bg: 'bg-orange-100' },
  PREVENTIVE:  { label: 'Preventive',  color: 'text-blue-700',   bg: 'bg-blue-100' },
};

const CAPA_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  OPEN:                 { label: 'Open',                  color: 'text-red-600',    bg: 'bg-red-100' },
  IN_PROGRESS:          { label: 'In Progress',           color: 'text-yellow-600', bg: 'bg-yellow-100' },
  PENDING_VERIFICATION: { label: 'Pending Verification',  color: 'text-purple-600', bg: 'bg-purple-100' },
  CLOSED:               { label: 'Closed',                color: 'text-green-600',  bg: 'bg-green-100' },
  CANCELLED:            { label: 'Cancelled',             color: 'text-gray-400',   bg: 'bg-gray-50' },
};

const SOURCE_TYPES = ['AUDIT', 'INCIDENT', 'CUSTOMER_COMPLAINT', 'INTERNAL', 'RISK', 'OTHER'];

// ── NC Config ─────────────────────────────────────────────────

const NC_CATEGORY: Record<string, { label: string; color: string; bg: string }> = {
  PRODUCT:   { label: 'Produto',    color: 'text-blue-700',   bg: 'bg-blue-100' },
  PROCESS:   { label: 'Processo',   color: 'text-purple-700', bg: 'bg-purple-100' },
  SUPPLIER:  { label: 'Fornecedor', color: 'text-orange-700', bg: 'bg-orange-100' },
  SYSTEM:    { label: 'Sistema',    color: 'text-gray-700',   bg: 'bg-gray-100' },
};

const NC_SEVERITY: Record<string, { label: string; color: string; bg: string }> = {
  MINOR:    { label: 'Minor',    color: 'text-yellow-700', bg: 'bg-yellow-100' },
  MAJOR:    { label: 'Major',    color: 'text-orange-700', bg: 'bg-orange-100' },
  CRITICAL: { label: 'Crítica',  color: 'text-red-700',    bg: 'bg-red-100' },
};

const NC_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  OPEN:          { label: 'Aberta',      color: 'text-red-600',    bg: 'bg-red-100' },
  INVESTIGATING: { label: 'Em análise',  color: 'text-yellow-600', bg: 'bg-yellow-100' },
  CORRECTED:     { label: 'Corrigida',   color: 'text-blue-600',   bg: 'bg-blue-100' },
  CLOSED:        { label: 'Fechada',     color: 'text-green-600',  bg: 'bg-green-100' },
};

// ── Modals ────────────────────────────────────────────────────

function ControlEditModal({ initial, onClose, onSave }: { initial: any; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    status:   initial?.status   ?? 'NOT_ASSESSED',
    evidence: initial?.evidence ?? '',
    notes:    initial?.notes    ?? '',
  });
  const s = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">{initial.clauseNumber} — {initial.title}</h2>
            {initial.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{initial.description}</p>}
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => s('status', e.target.value)}>
              {Object.entries(CONTROL_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Evidence</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={3} value={form.evidence} onChange={e => s('evidence', e.target.value)} placeholder="Describe the evidence of implementation…" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.notes} onChange={e => s('notes', e.target.value)} />
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onSave({ status: form.status, evidence: form.evidence || undefined, notes: form.notes || undefined })}>Save</Button>
        </div>
      </div>
    </div>
  );
}

function CapaModal({ initial, onClose, onSave }: { initial?: any; onClose: () => void; onSave: (d: any) => void }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    type:                initial?.type                ?? 'CORRECTIVE',
    title:               initial?.title               ?? '',
    description:         initial?.description         ?? '',
    rootCause:           initial?.rootCause           ?? '',
    sourceType:          initial?.sourceType          ?? 'INTERNAL',
    sourceRef:           initial?.sourceRef           ?? '',
    correctiveAction:    initial?.correctiveAction    ?? '',
    preventiveAction:    initial?.preventiveAction    ?? '',
    dueDate:             initial?.dueDate             ? initial.dueDate.slice(0, 10) : '',
    status:              initial?.status              ?? 'OPEN',
    effectivenessCheck:  initial?.effectivenessCheck  ?? '',
    notes:               initial?.notes               ?? '',
  });
  const s = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-base font-semibold">{isEdit ? 'Edit CAPA' : 'New CAPA'}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          {!isEdit && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.type} onChange={e => s('type', e.target.value)}>
                    <option value="CORRECTIVE">Corrective</option>
                    <option value="PREVENTIVE">Preventive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source Type</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.sourceType} onChange={e => s('sourceType', e.target.value)}>
                    {SOURCE_TYPES.map(v => <option key={v} value={v}>{v.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.title} onChange={e => s('title', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={3} value={form.description} onChange={e => s('description', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source Reference</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.sourceRef} onChange={e => s('sourceRef', e.target.value)} placeholder="e.g. Audit report ref, incident ID…" />
              </div>
            </>
          )}
          {isEdit && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => s('status', e.target.value)}>
                    {Object.entries(CAPA_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.dueDate} onChange={e => s('dueDate', e.target.value)} />
                </div>
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Root Cause</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.rootCause} onChange={e => s('rootCause', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Corrective Action</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.correctiveAction} onChange={e => s('correctiveAction', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preventive Action</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.preventiveAction} onChange={e => s('preventiveAction', e.target.value)} />
          </div>
          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Effectiveness Check</label>
              <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.effectivenessCheck} onChange={e => s('effectivenessCheck', e.target.value)} />
            </div>
          )}
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.dueDate} onChange={e => s('dueDate', e.target.value)} />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.notes} onChange={e => s('notes', e.target.value)} />
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm"
            disabled={!isEdit && (!form.title || !form.description)}
            onClick={() => onSave({
              ...(isEdit
                ? { status: form.status, rootCause: form.rootCause || undefined, correctiveAction: form.correctiveAction || undefined, preventiveAction: form.preventiveAction || undefined, effectivenessCheck: form.effectivenessCheck || undefined, notes: form.notes || undefined, dueDate: form.dueDate || undefined }
                : { type: form.type, title: form.title, description: form.description, rootCause: form.rootCause || undefined, sourceType: form.sourceType, sourceRef: form.sourceRef || undefined, correctiveAction: form.correctiveAction || undefined, preventiveAction: form.preventiveAction || undefined, dueDate: form.dueDate || undefined }
              ),
            })}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── NCModal ───────────────────────────────────────────────────

function NCModal({ initial, onClose, onSave }: { initial?: any; onClose: () => void; onSave: (d: any) => void }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    title:             initial?.title             ?? '',
    category:          initial?.category          ?? 'PROCESS',
    severity:          initial?.severity          ?? 'MINOR',
    description:       initial?.description       ?? '',
    rootCause:         initial?.rootCause         ?? '',
    correctiveAction:  initial?.correctiveAction  ?? '',
    responsiblePerson: initial?.responsiblePerson ?? '',
    detectedAt:        initial?.detectedAt        ? initial.detectedAt.slice(0, 10) : '',
    closedAt:          initial?.closedAt          ? initial.closedAt.slice(0, 10)   : '',
    status:            initial?.status            ?? 'OPEN',
  });
  const s = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-base font-semibold">{isEdit ? 'Editar Não Conformidade' : 'Nova Não Conformidade'}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.title} onChange={e => s('title', e.target.value)} placeholder="Descrição curta da não conformidade" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.category} onChange={e => s('category', e.target.value)}>
                {Object.entries(NC_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gravidade</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.severity} onChange={e => s('severity', e.target.value)}>
                {Object.entries(NC_SEVERITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={3} value={form.description} onChange={e => s('description', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Causa Raiz</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.rootCause} onChange={e => s('rootCause', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ação Corretiva</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.correctiveAction} onChange={e => s('correctiveAction', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsável</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.responsiblePerson} onChange={e => s('responsiblePerson', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Detectado Em</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.detectedAt} onChange={e => s('detectedAt', e.target.value)} />
            </div>
          </div>
          {isEdit && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => s('status', e.target.value)}>
                  {Object.entries(NC_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fechada Em</label>
                <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.closedAt} onChange={e => s('closedAt', e.target.value)} />
              </div>
            </div>
          )}
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm"
            disabled={!form.title}
            onClick={() => onSave({
              title: form.title,
              category: form.category,
              severity: form.severity,
              description: form.description || undefined,
              rootCause: form.rootCause || undefined,
              correctiveAction: form.correctiveAction || undefined,
              responsiblePerson: form.responsiblePerson || undefined,
              detectedAt: form.detectedAt || undefined,
              ...(isEdit ? {
                status: form.status,
                closedAt: form.closedAt || undefined,
              } : {}),
            })}>
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Tabs config ───────────────────────────────────────────────

const TABS = [
  { id: 'controls',  label: 'ISO 9001 Controls',    icon: ShieldCheck },
  { id: 'capas',     label: 'CAPA Records',          icon: ClipboardList },
  { id: 'nc',        label: 'Não Conformidades',     icon: XCircle },
  { id: 'metrics',   label: 'Métricas Qualidade',    icon: BarChart2 },
];

// ── Main Page ─────────────────────────────────────────────────

export default function QualityPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('controls');
  const [capaTypeFilter, setCapaTypeFilter] = useState<string>('ALL');
  const [capaStatusFilter, setCapaStatusFilter] = useState<string>('ALL');
  const [ncStatusFilter, setNcStatusFilter] = useState<string>('ALL');
  const [editControl, setEditControl] = useState<any>(null);
  const [editCapa, setEditCapa] = useState<any>(null);
  const [showNewCapa, setShowNewCapa] = useState(false);
  const [editNC, setEditNC] = useState<any>(null);
  const [showNewNC, setShowNewNC] = useState(false);

  const { data: dashboard } = useQuery({
    queryKey: ['quality-dashboard'],
    queryFn: () => qualityApi.dashboard().then((r: any) => r.data),
  });

  const { data: ncList = [] } = useQuery({
    queryKey: ['quality-nc'],
    queryFn: () => qualityApi.listNCs().then((r: any) => r.data),
  });

  const updateControlMut = useMutation({
    mutationFn: ({ id, data }: any) => qualityApi.updateControl(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quality-dashboard'] });
      setEditControl(null);
    },
  });

  const createCapaMut = useMutation({
    mutationFn: (d: any) => qualityApi.createCapa(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quality-dashboard'] });
      setShowNewCapa(false);
    },
  });

  const updateCapaMut = useMutation({
    mutationFn: ({ id, data }: any) => qualityApi.updateCapa(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quality-dashboard'] });
      setEditCapa(null);
    },
  });

  const removeCapaMut = useMutation({
    mutationFn: (id: string) => qualityApi.removeCapa(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quality-dashboard'] });
      setEditCapa(null);
    },
  });

  const createNCMut = useMutation({
    mutationFn: (d: any) => qualityApi.createNC(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quality-nc'] });
      setShowNewNC(false);
    },
  });

  const updateNCMut = useMutation({
    mutationFn: ({ id, data }: any) => qualityApi.updateNC(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quality-nc'] });
      setEditNC(null);
    },
  });

  const controls: any[] = dashboard?.controls ?? [];
  const capas: any[] = dashboard?.capas ?? dashboard?.recentCapas ?? [];
  const ncs: any[] = Array.isArray(ncList) ? ncList : [];

  const filteredCapas = capas.filter(c => {
    if (capaTypeFilter !== 'ALL' && c.type !== capaTypeFilter) return false;
    if (capaStatusFilter !== 'ALL' && c.status !== capaStatusFilter) return false;
    return true;
  });

  const filteredNCs = ncs.filter(nc => {
    if (ncStatusFilter !== 'ALL' && nc.status !== ncStatusFilter) return false;
    return true;
  });

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const stats = {
    total:        controls.length,
    implemented:  controls.filter(c => c.status === 'IMPLEMENTED').length,
    openCapas:    capas.filter(c => c.status === 'OPEN' || c.status === 'IN_PROGRESS').length,
    closedCapas:  capas.filter(c => c.status === 'CLOSED').length,
    overdueCapas: capas.filter(c => c.dueDate && new Date(c.dueDate) < now && c.status !== 'CLOSED' && c.status !== 'CANCELLED').length,
    notAssessed:  controls.filter(c => c.status === 'NOT_ASSESSED').length,
  };

  // NC derived stats
  const ncOpen      = ncs.filter(nc => nc.status === 'OPEN').length;
  const ncCritical  = ncs.filter(nc => nc.severity === 'CRITICAL').length;
  const ncCorrected = ncs.filter(nc => {
    if (nc.status !== 'CORRECTED' && nc.status !== 'CLOSED') return false;
    if (!nc.closedAt) return false;
    return new Date(nc.closedAt) >= thisMonthStart;
  }).length;

  // Metrics derived from controls
  const totalControls   = controls.length;
  const implCount       = controls.filter(c => c.status === 'IMPLEMENTED').length;
  const verifiedCount   = controls.filter(c => c.status === 'IMPLEMENTED' || c.status === 'PARTIAL').length;
  const notImplCount    = controls.filter(c => c.status === 'NOT_ASSESSED').length;
  const implPct         = totalControls > 0 ? Math.round((implCount / totalControls) * 100) : 0;

  // Controls by category (clause prefix)
  const categoryGroups: Record<string, { total: number; implemented: number; partial: number; notAssessed: number }> = {};
  controls.forEach(c => {
    const cat = c.clauseNumber?.split('.')[0] ?? 'Other';
    if (!categoryGroups[cat]) categoryGroups[cat] = { total: 0, implemented: 0, partial: 0, notAssessed: 0 };
    categoryGroups[cat].total++;
    if (c.status === 'IMPLEMENTED') categoryGroups[cat].implemented++;
    else if (c.status === 'PARTIAL') categoryGroups[cat].partial++;
    else if (c.status === 'NOT_ASSESSED') categoryGroups[cat].notAssessed++;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quality &amp; Operational Governance</h1>
            <p className="text-sm text-gray-500">ISO 9001:2015 Quality Management System — CAPA Management</p>
          </div>
        </div>
        {tab === 'capas' && (
          <Button onClick={() => setShowNewCapa(true)}>
            <Plus className="w-4 h-4 mr-1.5" />New CAPA
          </Button>
        )}
        {tab === 'nc' && (
          <Button onClick={() => setShowNewNC(true)}>
            <Plus className="w-4 h-4 mr-1.5" />Nova NC
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-6 gap-3">
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <div className="text-xs text-blue-600 font-medium mb-1">Total Controls</div>
          <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <div className="text-xs text-green-600 font-medium mb-1">Implemented</div>
          <div className="text-2xl font-bold text-green-700">{stats.implemented}</div>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center">
          <div className="text-xs text-red-600 font-medium mb-1">Open CAPAs</div>
          <div className="text-2xl font-bold text-red-700">{stats.openCapas}</div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center">
          <div className="text-xs text-emerald-600 font-medium mb-1">Closed CAPAs</div>
          <div className="text-2xl font-bold text-emerald-700">{stats.closedCapas}</div>
        </div>
        <div className="bg-orange-50 rounded-xl p-3 text-center">
          <div className="text-xs text-orange-600 font-medium mb-1">Overdue CAPAs</div>
          <div className="text-2xl font-bold text-orange-700">{stats.overdueCapas}</div>
        </div>
        <div className="bg-yellow-50 rounded-xl p-3 text-center">
          <div className="text-xs text-yellow-600 font-medium mb-1">Not Assessed</div>
          <div className="text-2xl font-bold text-yellow-700">{stats.notAssessed}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <Icon className="w-4 h-4" />{t.label}
            </button>
          );
        })}
      </div>

      {/* ISO 9001 Controls Tab */}
      {tab === 'controls' && (
        <div className="space-y-2">
          {controls.length === 0 ? (
            <div className="bg-white rounded-xl border text-center py-12 text-gray-400">
              <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No ISO 9001 controls found.</p>
            </div>
          ) : (
            controls.map((ctrl: any) => {
              const st = CONTROL_STATUS[ctrl.status] ?? CONTROL_STATUS.NOT_ASSESSED;
              return (
                <div
                  key={ctrl.id}
                  className="bg-white rounded-xl border px-4 py-3 flex items-start justify-between gap-4 hover:border-green-300 cursor-pointer group transition-colors"
                  onClick={() => setEditControl(ctrl)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">{ctrl.clauseNumber}</span>
                      <span className="text-sm font-medium text-gray-900">{ctrl.title}</span>
                    </div>
                    {ctrl.description && <p className="text-xs text-gray-500 line-clamp-2">{ctrl.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.bg} ${st.color}`}>{st.label}</span>
                    <button className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-100 rounded text-gray-400 transition-opacity">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* CAPA Records Tab */}
      {tab === 'capas' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1">
              {['ALL', 'CORRECTIVE', 'PREVENTIVE'].map(f => (
                <button
                  key={f}
                  onClick={() => setCapaTypeFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${capaTypeFilter === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {f === 'ALL' ? 'All Types' : f.charAt(0) + f.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <div className="w-px h-5 bg-gray-200" />
            <div className="flex gap-1">
              {['ALL', 'OPEN', 'IN_PROGRESS', 'PENDING_VERIFICATION', 'CLOSED', 'CANCELLED'].map(f => {
                const st = CAPA_STATUS[f];
                return (
                  <button
                    key={f}
                    onClick={() => setCapaStatusFilter(f)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${capaStatusFilter === f ? (st ? `${st.bg} ${st.color} ring-1 ring-inset ring-current` : 'bg-gray-900 text-white') : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {f === 'ALL' ? 'All Statuses' : (st?.label ?? f)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden">
            {filteredCapas.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No CAPA records match the selected filters.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['ID', 'Type', 'Title / Description', 'Due Date', 'Status', 'Responsible', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCapas.map((capa: any) => {
                    const typ = CAPA_TYPE[capa.type] ?? CAPA_TYPE.CORRECTIVE;
                    const st = CAPA_STATUS[capa.status] ?? CAPA_STATUS.OPEN;
                    const isOverdue = capa.dueDate && new Date(capa.dueDate) < now && capa.status !== 'CLOSED' && capa.status !== 'CANCELLED';
                    return (
                      <tr key={capa.id} className="hover:bg-gray-50 group">
                        <td className="px-4 py-3 text-xs font-mono text-gray-500">{capa.capaId}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${typ.bg} ${typ.color}`}>{typ.label}</span>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-sm font-medium text-gray-900">{capa.title}</p>
                          {capa.description && <p className="text-xs text-gray-500 truncate">{capa.description}</p>}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {capa.dueDate ? (
                            <span className={isOverdue ? 'text-red-600 font-semibold flex items-center gap-1' : 'text-gray-500'}>
                              {isOverdue && <AlertTriangle className="w-3 h-3" />}
                              {format(new Date(capa.dueDate), 'dd/MM/yyyy')}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.bg} ${st.color}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{capa.responsible ?? '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setEditCapa(capa)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded text-gray-400"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Não Conformidades Tab */}
      {tab === 'nc' && (
        <div className="space-y-4">
          {/* NC KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-red-50 rounded-xl p-4">
              <div className="text-xs text-red-600 font-medium mb-1">Abertas</div>
              <div className="text-2xl font-bold text-red-700">{ncOpen}</div>
            </div>
            <div className="bg-orange-50 rounded-xl p-4">
              <div className="text-xs text-orange-600 font-medium mb-1">Críticas</div>
              <div className="text-2xl font-bold text-orange-700">{ncCritical}</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <div className="text-xs text-green-600 font-medium mb-1">Corrigidas Este Mês</div>
              <div className="text-2xl font-bold text-green-700">{ncCorrected}</div>
            </div>
          </div>

          {/* Status filter */}
          <div className="flex gap-1">
            {(['ALL', 'OPEN', 'INVESTIGATING', 'CORRECTED', 'CLOSED'] as const).map(f => {
              const st = NC_STATUS[f as string];
              return (
                <button
                  key={f}
                  onClick={() => setNcStatusFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${ncStatusFilter === f ? (st ? `${st.bg} ${st.color} ring-1 ring-inset ring-current` : 'bg-gray-900 text-white') : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {f === 'ALL' ? 'Todos' : (st?.label ?? f)}
                </button>
              );
            })}
          </div>

          {/* NC Table */}
          <div className="bg-white rounded-xl border overflow-hidden">
            {filteredNCs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <XCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Sem não conformidades registadas.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['ID', 'Título', 'Categoria', 'Gravidade', 'Estado', 'Detectado Em', 'Responsável', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredNCs.map((nc: any) => {
                    const cat = NC_CATEGORY[nc.category] ?? NC_CATEGORY.PROCESS;
                    const sev = NC_SEVERITY[nc.severity] ?? NC_SEVERITY.MINOR;
                    const st  = NC_STATUS[nc.status]     ?? NC_STATUS.OPEN;
                    return (
                      <tr key={nc.id} className="hover:bg-gray-50 group">
                        <td className="px-4 py-3 text-xs font-mono text-gray-500">{nc.ncId ?? nc.id?.slice(0, 8)}</td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-sm font-medium text-gray-900 truncate">{nc.title}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${cat.bg} ${cat.color}`}>{cat.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${sev.bg} ${sev.color}`}>{sev.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.bg} ${st.color}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {nc.detectedAt ? format(new Date(nc.detectedAt), 'dd/MM/yyyy') : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{nc.responsiblePerson ?? '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setEditNC(nc)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded text-gray-400"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Métricas Qualidade Tab */}
      {tab === 'metrics' && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <div className="text-xs text-gray-500 font-medium mb-2">Implementação (%)</div>
              <div className="text-3xl font-bold text-green-700 mb-2">{implPct}%</div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${implPct}%` }}
                />
              </div>
              <div className="text-xs text-gray-400 mt-1">{implCount} de {totalControls} controlos</div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="text-xs text-gray-500 font-medium mb-2">Controlos Verificados</div>
              <div className="text-3xl font-bold text-blue-700">{verifiedCount}</div>
              <div className="text-xs text-gray-400 mt-1">Implementados + Parciais</div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="text-xs text-gray-500 font-medium mb-2">Não Implementados</div>
              <div className="text-3xl font-bold text-red-600">{notImplCount}</div>
              <div className="text-xs text-gray-400 mt-1">Sem avaliação registada</div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="text-xs text-gray-500 font-medium mb-2">NC Abertas</div>
              <div className="text-3xl font-bold text-orange-600">{ncOpen}</div>
              <div className="text-xs text-gray-400 mt-1">Não Conformidades activas</div>
            </div>
          </div>

          {/* Controls breakdown by clause section */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700">Controlos por Secção ISO 9001</h3>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Secção', 'Total', 'Implementados', 'Parciais', 'Não Avaliados', 'Progresso'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.entries(categoryGroups)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([section, g]) => {
                    const pct = g.total > 0 ? Math.round((g.implemented / g.total) * 100) : 0;
                    return (
                      <tr key={section} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">§{section}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 font-medium">{g.total}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">{g.implemented}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700">{g.partial}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">{g.notAssessed}</span>
                        </td>
                        <td className="px-4 py-3 w-36">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                              <div
                                className="bg-green-500 h-1.5 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {editControl && (
        <ControlEditModal
          initial={editControl}
          onClose={() => setEditControl(null)}
          onSave={d => updateControlMut.mutate({ id: editControl.id, data: d })}
        />
      )}
      {showNewCapa && (
        <CapaModal
          onClose={() => setShowNewCapa(false)}
          onSave={d => createCapaMut.mutate(d)}
        />
      )}
      {editCapa && (
        <CapaModal
          initial={editCapa}
          onClose={() => setEditCapa(null)}
          onSave={d => updateCapaMut.mutate({ id: editCapa.id, data: d })}
        />
      )}
      {showNewNC && (
        <NCModal
          onClose={() => setShowNewNC(false)}
          onSave={d => createNCMut.mutate(d)}
        />
      )}
      {editNC && (
        <NCModal
          initial={editNC}
          onClose={() => setEditNC(null)}
          onSave={d => updateNCMut.mutate({ id: editNC.id, data: d })}
        />
      )}
    </div>
  );
}
