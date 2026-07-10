'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { licensingApi } from '@/lib/api';
import {
  Building2, Users, Euro, TrendingUp, Shield, CheckCircle, XCircle,
  Clock, Edit, ChevronRight, BarChart2, Loader2, AlertCircle,
  Brain, Briefcase, Globe, FileText, Settings, Zap, Plus,
  ArrowUpRight, CreditCard, Package, Activity,
} from 'lucide-react';
import { cn, formatDateTime, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';

// ── Helpers ───────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:    'bg-green-100 text-green-700',
  TRIAL:     'bg-yellow-100 text-yellow-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  PAST_DUE:  'bg-orange-100 text-orange-700',
  EXPIRED:   'bg-gray-100 text-gray-400',
  FREE:      'bg-blue-50 text-blue-600',
  PENDING:   'bg-gray-100 text-gray-500',
};

const PLAN_COLORS: Record<string, string> = {
  FREE:         'bg-gray-100 text-gray-600',
  STARTER:      'bg-blue-100 text-blue-700',
  PROFESSIONAL: 'bg-indigo-100 text-indigo-700',
  ENTERPRISE:   'bg-purple-100 text-purple-700',
  CUSTOM:       'bg-amber-100 text-amber-700',
};

const INVOICE_STATUS: Record<string, string> = {
  DRAFT:     'bg-gray-100 text-gray-500',
  SENT:      'bg-blue-100 text-blue-600',
  PAID:      'bg-green-100 text-green-700',
  OVERDUE:   'bg-red-100 text-red-600',
  CANCELLED: 'bg-gray-50 text-gray-400',
};

