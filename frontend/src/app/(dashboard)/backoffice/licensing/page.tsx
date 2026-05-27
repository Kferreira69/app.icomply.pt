'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { licensingApi } from '@/lib/api';
import {
  Building2, Users, Euro, TrendingUp, Shield, CheckCircle, XCircle,
  Clock, Edit, Plus, ChevronRight, BarChart2, Loader2, AlertCircle,
  Brain, Briefcase, Globe, FileText, Settings,
} from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:    'bg-green-100 text-green-700',
  TRIAL:     'bg-yellow-100 text-yellow-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  FREE:      'bg-blue-50 text-blue-600',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[status] || 'bg-gray-100 text-gray-600')}>
      {status}
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', color)}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

// ── Module toggle row ─────────────────────────────────────────────────────────

const MODULE_ICONS: Record<string, any> = {
  gdpr: Shield, nis2: Shield, dora: AlertCircle, soa: FileText,
  hr_compliance: Briefcase, ai_governance: Brain, aiAssistant: Brain,
  whistleblow: AlertCircle, vendors: Building2, trustCenter: Globe,
};

function ModuleRow({
  mod, enabled, monthlyPrice, annualPrice, billingCycle, onChange,
}: {
  mod: any; enabled: boolean; monthlyPrice: number; annualPrice: number;
  billingCycle: string; onChange: (key: string, val: any) => void;
}) {
  const Icon = MODULE_ICONS[mod.key] || Settings;
  const price = billingCycle === 'ANNUAL' ? annualPrice : monthlyPrice;

  return (
    <div className={cn('flex items-center gap-3 py-2 px-3 rounded-lg transition-colors', enabled ? 'bg-blue-50' : 'bg-gray-50')}>
      <button
        onClick={() => onChange('enabled', !enabled)}
        className={cn(
          'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0',
          enabled ? 'bg-blue-600 border-blue-600' : 'border-gray-300',
        )}
      >
        {enabled && <CheckCircle className="w-3 h-3 text-white" />}
      </button>
      <Icon className={cn('w-4 h-4 flex-shrink-0', enabled ? 'text-blue-600' : 'text-gray-400')} />
      <span className={cn('flex-1 text-sm', enabled ? 'text-gray-900 font-medium' : 'text-gray-500')}>
        {mod.label}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">€</span>
        <input
          type="number"
          value={billingCycle === 'ANNUAL' ? annualPrice : monthlyPrice}
          onChange={e => onChange(billingCycle === 'ANNUAL' ? 'annualPrice' : 'monthlyPrice', Number(e.target.value))}
          className="w-20 border border-gray-200 rounded px-2 py-0.5 text-xs text-right"
          disabled={!enabled}
        />
        <span className="text-xs text-gray-400">/{billingCycle === 'ANNUAL' ? 'ano' : 'mês'}</span>
      </div>
    </div>
  );
}

// ── Client drawer ─────────────────────────────────────────────────────────────

