'use client';

import { useQuery } from '@tanstack/react-query';
import { licensingApi } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { Loader2, Check, Mail, FileText } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

// ── Colour maps ────────────────────────────────────────────────

const PLAN_GRADIENT: Record<string, string> = {
  FREE:         'from-gray-500  to-gray-600',
  STARTER:      'from-blue-500  to-blue-600',
  PROFESSIONAL: 'from-blue-600  to-indigo-700',
  ENTERPRISE:   'from-purple-600 to-purple-800',
  CUSTOM:       'from-amber-500 to-amber-600',
};

const LICENSE_STATUS: Record<string, string> = {
  ACTIVE:    'text-green-700  bg-green-100',
  TRIAL:     'text-blue-700   bg-blue-100',
  SUSPENDED: 'text-orange-700 bg-orange-100',
  CANCELLED: 'text-red-700    bg-red-100',
};

const INVOICE_STATUS: Record<string, string> = {
  DRAFT:     'text-gray-600  bg-gray-100',
  SENT:      'text-blue-600  bg-blue-100',
  PAID:      'text-green-600 bg-green-100',
  OVERDUE:   'text-red-600   bg-red-100',
  CANCELLED: 'text-gray-400  bg-gray-50',
};

// ── Module label map (matches MODULE_CATALOGUE keys) ──────────

const MODULE_LABELS: Record<string, string> = {
  dashboard:     'Dashboard',
  diagnostic:    'Diagnóstico',
  projects:      'Projetos & Tarefas',
  risks:         'Gestão de Riscos',
  evidence:      'Evidências',
  audits:        'Auditorias & Findings',
  capa:          'CAPA',
  reports:       'Relatórios PDF',
  policies:      'Políticas',
  gdpr:          'GDPR / ROPA / DPIA',
  nis2:          'NIS2 Compliance',
  dora:          'DORA',
  soa:           'ISO 27001 SoA',
  vendors:       'Fornecedores',
  whistleblow:   'Canal de Denúncias',
  hr_compliance: 'HR Compliance',
  ai_governance: 'AI Governance',
  aiAssistant:   'AI Assistant',
  trustCenter:   'Trust Center',
  excelImport:   'Importação Excel',
  translations:  'Traduções',
};

// ─────────────────────────────────────────────────────────────

export default function BillingPage() {
  const t = useTranslations('billing');

  const { data: license, isLoading } = useQuery({
    queryKey: ['my-license'],
    queryFn: () => licensingApi.myLicense().then(r => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!license) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
        <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">{t('noLicense')}</p>
        <a
          href="mailto:support@icomply.pt"
          className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-primary hover:underline"
        >
          support@icomply.pt →
        </a>
      </div>
    );
  }

  const isAnnual        = license.billingCycle === 'ANNUAL';
  const enabledModules  = (license.modules  || []).filter((m: any) => m.enabled);
  const disabledModules = (license.modules  || []).filter((m: any) => !m.enabled);
  const invoices        = license.invoices  || [];

  const subtotal = enabledModules.reduce(
    (sum: number, m: any) => sum + Number(isAnnual ? m.annualPrice : m.monthlyPrice),
    0,
  );

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Plan card ─────────────────────────────────────────── */}
      <div
        className={cn(
          'rounded-xl p-6 text-white bg-gradient-to-br',
          PLAN_GRADIENT[license.plan] ?? 'from-primary to-primary/80',
        )}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-white/60 text-xs uppercase tracking-widest mb-1">{t('planLabel')}</p>
            <p className="text-3xl font-bold tracking-tight">{license.plan}</p>
          </div>
          <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', LICENSE_STATUS[license.status] ?? 'text-white/80 bg-white/20')}>
            {license.status}
          </span>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-white/75 mt-2">
          <span>{isAnnual ? t('cycleAnnual') : t('cycleMonthly')}</span>
          <span>{license.maxUsers} {t('usersLabel')}</span>
          {license.startDate && (
            <span>{t('renewalLabel')}: {formatDate(license.startDate)}</span>
          )}
          {license.trialEndsAt && (
            <span className="text-yellow-200 font-medium">
              {t('trialLabel')}: {formatDate(license.trialEndsAt)}
            </span>
          )}
        </div>

        {/* Monthly total */}
        {subtotal > 0 && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-white/60 text-xs">{t('monthlyTotal')}</p>
            <p className="text-xl font-semibold">
              €{subtotal.toFixed(2)}<span className="text-sm font-normal text-white/60">/{isAnnual ? t('year') : t('month')}</span>
            </p>
          </div>
        )}
      </div>

      {/* ── Active modules ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">{t('modulesTitle')}</h2>

        {enabledModules.length === 0 ? (
          <p className="text-sm text-gray-400">{t('noModules')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {enabledModules.map((mod: any) => {
              const price = Number(isAnnual ? mod.annualPrice : mod.monthlyPrice);
              return (
                <div
                  key={mod.module}
                  className="flex items-center gap-2 px-3 py-2.5 bg-green-50 rounded-lg border border-green-100"
                >
                  <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate flex-1">
                    {MODULE_LABELS[mod.module] ?? mod.module}
                  </span>
                  {price > 0 && (
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      €{price}/{isAnnual ? 'ano' : 'mês'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Disabled modules (collapsed) */}
        {disabledModules.length > 0 && (
          <details className="mt-3">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">
              {t('showDisabled')} ({disabledModules.length})
            </summary>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {disabledModules.map((mod: any) => (
                <div
                  key={mod.module}
                  className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100 opacity-60"
                >
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                  <span className="text-sm text-gray-400 truncate">
                    {MODULE_LABELS[mod.module] ?? mod.module}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* ── Invoice history ───────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{t('invoicesTitle')}</h2>
        </div>

        {invoices.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">{t('noInvoices')}</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {[t('invoiceDate'), t('invoiceDesc'), t('invoiceAmount'), t('invoiceStatus')].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {formatDate(inv.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-[180px] truncate">
                    {inv.description || (inv.periodStart
                      ? `${formatDate(inv.periodStart)} → ${formatDate(inv.periodEnd)}`
                      : '—')}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
                    €{Number(inv.totalAmount).toFixed(2)}
                    {inv.moloniDocNo && (
                      <span className="ml-1.5 text-xs font-normal text-gray-400">#{inv.moloniDocNo}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-1 rounded-full font-medium', INVOICE_STATUS[inv.status] ?? 'text-gray-500 bg-gray-100')}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Upgrade / contact ────────────────────────────────── */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex items-start gap-4">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Mail className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-blue-900">{t('upgradeTitle')}</p>
          <p className="text-sm text-blue-700 mt-1">{t('upgradeText')}</p>
          <a
            href="mailto:support@icomply.pt"
            className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-blue-700 hover:text-blue-900 transition-colors"
          >
            {t('upgradeContact')} <span aria-hidden>→</span>
          </a>
        </div>
      </div>

    </div>
  );
}
