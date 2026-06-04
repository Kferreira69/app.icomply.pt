'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auditorPortalApi } from '@/lib/api';
import { Shield, Plus, Trash2, Copy, CheckCircle, Loader2, Clock, X } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

const PERMISSIONS = ['EVIDENCE','CONTROLS','FINDINGS','POLICIES','RISKS'];

export default function AuditorSessionsPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({ auditorName: '', auditorFirm: '', auditorEmail: '', permissions: ['EVIDENCE','CONTROLS','FINDINGS','POLICIES'], expiresAt: '', notes: '' });

  const { data: sessions = [] } = useQuery({ queryKey: ['auditor-sessions'], queryFn: () => auditorPortalApi.listSessions().then(r => r.data) });
  const createMutation = useMutation({ mutationFn: (d: any) => auditorPortalApi.createSession(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['auditor-sessions'] }); setShowNew(false); } });
  const deactivateMutation = useMutation({ mutationFn: (id: string) => auditorPortalApi.deactivate(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['auditor-sessions'] }) });

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/auditor/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token); setTimeout(() => setCopied(null), 2000);
  };

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none';

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-slate-700 to-gray-900 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1"><Shield className="w-5 h-5 text-gray-300" /><span className="text-gray-400 text-xs font-medium uppercase tracking-widest">Auditoria Externa</span></div>
            <h1 className="text-2xl font-bold">Portal de Auditoria</h1>
            <p className="text-gray-300 text-sm mt-1">Crie acessos seguros e limitados para auditores externos</p>
          </div>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 bg-white text-gray-900 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-100">
            <Plus className="w-4 h-4" /> Criar Acesso
          </button>
        </div>
      </div>

      {(sessions as any[]).length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16">
          <Shield className="w-12 h-12 text-gray-200 mb-4" />
          <p className="text-gray-400 font-medium">Sem sessões de auditoria</p>
          <button onClick={() => setShowNew(true)} className="mt-4 flex items-center gap-2 bg-gray-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-900">
            <Plus className="w-4 h-4" /> Criar primeiro acesso
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {(sessions as any[]).map((s: any) => (
            <div key={s.id} className={cn('bg-white rounded-2xl border shadow-sm p-5', s.isActive ? 'border-gray-100' : 'border-gray-200 opacity-60')}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', s.isActive ? 'bg-green-500' : 'bg-gray-300')} />
                    <p className="font-semibold text-gray-900">{s.auditorName}</p>
                    {s.auditorFirm && <span className="text-xs text-gray-400">· {s.auditorFirm}</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 ml-4">{s.auditorEmail}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3 ml-4">
                    {s.permissions?.map((p: string) => (
                      <span key={p} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{p.toLowerCase()}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Expira</p>
                    <p className="text-xs font-medium text-gray-700">{formatDate(s.expiresAt)}</p>
                  </div>
                  <button onClick={() => copyLink(s.token)} className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors', copied === s.token ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}>
                    {copied === s.token ? <><CheckCircle className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar link</>}
                  </button>
                  {s.isActive && (
                    <button onClick={() => deactivateMutation.mutate(s.id)} className="p-2 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              {s.requests?.length > 0 && (
                <div className="mt-3 ml-4 flex items-center gap-2 text-xs text-amber-600">
                  <Clock className="w-3.5 h-3.5" /> {s.requests.filter((r: any) => r.status === 'OPEN').length} pedidos por responder
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Criar Acesso de Auditor</h2>
              <button onClick={() => setShowNew(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {[{ label: 'Nome do auditor *', key: 'auditorName', ph: 'Ex: Maria Santos' }, { label: 'Firma de auditoria', key: 'auditorFirm', ph: 'Ex: Ernst & Young Portugal' }, { label: 'Email *', key: 'auditorEmail', ph: 'marta.santos@ey.com', type: 'email' }].map(f => (
                <div key={f.key}><label className="block text-xs font-semibold text-gray-600 mb-1.5">{f.label}</label><input type={f.type || 'text'} className={inp} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.ph} /></div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Permissões de acesso</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {PERMISSIONS.map(p => (
                    <label key={p} className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-xs font-medium', form.permissions.includes(p) ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-500')}>
                      <input type="checkbox" checked={form.permissions.includes(p)} onChange={e => setForm(pr => ({ ...pr, permissions: e.target.checked ? [...pr.permissions, p] : pr.permissions.filter(x => x !== p) }))} className="w-3.5 h-3.5" />
                      {p.toLowerCase()}
                    </label>
                  ))}
                </div>
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Expiração do acesso</label><input type="date" className={inp} value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))} /></div>
              <div className="flex gap-3">
                <button onClick={() => setShowNew(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
                <button onClick={() => createMutation.mutate(form)} disabled={!form.auditorName || !form.auditorEmail || createMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-800 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-gray-900">
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  Criar + enviar convite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
