'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { boardReportsApi } from '@/lib/api';
import { FileText, Plus, CheckCircle, Clock, Users, Download, Send, Loader2, Shield, X } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT:            { label: 'Rascunho',          color: 'bg-gray-100 text-gray-600'   },
  PENDING_APPROVAL: { label: 'Aguarda Aprovação', color: 'bg-yellow-100 text-yellow-700' },
  APPROVED:         { label: 'Aprovado',          color: 'bg-green-100 text-green-700'  },
  PUBLISHED:        { label: 'Publicado',         color: 'bg-blue-100 text-blue-700'    },
};

const SECTIONS = [
  { key: 'compliance_overview',  label: 'Visão Geral de Conformidade' },
  { key: 'risk_summary',         label: 'Sumário de Riscos' },
  { key: 'incident_overview',    label: 'Incidentes & CAPA' },
  { key: 'audit_results',        label: 'Resultados de Auditorias' },
  { key: 'vendor_risk',          label: 'Risco de Fornecedores' },
  { key: 'policy_status',        label: 'Estado de Políticas' },
  { key: 'nis2_compliance',      label: 'Conformidade NIS2' },
  { key: 'dora_compliance',      label: 'Conformidade DORA' },
  { key: 'gdpr_summary',         label: 'Resumo RGPD' },
  { key: 'management_actions',   label: 'Ações do Órgão de Gestão' },
];

