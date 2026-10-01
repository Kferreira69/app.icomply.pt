// ─────────────────────────────────────────────────────────────────────────────
// Text engine behind the global search.
//
// KEEP IDENTICAL to frontend/src/lib/search/text.ts — the backend ranks database
// rows with it, the frontend ranks pages / help / videos with it, and both lists
// are merged in one result list, so they must score the same way. A backend test
// (tests/search-text.spec.ts) fails if the two copies drift apart.
//
// What it does:
//  • accent- and case-insensitive ("formacao" finds "Formação", "politica" → "Política")
//  • light PT/EN stemming ("formações", "formar", "formado" all reduce to "form")
//  • every word of the query must be found for an *exact* result; results that
//    only have some of the words are *partial*
//  • a small thesaurus links concepts ("formação" → academia, vídeos, tutoriais,
//    ajuda…) — those hits are *related* and always rank below direct hits
//  • tolerates one or two typos in titles / names ("polica", "auditora")
// ─────────────────────────────────────────────────────────────────────────────

export type Tier = 'exact' | 'partial' | 'related';

export interface SearchField {
  /** Stable key, reported back as "matched in". */
  key: string;
  text: string;
  /** Importance of the field (title 10 … long free text ~1.5). */
  weight: number;
  /** Long free text: no substring/fuzzy matching, only whole words and stems. */
  long?: boolean;
  /** Allow typo tolerance (titles, names, codes). */
  fuzzy?: boolean;
}

export interface ParsedQuery {
  raw: string;
  /** Folded query, punctuation collapsed to single spaces. */
  phrase: string;
  /** Folded tokens (stop-words removed unless that would leave nothing). */
  tokens: string[];
  stems: string[];
  /** Stems of related concepts (thesaurus), excluding the query's own stems. */
  related: string[];
}

export interface FieldMatch {
  tier: Tier;
  score: number;
  /** Key of the best matching field. */
  field: string;
}

// ── folding / tokenizing / stemming ──────────────────────────────────────────

const MARKS = /[̀-ͯ]/g;

export function fold(s: string): string {
  return (s ?? '').normalize('NFD').replace(MARKS, '').toLowerCase();
}

/** Folded text with punctuation collapsed to single spaces (word-boundary safe). */
export function flatten(s: string): string {
  return fold(s).replace(/[^a-z0-9]+/g, ' ').trim();
}

export function tokenize(s: string): string[] {
  return flatten(s).split(' ').filter(t => t.length >= 2);
}

const SUFFIXES = [
  'amentos', 'amento', 'acoes', 'acao', 'icoes', 'icao', 'idades', 'idade', 'mente',
  'adores', 'ador', 'ando', 'endo', 'indo', 'ados', 'adas', 'ado', 'ada',
  'ings', 'ing', 'ies', 'es', 's', 'ar', 'er', 'ir',
];

const stemCache = new Map<string, string>();

// Suffixes that turn a long word into a short common one ("qualidade" → "qual") need a longer root.
const LONG_ROOT_SUFFIXES = new Set(['idades', 'idade', 'mente']);

export function stem(t: string): string {
  const hit = stemCache.get(t);
  if (hit !== undefined) return hit;
  let out = t;
  if (t.length > 4) {
    for (const suf of SUFFIXES) {
      const minRoot = LONG_ROOT_SUFFIXES.has(suf) ? 6 : 4;
      if (t.endsWith(suf) && t.length - suf.length >= minRoot) { out = t.slice(0, -suf.length); break; }
    }
  }
  if (stemCache.size > 20000) stemCache.clear();
  stemCache.set(t, out);
  return out;
}

/** Two stems are "the same word" when equal, or one is a prefix of the other (not too short). */
export function stemsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (!long.startsWith(short)) return false;
  return short.length >= 5 || (short.length >= 4 && long.length - short.length <= 1);
}

/**
 * Bounded edit distance (insert / delete / replace / swap two neighbouring letters):
 * are a and b within `max` edits? A swap counts as one edit ("viedo" ≈ "video").
 */
