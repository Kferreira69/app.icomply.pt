'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { featureFlagsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';
import { Flag, CheckCircle2, XCircle, Save, RefreshCw, Filter, Search, AlertCircle } from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────

const PLANS = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'] as const;
type Plan = typeof PLANS[number];

const PLAN_COLORS: Record<Plan, string> = {
  FREE:         'bg-gray-100 text-gray-600 ring-gray-200',
  STARTER:      'bg-blue-100 text-blue-700 ring-blue-200',
  PROFESSIONAL: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
  ENTERPRISE:   'bg-purple-100 text-purple-700 ring-purple-200',
};

const PLAN_SELECTED: Record<Plan, string> = {
  FREE:         'bg-gray-600 text-white ring-gray-400',
  STARTER:      'bg-blue-600 text-white ring-blue-400',
  PROFESSIONAL: 'bg-indigo-600 text-white ring-indigo-400',
  ENTERPRISE:   'bg-purple-600 text-white ring-purple-400',
};

const CATEGORY_COLORS: Record<string, string> = {
  CORE:         'bg-green-50 text-green-700',
  COMPLIANCE:   'bg-blue-50 text-blue-700',
  FRAMEWORKS:   'bg-violet-50 text-violet-700',
  OPERATIONS:   'bg-amber-50 text-amber-700',
  GOVERNANCE:   'bg-rose-50 text-rose-700',
  INTELLIGENCE: 'bg-cyan-50 text-cyan-700',
  ENTERPRISE:   'bg-purple-50 text-purple-700',
};

interface FeatureFlag {
  id: string;
  key: string;
  label: string;
  description?: string;
  category: string;
  requiredPlan: string;
  isActive: boolean;
  sortOrder: number;
}

// ── Component ─────────────────────────────────────────────────