export default function BoardReportsPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [newForm, setNewForm] = useState({ title: '', period: '', sections: SECTIONS.map(s => s.key) });
  const [signerForm, setSignerForm] = useState([{ name: '', email: '', role: '' }]);

  const { data: reports = [] } = useQuery({ queryKey: ['board-reports'], queryFn: () => boardReportsApi.list().then(r => r.data) });
  const { data: packData } = useQuery({ queryKey: ['board-pack', selected?.id], queryFn: () => selected ? boardReportsApi.packData(selected.id).then(r => r.data) : null, enabled: !!selected?.id });

  const createMutation = useMutation({ mutationFn: (d: any) => boardReportsApi.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['board-reports'] }); setShowNew(false); } });
  const requestSignoffMutation = useMutation({ mutationFn: ({ id, signers }: any) => boardReportsApi.requestSignoff(id, signers), onSuccess: () => qc.invalidateQueries({ queryKey: ['board-reports'] }) });

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-700 to-purple-800 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1"><Shield className="w-5 h-5 text-indigo-300" /><span className="text-indigo-200 text-xs font-medium uppercase tracking-widest">NIS2 Art. 20 · DORA Art. 5</span></div>
            <h1 className="text-2xl font-bold">Relatórios para o Órgão de Gestão</h1>
            <p className="text-indigo-200 text-sm mt-1">Board packs com aprovação digital — evidência de supervisão executiva</p>
          </div>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 bg-white text-indigo-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-50">
            <Plus className="w-4 h-4" /> Novo Relatório
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* List */}
        <div className="space-y-3">
          {(reports as any[]).length === 0 ? (
            <div className="bg-white rounded-2xl border p-8 text-center"><FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="text-gray-400 text-sm">Sem relatórios</p></div>
          ) : (reports as any[]).map((r: any) => (
            <button key={r.id} onClick={() => setSelected(r)}
              className={cn('w-full text-left bg-white rounded-2xl border shadow-sm p-4 transition-all hover:shadow-md', selected?.id === r.id ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-gray-100')}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{r.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{r.period}</p>
                </div>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_CONFIG[r.status]?.color || '')}>
                  {STATUS_CONFIG[r.status]?.label}
                </span>
              </div>
              {r.signoffs?.length > 0 && (
                <div className="flex items-center gap-1 mt-2">
                  <Users className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">{r.signoffs.filter((s: any) => s.signedAt).length}/{r.signoffs.length} assinaturas</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Detail */}
        {selected ? (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gray-50 border-b px-5 py-4 flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-900">{selected.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{selected.period}</p>
              </div>
              <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold', STATUS_CONFIG[selected.status]?.color || '')}>{STATUS_CONFIG[selected.status]?.label}</span>
            </div>

            <div className="p-5 space-y-5">
              {/* Pack data stats */}
              {packData && (
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Riscos Alto', value: packData.stats?.risks || 0, color: 'text-red-600 bg-red-50' },
                    { label: 'CAPAs Abertos', value: packData.stats?.openCapas || 0, color: 'text-orange-600 bg-orange-50' },
                    { label: 'Evidências Expirando', value: packData.stats?.evidenceExpiring || 0, color: 'text-amber-600 bg-amber-50' },
                    { label: 'Auditorias Concluídas', value: packData.stats?.completedAudits || 0, color: 'text-green-600 bg-green-50' },
                  ].map(s => (
                    <div key={s.label} className={cn('rounded-xl p-3 text-center', s.color.split(' ')[1])}>
                      <p className={cn('text-2xl font-black', s.color.split(' ')[0])}>{s.value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Signoffs */}
              {selected.signoffs?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assinaturas</p>
                  <div className="space-y-2">
                    {selected.signoffs.map((s: any) => (
                      <div key={s.id} className={cn('flex items-center gap-3 p-3 rounded-xl', s.signedAt ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-200')}>
                        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0', s.signedAt ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600')}>
                          {s.signedAt ? '✓' : s.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                          <p className="text-xs text-gray-500">{s.role} · {s.email}</p>
                        </div>
                        {s.signedAt ? (
                          <span className="text-xs text-green-600 font-medium">{formatDate(s.signedAt)}</span>
                        ) : (
                          <span className="text-xs text-gray-400">Pendente</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Request signoff */}
              {selected.status === 'DRAFT' && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-indigo-900">Solicitar aprovação do Órgão de Gestão</p>
                  {signerForm.map((signer, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2">
                      <input className={inp} value={signer.name} onChange={e => setSignerForm(p => p.map((s, j) => j === i ? { ...s, name: e.target.value } : s))} placeholder="Nome" />
                      <input className={inp} value={signer.email} onChange={e => setSignerForm(p => p.map((s, j) => j === i ? { ...s, email: e.target.value } : s))} placeholder="Email" />
                      <input className={inp} value={signer.role} onChange={e => setSignerForm(p => p.map((s, j) => j === i ? { ...s, role: e.target.value } : s))} placeholder="Cargo" />
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button onClick={() => setSignerForm(p => [...p, { name: '', email: '', role: '' }])} className="text-xs text-indigo-600 hover:underline">+ Adicionar signatário</button>
                    <button onClick={() => requestSignoffMutation.mutate({ id: selected.id, signers: signerForm.filter(s => s.name && s.email) })}
                      disabled={requestSignoffMutation.isPending}
                      className="ml-auto flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-semibold">
                      {requestSignoffMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Enviar para aprovação
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center py-20">
            <div className="text-center"><FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="text-gray-400 text-sm">Selecione um relatório</p></div>
          </div>
        )}
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Novo Board Pack</h2>
              <button onClick={() => setShowNew(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Título</label><input className={inp} value={newForm.title} onChange={e => setNewForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Relatório Trimestral Q2 2025" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Período</label><input className={inp} value={newForm.period} onChange={e => setNewForm(p => ({ ...p, period: e.target.value }))} placeholder="Ex: Q2 2025" /></div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Secções a incluir</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {SECTIONS.map(s => (
                    <label key={s.key} className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-xs transition-colors', newForm.sections.includes(s.key) ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-600')}>
                      <input type="checkbox" checked={newForm.sections.includes(s.key)} onChange={e => setNewForm(p => ({ ...p, sections: e.target.checked ? [...p.sections, s.key] : p.sections.filter(x => x !== s.key) }))} className="w-3.5 h-3.5" />
                      {s.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowNew(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
                <button onClick={() => createMutation.mutate({ ...newForm, sections: newForm.sections })} disabled={!newForm.title || createMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  Criar Relatório
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
