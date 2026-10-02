'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Inbox, Mail, Building2, Phone, ExternalLink, AlertCircle, Trash2 } from 'lucide-react';
import { leadsApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED'] as const;
const STATUS_LABEL: Record<string, string> = { NEW: 'Novo', CONTACTED: 'Contactado', QUALIFIED: 'Qualificado', CLOSED: 'Fechado' };
const STATUS_TONE: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700', CONTACTED: 'bg-amber-100 text-amber-700',
  QUALIFIED: 'bg-green-100 text-green-700', CLOSED: 'bg-gray-100 text-gray-600',
};
const TYPE_LABEL: Record<string, string> = {
  DEMO: 'Demonstração', CONTACT: 'Contacto', FEATURE_REQUEST: 'Sugestão de funcionalidade', NEWSLETTER: 'Novidades',
};

interface Lead {
  id: string; type: string; name: string; email: string; company?: string | null; role?: string | null;
  phone?: string | null; domains: string[]; message?: string | null; sourceUrl?: string | null;
  status: string; notes?: string | null; createdAt: string;
}

export default function LeadsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>('');
  const [type, setType] = useState<string>('');

  const { data, isLoading, error } = useQuery<{ items: Lead[]; counts: Record<string, number> }>({
    queryKey: ['backoffice-leads', status, type],
    queryFn: () => leadsApi.list({ status: status || undefined, type: type || undefined }).then(r => r.data),
  });

  const update = useMutation({
    mutationFn: ({ id, ...body }: { id: string; status?: string; notes?: string }) => leadsApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backoffice-leads'] }),
  });

  const erase = useMutation({
    mutationFn: ({ id, email, all }: { id: string; email: string; all: boolean }) => (all ? leadsApi.removeByEmail(email) : leadsApi.remove(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backoffice-leads'] }),
  });

  if (error) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center text-gray-600">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
        Sem acesso: esta página é exclusiva do backoffice da Contemporary Constellation.
      </div>
    );
  }

  const counts = data?.counts ?? {};
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Inbox className="w-5 h-5" /></div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Leads do site</h1>
          <p className="text-sm text-gray-500">Pedidos de demonstração, contactos e sugestões de funcionalidades vindos de icomply.pt. Os leads são apagados automaticamente 24 meses após a última atividade, salvo se a pessoa for utilizadora ou contacto de um cliente.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={() => setStatus('')} className={cn('px-3 py-1.5 rounded-full text-xs font-medium border', status === '' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200')}>
          Todos
        </button>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatus(s)} className={cn('px-3 py-1.5 rounded-full text-xs font-medium border', status === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200')}>
            {STATUS_LABEL[s]} {counts[s] ? `(${counts[s]})` : ''}
          </button>
        ))}
        <select value={type} onChange={e => setType(e.target.value)} className="ml-auto text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
          <option value="">Todos os tipos</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {isLoading && <p className="text-sm text-gray-500">A carregar…</p>}
      {!isLoading && !data?.items.length && <p className="text-sm text-gray-500 py-10 text-center">Ainda não há leads com este filtro.</p>}

      <div className="space-y-3">
        {data?.items.map(l => (
          <div key={l.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-gray-900">{l.name}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{TYPE_LABEL[l.type] ?? l.type}</span>
              <span className="text-xs text-gray-400">{new Date(l.createdAt).toLocaleString('pt-PT')}</span>
              <select
                value={l.status}
                onChange={e => update.mutate({ id: l.id, status: e.target.value })}
                className={cn('ml-auto text-xs font-medium rounded-full px-2.5 py-1 border-0', STATUS_TONE[l.status])}
              >
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
              <button title="Apagar este lead (RGPD)" className="p-1.5 rounded hover:bg-red-50 text-red-500"
                onClick={() => { if (confirm(`Apagar o lead de ${l.name}? Esta ação não pode ser desfeita.`)) erase.mutate({ id: l.id, email: l.email, all: false }); }}>
                <Trash2 className="w-4 h-4" />
              </button>
              <button title="Apagar todos os leads deste email (pedido de apagamento RGPD)" className="text-[11px] text-red-500 hover:underline"
                onClick={() => { if (confirm(`Apagar TODOS os leads de ${l.email}?`)) erase.mutate({ id: l.id, email: l.email, all: true }); }}>
                apagar tudo deste email
              </button>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
              <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1 hover:text-blue-600"><Mail className="w-3.5 h-3.5" />{l.email}</a>
              {l.company && <span className="inline-flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{l.company}{l.role ? ` · ${l.role}` : ''}</span>}
              {l.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{l.phone}</span>}
              {l.sourceUrl && <span className="inline-flex items-center gap-1 text-gray-400"><ExternalLink className="w-3.5 h-3.5" />{l.sourceUrl}</span>}
            </div>
            {l.domains.length > 0 && <p className="text-xs text-gray-500">Interesse: {l.domains.join(', ')}</p>}
            {l.message && <p className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{l.message}</p>}
            <textarea
              defaultValue={l.notes ?? ''}
              placeholder="Notas internas…"
              rows={1}
              onBlur={e => { if ((e.target.value || '') !== (l.notes ?? '')) update.mutate({ id: l.id, notes: e.target.value }); }}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