export function withinEdits(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  const rows: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    rows[i] = [i];
    for (let j = 1; j <= b.length; j++) {
      if (i === 0) { rows[0][j] = j; continue; }
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, rows[i - 2][j - 2] + 1);
      rows[i][j] = v;
    }
  }
  return rows[a.length][b.length] <= max;
}

/** How many typos to forgive in a word of this length (more when the first letters agree). */
function typoBudget(a: string, b: string): number {
  const len = Math.min(a.length, b.length);
  if (len < 5) return 0;
  if (len >= 9) return 2;
  return len >= 6 && a.slice(0, 3) === b.slice(0, 3) ? 2 : 1;
}

// ── stop-words & thesaurus ───────────────────────────────────────────────────

const STOPWORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 'um', 'uma', 'uns', 'umas',
  'para', 'por', 'com', 'sem', 'que', 'como', 'ao', 'aos', 'ou', 'se', 'ser', 'os', 'as', 'pelo', 'pela',
  'the', 'of', 'and', 'to', 'in', 'for', 'on', 'an', 'is', 'are', 'how', 'what', 'with',
]);

// Groups of words that live in the same "area". A query word that belongs to a group
// makes every other word of the group a *related* term. Keep groups tight — a word
// that is too generic ("conformidade") would relate everything to everything.
const CONCEPTS: string[][] = [
  // training / learning / help
  ['formacao', 'formacoes', 'formar', 'treino', 'treinos', 'training', 'academia', 'academy', 'curso', 'cursos',
    'course', 'tutorial', 'tutoriais', 'video', 'videos', 'aprender', 'aprendizagem', 'learning',
    'sensibilizacao', 'awareness', 'workshop', 'webinar', 'capacitacao', 'onboarding', 'ensino', 'ajuda', 'help', 'guia'],
  ['ajuda', 'help', 'suporte', 'support', 'faq', 'duvida', 'duvidas', 'apoio', 'guia', 'guide', 'tutorial', 'tutoriais',
    'instrucoes', 'knowledge', 'conhecimento', 'ticket', 'tickets', 'academia', 'video', 'videos'],
  // documents & policies
  ['politica', 'politicas', 'policy', 'policies', 'procedimento', 'procedimentos', 'procedure', 'norma', 'normas',
    'regulamento', 'diretriz', 'diretrizes', 'guideline', 'conduta'],
  ['documento', 'documentos', 'document', 'documentacao', 'documentation', 'ficheiro', 'ficheiros', 'file', 'anexo',
    'anexos', 'attachment', 'manual', 'manuais', 'instrucao', 'formulario', 'formularios', 'registo', 'registos',
    'word', 'docx', 'pdf'],
  ['qualidade', 'quality', 'sgq', 'iso9001', '9001', 'melhoria', 'improvement'],
  // risk / audit / evidence / tasks
  ['risco', 'riscos', 'risk', 'risks', 'ameaca', 'ameacas', 'threat', 'vulnerabilidade', 'vulnerabilidades',
    'mitigacao', 'mitigation', 'heatmap'],
  ['auditoria', 'auditorias', 'audit', 'audits', 'auditor', 'auditores', 'auditar', 'inspecao', 'constatacao',
    'finding', 'findings'],
  ['evidencia', 'evidencias', 'evidence', 'prova', 'provas', 'comprovativo', 'comprovativos', 'upload'],
  ['tarefa', 'tarefas', 'task', 'tasks', 'atividade', 'atividades', 'kanban', 'pendente', 'pendentes'],
  ['capa', 'corretiva', 'corretivas', 'preventiva', 'preventivas', 'corrective', 'preventive', 'naoconformidade'],
  ['controlo', 'controlos', 'control', 'controls', 'requisito', 'requisitos', 'requirement', 'requirements'],
  // third parties, privacy, incidents
  ['fornecedor', 'fornecedores', 'vendor', 'vendors', 'supplier', 'suppliers', 'terceiro', 'terceiros', 'tprm',
    'subcontratante', 'subcontratantes'],
  ['rgpd', 'gdpr', 'privacidade', 'privacy', 'ropa', 'dpia', 'aipd', 'titular', 'titulares', 'dsar',
    'consentimento', 'consent', 'dpo'],
  ['incidente', 'incidentes', 'incident', 'incidents', 'violacao', 'violacoes', 'breach', 'ataque', 'ciberataque'],
  ['denuncia', 'denuncias', 'whistleblow', 'whistleblowing', 'irregularidade', 'irregularidades', 'etica', 'ethics'],
  // people & settings
  ['utilizador', 'utilizadores', 'user', 'users', 'convite', 'convidar', 'invite', 'permissao', 'permissoes',
    'permissions', 'papel', 'papeis', 'role', 'roles', 'equipa', 'team', 'colaborador', 'colaboradores'],
  ['relatorio', 'relatorios', 'report', 'reports', 'exportar', 'export', 'kpi', 'kpis', 'indicador', 'indicadores'],
  ['definicoes', 'settings', 'configuracao', 'configuracoes', 'configuration', 'organizacao', 'organization',
    'perfil', 'profile', 'preferencias', 'idioma'],
  // frameworks / domains
  ['seguranca', 'security', 'ciberseguranca', 'cybersecurity', 'isms', '27001'],
  ['ia', 'ai', 'inteligencia', 'artificial', '42001'],
  ['continuidade', 'bcp', 'bcm', 'recuperacao', 'disaster', 'resiliencia', 'resilience'],
  ['sustentabilidade', 'esg', 'csrd', 'gri'],
  ['lavagem', 'aml', 'kyc', 'sancoes', 'sanctions', 'pep'],
];

