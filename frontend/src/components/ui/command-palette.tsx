'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, FileText, AlertTriangle, Shield, Users, BarChart2, Building2, X, Hash, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

export function CommandPalette() {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filtered = query.trim()
    ? QUICK_ACTIONS.filter(a => a.label.toLowerCase().includes(query.toLowerCase()) || a.category.toLowerCase().includes(query.toLowerCase()))
    : QUICK_ACTIONS.slice(0, 8);

  const open_ = useCallback(() => { setOpen(true); setQuery(''); setSelected(0); }, []);
  const close_ = useCallback(() => { setOpen(false); setQuery(''); }, []);

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
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === 'Enter' && filtered[selected]) { router.push(filtered[selected].href); close_(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, selected, filtered, router, close_]);

  // No visible trigger — activated via Cmd+K or the topbar search button
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] p-4" onClick={close_}>
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setSelected(0); }}
            placeholder="Pesquisar páginas, ações, frameworks..."
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none" />
          <button onClick={close_} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">Sem resultados para "{query}"</div>
          ) : (
            (() => {
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
                      className={cn('flex items-center gap-3 px-4 py-2.5 text-sm transition-colors', selected === item.idx ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50')}>
                      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', selected === item.idx ? 'bg-blue-100' : 'bg-gray-100')}>
                        <item.icon className={cn('w-3.5 h-3.5', selected === item.idx ? 'text-blue-600' : 'text-gray-500')} />
                      </div>
                      <span className="flex-1 font-medium">{item.label}</span>
                      {selected === item.idx && <ChevronRight className="w-4 h-4 text-blue-400" />}
                    </Link>
                  ))}
                </div>
              ));
            })()
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-2 flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1"><kbd className="bg-gray-100 px-1 rounded text-[10px]">↑↓</kbd> navegar</span>
          <span className="flex items-center gap-1"><kbd className="bg-gray-100 px-1 rounded text-[10px]">Enter</kbd> selecionar</span>
          <span className="flex items-center gap-1"><kbd className="bg-gray-100 px-1 rounded text-[10px]">Esc</kbd> fechar</span>
        </div>
      </div>
    </div>
  );
}
