'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { webhooksApi } from '@/lib/api';
import {
  Webhook, Plus, Trash2, Edit2, CheckCircle2, XCircle, Loader2,
  Copy, RefreshCw, Activity,
} from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';

const EVENT_GROUPS: Record<string, string[]> = {
  'Riscos':       ['risk.created', 'risk.high', 'risk.treatment_updated'],
  'Tarefas':      ['task.overdue', 'task.completed'],
  'CAPA':         ['capa.overdue', 'capa.completed'],
  'Evidências':   ['evidence.expiring', 'evidence.approved'],
  'Auditorias':   ['audit.started', 'audit.completed', 'finding.created'],
  'Fornecedores': ['vendor.assessment_completed'],
  'Políticas':    ['policy.approved'],
  'GDPR':         ['dsar.received', 'breach.reported'],
};

const EVENT_LABELS: Record<string, string> = {
  'risk.created': 'Risco criado', 'risk.high': 'Risco alto/crítico', 'risk.treatment_updated': 'Plano de tratamento atualizado',
  'task.overdue': 'Tarefa em atraso', 'task.completed': 'Tarefa concluída',
  'capa.overdue': 'CAPA em atraso', 'capa.completed': 'CAPA encerrada',
  'evidence.expiring': 'Evidência a expirar', 'evidence.approved': 'Evidência aprovada',
  'audit.started': 'Auditoria iniciada', 'audit.completed': 'Auditoria concluída', 'finding.created': 'Finding criado',
  'vendor.assessment_completed': 'Assessment de fornecedor concluído',
  'policy.approved': 'Política aprovada',
  'dsar.received': 'DSAR recebido', 'breach.reported': 'Violação de dados reportada',
};

export default function WebhooksPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', url: '', events: [] as string[] });

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => webhooksApi.list().then(r => r.data),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['webhook-events'],
    queryFn: () => webhooksApi.listEvents().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => webhooksApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhooks'] }); setShowForm(false); setForm({ name: '', url: '', events: [] }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: any) => webhooksApi.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhooks'] }); setEditingId(null); },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => webhooksApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks'] }),
  });

  const toggleEvent = (ev: string) => {
    setForm(p => ({
      ...p,
      events: p.events.includes(ev) ? p.events.filter(e => e !== ev) : [...p.events, ev],
    }));
  };

  const copySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    setCopied(secret.slice(0, 8));
    setTimeout(() => setCopied(null), 2000);
  };

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none';

  const WebhookForm = ({ onSubmit, onCancel, loading }: { onSubmit: () => void; onCancel: () => void; loading: boolean }) => (
    <div className="bg-gray-50 rounded-xl p-5 space-y-4 border border-gray-200">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Nome *</label>
          <input className={inp} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Slack alertas" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">URL Endpoint *</label>
          <input className={inp} value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://hooks.slack.com/..." />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Eventos a subscrever</label>
        <div className="space-y-3">
          {Object.entries(EVENT_GROUPS).map(([group, evs]) => (
            <div key={group}>
              <p className="text-xs font-medium text-gray-500 mb-1.5">{group}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {evs.map(ev => (
                  <label key={ev} className={cn('flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs border transition-colors',
                    form.events.includes(ev) ? 'bg-primary/5 border-primary/30 text-primary' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300')}>
                    <input type="checkbox" checked={form.events.includes(ev)} onChange={() => toggleEvent(ev)} className="w-3 h-3" />
                    {EVENT_LABELS[ev] || ev}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
        <button onClick={onSubmit} disabled={!form.name || !form.url || loading}
          className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />} Guardar
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
              <Webhook className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Webhooks & Integrações</h2>
              <p className="text-xs text-gray-500">Receba notificações em tempo real via HTTP POST</p>
            </div>
          </div>
          <button onClick={() => { setShowForm(true); setEditingId(null); }}
            className="flex items-center gap-1.5 text-sm text-primary hover:underline">
            <Plus className="w-4 h-4" /> Novo webhook
          </button>
        </div>

        {showForm && !editingId && (
          <div className="mb-4">
            <WebhookForm
              onSubmit={() => createMutation.mutate(form)}
              onCancel={() => { setShowForm(false); setForm({ name: '', url: '', events: [] }); }}
              loading={createMutation.isPending}
            />
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (webhooks as any[]).length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">
            <Webhook className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            Sem webhooks configurados
          </div>
        ) : (
          <div className="space-y-3">
            {(webhooks as any[]).map((wh: any) => (
              <div key={wh.id} className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', wh.isActive ? 'bg-green-500' : 'bg-gray-300')} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{wh.name}</p>
                      <p className="text-xs text-gray-400 truncate">{wh.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{wh.events?.length || 0} eventos</span>
                    {wh.failureCount > 0 && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">{wh.failureCount} erros</span>
                    )}
                    <button onClick={() => updateMutation.mutate({ id: wh.id, isActive: !wh.isActive })}
                      className={cn('text-xs px-2 py-1 rounded-lg font-medium', wh.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                      {wh.isActive ? 'Ativo' : 'Pausado'}
                    </button>
                    <button onClick={() => { setEditingId(editingId === wh.id ? null : wh.id); setForm({ name: wh.name, url: wh.url, events: wh.events || [] }); setShowForm(false); }}
                      className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gray-700">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeMutation.mutate(wh.id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {editingId === wh.id && (
                  <div className="border-t border-gray-100 p-4">
                    <WebhookForm
                      onSubmit={() => updateMutation.mutate({ id: wh.id, ...form })}
                      onCancel={() => setEditingId(null)}
                      loading={updateMutation.isPending}
                    />
                  </div>
                )}

                {/* Recent deliveries */}
                {wh.deliveries?.length > 0 && (
                  <div className="border-t border-gray-100 px-4 py-2">
                    <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                      <Activity className="w-3 h-3" /> Entregas recentes
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {wh.deliveries.slice(0, 5).map((d: any) => (
                        <div key={d.id} className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded-full', d.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600')}>
                          {d.success ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {d.event} {d.statusCode && `(${d.statusCode})`}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700 space-y-1">
        <p><strong>Segurança:</strong> Cada webhook tem um secret HMAC-SHA256. Verifique o header <code>X-iComply-Signature</code> no seu endpoint.</p>
        <p><strong>Retry:</strong> Em caso de falha, o webhook será desativado após 10 falhas consecutivas.</p>
        <p><strong>Timeout:</strong> 10 segundos por entrega. O endpoint deve responder rapidamente (2xx).</p>
      </div>
    </div>
  );
}
