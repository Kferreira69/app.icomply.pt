'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { licensingApi } from '@/lib/api';
import {
  Loader2, Check, Mail, FileText, CreditCard, Package,
  ExternalLink, TrendingUp, Users, HardDrive, Brain, Zap,
  CheckCircle, ChevronDown, ChevronUp, Clock, AlertTriangle,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

// ── Constants ─────────────────────────────────────────────────

const PLAN_GRADIENT: Record<string, string> = {
  FREE:         'from-gray-500  to-gray-600',
  STARTER:      'from-blue-500  to-blue-600',
  PROFESSIONAL: 'from-blue-600  to-indigo-700',
  ENTERPRISE:   'from-purple-600 to-purple-800',
  CUSTOM:       'from-amber-500 to-amber-600',
};

const STATUS_STYLE: Record<string, string> = {
  ACTIVE:    'text-green-700 bg-green-100',
  TRIAL:     'text-blue-700 bg-blue-100',
  SUSPENDED: 'text-orange-700 bg-orange-100',
  CANCELLED: 'text-red-700 bg-red-100',
  PAST_DUE:  'text-orange-700 bg-orange-100',
  EXPIRED:   'text-gray-600 bg-gray-100',
};

const INVOICE_STATUS: Record<string, string> = {
  DRAFT:     'text-gray-600 bg-gray-100',
  SENT:      'text-blue-600 bg-blue-100',
  PAID:      'text-green-600 bg-green-100',
  OVERDUE:   'text-red-600 bg-red-100',
  CANCELLED: 'text-gray-400 bg-gray-50',
};

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', diagnostic: 'Diagnóstico', projects: 'Projetos & Tarefas',
  risks: 'Gestão de Riscos', evidence: 'Evidências', audits: 'Auditorias & Findings',
  capa: 'CAPA', reports: 'Relatórios PDF', policies: 'Políticas',
  gdpr: 'GDPR / ROPA / DPIA', nis2: 'NIS2 Compliance', dora: 'DORA',
  soa: 'ISO 27001 SoA', vendors: 'Fornecedores', whistleblow: 'Canal de Denúncias',
  hr_compliance: 'HR Compliance', ai_governance: 'AI Governance',
  aiAssistant: 'AI Assistant', trustCenter: 'Trust Center',
  excelImport: 'Importação Excel', translations: 'Traduções',
};

const PLANS_INFO: Record<string, { price: number; annualPrice: number; description: string; highlight?: string }> = {
  FREE:         { price: 0,    annualPrice: 0,    description: 'Diagnóstico e dashboard básico' },
  STARTER:      { price: 149,  annualPrice: 1490, description: 'Projetos, riscos e relatórios essenciais', highlight: 'Ideal para equipas pequenas' },
  PROFESSIONAL: { price: 399,  annualPrice: 3990, description: 'Governance completo com GDPR, ISO 27001 e auditorias', highlight: 'Mais popular' },
  ENTERPRISE:   { price: 999,  annualPrice: 9990, description: 'Todos os módulos + SSO + API + Multi-entity + suporte premium', highlight: 'Para grandes organizações' },
};

// ─────────────────────────────────────────────────────────────

