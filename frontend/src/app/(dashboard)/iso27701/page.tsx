'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { iso27701Api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Eye, CheckCircle2, XCircle, AlertCircle, Circle, MinusCircle, Pencil, X,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  NOT_STARTED:    { label: 'Não Iniciado',  color: 'text-gray-500',   bg: 'bg-gray-100',   icon: Circle },
  PLANNED:        { label: 'Planeado',      color: 'text-blue-500',   bg: 'bg-blue-100',   icon: Circle },
  IN_PROGRESS:    { label: 'Em Curso',      color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertCircle },
  IMPLEMENTED:    { label: 'Implementado',  color: 'text-green-600',  bg: 'bg-green-100',  icon: CheckCircle2 },
  VERIFIED:       { label: 'Verificado',    color: 'text-purple-600', bg: 'bg-purple-100', icon: CheckCircle2 },
  NOT_APPLICABLE: { label: 'N/A',           color: 'text-gray-300',   bg: 'bg-gray-50',    icon: MinusCircle },
};

const APPLICABLE_TO: Record<string, { label: string; color: string }> = {
  CONTROLLER: { label: 'Responsável',  color: 'text-purple-600' },
  PROCESSOR:  { label: 'Subcontratante', color: 'text-blue-600' },
  BOTH:       { label: 'Ambos',        color: 'text-gray-600' },
};

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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
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

export default function Iso27701Page() {
  const qc = useQueryClient();
  const [editControl, setEditControl] = useState<any>(null);
  const [filterApplicableTo, setFilterApplicableTo] = useState<string>('ALL');

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center"><Eye className="w-5 h-5 text-white" /></div>
          <div><h1 className="text-2xl font-bold text-gray-900">ISO 27701 — PIMS</h1>
            <p className="text-sm text-gray-500">Privacy Information Management System · Extensão ao ISO 27001</p></div>
        </div>
        <div className="flex gap-2">
          {['ALL','CONTROLLER','PROCESSOR'].map(f => (
            <button key={f} onClick={() => setFilterApplicableTo(f)} className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${filterApplicableTo === f ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}>
              {f === 'ALL' ? 'Todos' : APPLICABLE_TO[f]?.label}
            </button>
          ))}
        </div>
      </div>

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

      {editControl && (
        <EditModal
          control={editControl}
          onClose={() => setEditControl(null)}
          onSave={d => updateMut.mutate({ code: editControl.controlCode, data: d })}
        />
      )}
    </div>
  );
}
