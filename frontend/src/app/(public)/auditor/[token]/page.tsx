'use client';

import { useState, useEffect } from 'react';
import { auditorPortalApi } from '@/lib/api';
import { Shield, FileText, Loader2, AlertCircle, CheckCircle, MessageSquare, Download, Search, ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function AuditorPortalPage({ params }: { params: { token: string } }) {
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'evidence' | 'controls' | 'findings' | 'policies' | 'requests'>('evidence');
  const [search, setSearch]     = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm] = useState({ subject: '', message: '', type: 'CLARIFICATION' });

  useEffect(() => {
    auditorPortalApi.getPortal(params.token)
      .then((d: any) => {
        if (d?.statusCode >= 400 || d?.error) setError(d.message || 'Acesso inválido');
        else setData(d);
        setLoading(false);
      })
      .catch(() => { setError('Erro de ligação'); setLoading(false); });
  }, [params.token]);

  const submitRequest = async () => {
    if (!requestForm.subject) return;
    await auditorPortalApi.createRequest(params.token, requestForm);
    setShowRequestForm(false);
    setRequestForm({ subject: '', message: '', type: 'CLARIFICATION' });
    // Refresh
    const d: any = await auditorPortalApi.getPortal(params.token);
    setData(d);
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-10 max-w-md text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-900 mb-2">Acesso não autorizado</h2>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    </div>
  );

  const session = data?.session;
  const evid    = data?.data?.evidence || [];
  const ctrls   = data?.data?.controls || [];
  const finds   = data?.data?.findings || [];
  const pols    = data?.data?.policies || [];
  const requests = data?.requests || [];
  const perms: string[] = session?.permissions || [];

  const tabs = [
    { key: 'evidence',  label: `Evidências (${evid.length})`,        show: perms.includes('EVIDENCE')  },
    { key: 'controls',  label: `Controlos (${ctrls.length})`,         show: perms.includes('CONTROLS')  },
    { key: 'findings',  label: `Findings (${finds.length})`,          show: perms.includes('FINDINGS')  },
    { key: 'policies',  label: `Políticas (${pols.length})`,          show: perms.includes('POLICIES')  },
    { key: 'requests',  label: `Pedidos (${requests.length})`,        show: true },
  ].filter(t => t.show);

  const filterBySearch = (items: any[], fields: string[]) =>
    !search ? items : items.filter(item => fields.some(f => String(item[f] || '').toLowerCase().includes(search.toLowerCase())));

  const STATUS_COLORS: Record<string, string> = { APPROVED: 'bg-green-100 text-green-700', PENDING: 'bg-yellow-100 text-yellow-700', REJECTED: 'bg-red-100 text-red-700', IMPLEMENTED: 'bg-green-100 text-green-700', PARTIAL: 'bg-yellow-100 text-yellow-700', GAP: 'bg-red-100 text-red-700' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center"><Shield className="w-5 h-5 text-white" /></div>
            <div>
              <p className="text-xs text-gray-500">Portal de Auditoria — iComply</p>
              <h1 className="text-sm font-bold text-gray-900">
                {session?.auditorName}{session?.auditorFirm && <span className="text-gray-400"> · {session.auditorFirm}</span>}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Acesso válido até {formatDate(session?.expiresAt)}</span>
            <button onClick={() => setShowRequestForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
              <MessageSquare className="w-4 h-4" /> Novo Pedido
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">
        {/* Permissions summary */}
        <div className="flex flex-wrap gap-2">
          {perms.map(p => (
            <span key={p} className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
              <CheckCircle className="w-3 h-3" /> {p.toLowerCase()}
            </span>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none shadow-sm" placeholder="Pesquisar em todos os dados..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
              className={cn('flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-colors', activeTab === tab.key ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50')}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {activeTab === 'evidence' && (
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b"><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Título</th><th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th><th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Data</th><th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ação</th></tr></thead>
              <tbody>
                {filterBySearch(evid, ['title']).map((e: any) => (
                  <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{e.title}</td>
                    <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[e.status] || 'bg-gray-100 text-gray-600')}>{e.status}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(e.createdAt)}</td>
                    <td className="px-4 py-3">{e.s3Url && <a href={e.s3Url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline"><Download className="w-3.5 h-3.5" /> Ver</a>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'controls' && (
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b"><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Código</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Controlo</th><th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tema</th></tr></thead>
              <tbody>
                {filterBySearch(ctrls, ['title','controlCode','theme']).map((c: any) => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{c.controlCode}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{c.title}</td>
                    <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-600')}>{c.status}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{c.theme}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'findings' && (
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b"><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Finding</th><th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Severidade</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Auditoria</th></tr></thead>
              <tbody>
                {filterBySearch(finds, ['title','description']).map((f: any) => (
                  <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{f.title || f.description?.slice(0, 80)}</td>
                    <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', f.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : f.severity === 'HIGH' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600')}>{f.severity}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{f.audit?.title || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'policies' && (
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b"><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Política</th><th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Categoria</th><th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Versão</th><th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Data</th></tr></thead>
              <tbody>
                {filterBySearch(pols, ['title','category']).map((p: any) => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.title}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{p.category}</td>
                    <td className="px-4 py-3 text-xs text-center text-gray-500">v{p.version}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'requests' && (
            <div className="p-5 space-y-3">
              {requests.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Sem pedidos ainda</div>
              ) : requests.map((r: any) => (
                <div key={r.id} className={cn('p-4 rounded-xl border', r.status === 'RESPONDED' ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-200')}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{r.subject}</p>
                      {r.message && <p className="text-xs text-gray-600 mt-1">{r.message}</p>}
                    </div>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0', r.status === 'RESPONDED' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600')}>{r.status}</span>
                  </div>
                  {r.response && <div className="mt-3 bg-white border border-green-200 rounded-lg p-3 text-sm text-gray-700"><span className="text-xs font-semibold text-green-600 block mb-1">Resposta:</span>{r.response}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Request form modal */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Novo Pedido</h2>
              <button onClick={() => setShowRequestForm(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo</label>
                <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" value={requestForm.type} onChange={e => setRequestForm(p => ({ ...p, type: e.target.value }))}>
                  <option value="CLARIFICATION">Esclarecimento</option>
                  <option value="EVIDENCE_REQUEST">Pedido de Evidência</option>
                  <option value="FINDING">Finding</option>
                </select>
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Assunto *</label><input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" value={requestForm.subject} onChange={e => setRequestForm(p => ({ ...p, subject: e.target.value }))} /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Mensagem</label><textarea className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none" rows={3} value={requestForm.message} onChange={e => setRequestForm(p => ({ ...p, message: e.target.value }))} /></div>
              <div className="flex gap-3">
                <button onClick={() => setShowRequestForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
                <button onClick={submitRequest} disabled={!requestForm.subject} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
                  <MessageSquare className="w-4 h-4" /> Enviar pedido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