interface IndexedConcept { stems: string[] }
const CONCEPT_INDEX: IndexedConcept[] = CONCEPTS.map(words => ({
  stems: Array.from(new Set(words.map(w => stem(fold(w))))),
}));

function expandRelated(tokens: string[], queryStems: string[]): string[] {
  const out = new Set<string>();
  // A misspelt word ("viedo") still points at its concept when it is one typo away from a known word.
  const typoOf = (stemmed: string, token: string) =>
    token.length >= 5 && withinEdits(stemmed, token, typoBudget(stemmed, token));
  for (const c of CONCEPT_INDEX) {
    const hit = c.stems.some(cs => queryStems.some(qs => stemsMatch(cs, qs)) || tokens.some(t => typoOf(cs, t)));
    if (!hit) continue;
    for (const cs of c.stems) {
      if (!queryStems.some(qs => stemsMatch(cs, qs))) out.add(cs);
    }
  }
  return Array.from(out);
}

// ── query parsing ────────────────────────────────────────────────────────────

export function parseQuery(raw: string): ParsedQuery {
  const clipped = (raw ?? '').slice(0, 120);
  const all = tokenize(clipped);
  let tokens = all.filter(t => !STOPWORDS.has(t));
  if (!tokens.length) tokens = all;
  tokens = Array.from(new Set(tokens)).slice(0, 8);
  const stems = tokens.map(stem);
  return {
    raw: clipped,
    phrase: flatten(clipped),
    tokens,
    stems,
    related: tokens.length ? expandRelated(tokens, stems) : [],
  };
}

// ── scoring ──────────────────────────────────────────────────────────────────

const MAX_LONG_CHARS = 8000;

