'use client';

import Link from 'next/link';
import {
  AlertTriangle, BookOpen, Briefcase, Building2, CheckSquare, ClipboardList, Database, Eye, FileText,
  FolderOpen, GraduationCap, HelpCircle, Layers, Play, Scale, Shield, ShieldAlert, Brain, Compass,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchResult } from '@/lib/search/catalog';
import { highlightRanges, parseQuery } from '@/lib/search/text';

const ICONS: Record<string, { icon: React.ElementType; tone: string }> = {
  page:                   { icon: Compass,       tone: 'bg-blue-50 text-blue-600' },
  video:                  { icon: Play,          tone: 'bg-pink-50 text-pink-600' },
  help:                   { icon: HelpCircle,    tone: 'bg-sky-50 text-sky-600' },
  faq:                    { icon: HelpCircle,    tone: 'bg-sky-50 text-sky-600' },
  guide:                  { icon: BookOpen,      tone: 'bg-sky-50 text-sky-600' },
  policy:                 { icon: BookOpen,      tone: 'bg-emerald-50 text-emerald-600' },
  'policy-attachment':    { icon: FileText,      tone: 'bg-emerald-50 text-emerald-600' },
  'quality-document':     { icon: FileText,      tone: 'bg-cyan-50 text-cyan-600' },
  task:                   { icon: CheckSquare,   tone: 'bg-indigo-50 text-indigo-600' },
  risk:                   { icon: AlertTriangle, tone: 'bg-orange-50 text-orange-600' },
  evidence:               { icon: Database,      tone: 'bg-yellow-50 text-yellow-700' },
  project:                { icon: FolderOpen,    tone: 'bg-sky-50 text-sky-600' },
  audit:                  { icon: Shield,        tone: 'bg-indigo-50 text-indigo-600' },
  finding:                { icon: Shield,        tone: 'bg-indigo-50 text-indigo-600' },
  capa:                   { icon: ClipboardList, tone: 'bg-rose-50 text-rose-600' },
  'capa-record':          { icon: ClipboardList, tone: 'bg-cyan-50 text-cyan-600' },
  'non-conformance':      { icon: ShieldAlert,   tone: 'bg-cyan-50 text-cyan-600' },
  vendor:                 { icon: Building2,     tone: 'bg-teal-50 text-teal-600' },
  'unified-control':      { icon: Layers,        tone: 'bg-rose-50 text-rose-600' },
  ropa:                   { icon: Eye,           tone: 'bg-purple-50 text-purple-600' },
  dpia:                   { icon: Eye,           tone: 'bg-purple-50 text-purple-600' },
  'regulatory-change':    { icon: Scale,         tone: 'bg-pink-50 text-pink-600' },
  'ai-system':            { icon: Brain,         tone: 'bg-violet-50 text-violet-600' },
  'hr-training':          { icon: GraduationCap, tone: 'bg-green-50 text-green-600' },
  'whistleblow-training': { icon: GraduationCap, tone: 'bg-orange-50 text-orange-600' },
  'bcp-plan':             { icon: ShieldAlert,   tone: 'bg-amber-50 text-amber-600' },
  'itsm-incident':        { icon: AlertTriangle, tone: 'bg-gray-100 text-gray-600' },
  'aml-case':             { icon: Scale,         tone: 'bg-orange-50 text-orange-600' },
  report:                 { icon: Briefcase,     tone: 'bg-gray-100 text-gray-600' },
};

export function iconFor(type: string) {
  return ICONS[type] ?? { icon: FileText, tone: 'bg-gray-100 text-gray-600' };
}

/** Renders `text` with the words that matched the query in bold/yellow (accent-insensitive). */
export function Highlight({ text, query }: { text: string; query: string }) {
  const ranges = highlightRanges(text, parseQuery(query));
  if (!ranges.length) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let at = 0;
  ranges.forEach(([s, e], i) => {
    if (s > at) parts.push(text.slice(at, s));
    parts.push(<mark key={i} className="bg-yellow-100 text-inherit rounded-sm px-0.5 font-semibold">{text.slice(s, e)}</mark>);
    at = e;
  });
  if (at < text.length) parts.push(text.slice(at));
  return <>{parts}</>;
}

interface RowProps {
  result: SearchResult;
  query: string;
  selected?: boolean;
  onNavigate?: () => void;
  onHover?: () => void;
  size?: 'sm' | 'md';
}

export function ResultRow({ result: r, query, selected, onNavigate, onHover, size = 'sm' }: RowProps) {
  const { icon: Icon, tone } = iconFor(r.type);
  return (
    <Link
      href={r.href}
      onClick={onNavigate}
      onMouseMove={onHover}
      data-selected={selected ? 'true' : undefined}
      className={cn(
        'flex items-start gap-3 px-4 transition-colors',
        size === 'sm' ? 'py-2' : 'py-3',
        selected ? 'bg-blue-50' : 'hover:bg-gray-50',
      )}
    >
      <div className={cn('mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', tone)}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium truncate', selected ? 'text-blue-700' : 'text-gray-900')}>
          <Highlight text={r.title} query={query} />
        </p>
        {(r.subtitle || r.matchedIn) && (
          <p className="text-xs text-gray-500 truncate">
            {r.subtitle}
            {r.subtitle && r.matchedIn ? ' · ' : ''}
            {r.matchedIn && <span className="text-gray-400">encontrado em {r.matchedIn}</span>}
          </p>
        )}
        {r.snippet && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
            <Highlight text={r.snippet} query={query} />
          </p>
        )}
      </div>
      <span className="text-[10px] font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 flex-shrink-0 mt-0.5 whitespace-nowrap">
        {r.typeLabel}
      </span>
    </Link>
  );
}

export const TIER_TITLES = {
  exact: { title: 'Correspondência exata', hint: 'contêm todas as palavras' },
  partial: { title: 'Correspondência parcial', hint: 'contêm algumas das palavras' },
  related: { title: 'Relacionados', hint: 'mesmo assunto, outras palavras' },
} as const;
