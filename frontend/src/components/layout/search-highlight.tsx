'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { flatten } from '@/lib/search/text';

/**
 * Search results link to `/page?hl=<title>`. Once that page has rendered, find the first
 * place on it that shows that text, scroll there and flash it — so a search hit lands on the
 * item itself instead of just on the module's page. Works on any list/table/card, no
 * per-page code needed; if the text is not on screen (paginated, in a modal…) nothing happens.
 */
export function SearchHighlight() {
  const params = useSearchParams();
  const pathname = usePathname();
  const hl = params.get('hl');

  useEffect(() => {
    if (!hl) return;
    const needle = flatten(hl).slice(0, 60);
    if (needle.length < 2) return;

    let tries = 0;
    const find = (): boolean => {
      const root = document.querySelector('main');
      if (!root) return false;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const text = n.nodeValue;
        if (!text || text.length < 2 || !flatten(text).includes(needle)) continue;
        const el = n.parentElement;
        if (!el || el.closest('[data-search-ignore]')) continue;
        el.closest('details')?.setAttribute('open', '');
        const target = (el.closest('tr, li, article') as HTMLElement | null) ?? el;
        target.scrollIntoView({ block: 'center', behavior: 'smooth' });
        target.classList.add('search-hit-flash');
        setTimeout(() => target.classList.remove('search-hit-flash'), 3500);
        return true;
      }
      return false;
    };

    // the page fetches its data first — keep looking for a few seconds
    const timer = setInterval(() => {
      if (find() || ++tries > 24) clearInterval(timer);
    }, 250);
    return () => clearInterval(timer);
  }, [hl, pathname]);

  return null;
}