export default function FeatureFlagsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [dirty, setDirty] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data: flags = [], isLoading, error } = useQuery<FeatureFlag[]>({
    queryKey: ['feature-flags-admin'],
    queryFn:  () => featureFlagsApi.listAll().then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: (updates: { key: string; requiredPlan: string }[]) =>
      featureFlagsApi.bulkUpdate(updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feature-flags-admin'] });
      setDirty({});
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ key, isActive }: { key: string; isActive: boolean }) =>
      featureFlagsApi.update(key, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feature-flags-admin'] }),
  });

  const categories = useMemo(() => {
    const cats = Array.from(new Set(flags.map(f => f.category)));
    return ['ALL', ...cats.sort()];
  }, [flags]);

  const filtered = useMemo(() => {
    return flags.filter(f => {
      if (filterCategory !== 'ALL' && f.category !== filterCategory) return false;
      if (search && !f.label.toLowerCase().includes(search.toLowerCase()) &&
          !f.key.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [flags, filterCategory, search]);

  const grouped = useMemo(() => {
    const map: Record<string, FeatureFlag[]> = {};
    for (const f of filtered) {
      if (!map[f.category]) map[f.category] = [];
      map[f.category].push(f);
    }
    return map;
  }, [filtered]);

  function setFlagPlan(key: string, plan: string) {
    setDirty(prev => ({ ...prev, [key]: plan }));
  }

  function getEffectivePlan(flag: FeatureFlag): string {
    return dirty[flag.key] ?? flag.requiredPlan;
  }

  async function saveChanges() {
    setSaving(true);
    const updates = Object.entries(dirty).map(([key, requiredPlan]) => ({ key, requiredPlan }));
    try {
      await updateMutation.mutateAsync(updates);
    } finally {
      setSaving(false);
    }
  }

  const dirtyCount = Object.keys(dirty).length;

  if (user?.role !== 'SUPERADMIN') {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        <AlertCircle className="w-6 h-6 mr-2" />
        Acesso restrito a superadmins.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Flag className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Feature Flags</h1>
            <p className="text-sm text-gray-500">Configurar que funcionalidades estão disponíveis em cada plano</p>
          </div>
        </div>

        {dirtyCount > 0 && (
          <button
            onClick={saveChanges}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium shadow-sm"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar {dirtyCount} alteraç{dirtyCount === 1 ? 'ão' : 'ões'}
          </button>
        )}
      </div>

      {/* Plan legend */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Planos:</span>
        {PLANS.map(plan => (
          <span key={plan} className={cn('px-3 py-1 rounded-full text-xs font-semibold ring-1', PLAN_COLORS[plan])}>
            {plan}
          </span>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar funcionalidade..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                filterCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {cat === 'ALL' ? 'Todos' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          A carregar...
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[2fr_1fr_auto_repeat(4,1fr)] gap-px bg-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <div className="bg-gray-50 px-4 py-3">Funcionalidade</div>
            <div className="bg-gray-50 px-4 py-3">Categoria</div>
            <div className="bg-gray-50 px-4 py-3 text-center">Ativo</div>
            {PLANS.map(plan => (
              <div key={plan} className={cn('px-4 py-3 text-center', PLAN_COLORS[plan])}>
                {plan}
              </div>
            ))}
          </div>

          {/* Rows grouped by category */}
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              {filterCategory === 'ALL' && (
                <div className={cn('px-4 py-2 text-xs font-bold uppercase tracking-widest border-t border-gray-100', CATEGORY_COLORS[category] ?? 'bg-gray-50 text-gray-500')}>
                  {category}
                </div>
              )}
              {items.map(flag => {
                const effectivePlan = getEffectivePlan(flag);
                const isDirty = dirty[flag.key] !== undefined;

                return (
                  <div
                    key={flag.key}
                    className={cn(
                      'grid grid-cols-[2fr_1fr_auto_repeat(4,1fr)] gap-px bg-gray-100 border-t border-gray-50',
                      isDirty && 'bg-amber-50',
                    )}
                  >
                    {/* Label */}
                    <div className={cn('bg-white px-4 py-3', isDirty && 'bg-amber-50/60')}>
                      <p className="text-sm font-medium text-gray-900">{flag.label}</p>
                      <p className="text-xs text-gray-400 font-mono">{flag.key}</p>
                    </div>

                    {/* Category */}
                    <div className={cn('bg-white px-4 py-3 flex items-center', isDirty && 'bg-amber-50/60')}>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', CATEGORY_COLORS[flag.category] ?? 'bg-gray-100 text-gray-500')}>
                        {flag.category}
                      </span>
                    </div>

                    {/* Active toggle */}
                    <div className={cn('bg-white px-4 py-3 flex items-center justify-center', isDirty && 'bg-amber-50/60')}>
                      <button
                        onClick={() => toggleMutation.mutate({ key: flag.key, isActive: !flag.isActive })}
                        className="transition-colors"
                      >
                        {flag.isActive
                          ? <CheckCircle2 className="w-5 h-5 text-green-500 hover:text-green-700" />
                          : <XCircle className="w-5 h-5 text-gray-300 hover:text-gray-500" />
                        }
                      </button>
                    </div>

                    {/* Plan radio buttons */}
                    {PLANS.map(plan => {
                      const isSelected = effectivePlan === plan;
                      return (
                        <div
                          key={plan}
                          className={cn(
                            'bg-white px-4 py-3 flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors',
                            isDirty && 'bg-amber-50/60 hover:bg-amber-100/60',
                          )}
                          onClick={() => setFlagPlan(flag.key, plan)}
                        >
                          <div className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                            isSelected
                              ? cn('border-transparent', plan === 'FREE' ? 'bg-gray-600' : plan === 'STARTER' ? 'bg-blue-600' : plan === 'PROFESSIONAL' ? 'bg-indigo-600' : 'bg-purple-600')
                              : 'border-gray-300 hover:border-gray-400',
                          )}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-sm">
              Nenhuma funcionalidade encontrada.
            </div>
          )}
        </div>
      )}

      {/* Stats footer */}
      {!isLoading && (
        <div className="flex items-center gap-6 text-sm text-gray-500 pt-2">
          <span>{flags.length} funcionalidades no total</span>
          {PLANS.map(plan => {
            const count = flags.filter(f => (dirty[f.key] ?? f.requiredPlan) === plan).length;
            return (
              <span key={plan} className="flex items-center gap-1.5">
                <span className={cn('inline-block w-2 h-2 rounded-full', {
                  'bg-gray-500': plan === 'FREE',
                  'bg-blue-500': plan === 'STARTER',
                  'bg-indigo-500': plan === 'PROFESSIONAL',
                  'bg-purple-500': plan === 'ENTERPRISE',
                })} />
                {count} {plan}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
