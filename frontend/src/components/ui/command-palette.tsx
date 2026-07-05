'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, FileText, AlertTriangle, Shield, Users, BarChart2, Building2, X, Hash, ChevronRight, CheckSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { tasksApi, risksApi } from '@/lib/api';

const QUICK_ACTIONS = [
  { label: 'Dashboard',               href: '/dashboard',            icon: BarChart2,   category: 'Navegação' },
  { label: 'Novo Risco',              href: '/risks',                icon: AlertTriangle, category: 'Criar' },
  { label: 'Nova Evidência',          href: '/evidence',             icon: FileText,    category: 'Criar' },
  { label: 'Nova Auditoria',          href: '/audits',               icon: Shield,      category: 'Criar' },
  { label: 'ISO 27001 SoA',           href: '/soa',                  icon: Shield,      category: 'Frameworks' },
  { label: 'NIS2 Compliance',         href: '/nis2',                 icon: Shield,      category: 'Frameworks' },
  { label: 'NIS2 Incidentes',         href: '/nis2/incidents',       icon: AlertTriangle, category: 'Frameworks' },
  { label: 'DORA Register',           href: '/dora/register',        icon: Hash,        category: 'Frameworks' },
  { label: 'GDPR / ROPA',            href: '/gdpr',                 icon: Shield,      category: 'Frameworks' },
  { label: 'AI Governance',           href: '/ai-governance',        icon: Shield,      category: 'Frameworks' },
  { label: 'Relatórios',              href: '/reports',              icon: BarChart2,   category: 'GRC' },
  { label: 'Fornecedores TPRM',       href: '/vendors',              icon: Building2,   category: 'GRC' },
  { label: 'Compliance Monitor',      href: '/compliance-monitor',   icon: BarChart2,   category: 'Intelligence' },
  { label: 'Regulatory Feed',         href: '/regulatory-feed',      icon: Hash,        category: 'Intelligence' },
  { label: 'Board Reports',           href: '/board-reports',        icon: FileText,    category: 'Intelligence' },
  { label: 'Órgão de Gestão',         href: '/management-body',      icon: Users,       category: 'Intelligence' },
  { label: 'Client Hub',              href: '/client-hub',           icon: Building2,   category: 'Intelligence' },
  { label: 'Portal Auditoria',        href: '/auditor-sessions',     icon: Shield,      category: 'Intelligence' },
  { label: 'AI Tools',               href: '/ai-tools',             icon: Hash,        category: 'Ferramentas' },
  { label: 'Configurações SSO',       href: '/settings/sso',         icon: Shield,      category: 'Definições' },
  { label: 'Webhooks',               href: '/settings/webhooks',    icon: Hash,        category: 'Definições' },
  { label: 'Roles & Permissões',     href: '/settings/roles',       icon: Users,       category: 'Definições' },
];

const RISK_LEVEL_COLORS: Record<string, string> = {
  CRITICAL:   'bg-red-100 text-red-700',
  HIGH:       'bg-orange-100 text-orange-700',
  MEDIUM:     'bg-yellow-100 text-yellow-700',
  LOW:        'bg-green-100 text-green-700',
  NEGLIGIBLE: 'bg-gray-100 text-gray-600',
};

const TASK_STATUS_COLORS: Record<string, string> = {
  TODO:        'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  IN_REVIEW:   'bg-purple-100 text-purple-700',
  DONE:        'bg-green-100 text-green-700',
  CANCELLED:   'bg-red-100 text-red-700',
};
const TASK_STATUS_LABELS: Record<string, string> = {
  TODO: 'A Fazer', IN_PROGRESS: 'Em Curso', IN_REVIEW: 'Em Revisão',
  DONE: 'Concluída', CANCELLED: 'Cancelada',
};

function getRiskLevelLabel(score: number): string {
  if (score >= 20) return 'CRITICAL';
  if (score >= 12) return 'HIGH';
  if (score >= 6)  return 'MEDIUM';
  if (score >= 1)  return 'LOW';
  return 'NEGLIGIBLE';
}

interface ContentResult {
  id: string;
  label: string;
  meta: string;
  metaClass: string;
  href: string;
  type: 'task' | 'risk';
}

