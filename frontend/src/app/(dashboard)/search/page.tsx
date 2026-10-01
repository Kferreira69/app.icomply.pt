'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MIN_CHARS, useGlobalSearch } from '@/lib/search/use-global-search';
import { ResultRow, TIER_TITLES } from '@/components/search/result-row';
import type { Tier } from '@/lib/search/text';

const TIERS: Tier[] = ['exact', 'partial', 'related'];

function SearchResults() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get('q') ?? '';
  const [input, setInput] = useState(initial);
  const [type, setType] = useState<string | null>(null);

  // keep the address bar in sync (shareable / back-button friendly)
  useEffect(() => {
    const t = setTimeout(() => {
      const next = input.trim();
      if (next !== (params.get('q') ?? '')) router.replace(next ? `/search?q=${encodeURIComponent(next)}` : '/search');
    }, 400);
    return () => clearTimeout(t);
  }, [input, params, router]);

  const query = input.trim();
  const { results, counts, loading, serverError } = useGlobalSearch(query, 100);
  useEffect(() => { setType(null); }, [query]);

  const types = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of results) m.set(r.typeLabel, (m.get(r.typeLabel) ?? 0) + 1);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [results]);

  const shown = type ? results.filter(r => r.typeLabel === type) : results;
  const active = query.length >= MIN_CHARS;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Pesquisa</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Procura em todas as páginas, registos, documentos, ajuda e vídeos. Ignora acentos e maiúsculas e sugere assuntos relacionados.
        </p>
      </div>

      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-200">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          autoFocus value={input} onChange={e => setInput(e.target.value)}
          placeholder="O que procura?" className="flex-1 outline-none text-sm bg-transparent"
          autoComplete="off" spellCheck={false}
        />
        {loading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
      </div>

      {active && types.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setType(null)}
            className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              type === null ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}>
            Tudo ({results.length})
          </button>
          {types.map(([label, n]) => (
            <button key={label} onClick={() => setType(label === type ? null : label)}
              className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                type === label ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}>
              {label} ({n})
            </button>
          ))}
        </div>
      )}

      {!active && <p className="text-sm text-gray-400">Escreva pelo menos {MIN_CHARS} letras.</p>}

      {active && !loading && shown.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <p className="text-sm font-medium text-gray-700">Sem resultados para “{query}”</p>
          <p className="text-xs text-gray-400 mt-1">Tente menos palavras, outra grafia ou um sinónimo.</p>
        </div>
      )}

      {active && TIERS.map(tier => {
        const items = shown.filter(r => r.tier === tier);
        if (!items.length) return null;
        return (
          <section key={tier} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <header className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/60 flex items-center gap-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{TIER_TITLES[tier].title}</h3>
              <span className="text-xs text-gray-400">{items.length} · {TIER_TITLES[tier].hint}</span>
            </header>
            <div className="divide-y divide-gray-50">
              {items.map(r => <ResultRow key={`${r.type}:${r.id}`} result={r} query={query} size="md" />)}
            </div>
          </section>
        );
      })}

      {active && serverError && (
        <p className="text-xs text-amber-600">
          A pesquisa nos seus registos está indisponível neste momento — a mostrar apenas páginas, ajuda e vídeos.
        </p>
      )}
      {active && counts.exact + counts.partial + counts.related >= 100 && (
        <p className="text-xs text-gray-400">A mostrar os 100 melhores resultados — refine a pesquisa para ver outros.</p>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchResults />
    </Suspense>
  );
}
