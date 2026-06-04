'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientHubApi } from '@/lib/api';
import { Building2, Plus, AlertTriangle, CheckCircle, Clock, Loader2, X, ExternalLink, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const HEALTH_CONFIG = {
  GOOD:      { color: 'bg-green-100 text-green-700',  dot: 'bg-green-500',  label: 'Conforme' },
  ATTENTION: { color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500', label: 'Atenção' },
  CRITICAL:  { color: 'bg-red-100 text-red-700',      dot: 'bg-red-500 animate-pulse', label: 'Crítico' },
};

export default function ClientHubPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ clientSlug: '', clientName: '', role: 'MANAGER' });

  const { data, isLoading } = useQuery({ queryKey: ['client-hub'], queryFn: () => clientHubApi.getDashboard().then(r => r.data) });
  const addMutation    = useMutation({ mutationFn: (d: any) => clientHubApi.addClient(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-hub'] }); setShowAdd(false); setAddForm({ clientSlug: '', clientName: '', role: 'MANAGER' }); } });
  const removeMutation = useMutation({ mutationFn: (id: string) => clientHubApi.removeClient(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['client-hub'] }) });

  const clients: any[] = data?.clients || [];
  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-cyan-600 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1"><Building2 className="w-5 h-5 text-cyan-300" /><span className="text-cyan-200 text-xs font-medium uppercase tracking-widest">Hub Multi-Cliente</span></div>
            <h1 className="text-2xl font-bold">Client Hub</h1>
            <p className="text-cyan-200 text-sm mt-1">Gerir todos os clientes a partir de um único dashboard de consultoria</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-white text-cyan-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-cyan-50">
            <Plus className="w-4 h-4" /> Adicionar Cliente
          </button>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: 'Total Clientes', value: data?.total || 0 },
            { label: 'Necessitam Atenção', value: data?.critical || 0 },
            { label: 'Conformes', value: (data?.total || 0) - (data?.critical || 0) },
          ].map(s => (
            <div key={s.label} className="bg-white/15 rounded-xl p-3">
              <p className="text-3xl font-black">{s.value}</p>
              <p className="text-cyan-200 text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Client grid */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-cyan-600" /></div>
      ) : clients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16">
          <Building2 className="w-12 h-12 text-gray-200 mb-4" />
          <p className="text-gray-400 font-medium">Sem clientes no hub</p>
          <p className="text-gray-400 text-sm mt-1">Adicione organizações cliente para gestão centralizada</p>
          <button onClick={() => setShowAdd(true)} className="mt-4 flex items-center gap-2 bg-cyan-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-cyan-700">
            <Plus className="w-4 h-4" /> Adicionar primeiro cliente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map((client: any) => {
            const health = HEALTH_CONFIG[client.health as keyof typeof HEALTH_CONFIG] || HEALTH_CONFIG.GOOD;
            return (
              <div key={client.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center text-cyan-700 font-bold text-lg flex-shrink-0">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{client.name}</p>
                        <p className="text-xs text-gray-400">{client.industry || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className={cn('w-2 h-2 rounded-full flex-shrink-0', health.dot)} />
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', health.color)}>{health.label}</span>
                    </div>
                  </div>

                  {/* Alert stats */}
                  <div className="grid grid-cols-3 gap-2 text-center mt-4">
                    {[
                      { label: 'Tarefas atrasadas', value: client.overdueTasks, color: client.overdueTasks > 0 ? 'text-red-600' : 'text-gray-700' },
                      { label: 'Riscos altos', value: client.highRisks, color: client.highRisks > 0 ? 'text-orange-600' : 'text-gray-700' },
                      { label: 'CAPAs abertos', value: client.openCapas, color: client.openCapas > 0 ? 'text-amber-600' : 'text-gray-700' },
                    ].map(s => (
                      <div key={s.label} className="bg-gray-50 rounded-xl py-2">
                        <p className={cn('text-xl font-black', s.color)}>{s.value}</p>
                        <p className="text-[10px] text-gray-400 leading-tight">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-2">
                  <span className="text-xs text-gray-400">{client.plan || 'FREE'}</span>
                  <div className="flex-1" />
                  <button onClick={() => removeMutation.mutate(client.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <Link href={`/dashboard`} className="flex items-center gap-1 text-xs text-cyan-600 font-medium hover:underline">
                    Ver detalhes <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add client modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Adicionar Cliente</h2>
              <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                Introduza o slug ou nome da organização cliente. A organização deve já existir na plataforma.
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Slug da organização</label><input className={inp} value={addForm.clientSlug} onChange={e => setAddForm(p => ({ ...p, clientSlug: e.target.value }))} placeholder="ex: empresa-cliente-lda" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Ou nome da organização</label><input className={inp} value={addForm.clientName} onChange={e => setAddForm(p => ({ ...p, clientName: e.target.value }))} placeholder="Ex: Empresa Cliente Lda" /></div>
              <div className="flex gap-3">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
                <button onClick={() => addMutation.mutate(addForm)} disabled={(!addForm.clientSlug && !addForm.clientName) || addMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-cyan-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
                  {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Adicionar
                </button>
              </div>
              {addMutation.isError && <p className="text-xs text-red-600 text-center">Organização não encontrada. Verifique o slug ou nome.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