export default function BillingPage() {
  const [showDisabled, setShowDisabled] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState('MONTHLY');

  const { data: license, isLoading } = useQuery({
    queryKey: ['my-license'],
    queryFn: () => licensingApi.myLicense().then(r => r.data),
  });
  const { data: addons = [] } = useQuery({
    queryKey: ['my-addons'],
    queryFn: () => licensingApi.myAddons().then(r => r.data),
  });
  const { data: events = [] } = useQuery({
    queryKey: ['my-events'],
    queryFn: () => licensingApi.myEvents().then(r => r.data),
  });
  const { data: catalogue } = useQuery({
    queryKey: ['licence-catalogue'],
    queryFn: () => licensingApi.catalogue().then(r => r.data),
  });

  const checkoutMutation = useMutation({
    mutationFn: (data: { plan: string; billingCycle: string }) => licensingApi.stripeCheckout(data).then(r => r.data),
    onSuccess: (data) => { if (data.url) window.location.href = data.url; },
  });

  const portalMutation = useMutation({
    mutationFn: () => licensingApi.stripePortal().then(r => r.data),
    onSuccess: (data) => { if (data.url) window.open(data.url, '_blank'); },
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!license) return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center max-w-lg mx-auto">
      <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 text-sm">Sem licença configurada. Contacte o suporte para activar a sua subscrição.</p>
      <a href="mailto:support@icomply.pt" className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-primary hover:underline">
        support@icomply.pt →
      </a>
    </div>
  );

  const isAnnual        = license.billingCycle === 'ANNUAL';
  const enabledModules  = (license.modules || []).filter((m: any) => m.enabled);
  const disabledModules = (license.modules || []).filter((m: any) => !m.enabled);
  const invoices        = license.invoices || [];
  const activeAddons    = (addons as any[]).filter(a => a.enabled);
  const subtotal        = enabledModules.reduce((s: number, m: any) => s + Number(isAnnual ? m.annualPrice : m.monthlyPrice), 0);
  const hasStripe       = !!license.stripeCustomerId;

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Plan card ─────────────────────────────────────────── */}
      <div className={cn('rounded-xl p-6 text-white bg-gradient-to-br', PLAN_GRADIENT[license.plan] ?? 'from-primary to-primary/80')}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Subscrição</p>
            <p className="text-3xl font-bold tracking-tight">{license.plan}</p>
            {PLANS_INFO[license.plan]?.description && (
              <p className="text-white/70 text-sm mt-1">{PLANS_INFO[license.plan].description}</p>
            )}
          </div>
          <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', STATUS_STYLE[license.status] ?? 'text-white/80 bg-white/20')}>
            {license.status}
          </span>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-white/75">
          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{isAnnual ? 'Anual' : 'Mensal'}</span>
          <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{license.maxUsers} utilizadores</span>
          <span className="flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5" />{license.maxStorageGb ?? 5} GB</span>
          <span className="flex items-center gap-1.5"><Brain className="w-3.5 h-3.5" />{license.maxAiCredits ?? 100} AI credits</span>
        </div>

        {license.trialEndsAt && license.status === 'TRIAL' && (
          <div className="mt-3 flex items-center gap-2 text-yellow-200 text-sm bg-yellow-900/30 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Trial termina em {formatDate(license.trialEndsAt)}
          </div>
        )}

        {subtotal > 0 && (
          <div className="mt-4 pt-4 border-t border-white/20 flex items-end justify-between">
            <div>
              <p className="text-white/60 text-xs">Total subscrição</p>
              <p className="text-xl font-semibold">
                €{subtotal.toFixed(2)}<span className="text-sm font-normal text-white/60">/{isAnnual ? 'ano' : 'mês'}</span>
              </p>
            </div>
            {hasStripe && (
              <button onClick={() => portalMutation.mutate()} disabled={portalMutation.isPending}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg text-sm text-white transition-colors">
                {portalMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Gerir pagamento
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Active modules ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Módulos activos ({enabledModules.length})</h2>
        {enabledModules.length === 0 ? (
          <p className="text-sm text-gray-400">Sem módulos activos</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {enabledModules.map((mod: any) => {
              const price = Number(isAnnual ? mod.annualPrice : mod.monthlyPrice);
              return (
                <div key={mod.module} className="flex items-center gap-2 px-3 py-2.5 bg-green-50 rounded-lg border border-green-100">
                  <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate flex-1">{MODULE_LABELS[mod.module] ?? mod.module}</span>
                  {price > 0 && <span className="text-xs text-gray-400 whitespace-nowrap">€{price}/{isAnnual ? 'ano' : 'mês'}</span>}
                </div>
              );
            })}
          </div>
        )}

        {disabledModules.length > 0 && (
          <div className="mt-3">
            <button onClick={() => setShowDisabled(p => !p)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
              {showDisabled ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showDisabled ? 'Ocultar' : 'Ver'} módulos não activos ({disabledModules.length})
            </button>
            {showDisabled && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {disabledModules.map((mod: any) => (
                  <div key={mod.module} className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100 opacity-60">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                    <span className="text-sm text-gray-400 truncate">{MODULE_LABELS[mod.module] ?? mod.module}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Add-ons ───────────────────────────────────────────── */}
      {activeAddons.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Add-ons activos</h2>
          <div className="space-y-2">
            {activeAddons.map((addon: any) => {
              const info = catalogue?.addons?.find((a: any) => a.key === addon.addonKey);
              return (
                <div key={addon.addonKey} className="flex items-center gap-3 px-3 py-2.5 bg-violet-50 rounded-lg border border-violet-100">
                  <Package className="w-4 h-4 text-violet-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700 flex-1">{info?.label || addon.addonKey}</span>
                  {addon.price > 0 && <span className="text-xs text-gray-400">€{Number(addon.price).toFixed(2)}/mês</span>}
                  <span className="text-xs text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">Activo</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Upgrade plans ─────────────────────────────────────── */}
      {license.plan !== 'ENTERPRISE' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Planos disponíveis</h2>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {['MONTHLY', 'ANNUAL'].map(c => (
                <button key={c} onClick={() => setBillingCycle(c)}
                  className={cn('px-3 py-1 rounded-md text-xs font-medium transition-colors',
                    billingCycle === c ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
                  {c === 'MONTHLY' ? 'Mensal' : 'Anual'}
                  {c === 'ANNUAL' && <span className="ml-1 text-green-600">-17%</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {Object.entries(PLANS_INFO).filter(([k]) => k !== 'FREE' && k !== license.plan).map(([planKey, info]) => (
              <div key={planKey}
                className={cn('border rounded-xl p-4 cursor-pointer transition-all',
                  selectedPlan === planKey ? 'border-primary bg-blue-50' : 'border-gray-100 hover:border-gray-300')}>
                <div className="flex items-start justify-between">
                  <div onClick={() => setSelectedPlan(selectedPlan === planKey ? null : planKey)} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{planKey}</span>
                      {info.highlight && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{info.highlight}</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{info.description}</p>
                    <p className="text-lg font-bold text-gray-900 mt-2">
                      €{billingCycle === 'ANNUAL' ? info.annualPrice : info.price}
                      <span className="text-sm font-normal text-gray-400">/{billingCycle === 'ANNUAL' ? 'ano' : 'mês'}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => checkoutMutation.mutate({ plan: planKey, billingCycle })}
                    disabled={checkoutMutation.isPending}
                    className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 ml-4 flex-shrink-0 transition-colors"
                  >
                    {checkoutMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                    Upgrade
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">Pagamento seguro via Stripe · Cartão ou SEPA · Fatura emitida automaticamente</p>
        </div>
      )}

      {/* ── Invoice history ───────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Faturas e Recibos</h2>
          {hasStripe && (
            <button onClick={() => portalMutation.mutate()} disabled={portalMutation.isPending}
              className="flex items-center gap-1 text-xs text-primary hover:underline">
              <ExternalLink className="w-3.5 h-3.5" /> Portal de pagamento
            </button>
          )}
        </div>
        {invoices.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">Sem faturas</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Data', 'Descrição', 'Valor', 'Referência', 'Estado'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(inv.createdAt)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-[160px] truncate">
                    {inv.description || (inv.periodStart ? `${formatDate(inv.periodStart)} → ${formatDate(inv.periodEnd)}` : '—')}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">€{Number(inv.totalAmount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {inv.moloniDocNo && <span className="block text-blue-600">Fatura #{inv.moloniDocNo}</span>}
                    {inv.moloniReceiptNo && <span className="block text-green-600">Recibo #{inv.moloniReceiptNo}</span>}
                    {inv.pdfUrl && <a href={inv.pdfUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">PDF</a>}
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

      {/* ── Subscription events ───────────────────────────────── */}
      {(events as any[]).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Histórico de subscrição</h2>
          <div className="space-y-2">
            {(events as any[]).slice(0, 10).map((ev: any) => (
              <div key={ev.id} className="flex items-center gap-3 text-sm">
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0',
                  ev.type.includes('SUCCEEDED') || ev.type === 'CREATED' || ev.type === 'UPGRADED' ? 'bg-green-500' :
                  ev.type.includes('FAILED') || ev.type === 'SUSPENDED' || ev.type === 'CANCELLED' ? 'bg-red-500' : 'bg-blue-500')} />
                <span className="text-gray-700 flex-1">{ev.type.replace(/_/g, ' ')}</span>
                {ev.fromPlan && <span className="text-xs text-gray-400">{ev.fromPlan} → {ev.toPlan}</span>}
                <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(ev.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Contact ───────────────────────────────────────────── */}
      {!hasStripe && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex items-start gap-4">
          <Mail className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Upgrade ou personalização</p>
            <p className="text-sm text-blue-700 mt-1">Para upgrade de plano, add-ons ou proposta personalizada, contacte-nos.</p>
            <a href="mailto:support@icomply.pt"
              className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-blue-700 hover:text-blue-900">
              support@icomply.pt <span aria-hidden>→</span>
            </a>
          </div>
        </div>
      )}

    </div>
  );
}
