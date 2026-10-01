'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { searchApi } from '@/lib/api';
import { SearchResult, mergeResults, parseQuery, searchCatalog } from './catalog';
import { Tier } from './text';

export const MIN_CHARS = 2;

export interface GlobalSearch {
  results: SearchResult[];
  tokens: string[];
  counts: Record<Tier, number>;
  /** True while the server part of the search is still running. */
  loading: boolean;
  /** The server part failed — the built-in results (pages, help, videos) still work. */
  serverError: boolean;
}

/**
 * Pages / help / videos are ranked instantly in the browser; the user's own records
 * (policies, risks, documents…) come from the server a moment later and are merged in.
 */
export function useGlobalSearch(query: string, limit = 30): GlobalSearch {
  const trimmed = query.trim();
  const active = trimmed.length >= MIN_CHARS;
  const parsed = useMemo(() => parseQuery(trimmed), [trimmed]);
  const local = useMemo(() => (active ? searchCatalog(parsed) : []), [active, parsed]);

  const [remote, setRemote] = useState<{ q: string; hits: SearchResult[] }>({ q: '', hits: [] });
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    if (!active) { setRemote({ q: '', hits: [] }); setLoading(false); setServerError(false); return; }
    const mine = ++seq.current;
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await searchApi.search(trimmed, limit, ctrl.signal);
        if (seq.current !== mine) return;
        setRemote({ q: trimmed, hits: (res.data?.hits ?? []) as SearchResult[] });
        setServerError(false);
      } catch (err: any) {
        if (seq.current !== mine || err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
        setServerError(true);
        setRemote({ q: trimmed, hits: [] });
      } finally {
        if (seq.current === mine) setLoading(false);
      }
    }, 220);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [trimmed, active, limit]);

  // keep showing the previous server hits while the next ones load (no flicker) as long as
  // the user is still typing / erasing the same query — never for an unrelated one
  const hits = remote.q && (trimmed.startsWith(remote.q) || remote.q.startsWith(trimmed)) ? remote.hits : [];
  const results = useMemo(() => mergeResults(local, hits), [local, hits]);

  const counts = useMemo(() => {
    const c: Record<Tier, number> = { exact: 0, partial: 0, related: 0 };
    for (const r of results) c[r.tier]++;
    return c;
  }, [results]);

  return { results, tokens: parsed.tokens, counts, loading, serverError };
}