function Badge({ text, className }: { text: string; className?: string }) {
  return <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', className)}>{text}</span>;
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-sm text-gray-500 truncate">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Add-on catalogue (superadmin cost/margin editor) ───────────

function AddonCatalogueSection() {
  const qc = useQueryClient();
  const [edits, setEdits] = useState<Record<string, { costPrice?: number; marginMultiplier?: number; monthlyPrice?: number; annualPrice?: number }>>({});

  const { data: items, isLoading } = useQuery({
    queryKey: ['addon-catalogue'],
    queryFn: () => licensingApi.listAddonCatalogue().then(r => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: ({ key, data }: { key: string; data: any }) => licensingApi.updateAddonCatalogueItem(key, data),
    onSuccess: (_res, { key }) => {
      qc.invalidateQueries({ queryKey: ['addon-catalogue'] });
      qc.invalidateQueries({ queryKey: ['licence-catalogue'] });
      setEdits(p => { const { [key]: _omit, ...rest } = p; return rest; });
    },
  });

  const getValue = (item: any, field: string) => edits[item.key]?.[field as keyof typeof edits[string]] ?? Number(item[field]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Catálogo de Add-ons — Custo &amp; Margem</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Preço de custo (o que a iComply paga ao fornecedor) e margem — o preço de venda ao cliente é calculado automaticamente (custo × margem), mas pode ser sobreposto manualmente.
        </p>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center h-24"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Add-on', 'Custo (€/mês)', 'Margem', 'Preço venda (€/mês)', 'Preço venda (€/ano)', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(items || []).map((item: any) => {
                const dirty = !!edits[item.key];
                const costPrice = getValue(item, 'costPrice');
                const marginMultiplier = getValue(item, 'marginMultiplier');
                const computedMonthly = Number((costPrice * marginMultiplier).toFixed(2));
                const monthlyPrice = edits[item.key]?.monthlyPrice ?? computedMonthly;
                const annualPrice = edits[item.key]?.annualPrice ?? Number(item.annualPrice ?? monthlyPrice * 10);
                return (
                  <tr key={item.key} className="border-b border-gray-50">
                    <td className="px-4 py-2.5 text-sm text-gray-900">{item.label}</td>
                    <td className="px-4 py-2.5">
                      <input type="number" step="0.01" value={costPrice}
                        onChange={e => setEdits(p => ({ ...p, [item.key]: { ...p[item.key], costPrice: Number(e.target.value) } }))}
                        className="w-24 border border-gray-200 rounded px-2 py-1 text-xs text-right" />
                    </td>
                    <td className="px-4 py-2.5">
                      <input type="number" step="0.1" value={marginMultiplier}
                        onChange={e => setEdits(p => ({ ...p, [item.key]: { ...p[item.key], marginMultiplier: Number(e.target.value) } }))}
                        className="w-16 border border-gray-200 rounded px-2 py-1 text-xs text-right" />
                      <span className="text-xs text-gray-400 ml-1">×</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <input type="number" step="0.01" value={monthlyPrice}
                        onChange={e => setEdits(p => ({ ...p, [item.key]: { ...p[item.key], monthlyPrice: Number(e.target.value) } }))}
                        className="w-24 border border-gray-200 rounded px-2 py-1 text-xs text-right font-medium" />
                    </td>
                    <td className="px-4 py-2.5">
                      <input type="number" step="0.01" value={annualPrice}
                        onChange={e => setEdits(p => ({ ...p, [item.key]: { ...p[item.key], annualPrice: Number(e.target.value) } }))}
                        className="w-24 border border-gray-200 rounded px-2 py-1 text-xs text-right" />
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        disabled={!dirty || saveMutation.isPending}
                        onClick={() => saveMutation.mutate({ key: item.key, data: edits[item.key] })}
                        className={cn('px-3 py-1 rounded-lg text-xs font-medium transition-colors',
                          dirty ? 'bg-primary text-white hover:bg-primary/90' : 'bg-gray-100 text-gray-400 cursor-not-allowed')}
                      >
                        Guardar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Client drawer ─────────────────────────────────────────────

const MODULE_CATALOGUE_MAP: Record<string, string> = {
  dashboard: 'Dashboard', diagnostic: 'Diagnóstico', projects: 'Projetos',
  risks: 'Riscos', evidence: 'Evidências', audits: 'Auditorias', capa: 'CAPA',
  reports: 'Relatórios', policies: 'Políticas', gdpr: 'GDPR', nis2: 'NIS2',
  dora: 'DORA', soa: 'ISO 27001 SoA', vendors: 'Fornecedores',
  whistleblow: 'Denúncias', hr_compliance: 'HR Compliance', ai_governance: 'AI Governance',
  aiAssistant: 'AI Assistant', trustCenter: 'Trust Center', excelImport: 'Import Excel', translations: 'Traduções',
};

function ClientDrawer({ org, onClose }: { org: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: licence } = useQuery({
    queryKey: ['license', org.id],
    queryFn: () => licensingApi.getClient(org.id).then(r => r.data ?? null),
  });
  const { data: catalogue } = useQuery({
    queryKey: ['licence-catalogue'],
    queryFn: () => licensingApi.catalogue().then(r => r.data),
  });

  const { data: orgUsers, refetch: refetchUsers } = useQuery({
    queryKey: ['org-users', org.id],
    queryFn: () => licensingApi.listOrgUsers(org.id).then(r => r.data ?? []),
    enabled: false, // loaded lazily when tab selected
  });

  const [tab, setTab]         = useState<'license' | 'addons' | 'invoices' | 'events' | 'users'>('license');
  const [form, setForm]       = useState<any>(null);
  const [moduleMap, setModMap] = useState<Record<string, any>>({});
  const [invoiceForm, setInvoiceForm] = useState({ description: '', dueDate: '', sendToMoloni: true });
  const [inviteForm, setInviteForm]   = useState({ email: '', firstName: '', lastName: '', role: 'ADMIN' });
  const [inviting, setInviting]       = useState(false);
  const [inviteError, setInviteError] = useState('');

  // Init form — works for both new orgs (no licence yet) and existing ones
  if (!form && (licence !== undefined)) {
    setForm({
      plan:         licence?.plan         || 'FREE',
      status:       licence?.status       || 'ACTIVE',
      billingCycle: licence?.billingCycle || 'MONTHLY',
      aiProvider:   licence?.aiProvider   || 'AUTO',
      aiModel:      licence?.aiModel      || '',
      maxUsers:     licence?.maxUsers     || 5,
      maxStorageGb: licence?.maxStorageGb || 5,
      maxAiCredits: licence?.maxAiCredits || 100,
      contactEmail: licence?.contactEmail || '',
      notes:        licence?.notes        || '',
      autoRenew:    licence?.autoRenew    ?? true,
      isDemoMode:   (org as any).isDemoMode ?? false,
      moloniCustomerId:  licence?.moloniCustomerId  || '',
      stripeCustomerId:  licence?.stripeCustomerId  || '',
    });
    const map: Record<string, any> = {};
    for (const m of licence?.modules || []) map[m.module] = { ...m };
    setModMap(map);
  }

  const saveMutation = useMutation({
    mutationFn: (d: any) => licensingApi.upsert(org.id, d),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['license', org.id] }); qc.invalidateQueries({ queryKey: ['license-clients'] }); },
  });

  const invoiceMutation = useMutation({
    mutationFn: (d: any) => licensingApi.createInvoice(org.id, d),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['license', org.id] }),
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => licensingApi.markPaid(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['license', org.id] }),
  });

  const handleSave = () => {
    const modules = Object.entries(moduleMap).map(([module, v]: any) => ({
      module, enabled: v.enabled ?? false, monthlyPrice: v.monthlyPrice ?? 0, annualPrice: v.annualPrice ?? 0,
    }));
    saveMutation.mutate({ ...form, modules });
  };

  const total = Object.values(moduleMap).filter((m: any) => m.enabled)
    .reduce((s: number, m: any) => s + Number(form?.billingCycle === 'ANNUAL' ? m.annualPrice : m.monthlyPrice), 0);

  const tabs = [
    { key: 'license',  label: 'Licença',       icon: Settings },
    { key: 'addons',   label: 'Add-ons',        icon: Package  },
    { key: 'invoices', label: 'Faturas',        icon: FileText },
    { key: 'users',    label: 'Utilizadores',   icon: Users    },
    { key: 'events',   label: 'Histórico',      icon: Activity },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">
                {org.name.substring(0, 2).toUpperCase()}
              </div>
              <h2 className="text-lg font-bold text-gray-900">{org.name}</h2>
              {licence && <Badge text={licence.plan || 'FREE'} className={PLAN_COLORS[licence.plan] || 'bg-gray-100 text-gray-600'} />}
              {licence && <Badge text={licence.status || 'ACTIVE'} className={STATUS_COLORS[licence.status] || ''} />}
            </div>
            <p className="text-xs text-gray-500 mt-0.5 ml-10">
              {org.industry} · {org.country} · {org._count?.users ?? 0} utilizadores
              {licence?.stripeCustomerId && <span className="ml-2 text-green-600">✓ Stripe</span>}
              {licence?.moloniCustomerId && <span className="ml-2 text-blue-600">✓ Moloni</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={saveMutation.isPending}
              className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Guardar
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none px-2">×</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b px-6 flex gap-1">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => { setTab(key as any); if (key === 'users') refetchUsers(); }}
              className={cn('flex items-center gap-1.5 px-3 py-3 text-sm border-b-2 -mb-px transition-colors',
                tab === key ? 'border-primary text-primary font-medium' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* ── License tab ─────────────────────────────────── */}
          {tab === 'license' && form && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { l: 'Plano',      f: 'plan',         opts: ['FREE','STARTER','PROFESSIONAL','ENTERPRISE','CUSTOM'] },
                  { l: 'Estado',     f: 'status',       opts: ['ACTIVE','TRIAL','SUSPENDED','CANCELLED','PAST_DUE','EXPIRED'] },
                  { l: 'Faturação',  f: 'billingCycle', opts: ['MONTHLY','QUARTERLY','ANNUAL','MULTI_YEAR'] },
                  { l: 'Provider IA', f: 'aiProvider',  opts: ['AUTO','ANTHROPIC','OPENAI'] },
                ].map(({ l, f, opts }) => (
                  <div key={f}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{l}</label>
                    <select value={form[f]} onChange={e => setForm((p: any) => ({ ...p, [f]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                      {opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                {[
                  { l: 'Modelo IA (override)', f: 'aiModel',      ph: 'ex: gpt-4o-mini', num: false },
                  { l: 'Máx. utilizadores',    f: 'maxUsers',     ph: '',                num: true  },
                  { l: 'Storage (GB)',          f: 'maxStorageGb', ph: '',                num: true  },
                  { l: 'AI Credits',            f: 'maxAiCredits', ph: '',                num: true  },
                ].map(({ l, f, ph, num }) => (
                  <div key={f}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{l}</label>
                    <input type={num ? 'number' : 'text'} value={form[f]} placeholder={ph}
                      onChange={e => setForm((p: any) => ({ ...p, [f]: num ? Number(e.target.value) : e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email de faturação</label>
                  <input value={form.contactEmail} onChange={e => setForm((p: any) => ({ ...p, contactEmail: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Stripe Customer ID</label>
                  <input value={form.stripeCustomerId} onChange={e => setForm((p: any) => ({ ...p, stripeCustomerId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-xs" placeholder="cus_..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Moloni Customer ID</label>
                  <input value={form.moloniCustomerId} onChange={e => setForm((p: any) => ({ ...p, moloniCustomerId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-xs" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Notas internas</label>
                  <textarea value={form.notes} rows={2} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
                </div>
                {/* Demo Mode */}
                <div className="col-span-2">
                  <div className={cn(
                    'flex items-start gap-3 p-3 rounded-xl border-2 transition-colors',
                    form.isDemoMode ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-gray-50',
                  )}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                        <Zap className={cn('w-4 h-4 flex-shrink-0', form.isDemoMode ? 'text-amber-500' : 'text-gray-400')} />
                        Modo Demo
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Activa todas as funcionalidades ENTERPRISE para demonstrações. Não substitui o plano real.
                      </p>
                    </div>
                    <button
                      onClick={() => setForm((p: any) => ({ ...p, isDemoMode: !p.isDemoMode }))}
                      className={cn(
                        'relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5',
                        form.isDemoMode ? 'bg-amber-500' : 'bg-gray-300',
                      )}
                    >
                      <span className={cn(
                        'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                        form.isDemoMode ? 'translate-x-5' : 'translate-x-0',
                      )} />
                    </button>
                  </div>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="autoRenew" checked={form.autoRenew} onChange={e => setForm((p: any) => ({ ...p, autoRenew: e.target.checked }))} />
                  <label htmlFor="autoRenew" className="text-sm text-gray-700">Renovação automática</label>
                </div>
              </div>

              {/* Modules */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">Módulos</h3>
                  <span className="text-xs font-bold text-primary">€{total.toFixed(2)}/{form.billingCycle === 'ANNUAL' ? 'ano' : 'mês'}</span>
                </div>
                <div className="space-y-1.5">
                  {catalogue?.modules?.map((mod: any) => {
                    const cur = moduleMap[mod.key] || { enabled: false, monthlyPrice: mod.monthlyPrice, annualPrice: mod.annualPrice };
                    const enabled = cur.enabled ?? false;
                    const price   = form.billingCycle === 'ANNUAL' ? cur.annualPrice ?? mod.annualPrice : cur.monthlyPrice ?? mod.monthlyPrice;
                    return (
                      <div key={mod.key} className={cn('flex items-center gap-3 py-2 px-3 rounded-lg', enabled ? 'bg-blue-50' : 'bg-gray-50')}>
                        <button onClick={() => setModMap(p => ({ ...p, [mod.key]: { ...p[mod.key], module: mod.key, enabled: !enabled } }))}
                          className={cn('w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0', enabled ? 'bg-primary border-primary' : 'border-gray-300')}>
                          {enabled && <CheckCircle className="w-3 h-3 text-white" />}
                        </button>
                        <span className={cn('flex-1 text-sm', enabled ? 'text-gray-900 font-medium' : 'text-gray-500')}>
                          {MODULE_CATALOGUE_MAP[mod.key] || mod.label}
                        </span>
                        <span className="text-xs text-gray-400">€</span>
                        <input type="number" value={price}
                          onChange={e => setModMap(p => ({ ...p, [mod.key]: { ...p[mod.key], module: mod.key, [form.billingCycle === 'ANNUAL' ? 'annualPrice' : 'monthlyPrice']: Number(e.target.value) } }))}
                          className="w-20 border border-gray-200 rounded px-2 py-0.5 text-xs text-right" disabled={!enabled} />
                        <span className="text-xs text-gray-400">/{form.billingCycle === 'ANNUAL' ? 'ano' : 'mês'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── Add-ons tab ─────────────────────────────────── */}
          {tab === 'addons' && catalogue && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Activa ou desactiva add-ons para esta organização.</p>
              {catalogue.addons?.map((addon: any) => {
                const active = licence?.addons?.find((a: any) => a.addonKey === addon.key);
                const enabled = active?.enabled ?? false;
                return (
                  <div key={addon.key} className={cn('flex items-center gap-3 p-3 rounded-xl border transition-colors', enabled ? 'border-primary/30 bg-blue-50/50' : 'border-gray-100 bg-gray-50/50')}>
                    <Package className={cn('w-4 h-4 flex-shrink-0', enabled ? 'text-primary' : 'text-gray-400')} />
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium', enabled ? 'text-gray-900' : 'text-gray-500')}>{addon.label}</p>
                      <p className="text-xs text-gray-400">€{addon.monthlyPrice}/mês · €{addon.annualPrice}/ano</p>
                    </div>
                    <button
                      onClick={() => licensingApi.toggleAddon(org.id, addon.key, !enabled).then(() => qc.invalidateQueries({ queryKey: ['license', org.id] }))}
                      className={cn('px-3 py-1 rounded-lg text-xs font-medium transition-colors', enabled ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300')}
                    >
                      {enabled ? 'Activo' : 'Activar'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Invoices tab ────────────────────────────────── */}
          {tab === 'invoices' && (
            <>
              {/* Create invoice form */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Nova Fatura</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <input value={invoiceForm.description} onChange={e => setInvoiceForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Descrição (ex: iComply Professional — Outubro 2025)"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <input type="date" value={invoiceForm.dueDate} onChange={e => setInvoiceForm(p => ({ ...p, dueDate: e.target.value }))}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="sendMoloni" checked={invoiceForm.sendToMoloni} onChange={e => setInvoiceForm(p => ({ ...p, sendToMoloni: e.target.checked }))} />
                    <label htmlFor="sendMoloni" className="text-xs text-gray-600">Enviar para Moloni (série ICY)</label>
                  </div>
                </div>
                <button onClick={() => invoiceMutation.mutate(invoiceForm)} disabled={invoiceMutation.isPending}
                  className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium">
                  {invoiceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Criar fatura
                </button>
              </div>

              {/* Invoice list */}
              <div className="space-y-2">
                {(licence?.invoices || []).map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{inv.description || `Fatura ${inv.id.slice(-6)}`}</p>
                      <p className="text-xs text-gray-400">
                        {formatDate(inv.createdAt)}
                        {inv.moloniDocNo && <span className="ml-2 text-blue-600">#{inv.moloniDocNo}</span>}
                        {inv.moloniReceiptNo && <span className="ml-2 text-green-600">Recibo #{inv.moloniReceiptNo}</span>}
                        {inv.stripePaymentIntentId && <span className="ml-2 text-violet-600">✓ Stripe</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-bold text-gray-900">€{Number(inv.totalAmount).toFixed(2)}</span>
                      <Badge text={inv.status} className={INVOICE_STATUS[inv.status] || 'bg-gray-100 text-gray-500'} />
                      {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                        <button onClick={() => markPaidMutation.mutate(inv.id)}
                          className="text-xs text-green-700 bg-green-100 hover:bg-green-200 px-2 py-1 rounded-lg transition-colors">
                          Marcar pago
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Users tab ──────────────────────────────────── */}
          {tab === 'users' && (
            <div className="space-y-4">
              {/* Invite form */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-blue-900">Convidar utilizador</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Email *</label>
                    <input value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="email@empresa.pt" type="email"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Função</label>
                    <select value={inviteForm.role} onChange={e => setInviteForm(p => ({ ...p, role: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                      {[
                        { v: 'ADMIN',              l: 'Administrador' },
                        { v: 'COMPLIANCE_MANAGER', l: 'Compliance Manager' },
                        { v: 'CONSULTANT',         l: 'Consultor / Implementador' },
                        { v: 'INTERNAL_AUDITOR',   l: 'Auditor Interno' },
                        { v: 'EXTERNAL_AUDITOR',   l: 'Auditor Externo' },
                        { v: 'VIEWER',             l: 'Observador (só leitura)' },
                      ].map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Primeiro nome</label>
                    <input value={inviteForm.firstName} onChange={e => setInviteForm(p => ({ ...p, firstName: e.target.value }))}
                      placeholder="João" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Apelido</label>
                    <input value={inviteForm.lastName} onChange={e => setInviteForm(p => ({ ...p, lastName: e.target.value }))}
                      placeholder="Silva" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                {inviteError && <p className="text-xs text-red-600">{inviteError}</p>}
                <button
                  disabled={!inviteForm.email || inviting}
                  onClick={async () => {
                    if (!inviteForm.email) return;
                    setInviting(true); setInviteError('');
                    try {
                      await licensingApi.inviteOrgUser(org.id, inviteForm);
                      setInviteForm({ email: '', firstName: '', lastName: '', role: 'ADMIN' });
                      refetchUsers();
                    } catch (e: any) {
                      setInviteError(e?.response?.data?.message || 'Erro ao convidar');
                    } finally { setInviting(false); }
                  }}
                  className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Enviar convite
                </button>
              </div>

              {/* User list */}
              <div className="space-y-2">
                {!orgUsers ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
                ) : orgUsers.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Sem utilizadores nesta organização</p>
                ) : orgUsers.map((u: any) => (
                  <div key={u.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                      {(u.firstName?.[0] || u.email[0]).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {u.firstName || u.lastName ? `${u.firstName} ${u.lastName}`.trim() : u.email}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{u.role}</span>
                      <span className={cn('text-xs px-2 py-0.5 rounded font-medium',
                        u.status === 'ACTIVE'   ? 'bg-green-100 text-green-700' :
                        u.status === 'INVITED'  ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-500'
                      )}>{u.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Events tab ─────────────────────────────────── */}
          {tab === 'events' && (
            <div className="space-y-2">
              {(licence?.events || []).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Sem eventos registados</p>
              ) : (
                (licence?.events || []).map((ev: any) => (
                  <div key={ev.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                      ev.type.includes('SUCCEEDED') || ev.type === 'CREATED' || ev.type === 'UPGRADED' ? 'bg-green-500' :
                      ev.type.includes('FAILED') || ev.type === 'SUSPENDED' || ev.type === 'CANCELLED' ? 'bg-red-500' : 'bg-blue-500'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{ev.type.replace(/_/g, ' ')}</p>
                      {ev.fromPlan && <p className="text-xs text-gray-500">{ev.fromPlan} → {ev.toPlan}</p>}
                      <p className="text-xs text-gray-400">{formatDateTime(ev.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────

const EMPTY_NEW_CLIENT = {
  name: '', industry: '', country: 'PT', vatNumber: '', website: '', billingEmail: '',
  plan: 'FREE', isDemoMode: false,
  adminEmail: '', adminFirstName: '', adminLastName: '',
};

export default function LicensingPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [selectedOrg, setSelectedOrg]   = useState<any>(null);
  const [search, setSearch]             = useState('');
  const [planFilter, setPlanFilter]     = useState('ALL');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm]           = useState({ ...EMPTY_NEW_CLIENT });

  const createClientMutation = useMutation({
    mutationFn: (data: any) => licensingApi.createClient(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['license-clients'] });
      qc.invalidateQueries({ queryKey: ['license-stats'] });
      setShowNewModal(false);
      setNewForm({ ...EMPTY_NEW_CLIENT });
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['license-stats'],
    queryFn: () => licensingApi.stats().then(r => r.data),
  });

  const { data: clients, isLoading } = useQuery({
    queryKey: ['license-clients'],
    queryFn: () => licensingApi.listClients().then(r => r.data),
  });

  const isCCAdmin = user?.role === 'SUPER_ADMIN' &&
    user?.organization?.name?.toLowerCase().includes('contemporary constellation');

  if (!isCCAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <Shield className="w-12 h-12 text-gray-300 mb-4" />
        <h2 className="text-lg font-semibold text-gray-600">Acesso Restrito</h2>
        <p className="text-sm text-gray-400 mt-1">Área exclusiva da Contemporary Constellation</p>
      </div>
    );
  }

  const filtered = (clients || []).filter((c: any) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchPlan   = planFilter === 'ALL' || c.license?.plan === planFilter;
    return matchSearch && matchPlan;
  });

  const mrr = stats?.mrr ?? 0;
  const arr = stats?.arr ?? 0;

  return (
    <div className="space-y-6">

      {/* ── KPI strip ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2}   label="Total clientes"      value={stats?.totalOrgs ?? '—'}  color="bg-blue-50 text-blue-600" />
        <StatCard icon={CheckCircle} label="Licenças activas"    value={stats?.activeOrgs ?? '—'} sub={`${stats?.trialOrgs ?? 0} em trial`} color="bg-green-50 text-green-600" />
        <StatCard icon={TrendingUp}  label="MRR estimado"        value={`€${mrr.toLocaleString()}`} sub={`ARR ≈ €${arr.toLocaleString()}`} color="bg-purple-50 text-purple-600" />
        <StatCard icon={Euro}        label="Receita paga (total)" value={`€${Number(stats?.totalRevenue ?? 0).toFixed(0)}`} sub={`€${Number(stats?.pendingRevenue ?? 0).toFixed(0)} pendente`} color="bg-amber-50 text-amber-600" />
      </div>

      {/* ── Plan distribution ─────────────────────────────────── */}
      {stats?.planDistribution && stats.planDistribution.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Distribuição por Plano</h3>
          <div className="flex items-end gap-3 h-16">
            {stats.planDistribution.map((p: any) => {
              const maxCount = Math.max(...stats.planDistribution.map((x: any) => x._count));
              const height = Math.max(8, Math.round((p._count / maxCount) * 56));
              return (
                <div key={p.plan} className="flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-gray-700">{p._count}</span>
                  <div className={cn('rounded-t w-10 transition-all', PLAN_COLORS[p.plan] || 'bg-gray-200')} style={{ height }} />
                  <span className="text-xs text-gray-500">{p.plan}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Client table ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Clientes / Organizações</h2>
            <p className="text-xs text-gray-500 mt-0.5">{filtered.length} de {(clients || []).length} organizações</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={planFilter} onChange={e => setPlanFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600">
              <option value="ALL">Todos os planos</option>
              {['FREE','STARTER','PROFESSIONAL','ENTERPRISE','CUSTOM'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar..."
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-48 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            <button onClick={() => setShowNewModal(true)}
              className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 whitespace-nowrap">
              <Plus className="w-4 h-4" /> Nova Organização
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Cliente', 'Plano', 'Estado', 'Módulos', 'Add-ons', 'Utilizadores', 'MRR', 'Faturação', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((org: any) => {
                  const lic = org.license;
                  const enabledModules = lic?.modules?.filter((m: any) => m.enabled) || [];
                  const enabledAddons  = lic?.addons?.filter((a: any) => a.enabled) || [];
                  const orgMrr = enabledModules.reduce((s: number, m: any) => s + parseFloat(String(m.monthlyPrice ?? 0)), 0);
                  const hasStripe = !!lic?.stripeCustomerId;
                  const hasMoloni = !!lic?.moloniCustomerId;
                  return (
                    <tr key={org.id} onClick={() => setSelectedOrg(org)}
                      className="border-b border-gray-100 hover:bg-blue-50/30 cursor-pointer transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">
                            {org.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{org.name}</p>
                            <p className="text-xs text-gray-400 truncate">{org.industry}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge text={lic?.plan || 'FREE'} className={PLAN_COLORS[lic?.plan] || 'bg-gray-100 text-gray-600'} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge text={lic?.status || 'NO LICENSE'} className={STATUS_COLORS[lic?.status] || 'bg-gray-100 text-gray-500'} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{enabledModules.length}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{enabledAddons.length}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">{org._count?.users ?? 0} / {lic?.maxUsers ?? org.maxUsers ?? 5}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">€{orgMrr}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {hasStripe && <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">Stripe</span>}
                          {hasMoloni && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Moloni</span>}
                          {!hasStripe && !hasMoloni && <span className="text-xs text-gray-400">Manual</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Catálogo de add-ons (custo/margem) ─────────────────── */}
      <AddonCatalogueSection />

      {/* Drawer */}
      {selectedOrg && <ClientDrawer org={selectedOrg} onClose={() => setSelectedOrg(null)} />}

      {/* ── Nova Organização Modal ──────────────────────────────── */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowNewModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-base font-bold text-gray-900">Nova Organização</h2>
                <p className="text-xs text-gray-500 mt-0.5">Criar tenant + convidar primeiro administrador</p>
              </div>
              <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none px-1">×</button>
            </div>
            <div className="p-6 space-y-5">
              {/* Org info */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dados da Organização</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nome da empresa *</label>
                    <input value={newForm.name} onChange={e => setNewForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      placeholder="Ex: Empresa ABC, Lda" />
                  </div>
                  {[
                    { l: 'Sector', f: 'industry', ph: 'TECHNOLOGY, FINANCE, HEALTH...' },
                    { l: 'País', f: 'country', ph: 'PT' },
                    { l: 'NIF/VAT', f: 'vatNumber', ph: '123456789' },
                    { l: 'Website', f: 'website', ph: 'https://...' },
                  ].map(({ l, f, ph }) => (
                    <div key={f}>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{l}</label>
                      <input value={(newForm as any)[f]} onChange={e => setNewForm(p => ({ ...p, [f]: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={ph} />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Email de faturação</label>
                    <input type="email" value={newForm.billingEmail} onChange={e => setNewForm(p => ({ ...p, billingEmail: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="billing@empresa.pt" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Plano inicial</label>
                    <select value={newForm.plan} onChange={e => setNewForm(p => ({ ...p, plan: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                      {['FREE','STARTER','PROFESSIONAL','ENTERPRISE'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-3 pt-5">
                    <button onClick={() => setNewForm(p => ({ ...p, isDemoMode: !p.isDemoMode }))}
                      className={cn('relative w-10 h-5 rounded-full transition-colors', newForm.isDemoMode ? 'bg-amber-500' : 'bg-gray-300')}>
                      <span className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', newForm.isDemoMode ? 'translate-x-5' : 'translate-x-0.5')} />
                    </button>
                    <label className="text-sm text-gray-700">Modo Demo</label>
                  </div>
                </div>
              </div>

              {/* Admin user */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Primeiro Administrador <span className="text-gray-400 font-normal">(opcional)</span></p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                    <input type="email" value={newForm.adminEmail} onChange={e => setNewForm(p => ({ ...p, adminEmail: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="admin@empresa.pt" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Primeiro nome</label>
                    <input value={newForm.adminFirstName} onChange={e => setNewForm(p => ({ ...p, adminFirstName: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Último nome</label>
                    <input value={newForm.adminLastName} onChange={e => setNewForm(p => ({ ...p, adminLastName: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                {newForm.adminEmail && (
                  <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Será enviado convite por email para <strong>{newForm.adminEmail}</strong>
                  </p>
                )}
              </div>

              {createClientMutation.isError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  {(createClientMutation.error as any)?.response?.data?.message || 'Erro ao criar organização'}
                </p>
              )}
            </div>
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
              <button onClick={() => setShowNewModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancelar</button>
              <button
                onClick={() => createClientMutation.mutate(newForm)}
                disabled={!newForm.name.trim() || createClientMutation.isPending}
                className="flex items-center gap-1.5 bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                {createClientMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Criar Organização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
