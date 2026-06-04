'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doraRegisterApi } from '@/lib/api';
import {
  Database, Plus, Download, AlertTriangle, CheckCircle, Clock,
  Loader2, Edit2, Trash2, ChevronRight, Building2, Globe, Shield,
  X, Save,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

const SERVICE_TYPES = ['ICT_SERVICES','CLOUD','SAAS','DATA_CENTER','NETWORK','SOFTWARE','OTHER'];
const SUBST_LABELS: Record<string, string> = { EASY: 'Fácil', MODERATE: 'Moderado', DIFFICULT: 'Difícil', IMPOSSIBLE: 'Impossível' };
const SUBST_COLORS: Record<string, string> = { EASY: 'text-green-600', MODERATE: 'text-yellow-600', DIFFICULT: 'text-orange-600', IMPOSSIBLE: 'text-red-600' };

const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all';

function EntryModal({ entry, onClose }: { entry?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!entry?.id;
  const [form, setForm] = useState(entry || {
    providerName: '', providerLei: '', providerCountry: 'PT', serviceType: 'CLOUD',
    serviceDescription: '', contractRef: '', contractStart: '', contractEnd: '',
    isCritical: false, substitutability: 'MODERATE', concentrationRisk: false,
    dataTypes: [], dataLocations: [], exitStrategy: '', notes: '',
  });
  const s = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: (d: any) => isEdit ? doraRegisterApi.update(entry.id, d) : doraRegisterApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dora-register'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Editar Fornecedor ICT' : 'Novo Fornecedor ICT'}</h2>
            <p className="text-xs text-gray-500">DORA Art. 28 — Register of Information</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Critical badge */}
          <div className={cn('flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all', form.isCritical ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300')} onClick={() => s('isCritical', !form.isCritical)}>
            <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0', form.isCritical ? 'bg-red-500 border-red-500' : 'border-gray-400')}>
              {form.isCritical && <CheckCircle className="w-3.5 h-3.5 text-white" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Função Crítica ou Importante</p>
              <p className="text-xs text-gray-500">Marque se este fornecedor suporta funções críticas ou importantes (DORA Art. 28)</p>
            </div>
            {form.isCritical && <span className="ml-auto text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-lg">CRÍTICO</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nome do Fornecedor *</label>
              <input className={inp} value={form.providerName} onChange={e => s('providerName', e.target.value)} placeholder="Ex: Microsoft Ireland Operations Ltd" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">LEI Code</label>
              <input className={inp + ' font-mono text-xs'} value={form.providerLei || ''} onChange={e => s('providerLei', e.target.value)} placeholder="XXXXXXXXXXXXXXXXXX" maxLength={20} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">País do Fornecedor</label>
              <input className={inp} value={form.providerCountry} onChange={e => s('providerCountry', e.target.value)} placeholder="IE" maxLength={2} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo de Serviço</label>
              <select className={inp} value={form.serviceType} onChange={e => s('serviceType', e.target.value)}>
                {SERVICE_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Substituibilidade</label>
              <select className={inp} value={form.substitutability || 'MODERATE'} onChange={e => s('substitutability', e.target.value)}>
                {Object.entries(SUBST_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Início do Contrato</label>
              <input type="date" className={inp} value={form.contractStart?.split('T')[0] || ''} onChange={e => s('contractStart', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fim do Contrato</label>
              <input type="date" className={inp} value={form.contractEnd?.split('T')[0] || ''} onChange={e => s('contractEnd', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Descrição do Serviço</label>
              <textarea className={inp + ' resize-none'} rows={2} value={form.serviceDescription || ''} onChange={e => s('serviceDescription', e.target.value)} placeholder="Descreva os serviços ICT prestados..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Referência do Contrato</label>
              <input className={inp} value={form.contractRef || ''} onChange={e => s('contractRef', e.target.value)} placeholder="CTR-2025-001" />
            </div>
            <div className={cn('flex items-center gap-2 cursor-pointer p-3 rounded-xl border', form.concentrationRisk ? 'border-amber-400 bg-amber-50' : 'border-gray-200')} onClick={() => s('concentrationRisk', !form.concentrationRisk)}>
              <div className={cn('w-5 h-5 rounded border-2', form.concentrationRisk ? 'bg-amber-500 border-amber-500' : 'border-gray-400')} />
              <div>
                <p className="text-xs font-semibold text-gray-900">Risco de Concentração</p>
                <p className="text-[10px] text-gray-400">Dependência excessiva deste fornecedor</p>
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Estratégia de Saída</label>
              <textarea className={inp + ' resize-none'} rows={2} value={form.exitStrategy || ''} onChange={e => s('exitStrategy', e.target.value)} placeholder="Descreva a estratégia de saída/migração se este fornecedor deixar de prestar serviços..." />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 font-medium">Cancelar</button>
            <button onClick={() => mutation.mutate(form)} disabled={!form.providerName || mutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? 'Guardar alterações' : 'Adicionar fornecedor'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DoraRegisterPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'EXPIRING'>('ALL');

  const { data: dash, isLoading } = useQuery({
    queryKey: ['dora-register'],
    queryFn: () => doraRegisterApi.dashboard().then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => doraRegisterApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dora-register'] }),
  });

  const entries: any[] = dash?.entries || [];
  const filtered = entries.filter(e => {
    if (filter === 'CRITICAL') return e.isCritical;
    if (filter === 'EXPIRING') {
      const in90 = new Date(Date.now() + 90 * 86400000);
      return e.contractEnd && new Date(e.contractEnd) <= in90 && new Date(e.contractEnd) >= new Date();
    }
    return true;
  });

  const exportCsv = async () => {
    const res = await doraRegisterApi.exportCsv();
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'dora-register.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-700 to-indigo-800 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-5 h-5 text-blue-300" />
              <span className="text-blue-200 text-xs font-medium uppercase tracking-widest">DORA Art. 28</span>
            </div>
            <h1 className="text-2xl font-bold">Register of Information</h1>
            <p className="text-blue-200 text-sm mt-1">Registo de fornecedores de serviços ICT de terceiros</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCsv} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
            <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 bg-white text-blue-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors">
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>
        </div>
        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Total', value: dash?.total || 0, icon: Database, color: 'bg-white/20' },
            { label: 'Críticos', value: dash?.critical || 0, icon: AlertTriangle, color: 'bg-red-500/30' },
            { label: 'Ativos', value: dash?.active || 0, icon: CheckCircle, color: 'bg-green-500/30' },
            { label: 'A expirar (90d)', value: dash?.expiring || 0, icon: Clock, color: 'bg-amber-500/30' },
          ].map(k => (
            <div key={k.label} className={cn('rounded-xl p-3', k.color)}>
              <p className="text-3xl font-bold text-white">{k.value}</p>
              <p className="text-blue-200 text-xs mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['ALL', 'CRITICAL', 'EXPIRING'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              filter === f ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300')}>
            {f === 'ALL' ? 'Todos' : f === 'CRITICAL' ? '🔴 Críticos' : '⏰ A expirar'}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-500 self-center">{filtered.length} fornecedores</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Database className="w-12 h-12 text-gray-200 mb-4" />
            <p className="text-gray-400 font-medium">Sem fornecedores registados</p>
            <p className="text-gray-400 text-sm mt-1">Adicione os fornecedores de serviços ICT de terceiros</p>
            <button onClick={() => setShowForm(true)} className="mt-4 flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Adicionar primeiro fornecedor
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Fornecedor', 'Tipo', 'País', 'Contrato', 'Substituibilidade', 'Estado', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e: any) => (
                <tr key={e.id} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {e.isCritical && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="Crítico" />}
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{e.providerName}</p>
                        {e.providerLei && <p className="text-xs text-gray-400 font-mono">{e.providerLei}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-lg">{e.serviceType}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-sm text-gray-600">{e.providerCountry}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {e.contractEnd ? (
                      <span className={cn(new Date(e.contractEnd) < new Date(Date.now() + 90 * 86400000) ? 'text-amber-600 font-medium' : '')}>
                        → {formatDate(e.contractEnd)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-medium', SUBST_COLORS[e.substitutability] || 'text-gray-500')}>
                      {SUBST_LABELS[e.substitutability] || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-1 rounded-full font-medium',
                      e.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                      e.status === 'TERMINATED' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700')}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditing(e); setShowForm(true); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(e.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(showForm || editing) && <EntryModal entry={editing} onClose={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}