export function CommandPalette() {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState('');
  const [selected, setSelected] = useState(0);
  const [contentResults, setContentResults] = useState<ContentResult[]>([]);
  const [isSearching, setIsSearching]       = useState(false);
  const inputRef  = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  // cached data for client-side fallback filter
  const tasksCache  = useRef<any[]>([]);
  const risksCache  = useRef<any[]>([]);

  const open_ = useCallback(() => { setOpen(true); setQuery(''); setSelected(0); setContentResults([]); }, []);
  const close_ = useCallback(() => { setOpen(false); setQuery(''); setContentResults([]); }, []);

  // pre-warm caches when palette opens
  useEffect(() => {
    if (!open) return;
    tasksApi.list({ limit: 200 }).then(r => { tasksCache.current = r.data?.data ?? r.data ?? []; }).catch(() => {});
    risksApi.list({ limit: 200 }).then(r => { risksCache.current = r.data?.data ?? r.data ?? []; }).catch(() => {});
  }, [open]);

  // debounced content search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setContentResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const q = query.trim().toLowerCase();

      try {
        // Try API search first; fall back to cache filter
        let taskItems: any[] = [];
        let riskItems: any[] = [];

        try {
          const [tRes, rRes] = await Promise.all([
            tasksApi.list({ search: query.trim(), limit: 5 }),
            risksApi.list({ search: query.trim(), limit: 5 }),
          ]);
          taskItems = tRes.data?.data ?? tRes.data ?? [];
          riskItems = rRes.data?.data ?? rRes.data ?? [];
        } catch {
          // API doesn't support search param — filter cached data
          taskItems = tasksCache.current
            .filter(t => t.title?.toLowerCase().includes(q))
            .slice(0, 5);
          riskItems = risksCache.current
            .filter(r => r.title?.toLowerCase().includes(q) || r.name?.toLowerCase().includes(q))
            .slice(0, 5);
        }

        const results: ContentResult[] = [
          ...taskItems.map((t: any) => ({
            id: t.id,
            label: t.title,
            meta: TASK_STATUS_LABELS[t.status] ?? t.status,
            metaClass: TASK_STATUS_COLORS[t.status] ?? 'bg-gray-100 text-gray-600',
            href: `/tasks?highlight=${t.id}`,
            type: 'task' as const,
          })),
          ...riskItems.map((r: any) => {
            const level = r.riskLevel ?? getRiskLevelLabel(r.inherentScore ?? 0);
            return {
              id: r.id,
              label: r.title ?? r.name,
              meta: level,
              metaClass: RISK_LEVEL_COLORS[level] ?? 'bg-gray-100 text-gray-600',
              href: `/risks?highlight=${r.id}`,
              type: 'risk' as const,
            };
          }),
        ];

        setContentResults(results);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const filtered = query.trim() && query.trim().length < 3
    ? QUICK_ACTIONS.filter(a => a.label.toLowerCase().includes(query.toLowerCase()) || a.category.toLowerCase().includes(query.toLowerCase()))
    : query.trim().length >= 3
    ? QUICK_ACTIONS.filter(a => a.label.toLowerCase().includes(query.toLowerCase()) || a.category.toLowerCase().includes(query.toLowerCase())).slice(0, 4)
    : QUICK_ACTIONS.slice(0, 8);

  // Build a flat list of all navigable items for keyboard nav
  const allNavigable: Array<{ href: string }> = [
    ...filtered,
    ...contentResults,
  ];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); open_ ? open_() : close_(); }
      if (e.key === 'Escape') close_();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open_, close_]);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, allNavigable.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === 'Enter' && allNavigable[selected]) { router.push(allNavigable[selected].href); close_(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, selected, allNavigable, router, close_]);

  if (!open) return null;

  const taskResults = contentResults.filter(r => r.type === 'task');
  const riskResults = contentResults.filter(r => r.type === 'risk');

  // Offset for keyboard nav: filtered (pages) come first
  const contentOffset = filtered.length;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] p-4" onClick={close_}>
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
            placeholder="Pesquisar páginas, tarefas, riscos..."
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none"
          />
          {isSearching && <Loader2 className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" />}
          <button onClick={close_} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto py-2">
          {/* Quick actions / page results */}
          {filtered.length === 0 && contentResults.length === 0 && !isSearching ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              {query.trim().length >= 3 ? `Sem resultados para "${query}"` : 'Sem resultados'}
            </div>
          ) : (
            <>
              {/* Page navigation results */}
              {filtered.length > 0 && (() => {
                const grouped = filtered.reduce((acc: any, item, idx) => {
                  if (!acc[item.category]) acc[item.category] = [];
                  acc[item.category].push({ ...item, idx });
                  return acc;
                }, {});
                return Object.entries(grouped).map(([cat, items]: any) => (
                  <div key={cat}>
                    <p className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{cat}</p>
                    {items.map((item: any) => (
                      <Link key={item.href} href={item.href} onClick={close_}
                        className={cn('flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                          selected === item.idx ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50')}>
                        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                          selected === item.idx ? 'bg-blue-100' : 'bg-gray-100')}>
                          <item.icon className={cn('w-3.5 h-3.5', selected === item.idx ? 'text-blue-600' : 'text-gray-500')} />
                        </div>
                        <span className="flex-1 font-medium">{item.label}</span>
                        {selected === item.idx && <ChevronRight className="w-4 h-4 text-blue-400" />}
                      </Link>
                    ))}
                  </div>
                ));
              })()}

              {/* Content search results — only shown when query >= 3 chars */}
              {query.trim().length >= 3 && (contentResults.length > 0 || isSearching) && (
                <div>
                  <p className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    Pesquisar conteúdo
                    {isSearching && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                  </p>

                  {/* Tasks */}
                  {taskResults.length > 0 && (
                    <>
                      <p className="px-4 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <CheckSquare className="w-3 h-3" /> Tarefas
                      </p>
                      {taskResults.map((item, i) => {
                        const navIdx = contentOffset + i;
                        return (
                          <Link key={item.id} href={item.href} onClick={close_}
                            className={cn('flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                              selected === navIdx ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50')}>
                            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                              selected === navIdx ? 'bg-blue-100' : 'bg-gray-100')}>
                              <CheckSquare className={cn('w-3.5 h-3.5', selected === navIdx ? 'text-blue-600' : 'text-gray-500')} />
                            </div>
                            <span className="flex-1 font-medium truncate">{item.label}</span>
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0', item.metaClass)}>
                              {item.meta}
                            </span>
                          </Link>
                        );
                      })}
                    </>
                  )}

                  {/* Risks */}
                  {riskResults.length > 0 && (
                    <>
                      <p className="px-4 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Riscos
                      </p>
                      {riskResults.map((item, i) => {
                        const navIdx = contentOffset + taskResults.length + i;
                        return (
                          <Link key={item.id} href={item.href} onClick={close_}
                            className={cn('flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                              selected === navIdx ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50')}>
                            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                              selected === navIdx ? 'bg-blue-100' : 'bg-orange-50')}>
                              <AlertTriangle className={cn('w-3.5 h-3.5', selected === navIdx ? 'text-blue-600' : 'text-orange-500')} />
                            </div>
                            <span className="flex-1 font-medium truncate">{item.label}</span>
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0', item.metaClass)}>
                              {item.meta}
                            </span>
                          </Link>
                        );
                      })}
                    </>
                  )}

                  {!isSearching && contentResults.length === 0 && filtered.length === 0 && (
                    <div className="px-4 py-4 text-center text-gray-400 text-sm">
                      Sem resultados de conteúdo para "{query}"
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-2 flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1"><kbd className="bg-gray-100 px-1 rounded text-[10px]">↑↓</kbd> navegar</span>
          <span className="flex items-center gap-1"><kbd className="bg-gray-100 px-1 rounded text-[10px]">Enter</kbd> selecionar</span>
          <span className="flex items-center gap-1"><kbd className="bg-gray-100 px-1 rounded text-[10px]">Esc</kbd> fechar</span>
          {query.trim().length >= 3 && (
            <span className="ml-auto text-[10px] text-gray-300">3+ chars → pesquisa conteúdo</span>
          )}
        </div>
      </div>
    </div>
  );
}
