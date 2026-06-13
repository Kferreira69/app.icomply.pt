'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { evidenceIntegrationsApi } from '@/lib/api';
import {
  Plus, RefreshCw, Loader2, Pencil, Trash2, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, AlertCircle, Clock, Zap, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────

type Provider = 'AWS_CLOUDTRAIL' | 'GITHUB' | 'AZURE_AD' | 'GCP_AUDIT' | 'MANUAL_API';

interface EvidenceIntegration {
  id: string;
  name: string;
  provider: Provider;
  description?: string;
  config: Record<string, any>;
  isActive: boolean;
  lastSyncAt?: string;
  createdAt: string;
}

interface SyncLog {
  id: string;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PARTIAL';
  evidencesFound: number;
  evidencesAdded: number;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

// ── Provider metadata ──────────────────────────────────────────

const PROVIDER_META: Record<Provider, { label: string; abbr: string; color: string; bg: string; description: string }> = {
  GITHUB: {
    label: 'GitHub',
    abbr: 'GH',
    color: 'text-purple-700',
    bg: 'bg-purple-100',
    description: 'Recolhe eventos do audit log da organização GitHub',
  },
  AWS_CLOUDTRAIL: {
    label: 'AWS CloudTrail',
    abbr: 'AWS',
    color: 'text-orange-700',
    bg: 'bg-orange-100',
    description: 'Importa eventos de CloudTrail para registo de conformidade',
  },
  AZURE_AD: {
    label: 'Azure AD',
    abbr: 'AZ',
    color: 'text-blue-700',
    bg: 'bg-blue-100',
    description: 'Sincroniza logs de auditoria do Azure Active Directory',
  },
  GCP_AUDIT: {
    label: 'GCP Audit',
    abbr: 'GCP',
    color: 'text-green-700',
    bg: 'bg-green-100',
    description: 'Importa atividade de auditoria do Google Cloud Platform',
  },
  MANUAL_API: {
    label: 'API Manual',
    abbr: 'API',
    color: 'text-gray-700',
    bg: 'bg-gray-100',
    description: 'Endpoint HTTP personalizado para ingestão de evidências',
  },
};

const AWS_REGIONS = ['eu-west-1', 'eu-central-1', 'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'ap-southeast-1', 'ap-northeast-1'];

// ── Utility helpers ────────────────────────────────────────────

function timeAgo(iso?: string): string {
  if (!iso) return 'Nunca sincronizado';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `há ${diff}s`;
  if (diff < 3600) return `há ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)}d`;
}

function syncDuration(log: SyncLog): string {
  if (!log.completedAt) return '';
  const ms = new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function maskValue(val: any): string {
  if (val == null || val === '') return '';
  return '••••••••';
}

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return ['token', 'secret', 'key', 'password', 'apikey', 'accesskeyid', 'secretaccesskey', 'clientsecret', 'serviceaccountjson'].some(k => lower.includes(k));
}

// ── Toast ──────────────────────────────────────────────────────

interface Toast { id: number; msg: string; type: 'success' | 'error' }

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);
  return { toasts, add };
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={cn(
          'flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all',
          t.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white',
        )}>
          {t.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ── Provider icon ──────────────────────────────────────────────

function ProviderIcon({ provider, size = 'md' }: { provider: Provider; size?: 'sm' | 'md' | 'lg' }) {
  const m = PROVIDER_META[provider];
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-12 h-12 text-sm' : 'w-9 h-9 text-xs';
  return (
    <div className={cn('rounded-lg flex items-center justify-center font-bold flex-shrink-0', sz, m.bg, m.color)}>
      {m.abbr}
    </div>
  );
}

// ── Sync log status ────────────────────────────────────────────

function LogStatusIcon({ status }: { status: SyncLog['status'] }) {
  if (status === 'SUCCESS') return <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />;
  if (status === 'FAILED') return <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;
  if (status === 'PARTIAL') return <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />;
  return <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />;
}

// ── Toggle switch ──────────────────────────────────────────────

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={cn(
        'relative inline-flex w-10 h-5.5 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50',
        checked ? 'bg-green-500' : 'bg-gray-200',
      )}
      style={{ height: '22px', width: '40px' }}
    >
      <span className={cn(
        'absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-transform',
        checked ? 'translate-x-[18px]' : 'translate-x-0',
      )} />
    </button>
  );
}

// ── Inline logs panel ──────────────────────────────────────────

function LogsPanel({ integrationId }: { integrationId: string }) {
  const { data: logs = [], isLoading } = useQuery<SyncLog[]>({
    queryKey: ['integration-logs', integrationId],
    queryFn: () => evidenceIntegrationsApi.logs(integrationId).then(r => r.data),
  });

  if (isLoading) {
    return (
      <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-2 text-xs text-gray-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> A carregar logs...
      </div>
    );
  }

  const recent = logs.slice(0, 5);

  return (
    <div className="border-t border-gray-100 px-4 py-3">
      <p className="text-xs font-semibold text-gray-500 mb-2">Últimas sincronizações</p>
      {recent.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Sem logs disponíveis.</p>
      ) : (
        <div className="space-y-1.5">
          {recent.map(log => (
            <div key={log.id} className="flex items-start gap-2.5 text-xs text-gray-600">
              <LogStatusIcon status={log.status} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="font-medium">{new Date(log.startedAt).toLocaleString('pt-PT')}</span>
                  <span className="text-gray-400">{log.evidencesAdded} evidências adicionadas</span>
                  {log.completedAt && <span className="text-gray-400">{syncDuration(log)}</span>}
                </div>
                {log.error && <p className="text-red-500 mt-0.5 truncate">{log.error}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Config field rendering ─────────────────────────────────────

function configSummary(provider: Provider, config: Record<string, any>): React.ReactNode {
  const items: { label: string; value: string }[] = [];

  switch (provider) {
    case 'GITHUB':
      if (config.org) items.push({ label: 'Org', value: config.org });
      if (config.token) items.push({ label: 'Token', value: maskValue(config.token) });
      break;
    case 'AWS_CLOUDTRAIL':
      if (config.region) items.push({ label: 'Região', value: config.region });
      if (config.accessKeyId) items.push({ label: 'Access Key', value: maskValue(config.accessKeyId) });
      break;
    case 'AZURE_AD':
      if (config.tenantId) items.push({ label: 'Tenant ID', value: config.tenantId });
      if (config.clientId) items.push({ label: 'Client ID', value: config.clientId });
      break;
    case 'GCP_AUDIT':
      if (config.projectId) items.push({ label: 'Project ID', value: config.projectId });
      if (config.serviceAccountJson) items.push({ label: 'Service Account', value: '••••••••' });
      break;
    case 'MANUAL_API':
      if (config.url) items.push({ label: 'URL', value: config.url });
      if (config.apiKey) items.push({ label: 'API Key', value: maskValue(config.apiKey) });
      break;
  }

  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
      {items.map(i => (
        <span key={i.label} className="text-xs text-gray-400">
          <span className="font-medium text-gray-500">{i.label}:</span> {i.value}
        </span>
      ))}
    </div>
  );
}

// ── Modal form ─────────────────────────────────────────────────

interface FormData {
  name: string;
  description: string;
  provider: Provider;
  isActive: boolean;
  config: Record<string, any>;
}

const DEFAULT_FORM: FormData = {
  name: '',
  description: '',
  provider: 'GITHUB',
  isActive: true,
  config: {},
};

function ProviderConfigFields({ provider, config, onChange }: {
  provider: Provider;
  config: Record<string, any>;
  onChange: (key: string, value: string) => void;
}) {
  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none';
  const lbl = 'block text-xs font-medium text-gray-600 mb-1';

  switch (provider) {
    case 'GITHUB':
      return (
        <>
          <div>
            <label className={lbl}>Organização (slug) *</label>
            <input className={inp} value={config.org || ''} onChange={e => onChange('org', e.target.value)} placeholder="my-org" />
          </div>
          <div>
            <label className={lbl}>Token de acesso *</label>
            <input className={inp} type="password" value={config.token || ''} onChange={e => onChange('token', e.target.value)} placeholder="ghp_••••••••" autoComplete="new-password" />
          </div>
        </>
      );

    case 'AWS_CLOUDTRAIL':
      return (
        <>
          <div>
            <label className={lbl}>Região AWS *</label>
            <select className={inp} value={config.region || ''} onChange={e => onChange('region', e.target.value)}>
              <option value="">Selecionar região...</option>
              {AWS_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Access Key ID *</label>
            <input className={inp} value={config.accessKeyId || ''} onChange={e => onChange('accessKeyId', e.target.value)} placeholder="AKIAIOSFODNN7EXAMPLE" />
          </div>
          <div>
            <label className={lbl}>Secret Access Key *</label>
            <input className={inp} type="password" value={config.secretAccessKey || ''} onChange={e => onChange('secretAccessKey', e.target.value)} placeholder="wJalrXUtnFEMI/..." autoComplete="new-password" />
          </div>
          <div>
            <label className={lbl}>Trail ARN (opcional)</label>
            <input className={inp} value={config.trailArn || ''} onChange={e => onChange('trailArn', e.target.value)} placeholder="arn:aws:cloudtrail:..." />
          </div>
        </>
      );

    case 'AZURE_AD':
      return (
        <>
          <div>
            <label className={lbl}>Tenant ID *</label>
            <input className={inp} value={config.tenantId || ''} onChange={e => onChange('tenantId', e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
          </div>
          <div>
            <label className={lbl}>Client ID *</label>
            <input className={inp} value={config.clientId || ''} onChange={e => onChange('clientId', e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
          </div>
          <div>
            <label className={lbl}>Client Secret *</label>
            <input className={inp} type="password" value={config.clientSecret || ''} onChange={e => onChange('clientSecret', e.target.value)} placeholder="••••••••" autoComplete="new-password" />
          </div>
        </>
      );

    case 'GCP_AUDIT':
      return (
        <>
          <div>
            <label className={lbl}>Project ID *</label>
            <input className={inp} value={config.projectId || ''} onChange={e => onChange('projectId', e.target.value)} placeholder="my-gcp-project" />
          </div>
          <div>
            <label className={lbl}>Service Account JSON *</label>
            <textarea
              className={cn(inp, 'font-mono text-xs resize-none h-24')}
              value={config.serviceAccountJson || ''}
              onChange={e => onChange('serviceAccountJson', e.target.value)}
              placeholder='{"type":"service_account",...}'
              autoComplete="off"
            />
          </div>
        </>
      );

    case 'MANUAL_API':
      return (
        <>
          <div>
            <label className={lbl}>URL do endpoint *</label>
            <input className={inp} value={config.url || ''} onChange={e => onChange('url', e.target.value)} placeholder="https://api.exemplo.com/events" />
          </div>
          <div>
            <label className={lbl}>API Key *</label>
            <input className={inp} type="password" value={config.apiKey || ''} onChange={e => onChange('apiKey', e.target.value)} placeholder="••••••••" autoComplete="new-password" />
          </div>
          <div>
            <label className={lbl}>Headers adicionais (JSON, opcional)</label>
            <textarea
              className={cn(inp, 'font-mono text-xs resize-none h-16')}
              value={config.headers || ''}
              onChange={e => onChange('headers', e.target.value)}
              placeholder='{"X-Custom-Header":"value"}'
            />
          </div>
        </>
      );

    default:
      return null;
  }
}

function IntegrationModal({ initial, onClose, onSuccess }: {
  initial?: EvidenceIntegration;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!initial;
  const [form, setForm] = useState<FormData>(() =>
    initial
      ? { name: initial.name, description: initial.description || '', provider: initial.provider, isActive: initial.isActive, config: { ...initial.config } }
      : DEFAULT_FORM,
  );

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none';
  const lbl = 'block text-xs font-medium text-gray-600 mb-1';

  const createMutation = useMutation({
    mutationFn: (dto: any) => evidenceIntegrationsApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evidence-integrations'] });
      onSuccess('Integração criada com sucesso');
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (dto: any) => evidenceIntegrationsApi.update(initial!.id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evidence-integrations'] });
      onSuccess('Integração atualizada com sucesso');
      onClose();
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  const setConfig = (key: string, value: string) => {
    setForm(p => ({ ...p, config: { ...p.config, [key]: value } }));
  };

  const handleProviderChange = (provider: Provider) => {
    setForm(p => ({ ...p, provider, config: {} }));
  };

  const handleSubmit = () => {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      provider: form.provider,
      isActive: form.isActive,
      config: form.config,
    };
    if (isEdit) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const canSubmit = form.name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Editar integração' : 'Nova integração'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Provider */}
          <div>
            <label className={lbl}>Fornecedor *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(PROVIDER_META) as Provider[]).map(p => {
                const m = PROVIDER_META[p];
                const active = form.provider === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleProviderChange(p)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-colors text-xs font-medium',
                      active ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300',
                    )}
                  >
                    <span className={cn('w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0', m.bg, m.color)}>
                      {m.abbr}
                    </span>
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className={lbl}>Nome *</label>
            <input className={inp} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: GitHub Prod" />
          </div>

          {/* Description */}
          <div>
            <label className={lbl}>Descrição (opcional)</label>
            <input className={inp} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Breve descrição da integração" />
          </div>

          {/* Active */}
          <div className="flex items-center justify-between py-2 border-y border-gray-100">
            <span className="text-sm font-medium text-gray-700">Integração ativa</span>
            <ToggleSwitch checked={form.isActive} onChange={() => setForm(p => ({ ...p, isActive: !p.isActive }))} />
          </div>

          {/* Provider-specific config */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Configuração — {PROVIDER_META[form.provider].label}</p>
            <ProviderConfigFields provider={form.provider} config={form.config} onChange={setConfig} />
          </div>

          {/* Security notice */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 text-xs text-amber-700">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            As credenciais são armazenadas de forma encriptada
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {(error as any)?.response?.data?.message || 'Ocorreu um erro. Tente novamente.'}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isPending}
            className="flex-1 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Guardar' : 'Criar integração'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Integration row ────────────────────────────────────────────

function IntegrationRow({ integration, onEdit, onDeleted, onToast }: {
  integration: EvidenceIntegration;
  onEdit: () => void;
  onDeleted: () => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const qc = useQueryClient();
  const [logsOpen, setLogsOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const toggleMutation = useMutation({
    mutationFn: () => evidenceIntegrationsApi.toggle(integration.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evidence-integrations'] });
      onToast(integration.isActive ? 'Integração desativada' : 'Integração ativada', 'success');
    },
    onError: () => onToast('Erro ao alterar estado', 'error'),
  });

  const removeMutation = useMutation({
    mutationFn: () => evidenceIntegrationsApi.remove(integration.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evidence-integrations'] });
      onDeleted();
      onToast('Integração removida', 'success');
    },
    onError: () => onToast('Erro ao remover integração', 'error'),
  });

  const syncMutation = useMutation({
    mutationFn: () => evidenceIntegrationsApi.sync(integration.id),
    onMutate: () => setSyncing(true),
    onSettled: () => setSyncing(false),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evidence-integrations'] });
      qc.invalidateQueries({ queryKey: ['integration-logs', integration.id] });
      onToast('Sincronização iniciada', 'success');
    },
    onError: () => onToast('Erro ao sincronizar', 'error'),
  });

  const m = PROVIDER_META[integration.provider];

  const handleDelete = () => {
    if (confirm(`Remover integração "${integration.name}"? Esta ação não pode ser revertida.`)) {
      removeMutation.mutate();
    }
  };

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <ProviderIcon provider={integration.provider} />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 truncate">{integration.name}</span>
            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide', m.bg, m.color)}>
              {m.label}
            </span>
          </div>
          {integration.description && (
            <p className="text-xs text-gray-400 truncate mt-0.5">{integration.description}</p>
          )}
          {configSummary(integration.provider, integration.config)}
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeAgo(integration.lastSyncAt)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Status toggle */}
          <div className="flex items-center gap-1.5">
            <span className={cn('text-xs font-medium', integration.isActive ? 'text-green-600' : 'text-gray-400')}>
              {integration.isActive ? 'Ativo' : 'Inativo'}
            </span>
            <ToggleSwitch
              checked={integration.isActive}
              onChange={() => toggleMutation.mutate()}
              disabled={toggleMutation.isPending}
            />
          </div>

          {/* Sync now */}
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncing}
            title="Sincronizar agora"
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Sincronizar</span>
          </button>

          {/* Logs toggle */}
          <button
            onClick={() => setLogsOpen(o => !o)}
            title="Ver logs"
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {logsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Logs</span>
          </button>

          {/* Edit */}
          <button
            onClick={onEdit}
            title="Editar"
            className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={removeMutation.isPending}
            title="Remover"
            className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
          >
            {removeMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {logsOpen && <LogsPanel integrationId={integration.id} />}
    </div>
  );
}

// ── Provider showcase cards ────────────────────────────────────

function ProviderShowcaseCards({ onAdd }: { onAdd: (provider: Provider) => void }) {
  const featured: Provider[] = ['GITHUB', 'AWS_CLOUDTRAIL', 'AZURE_AD', 'GCP_AUDIT'];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {featured.map(p => {
        const m = PROVIDER_META[p];
        return (
          <button
            key={p}
            onClick={() => onAdd(p)}
            className="flex flex-col items-start gap-3 p-4 border border-gray-100 rounded-xl hover:border-gray-300 hover:shadow-sm bg-white text-left transition-all group"
          >
            <ProviderIcon provider={p} size="lg" />
            <div>
              <p className="text-sm font-semibold text-gray-800 group-hover:text-primary transition-colors">{m.label}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{m.description}</p>
            </div>
            <span className="text-xs font-medium text-primary flex items-center gap-1 mt-auto">
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────

export default function EvidenceIntegrationsPage() {
  const qc = useQueryClient();
  const { toasts, add: addToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EvidenceIntegration | null>(null);
  const [preselectedProvider, setPreselectedProvider] = useState<Provider | null>(null);

  const { data: integrations = [], isLoading } = useQuery<EvidenceIntegration[]>({
    queryKey: ['evidence-integrations'],
    queryFn: () => evidenceIntegrationsApi.list().then(r => r.data),
  });

  const syncAllMutation = useMutation({
    mutationFn: () => evidenceIntegrationsApi.syncAll(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evidence-integrations'] });
      addToast('Sincronização global iniciada', 'success');
    },
    onError: () => addToast('Erro ao sincronizar todas as integrações', 'error'),
  });

  const openCreateModal = (provider?: Provider) => {
    setEditing(null);
    setPreselectedProvider(provider || null);
    setModalOpen(true);
  };

  const openEditModal = (integration: EvidenceIntegration) => {
    setEditing(integration);
    setPreselectedProvider(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setPreselectedProvider(null);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Integrações de Evidências</h1>
          <p className="text-sm text-gray-500 mt-0.5">Recolha automática de evidências de fontes externas</p>
        </div>
        <div className="flex items-center gap-2">
          {integrations.length > 0 && (
            <button
              onClick={() => syncAllMutation.mutate()}
              disabled={syncAllMutation.isPending}
              className="flex items-center gap-1.5 text-sm px-3 py-2 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {syncAllMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Zap className="w-4 h-4" />}
              Sincronizar todas
            </button>
          )}
          <button
            onClick={() => openCreateModal()}
            className="flex items-center gap-1.5 text-sm px-3 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar integração
          </button>
        </div>
      </div>

      {/* Provider cards (always visible) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Fontes disponíveis</p>
        <ProviderShowcaseCards onAdd={provider => openCreateModal(provider)} />
      </div>

      {/* Active integrations */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-gray-700">
            Integrações configuradas
            {integrations.length > 0 && (
              <span className="ml-2 text-xs font-medium bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                {integrations.length}
              </span>
            )}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> A carregar...
          </div>
        ) : integrations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            {/* Simple SVG illustration */}
            <svg className="w-20 h-20 mb-4 text-gray-200" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="10" y="20" width="60" height="40" rx="8" stroke="currentColor" strokeWidth="2.5" />
              <circle cx="40" cy="40" r="10" stroke="currentColor" strokeWidth="2.5" />
              <path d="M40 30v4M40 46v4M30 40h-4M54 40h-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="40" cy="40" r="3" fill="currentColor" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-600 mb-1">Nenhuma integração configurada</h3>
            <p className="text-xs text-gray-400 mb-4 max-w-xs">
              Configure uma integração acima para começar a recolher evidências automaticamente de fontes externas.
            </p>
            <button
              onClick={() => openCreateModal()}
              className="flex items-center gap-1.5 text-sm px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Adicionar primeira integração
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {integrations.map(integration => (
              <IntegrationRow
                key={integration.id}
                integration={integration}
                onEdit={() => openEditModal(integration)}
                onDeleted={() => {}}
                onToast={addToast}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <IntegrationModal
          initial={editing || (preselectedProvider ? ({ provider: preselectedProvider } as any) : undefined)}
          onClose={closeModal}
          onSuccess={msg => addToast(msg, 'success')}
        />
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
