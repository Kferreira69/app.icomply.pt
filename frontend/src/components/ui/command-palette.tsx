'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X, ChevronRight, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MIN_CHARS, useGlobalSearch } from '@/lib/search/use-global-search';
import { PAGES } from '@/lib/search/pages';
import { ResultRow, TIER_TITLES, iconFor } from '@/components/search/result-row';
import type { SearchResult } from '@/lib/search/catalog';
import type { Tier } from '@/lib/search/text';

// Shown before the user types anything.
const SHORTCUTS: Array<{ label: string; href: string; category: string }> = [
  { label: 'Dashboard',               href: '/dashboard',            category: 'Navegação' },
  { label: 'Políticas',               href: '/policies',             category: 'Documentos' },
  { label: 'Gestão Documental',       href: '/quality/documents',    category: 'Documentos' },
  { label: 'ISO 14001 · Ambiente',    href: '/environment',          category: 'Frameworks' },
  { label: 'Evidências',              href: '/evidence',             category: 'Documentos' },
  { label: 'Riscos',                  href: '/risks',                category: 'Gerir' },
  { label: 'Tarefas',                 href: '/tasks',                category: 'Gerir' },
  { label: 'Auditorias',              href: '/audits',               category: 'Gerir' },
  { label: 'Fornecedores TPRM',       href: '/vendors',              category: 'Gerir' },
  { label: 'Centro de Formação',      href: '/academy',              category: 'Ajuda' },
  { label: 'Centro de Ajuda',         href: '/help',                 category: 'Ajuda' },
  { label: 'RGPD / ROPA',             href: '/gdpr',                 category: 'Frameworks' },
  { label: 'NIS2 Compliance',         href: '/nis2',                 category: 'Frameworks' },
  { label: 'ISO 27001 SoA',          href: '/soa',                  category: 'Frameworks' },
  { label: 'Relatórios',              href: '/reports',              category: 'Gerir' },
];

const MAX_PER_TIER: Record<Tier, number> = { exact: 10, partial: 5, related: 6 };
const TIERS: Tier[] = ['exact', 'partial', 'related'];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { results, counts, loading, serverError } = useGlobalSearch(open ? query : '', 30);
  const searching = query.trim().length >= MIN_CHARS;

  const close = useCallback(() => { setOpen(false); setQuery(''); setSelected(0); }, []);

  // ⌘K / Ctrl+K toggles, Esc closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => { if (!o) { setQuery(''); setSelected(0); } return !o; });
      } else if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [close]);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 30); }, [open]);

  // what is actually shown: a few per tier, best first
  const sections = useMemo(() => {
    if (!searching) return [] as Array<{ tier: Tier; items: SearchResult[] }>;
    return TIERS
      .map(tier => ({ tier, items: results.filter(r => r.tier === tier).slice(0, MAX_PER_TIER[tier]) }))
      .filter(s => s.items.length > 0);
  }, [results, searching]);

  const flat = useMemo(() => sections.flatMap(s => s.items), [sections]);
  const shortcuts = useMemo(() => {
    const known = new Set(PAGES.map(p => p.href));
    return SHORTCUTS.filter(s => known.has(s.href));
  }, []);
  const navCount = searching ? flat.length : shortcuts.length;
  const fullSearchHref = `/search?q=${encodeURIComponent(query.trim())}`;

  useEffect(() => { setSelected(0); }, [query]);

  // keyboard navigation inside the palette
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, Math.max(navCount - 1, 0))); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (searching && (e.metaKey || e.ctrlKey || flat.length === 0)) { router.push(fullSearchHref); close(); return; }
        const target = searching ? flat[selected]?.href : shortcuts[selected]?.href;
        if (target) { router.push(target); close(); }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, searching, flat, shortcuts, selected, navCount, router, close, fullSearchHref]);

  // keep the highlighted row in view
  useEffect(() => {
    listRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [selected, flat]);

  if (!open) return null;

  let offset = 0;
  const total = results.length;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh] p-4 bg-black/20" onClick={close}>
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
        role="dialog" aria-label="Pesquisa global"
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Pesquisar em tudo: políticas, documentos, riscos, ajuda, vídeos…"
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
            autoComplete="off" spellCheck={false}
          />
          {loading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" />}
          <button onClick={close} className="p-1 hover:bg-gray-100 rounded-lg" aria-label="Fechar">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[28rem] overflow-y-auto py-1">
          {!searching && (
            <>
              <p className="px-4 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Atalhos</p>
              {shortcuts.map((s, i) => {
                const { icon: Icon, tone } = iconFor('page');
                return (
                  <Link key={s.href} href={s.href} onClick={close} data-selected={selected === i ? 'true' : undefined}
                    onMouseMove={() => setSelected(i)}
                    className={cn('flex items-center gap-3 px-4 py-2 text-sm transition-colors',
                      selected === i ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50')}>
                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', tone)}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="flex-1 font-medium">{s.label}</span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">{s.category}</span>
                    {selected === i && <ChevronRight className="w-4 h-4 text-blue-400" />}
                  </Link>
                );
              })}
              <p className="px-4 py-3 text-xs text-gray-400">
                Escreva 2 ou mais letras. A pesquisa ignora acentos e maiúsculas, encontra qualquer palavra do conteúdo
                e sugere assuntos relacionados (ex.: “formação” → Centro de Formação, vídeos, ajuda).
              </p>
            </>
          )}

          {searching && flat.length === 0 && !loading && (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium text-gray-700">Sem resultados para “{query.trim()}”</p>
              <p className="text-xs text-gray-400 mt-1">Tente menos palavras, outra grafia ou um sinónimo.</p>
              <Link href="/help" onClick={close} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-3">
                Abrir o Centro de Ajuda <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}

          {searching && sections.map(sec => (
            <div key={sec.tier}>
              <p className="px-4 pt-2.5 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                {TIER_TITLES[sec.tier].title}
                <span className="font-normal normal-case tracking-normal text-gray-300">
                  {counts[sec.tier]} · {TIER_TITLES[sec.tier].hint}
                </span>
              </p>
              {sec.items.map(r => {
                const idx = offset++;
                return (
                  <ResultRow key={`${r.type}:${r.id}`} result={r} query={query}
                    selected={selected === idx} onNavigate={close} onHover={() => setSelected(idx)} />
                );
              })}
            </div>
          ))}

          {searching && serverError && (
            <p className="px-4 py-2 text-xs text-amber-600">
              A pesquisa nos seus registos está indisponível neste momento — a mostrar apenas páginas, ajuda e vídeos.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-2 flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1"><kbd className="bg-gray-100 px-1 rounded text-[10px]">↑↓</kbd> navegar</span>
          <span className="flex items-center gap-1"><kbd className="bg-gray-100 px-1 rounded text-[10px]">Enter</kbd> abrir</span>
          <span className="flex items-center gap-1"><kbd className="bg-gray-100 px-1 rounded text-[10px]">Esc</kbd> fechar</span>
          {searching && total > 0 && (
            <Link href={fullSearchHref} onClick={close} className="ml-auto flex items-center gap-1 text-blue-600 hover:underline">
              Ver todos os resultados ({total}) <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
