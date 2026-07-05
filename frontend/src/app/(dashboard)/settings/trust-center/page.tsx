'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { trustCenterApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { Globe, Eye, Copy, Check, ExternalLink, Shield, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TrustCenterSettingsPage() {
  const t = useTranslations('trustCenter');
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    isPublic: false,
    showFrameworks: true,
    showEvidence: true,
    showAudits: true,
    showPolicies: true,
    showVendors: false,
    showRisks: false,
    customMessage: '',
    customTitle: '',
    contactEmail: '',
    accentColor: '#2563eb',
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['trust-center-settings'],
    queryFn: () => trustCenterApi.getSettings().then(r => r.data),
  });

  useEffect(() => {
    if (settings) {
      setForm({
        isPublic: settings.isPublic ?? false,
        showFrameworks: settings.showFrameworks ?? true,
        showEvidence: settings.showEvidence ?? true,
        showAudits: settings.showAudits ?? true,
        showPolicies: settings.showPolicies ?? true,
        showVendors: settings.showVendors ?? false,
        showRisks: settings.showRisks ?? false,
        customMessage: settings.customMessage ?? '',
        customTitle: settings.customTitle ?? '',
        contactEmail: settings.contactEmail ?? '',
        accentColor: settings.accentColor ?? '#2563eb',
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => trustCenterApi.updateSettings(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trust-center-settings'] });
    },
  });

  const orgSlug = (user as any)?.organization?.slug || 'demo';
  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/trust/${orgSlug}`
    : `https://icomply.pt/trust/${orgSlug}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">{t('loading')}</div>;
  }

  const TOGGLE_OPTIONS: { key: keyof typeof form; labelKey: string; descKey: string }[] = [
    { key: 'showFrameworks', labelKey: 'toggleFrameworksLabel', descKey: 'toggleFrameworksDesc' },
    { key: 'showEvidence',   labelKey: 'toggleEvidenceLabel',   descKey: 'toggleEvidenceDesc' },
    { key: 'showAudits',     labelKey: 'toggleAuditsLabel',     descKey: 'toggleAuditsDesc' },
    { key: 'showPolicies',   labelKey: 'togglePoliciesLabel',   descKey: 'togglePoliciesDesc' },
    { key: 'showVendors',    labelKey: 'toggleVendorsLabel',    descKey: 'toggleVendorsDesc' },
    { key: 'showRisks',      labelKey: 'toggleRisksLabel',      descKey: 'toggleRisksDesc' },
  ];

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Shield className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500">{t('subtitle')}</p>
        </div>
      </div>

      {/* Enable / disable */}
      <div className="bg-white border rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">{t('statusTitle')}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {form.isPublic ? t('statusPublic') : t('statusHidden')}
            </p>
          </div>
          <button
            onClick={() => setForm(f => ({ ...f, isPublic: !f.isPublic }))}
            className={cn(
              'relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none',
              form.isPublic ? 'bg-blue-600' : 'bg-gray-200',
            )}
          >
            <span
              className={cn(
                'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                form.isPublic ? 'translate-x-6' : 'translate-x-1',
              )}
            />
          </button>
        </div>

        {form.isPublic && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center gap-3">
            <Globe className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm text-blue-700 font-mono truncate flex-1">{publicUrl}</span>
            <button
              onClick={copyUrl}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded bg-white border border-blue-200"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? t('copied') : t('copy')}
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded bg-white border border-blue-200"
            >
              <ExternalLink className="w-3 h-3" /> {t('view')}
            </a>
          </div>
        )}
      </div>

      {/* Appearance */}
      <div className="bg-white border rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">{t('appearance')}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('customTitleLabel')}</label>
            <input
              value={form.customTitle}
              onChange={e => setForm(f => ({ ...f, customTitle: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder={`Trust Center — ${orgSlug}`}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('contactEmail')}</label>
            <input
              type="email"
              value={form.contactEmail}
              onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="compliance@empresa.pt"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('accentColor')}</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.accentColor}
                onChange={e => setForm(f => ({ ...f, accentColor: e.target.value }))}
                className="h-9 w-14 border border-gray-300 rounded-lg cursor-pointer p-0.5"
              />
              <input
                value={form.accentColor}
                onChange={e => setForm(f => ({ ...f, accentColor: e.target.value }))}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                placeholder="#2563eb"
              />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t('customMessage')}</label>
          <textarea
            rows={3}
            value={form.customMessage}
            onChange={e => setForm(f => ({ ...f, customMessage: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
            placeholder={t('customMessagePlaceholder')}
          />
        </div>
      </div>

      {/* Visibility toggles */}
      <div className="bg-white border rounded-xl p-6">
        <h2 className="font-semibold text-gray-900 mb-4">{t('visibilityTitle')}</h2>
        <div className="space-y-4">
          {TOGGLE_OPTIONS.map(opt => (
            <div key={opt.key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900">{t(opt.labelKey)}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t(opt.descKey)}</p>
              </div>
              <button
                onClick={() => setForm(f => ({ ...f, [opt.key]: !f[opt.key] }))}
                className={cn(
                  'relative inline-flex h-6 w-10 items-center rounded-full transition-colors focus:outline-none flex-shrink-0',
                  form[opt.key] ? 'bg-blue-600' : 'bg-gray-200',
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                    form[opt.key] ? 'translate-x-5' : 'translate-x-1',
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* How to use notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <Eye className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-amber-800">
          <p className="font-medium">{t('howToUseTitle')}</p>
          <p className="text-xs mt-1">{t('howToUseDesc')}</p>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? t('saving') : t('saveSettings')}
        </button>
      </div>
    </div>
  );
}
