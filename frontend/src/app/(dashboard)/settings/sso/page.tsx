'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ssoApi } from '@/lib/api';
import { Shield, CheckCircle, AlertCircle, Loader2, Link2, Settings, X, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

const PROVIDERS = [
  { key: 'AZURE_AD',          label: 'Microsoft Azure AD',         logo: '🔷', description: 'Active Directory + Microsoft 365' },
  { key: 'GOOGLE_WORKSPACE',  label: 'Google Workspace',           logo: '🔵', description: 'Google Workspace (G Suite)' },
  { key: 'OKTA',              label: 'Okta',                       logo: '🟠', description: 'Okta Identity Platform' },
  { key: 'SAML',              label: 'SAML 2.0 (Genérico)',        logo: '🔐', description: 'Qualquer IdP SAML 2.0' },
  { key: 'OIDC',              label: 'OpenID Connect',             logo: '🔑', description: 'Qualquer IdP OpenID Connect' },
];

const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all';

export default function SsoPage() {
  const qc = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [form, setForm] = useState({ clientId: '', tenantId: '', domain: '', metadata: '' });
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { data: config } = useQuery({ queryKey: ['sso-config'], queryFn: () => ssoApi.getConfig().then(r => r.data) });

  useEffect(() => {
    if (config?.provider) setSelectedProvider(config.provider);
  }, [config?.provider]);

  const saveMutation = useMutation({
    mutationFn: () => ssoApi.upsertConfig({ provider: selectedProvider, ...form, isActive: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sso-config'] }); },
  });

  const testMutation = useMutation({
    mutationFn: () => ssoApi.test(),
    onSuccess: (r: any) => setTestResult(r.data),
  });

  const disableMutation = useMutation({
    mutationFn: () => ssoApi.disable(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sso-config'] }); setSelectedProvider(null); },
  });

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Single Sign-On (SSO)</h2>
            <p className="text-xs text-gray-500">Configure o login centralizado com o seu Identity Provider</p>
          </div>
          {config?.isActive && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-green-700 bg-green-100 px-2.5 py-1 rounded-full font-medium">
              <CheckCircle className="w-3.5 h-3.5" /> Ativo — {config.provider}
            </span>
          )}
        </div>

        {/* Provider selection */}
        <div className="space-y-2 mb-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Selecionar Identity Provider</p>
          <div className="grid grid-cols-1 gap-2">
            {PROVIDERS.map(p => (
              <button key={p.key} onClick={() => setSelectedProvider(selectedProvider === p.key ? null : p.key)}
                className={cn('flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all', selectedProvider === p.key ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-300 bg-white')}>
                <span className="text-2xl">{p.logo}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{p.label}</p>
                  <p className="text-xs text-gray-500">{p.description}</p>
                </div>
                {selectedProvider === p.key && <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* Configuration fields */}
        {selectedProvider && (
          <div className="space-y-4 border-t border-gray-100 pt-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Configuração</p>
            {(selectedProvider === 'AZURE_AD' || selectedProvider === 'OIDC') && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Client ID (Application ID)</label>
                <input className={inp} value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
              </div>
            )}
            {selectedProvider === 'AZURE_AD' && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tenant ID (Directory ID)</label>
                <input className={inp} value={form.tenantId} onChange={e => setForm(p => ({ ...p, tenantId: e.target.value }))} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
              </div>
            )}
            {(selectedProvider === 'GOOGLE_WORKSPACE' || selectedProvider === 'OKTA') && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Domínio</label>
                <input className={inp} value={form.domain} onChange={e => setForm(p => ({ ...p, domain: e.target.value }))} placeholder="empresa.com" />
              </div>
            )}
            {selectedProvider === 'SAML' && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Metadata URL ou XML</label>
                <textarea className={inp + ' resize-none'} rows={3} value={form.metadata} onChange={e => setForm(p => ({ ...p, metadata: e.target.value }))} placeholder="https://idp.empresa.com/metadata.xml" />
              </div>
            )}

            {testResult && (
              <div className={cn('flex items-center gap-2 p-3 rounded-xl text-sm', testResult.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700')}>
                {testResult.success ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                {testResult.message}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => testMutation.mutate()} disabled={testMutation.isPending}
                className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                {testMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                Testar ligação
              </button>
              <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Ativar SSO
              </button>
              {config?.isActive && (
                <button onClick={() => disableMutation.mutate()} className="flex items-center gap-2 text-red-600 border border-red-200 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-red-50 ml-auto">
                  <X className="w-4 h-4" /> Desativar
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700 space-y-2">
        <p><strong>Redirect URL</strong> para configurar no seu IdP:</p>
        <code className="block bg-white border border-blue-200 rounded-lg px-3 py-2 text-[11px] font-mono">{typeof window !== 'undefined' ? window.location.origin : 'https://app.icomply.pt'}/api/auth/sso/callback</code>
        <p><strong>Scope:</strong> openid email profile</p>
        <p>O SSO substitui o login por email/password — os utilizadores são redirecionados para o seu IdP.</p>
      </div>
    </div>
  );
}
