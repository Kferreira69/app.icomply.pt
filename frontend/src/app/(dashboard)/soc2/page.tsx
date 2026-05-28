'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { soc2Api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Award, CheckCircle2, XCircle, AlertCircle, Circle, MinusCircle, Pencil, X,
} from 'lucide-react';

const CATEGORIES: Record<string, { label: string; desc: string; color: string; bg: string }> = {
  CC: { label: 'Common Criteria', desc: 'CC — Segurança (obrigatório)', color: 'text-blue-700', bg: 'bg-blue-50' },
  A:  { label: 'Availability',    desc: 'A — Disponibilidade',           color: 'text-green-700', bg: 'bg-green-50' },
  PI: { label: 'Processing Integrity', desc: 'PI — Integridade do Processamento', color: 'text-purple-700', bg: 'bg-purple-50' },
  C:  { label: 'Confidentiality', desc: 'C — Confidencialidade',        color: 'text-orange-700', bg: 'bg-orange-50' },
  P:  { label: 'Privacy',         desc: 'P — Privacidade',              color: 'text-pink-700',   bg: 'bg-pink-50' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  NOT_ASSESSED:   { label: 'Não Avaliado',   color: 'text-gray-500',   bg: 'bg-gray-100',   icon: Circle },
  NON_COMPLIANT:  { label: 'Não Conforme',   color: 'text-red-600',    bg: 'bg-red-100',    icon: XCircle },
  PARTIAL:        { label: 'Parcial',         color: 'text-orange-500', bg: 'bg-orange-100', icon: AlertCircle },
  COMPLIANT:      { label: 'Conforme',        color: 'text-green-600',  bg: 'bg-green-100',  icon: CheckCircle2 },
  NOT_APPLICABLE: { label: 'N/A',             color: 'text-gray-300',   bg: 'bg-gray-50',    icon: MinusCircle },
};

function EditModal({ criterion, onClose, onSave }: { criterion: any; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({ status: criterion.status, evidence: criterion.evidence ?? '', notes: criterion.notes ?? '' });
  const s = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-5 border-b flex items-start justify-between">
          <div>
            <span className="text-xs font-mono text-gray-400">{criterion.criterionCode}</span>
            <h2 className="text-sm font-semibold text-gray-900 mt-0.5 max-w-md">{criterion.title}</h2>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          {criterion.description && <p className="text-xs text-gray-500 bg-gray-50 rounded p-3">{criterion.description}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado de Conformidade</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(STATUS_CONFIG).map(([k, v]) => { const Icon = v.icon; return (
                <button key={k} onClick={() => s('status', k)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all ${form.status === k ? `${v.bg} border-current font-medium ${v.color}` : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  <Icon className={`w-3.5 h-3.5 ${form.status === k ? v.color : 'text-gray-400'}`} />{v.label}
                </button>); })}
            </div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Evidência</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={3} value={form.evidence} onChange={e => s('evidence', e.target.value)} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.notes} onChange={e => s('notes', e.target.value)} /></div>
        </div>
        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={() => onSave({ status: form.status, evidence: form.evidence || null, notes: form.notes || null })}>Guardar</Button>
        </div>
      </div>
    </div>
  );
}

export default function Soc2Page() {
  const qc = useQueryClient();
  const [editCriterion, setEditCriterion] = useState<any>(null);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['soc2-dashboard'],
    queryFn: () => soc2Api.dashboard().then(r => r.data),
  });

  const updateMut = useMutation({
    mutationFn: ({ code, data }: { code: string; data: any }) => soc2Api.updateCriterion(code, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['soc2-dashboard'] }); setEditCriterion(null); },
  });

  const allCriteria = dashboard?.criteria ?? [];
  const byCategory: Record<string, any[]> = {};
  for (const c of allCriteria) {
    if (!byCategory[c.category]) byCategory[c.category] = [];
    byCategory[c.category].push(c);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center"><Award className="w-5 h-5 text-white" /></div>
        <div><h1 className="text-2xl font-bold text-gray-900">SOC 2 Trust Service Criteria</h1>
          <p className="text-sm text-gray-500">AICPA SOC 2 — Type I / Type II Readiness</p></div>
      </div>

      {isLoading ? <div className="text-center py-16 text-gray-400">A carregar...</div> : !dashboard ? null : (
        <>
          {/* Score cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-indigo-50 rounded-xl p-4">
              <div className="text-xs font-medium text-indigo-600 uppercase mb-2">Score Global</div>
              <div className="text-3xl font-bold text-indigo-700">{dashboard.score ?? 0}%</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <div className="text-xs font-medium text-green-600 uppercase mb-2">Conformes</div>
              <div className="text-3xl font-bold text-green-700">{dashboard.byStatus?.COMPLIANT ?? 0}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs font-medium text-gray-600 uppercase mb-2">Total Critérios</div>
              <div className="text-3xl font-bold text-gray-700">{dashboard.total ?? 0}</div>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="grid grid-cols-5 gap-3">
            {Object.entries(CATEGORIES).map(([cat, cfg]) => {
              const items = byCategory[cat] || [];
              const compliant = items.filter((c: any) => c.status === 'COMPLIANT').length;
              const pct = items.length > 0 ? Math.round((compliant / items.length) * 100) : 0;
              return (
                <div key={cat} className={`${cfg.bg} rounded-xl p-3 text-center`}>
                  <div className={`text-sm font-bold ${cfg.color}`}>{cat}</div>
                  <div className={`text-xs ${cfg.color} mb-2`}>{cfg.label}</div>
                  <div className={`text-2xl font-bold ${cfg.color}`}>{pct}%</div>
                  <div className={`text-xs ${cfg.color}`}>{compliant}/{items.length}</div>
                </div>
              );
            })}
          </div>

          {/* Criteria by category */}
          {Object.entries(CATEGORIES).map(([cat, cfg]) => {
            const items = byCategory[cat] || [];
            if (items.length === 0) return null;
            return (
              <div key={cat} className="bg-white rounded-xl border overflow-hidden">
                <div className={`px-4 py-3 ${cfg.bg} border-b flex items-center gap-2`}>
                  <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.desc}</span>
                  <span className={`text-xs ${cfg.color}`}>({items.length} critérios)</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {items.map((c: any) => {
                    const st = STATUS_CONFIG[c.status] || STATUS_CONFIG.NOT_ASSESSED;
                    const StatusIcon = st.icon;
                    return (
                      <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 group">
                        <span className="text-xs font-mono text-gray-500 w-16 flex-shrink-0">{c.criterionCode}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
                          {c.evidence && <p className="text-xs text-gray-500 truncate">✓ {c.evidence}</p>}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium flex-shrink-0 ${st.bg} ${st.color}`}>
                          <StatusIcon className="w-3 h-3" />{st.label}
                        </span>
                        <button onClick={() => setEditCriterion(c)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded text-gray-400 flex-shrink-0">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}

      {editCriterion && (
        <EditModal
          criterion={editCriterion}
          onClose={() => setEditCriterion(null)}
          onSave={d => updateMut.mutate({ code: editCriterion.criterionCode, data: d })}
        />
      )}
    </div>
  );
}
