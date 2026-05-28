'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qualityApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Plus, Pencil, X, ClipboardList, AlertTriangle } from 'lucide-react';
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

// ── Tabs config ───────────────────────────────────────────────

const TABS = [
  { id: 'controls', label: 'ISO 9001 Controls', icon: ShieldCheck },
  { id: 'capas',    label: 'CAPA Records',       icon: ClipboardList },
];

// ── Main Page ─────────────────────────────────────────────────

export default function QualityPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('controls');
  const [capaTypeFilter, setCapaTypeFilter] = useState<string>('ALL');
  const [capaStatusFilter, setCapaStatusFilter] = useState<string>('ALL');
  const [editControl, setEditControl] = useState<any>(null);
  const [editCapa, setEditCapa] = useState<any>(null);
  const [showNewCapa, setShowNewCapa] = useState(false);

  const { data: dashboard } = useQuery({
    queryKey: ['quality-dashboard'],
    queryFn: () => qualityApi.dashboard().then((r: any) => r.data),
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

  const controls: any[] = dashboard?.controls ?? [];
  const capas: any[] = dashboard?.capas ?? [];

  const filteredCapas = capas.filter(c => {
    if (capaTypeFilter !== 'ALL' && c.type !== capaTypeFilter) return false;
    if (capaStatusFilter !== 'ALL' && c.status !== capaStatusFilter) return false;
    return true;
  });

  const now = new Date();

  const stats = {
    total:       controls.length,
    implemented: controls.filter(c => c.status === 'IMPLEMENTED').length,
    openCapas:   capas.filter(c => c.status === 'OPEN' || c.status === 'IN_PROGRESS').length,
    closedCapas: capas.filter(c => c.status === 'CLOSED').length,
    overdueCapas: capas.filter(c => c.dueDate && new Date(c.dueDate) < now && c.status !== 'CLOSED' && c.status !== 'CANCELLED').length,
    notAssessed: controls.filter(c => c.status === 'NOT_ASSESSED').length,
  };

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
          {/* Filters */}
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

          {/* CAPA list */}
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
    </div>
  );
}
