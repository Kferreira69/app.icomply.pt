// Everything the app already knows without asking the server: screens, Academy
// videos, help-centre articles / FAQ and the per-page help guides. The server
// (GET /search) adds the user's own records; both are ranked by ./text.

import { VIDEOS } from '@/lib/content/academy-videos';
import { FAQ, KB_CATEGORIES } from '@/lib/content/help-kb';
import { helpContent } from '@/components/help/helpContent';
import { PAGES } from './pages';
import {
  ParsedQuery, SearchField, TIER_ORDER, Tier, makeSnippet, matchFields, parseQuery,
} from './text';

export interface SearchResult {
  id: string;
  /** page | video | help | faq | guide | <server entity type> */
  type: string;
  typeLabel: string;
  title: string;
  subtitle?: string;
  href: string;
  tier: Tier;
  score: number;
  snippet?: string;
  matchedIn?: string;
}

interface CatalogEntry {
  id: string;
  type: string;
  typeLabel: string;
  title: string;
  subtitle?: string;
  href: string;
  fields: SearchField[];
}

const FIELD_LABEL: Record<string, string> = {
  keywords: 'palavras-chave', group: 'menu', topics: 'tópicos', category: 'categoria',
  description: 'descrição', body: 'conteúdo', kind: 'tipo', sections: 'conteúdo', tips: 'dicas',
};

const hl = (t: string) => `hl=${encodeURIComponent(t.slice(0, 80))}`;

// Per-page help guides (helpContent) → the screen they belong to.
const GUIDE_HREF: Record<string, string> = {
  dashboard: '/dashboard', risks: '/risks', projects: '/projects', tasks: '/tasks', evidence: '/evidence',
  reports: '/reports', audits: '/audits', capa: '/capa', policies: '/policies', vendors: '/vendors',
  settings: '/settings/organization',
};

let cache: CatalogEntry[] | null = null;

function build(): CatalogEntry[] {
  const out: CatalogEntry[] = [];

  for (const p of PAGES) {
    out.push({
      id: `page:${p.href}`, type: 'page', typeLabel: 'Página', title: p.title, subtitle: p.group, href: p.href,
      fields: [
        { key: 'title', text: p.title, weight: 10, fuzzy: true },
        { key: 'keywords', text: p.keywords, weight: 6 },
        { key: 'group', text: p.group, weight: 4 },
      ],
    });
  }

  for (const v of VIDEOS) {
    out.push({
      id: `video:${v.id}`, type: 'video', typeLabel: 'Vídeo · Academia', title: v.title,
      subtitle: `${v.category} · ${v.duration} · ${v.level}`, href: `/academy?${hl(v.title)}`,
      fields: [
        { key: 'title', text: v.title, weight: 10, fuzzy: true },
        { key: 'topics', text: v.topics.join(' '), weight: 6 },
        { key: 'category', text: v.category, weight: 4 },
        { key: 'description', text: v.description, weight: 3 },
        // lets "formação / tutorial / academia" reach the videos as *related* results
        { key: 'kind', text: 'vídeo tutorial academia', weight: 3 },
      ],
    });
  }

  for (const cat of KB_CATEGORIES) {
    for (const a of cat.articles) {
      out.push({
        id: `help:${a.title}`, type: 'help', typeLabel: 'Ajuda', title: a.title, subtitle: cat.label,
        href: `/help?${hl(a.title)}`,
        fields: [
          { key: 'title', text: a.title, weight: 10, fuzzy: true },
          { key: 'category', text: cat.label, weight: 4 },
          { key: 'body', text: a.body, weight: 3, long: true },
        ],
      });
    }
  }

  for (const f of FAQ) {
    out.push({
      id: `faq:${f.q}`, type: 'faq', typeLabel: 'Pergunta frequente', title: f.q, href: `/help?${hl(f.q)}`,
      fields: [
        { key: 'title', text: f.q, weight: 10, fuzzy: true },
        { key: 'body', text: f.a, weight: 3, long: true },
      ],
    });
  }

  for (const [key, g] of Object.entries(helpContent)) {
    if (key === 'default' || !GUIDE_HREF[key]) continue;
    out.push({
      id: `guide:${key}`, type: 'guide', typeLabel: 'Guia da página', title: g.title, subtitle: 'Como usar este módulo',
      href: GUIDE_HREF[key],
      fields: [
        { key: 'title', text: g.title, weight: 10, fuzzy: true },
        { key: 'description', text: g.description, weight: 3 },
        { key: 'sections', text: g.sections.map(s => `${s.heading}. ${s.text}`).join(' '), weight: 2, long: true },
        { key: 'tips', text: g.tips.join(' '), weight: 2, long: true },
      ],
    });
  }

  return out;
}

/** Search the built-in catalogue (instant, no network). */
export function searchCatalog(q: ParsedQuery): SearchResult[] {
  if (!q.tokens.length) return [];
  cache ??= build();
  const hits: SearchResult[] = [];
  for (const e of cache) {
    const m = matchFields(e.fields, q);
    if (!m) continue;
    const field = e.fields.find(f => f.key === m.field);
    const snippet = field && field.key !== 'title' && field.key !== 'keywords' && field.key !== 'group'
      ? makeSnippet(field.text, q) : '';
    hits.push({
      id: e.id, type: e.type, typeLabel: e.typeLabel, title: e.title, subtitle: e.subtitle, href: e.href,
      tier: m.tier,
      // screens are what people usually want first when the name matches
      score: m.score * (e.type === 'page' ? 1.2 : 1),
      snippet: snippet || undefined,
      matchedIn: m.field === 'title' ? undefined : FIELD_LABEL[m.field] ?? m.field,
    });
  }
  return hits;
}

export function mergeResults(...lists: SearchResult[][]): SearchResult[] {
  return lists.flat().sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || b.score - a.score);
}

export { parseQuery };