export function matchFields(fields: SearchField[], q: ParsedQuery): FieldMatch | null {
  if (!q.tokens.length) return null;

  const covered = new Set<number>();
  const totals: Array<{ key: string; score: number }> = [];
  const relatedHits: Array<{ key: string; score: number }> = [];

  for (const f of fields) {
    if (!f.text) continue;
    const text = f.long ? f.text.slice(0, MAX_LONG_CHARS) : f.text;
    const flat = flatten(text);
    if (!flat) continue;
    const words = flat.split(' ');
    const wstems = words.map(stem);

    let score = 0;
    if (q.phrase.length >= 2) {
      if (flat === q.phrase) score += 60 * f.weight;
      else if (flat.startsWith(q.phrase)) score += 35 * f.weight;
      else if (q.tokens.length > 1 && flat.includes(q.phrase)) score += 25 * f.weight;
    }

    q.tokens.forEach((qt, i) => {
      const qs = q.stems[i];
      let s = 0;
      if (words.includes(qt)) s = 10;
      else if (wstems.includes(qs)) s = 8;
      else if (qs.length >= 3 && wstems.some(ws => stemsMatch(ws, qs))) s = 6;
      else if (qt.length >= 3 && words.some(w => w.startsWith(qt))) s = 6;
      else if (!f.long && qt.length >= 3 && flat.includes(qt)) s = 3;
      else if (f.fuzzy && !f.long && qt.length >= 5) {
        const near = (w: string) => w.length >= 4 && withinEdits(w, qt, typoBudget(w, qt));
        // compare with the plain word and with its stem ("polica" ≈ "politicas" → "politica")
        if (words.some(near) || wstems.some(near)) s = 4;
      }
      if (s > 0) { covered.add(i); score += s * f.weight; }
    });

    if (score > 0) totals.push({ key: f.key, score });
  }

  if (covered.size > 0) {
    totals.sort((a, b) => b.score - a.score);
    const rest = totals.slice(1).reduce((n, t) => n + t.score, 0);
    const base = totals[0].score + 0.3 * rest;
    const ratio = covered.size / q.tokens.length;
    const allCovered = covered.size === q.tokens.length;
    return {
      tier: allCovered ? 'exact' : 'partial',
      score: allCovered ? base : base * ratio * ratio,
      field: totals[0].key,
    };
  }

  // Nothing matched directly — look for related concepts.
  if (q.related.length) {
    for (const f of fields) {
      if (!f.text) continue;
      const text = f.long ? f.text.slice(0, MAX_LONG_CHARS) : f.text;
      const wstems = flatten(text).split(' ').map(stem);
      if (q.related.some(rs => wstems.some(ws => stemsMatch(ws, rs)))) {
        relatedHits.push({ key: f.key, score: 5 * f.weight * 0.5 });
      }
    }
    if (relatedHits.length) {
      relatedHits.sort((a, b) => b.score - a.score);
      return { tier: 'related', score: relatedHits[0].score + 0.2 * (relatedHits.length - 1), field: relatedHits[0].key };
    }
  }
  return null;
}

export const TIER_ORDER: Record<Tier, number> = { exact: 0, partial: 1, related: 2 };

// ── highlighting & snippets ──────────────────────────────────────────────────

/** Fold `s` char-by-char, remembering where each folded char came from. */
function foldIndexed(s: string): { folded: string; map: number[] } {
  let folded = '';
  const map: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const f = fold(s[i]);
    for (let k = 0; k < f.length; k++) { folded += f[k]; map.push(i); }
  }
  return { folded, map };
}

/** [start, end) ranges of `text` that match the query words (accent-insensitive). */
export function highlightRanges(text: string, q: ParsedQuery): Array<[number, number]> {
  if (!text || !q.tokens.length) return [];
  const { folded, map } = foldIndexed(text);
  const needles = Array.from(new Set([...q.tokens, ...q.stems.filter(s => s.length >= 4)])).sort((a, b) => b.length - a.length);
  const marks: Array<[number, number]> = [];
  for (const n of needles) {
    let from = 0;
    while (from < folded.length) {
      const at = folded.indexOf(n, from);
      if (at < 0) break;
      // extend to the end of the word so "formacao" highlights "formação" entirely
      let end = at + n.length;
      while (end < folded.length && /[a-z0-9]/.test(folded[end])) end++;
      const start = map[at];
      const stop = (map[end - 1] ?? text.length - 1) + 1;
      if (!marks.some(([s, e]) => start < e && stop > s)) marks.push([start, stop]);
      from = end;
    }
  }
  return marks.sort((a, b) => a[0] - b[0]);
}

/** A short excerpt of `text` around the first match, or '' when nothing matches. */
export function makeSnippet(text: string, q: ParsedQuery, max = 140): string {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  const ranges = highlightRanges(clean, q);
  if (!ranges.length) return '';
  const start = Math.max(0, ranges[0][0] - 40);
  let from = start;
  if (start > 0) { const sp = clean.indexOf(' ', start); if (sp >= 0 && sp < ranges[0][0]) from = sp + 1; }
  let to = Math.min(clean.length, from + max);
  if (to < clean.length) { const sp = clean.lastIndexOf(' ', to); if (sp > ranges[0][1]) to = sp; }
  return (from > 0 ? '…' : '') + clean.slice(from, to) + (to < clean.length ? '…' : '');
}