function ClientDrawer({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: clientData, isLoading } = useQuery({
    queryKey: ['license', orgId],
    queryFn: () => licensingApi.getClient(orgId).then(r => r.data),
  });
  const { data: catalogue } = useQuery({
    queryKey: ['licence-catalogue'],
    queryFn: () => licensingApi.catalogue().then(r => r.data),
  });

  const [form, setForm] = useState<any>(null);
  const [moduleMap, setModuleMap] = useState<Record<string, any>>({});

  // Initialise form when data loads
  const license = clientData?.license;

  useState(() => {
    if (license && !form) {
      setForm({
        plan: license.plan || 'FREE',
        status: license.status || 'ACTIVE',
        billingCycle: license.billingCycle || 'MONTHLY',
        aiProvider: license.aiProvider || 'AUTO',
        aiModel: license.aiModel || '',
        maxUsers: license.maxUsers || 5,
        contactEmail: license.contactEmail || '',
        notes: license.notes || '',
      });
      const map: Record<string, any> = {};
      for (const m of licence?.modules || []) {
        map[m.module] = { ...m };
      }
      setModuleMap(map);
    }
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => licensingApi.upsert(orgId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['license', orgId] });
      qc.invalidateQueries({ queryKey: ['license-clients'] });
    },
  });

  const handleSave = () => {
    const modules = Object.entries(moduleMap).map(([module, vals]: any) => ({
      module,
      enabled:      vals.enabled ?? false,
      monthlyPrice: vals.monthlyPrice ?? 0,
      annualPrice:  vals.annualPrice ?? 0,
    }));
    saveMutation.mutate({ ...form, modules });
  };

  const updateModule = (key: string, field: string, val: any) => {
    setModuleMap(prev => ({ ...prev, [key]: { ...prev[key], module: key, [field]: val } }));
  };

  const billingCycle = form?.billingCycle || 'MONTHLY';

  // Calculate total
  const total = Object.values(moduleMap)
    .filter((m: any) => m.enabled)
    .reduce((sum: number, m: any) => sum + Number(billingCycle === 'ANNUAL' ? m.annualPrice : m.monthlyPrice), 0);

  if (isLoading || !catalogue) {
    return (
      <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  const org = clientData;

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex justify-end">
      <div className="w-full max-w-2xl bg-white shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{org?.name}</h2>
            <p className="text-sm text-gray-500">{org?.industry} · {org?.country}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Guardar
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* License basics */}
          {form && (
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Plano', field: 'plan', options: ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'] },
                { label: 'Estado', field: 'status', options: ['ACTIVE', 'TRIAL', 'SUSPENDED', 'CANCELLED'] },
                { label: 'Facturação', field: 'billingCycle', options: ['MONTHLY', 'ANNUAL'] },
                { label: 'Provider IA', field: 'aiProvider', options: ['AUTO', 'ANTHROPIC', 'OPENAI'] },
              ].map(({ label, field, options }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                  <select
                    value={form[field]}
                    onChange={e => setForm((f: any) => ({ ...f, [field]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  >
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Modelo IA (override)</label>
                <input
                  value={form.aiModel}
                  onChange={e => setForm((f: any) => ({ ...f, aiModel: e.target.value }))}
                  placeholder="ex: gpt-4o-mini"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Máx. utilizadores</label>
                <input
                  type="number"
                  value={form.maxUsers}
                  onChange={e => setForm((f: any) => ({ ...f, maxUsers: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Email de contacto de billing</label>
                <input
                  value={form.contactEmail}
                  onChange={e => setForm((f: any) => ({ ...f, contactEmail: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Notas internas</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>
            </div>
          )}

          {/* Modules */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Módulos activos</h3>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Total estimado:</span>
                <span className="font-bold text-blue-600">€{total.toFixed(2)}/{billingCycle === 'ANNUAL' ? 'ano' : 'mês'}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              {catalogue?.modules?.map((mod: any) => {
                const current = moduleMap[mod.key] || { enabled: false, monthlyPrice: mod.monthlyPrice, annualPrice: mod.annualPrice };
                return (
                  <ModuleRow
                    key={mod.key}
                    mod={mod}
                    enabled={current.enabled ?? false}
                    monthlyPrice={current.monthlyPrice ?? mod.monthlyPrice}
                    annualPrice={current.annualPrice ?? mod.annualPrice}
                    billingCycle={billingCycle}
                    onChange={(field, val) => updateModule(mod.key, field, val)}
                  />
                );
              })}
            </div>
          </div>

          {/* Invoice history */}
          {license?.invoices?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Histórico de faturas</h3>
              <div className="space-y-2">
                {license.invoices.map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg text-sm">
                    <div>
                      <span className="font-medium">{inv.description}</span>
                      <span className="text-gray-400 ml-2 text-xs">{formatDateTime(inv.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">€{Number(inv.totalAmount).toFixed(2)}</span>
                      <StatusBadge status={inv.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LicensingPage() {
  const { user } = useAuthStore();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['license-stats'],
    queryFn: () => licensingApi.stats().then(r => r.data),
  });

  const { data: clients, isLoading } = useQuery({
    queryKey: ['license-clients'],
    queryFn: () => licensingApi.listClients().then(r => r.data),
  });

  const filtered = (clients || []).filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  // Guard: only Contemporary Constellation admins
  const isCCAdmin = user?.role === 'SUPER_ADMIN' &&
    user?.organization?.name?.toLowerCase().includes('contemporary constellation');

  if (!isCCAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <Shield className="w-12 h-12 text-gray-300 mb-4" />
        <h2 className="text-lg font-semibold text-gray-600">Acesso Restrito</h2>
        <p className="text-sm text-gray-400 mt-1">Esta área é exclusiva da Contemporary Constellation</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Building2}   label="Total de clientes"    value={stats?.totalOrgs ?? '—'}                          color="bg-blue-50 text-blue-600" />
        <StatCard icon={CheckCircle} label="Licenças activas"     value={stats?.activeOrgs ?? '—'}                         color="bg-green-50 text-green-600" />
        <StatCard icon={Euro}        label="Receita total (pago)"  value={`€${Number(stats?.totalRevenue ?? 0).toFixed(0)}`} color="bg-purple-50 text-purple-600" />
        <StatCard icon={TrendingUp}  label="Módulo top"           value={stats?.topModules?.[0]?.module ?? '—'}            color="bg-orange-50 text-orange-600" />
      </div>

      {/* Client list */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Clientes / Organizações</h2>
            <p className="text-xs text-gray-500 mt-0.5">Gestão de licenças e módulos por cliente</p>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar cliente..."
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-56 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Cliente', 'Plano', 'Estado', 'Provider IA', 'Módulos activos', 'Utilizadores', 'Desde', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((org: any) => (
                <tr
                  key={org.id}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedOrgId(org.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
                        {org.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{org.name}</p>
                        <p className="text-xs text-gray-400">{org.industry}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={org.license?.plan || 'FREE'} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={org.license?.status || 'ACTIVE'} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {org.aiProvider || 'AUTO'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {org.license?.modules?.filter((m: any) => m.enabled).length ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Users className="w-3.5 h-3.5" />
                      {org._count?.users ?? 0} / {org.maxUsers || 5}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {formatDateTime(org.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Drawer */}
      {selectedOrgId && (
        <ClientDrawer orgId={selectedOrgId} onClose={() => setSelectedOrgId(null)} />
      )}
    </div>
  );
}
