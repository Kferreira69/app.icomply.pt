'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { risksApi } from '@/lib/api';
import { Plus, AlertTriangle, Loader2, Grid3X3, Pencil } from 'lucide-react';
import { cn, getRiskColor, getRiskLabel, getStatusColor, formatDate, cleanFormData } from '@/lib/utils';
import { useForm } from 'react-hook-form';

const LIKELIHOOD_LABELS: Record<string, string> = {
  RARE: 'Raro', UNLIKELY: 'Improvável', POSSIBLE: 'Possível', LIKELY: 'Provável', ALMOST_CERTAIN: 'Quase Certo',
};
const IMPACT_LABELS: Record<string, string> = {
  NEGLIGIBLE: 'Negligível', MINOR: 'Menor', MODERATE: 'Moderado', MAJOR: 'Maior', CATASTROPHIC: 'Catastrófico',
};

function RiskHeatmap({ data }: { data: any }) {
  if (!data) return null;
  const impacts = ['NEGLIGIBLE', 'MINOR', 'MODERATE', 'MAJOR', 'CATASTROPHIC'];
  const likelihoods = ['ALMOST_CERTAIN', 'LIKELY', 'POSSIBLE', 'UNLIKELY', 'RARE'];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Grid3X3 className="w-5 h-5 text-gray-500" />
        Mapa de Calor de Riscos
      </h3>
      <div className="overflow-x-auto">
        <div className="min-w-[400px]">
          <div className="flex items-center mb-1">
            <div className="w-24 text-xs text-gray-400 text-right pr-2">Probabilidade ↓ / Impacto →</div>
            {impacts.map(i => (
              <div key={i} className="flex-1 text-center text-xs text-gray-500 font-medium px-1">
                {IMPACT_LABELS[i]?.slice(0, 3)}
              </div>
            ))}
          </div>
          {likelihoods.map((l, li) => (
            <div key={l} className="flex items-center mb-1">
              <div className="w-24 text-xs text-gray-500 text-right pr-2">{LIKELIHOOD_LABELS[l]?.slice(0, 6)}</div>
              {impacts.map((_, ii) => {
                const score = (5 - li) * (ii + 1);
                const count = data.matrix?.[5 - li]?.[ii + 1] || 0;
                const color = score >= 20 ? 'bg-red-500' : score >= 12 ? 'bg-orange-400' : score >= 6 ? 'bg-yellow-300' : 'bg-green-300';
                return (
                  <div key={ii} className={cn('flex-1 h-10 rounded m-0.5 flex items-center justify-center text-sm font-bold', color, count > 0 ? 'text-white shadow-inner' : 'opacity-30')}>
                    {count > 0 ? count : ''}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
        {[['bg-green-300', 'Baixo'], ['bg-yellow-300', 'Médio'], ['bg-orange-400', 'Alto'], ['bg-red-500', 'Crítico']].map(([c, l]) => (
          <div key={l} className="flex items-center gap-1"><div className={cn('w-3 h-3 rounded', c)} />{l}</div>
        ))}
      </div>
    </div>
  );
}

function NewRiskModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
  const createMutation = useMutation({
    mutationFn: (data: any) => risksApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['risks'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Registar Risco</h3>
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input {...register('title', { required: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Risco de acesso não autorizado..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <input {...register('category')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Segurança de Informação, Operacional..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea {...register('description')} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Probabilidade *</label>
              <select {...register('likelihood', { required: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
                {Object.entries(LIKELIHOOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Impacto *</label>
              <select {...register('impact', { required: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
                {Object.entries(IMPACT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plano de Mitigação</label>
            <textarea {...register('mitigationPlan')} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={createMutation.isPending} className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Registar Risco
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditRiskModal({ risk, onClose }: { risk: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      title: risk.title,
      category: risk.category || '',
      description: risk.description || '',
      likelihood: risk.likelihood,
      impact: risk.impact,
      mitigationPlan: risk.mitigationPlan || '',
      status: risk.status,
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => risksApi.update(risk.id, cleanFormData(data)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['risks'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Editar Risco</h3>
        <form onSubmit={handleSubmit(d => updateMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input {...register('title', { required: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <input {...register('category')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select {...register('status')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
                {['IDENTIFIED', 'ASSESSED', 'MITIGATED', 'ACCEPTED', 'CLOSED'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea {...register('description')} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Probabilidade</label>
              <select {...register('likelihood')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
                {Object.entries(LIKELIHOOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Impacto</label>
              <select {...register('impact')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
                {Object.entries(IMPACT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plano de Mitigação</label>
            <textarea {...register('mitigationPlan')} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-none" />
          </div>
          {updateMutation.isError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              Erro ao guardar. Tente novamente.
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={updateMutation.isPending} className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
              {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RisksPage() {
  const [showNew, setShowNew] = useState(false);
  const [editingRisk, setEditingRisk] = useState<any | null>(null);
  const [view, setView] = useState<'list' | 'heatmap'>('list');

  const { data, isLoading } = useQuery({
    queryKey: ['risks'],
    queryFn: () => risksApi.list({ limit: 100 }).then(r => r.data),
  });

  const { data: heatmap } = useQuery({
    queryKey: ['risks', 'heatmap'],
    queryFn: () => risksApi.heatmap().then(r => r.data),
  });

  const risks = data?.data || [];
  const summary = heatmap?.summary || {};

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {[
            { value: 'list', label: 'Lista' },
            { value: 'heatmap', label: 'Heatmap' },
          ].map(v => (
            <button
              key={v.value}
              onClick={() => setView(v.value as any)}
              className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                view === v.value ? 'bg-primary text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50')}
            >
              {v.label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Registar Risco
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Crítico', count: summary.critical ?? 0, color: 'border-red-500 bg-red-50 text-red-700' },
          { label: 'Alto', count: summary.high ?? 0, color: 'border-orange-500 bg-orange-50 text-orange-700' },
          { label: 'Médio', count: summary.medium ?? 0, color: 'border-yellow-500 bg-yellow-50 text-yellow-700' },
          { label: 'Baixo', count: summary.low ?? 0, color: 'border-green-500 bg-green-50 text-green-700' },
        ].map(s => (
          <div key={s.label} className={cn('bg-white rounded-xl border-2 shadow-sm p-4 text-center', s.color)}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-sm font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {view === 'heatmap' && <RiskHeatmap data={heatmap} />}

      {view === 'list' && (
        isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Risco', 'Categoria', 'Probabilidade', 'Impacto', 'Nível', 'Estado', 'Prazo', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {risks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">Nenhum risco registado</p>
                    </td>
                  </tr>
                ) : risks.map((r: any) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{r.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{r.description}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{r.category || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{LIKELIHOOD_LABELS[r.likelihood]}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{IMPACT_LABELS[r.impact]}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-1 rounded-full font-semibold', getRiskColor(r.inherentScore))}>
                        {getRiskLabel(r.inherentScore)} ({r.inherentScore})
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-1 rounded-full', getStatusColor(r.status))}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(r.dueDate)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setEditingRisk(r)} className="p-1 text-gray-300 hover:text-primary rounded transition-colors" title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {showNew && <NewRiskModal onClose={() => setShowNew(false)} />}
      {editingRisk && <EditRiskModal risk={editingRisk} onClose={() => setEditingRisk(null)} />}
    </div>
  );
}
