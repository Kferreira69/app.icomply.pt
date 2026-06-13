'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { regulatoryFeedApi } from '@/lib/api';
import {
  Rss, CheckCheck, ExternalLink, AlertTriangle, Info, Zap,
  Loader2, Search, ChevronDown, ChevronUp, Archive, BookOpen,
  Shield, Calendar, Bell, BellOff, TrendingUp,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

// ── Constants ──────────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  EU_OJ: 'EUR-Lex', ENISA: 'ENISA', EBA: 'EBA', EIOPA: 'EIOPA',
  ESMA: 'ESMA', CNCS: 'CNCS (PT)', CNPD: 'CNPD (PT)',
  BSI: 'BSI (DE)', ANSSI: 'ANSSI (FR)', OTHER: 'Outro',
};

const SOURCE_COLORS: Record<string, string> = {
  EU_OJ:  'bg-blue-100 text-blue-700 border border-blue-200',
  ENISA:  'bg-violet-100 text-violet-700 border border-violet-200',
  EBA:    'bg-green-100 text-green-700 border border-green-200',
  CNCS:   'bg-red-100 text-red-700 border border-red-200',
  CNPD:   'bg-red-100 text-red-700 border border-red-200',
  OTHER:  'bg-gray-100 text-gray-600 border border-gray-200',
};

const PRIORITY_CONFIG: Record<string, { label: string; badge: string; border: string; dot: string }> = {
  CRITICAL: { label: 'Crítica',  badge: 'bg-red-100 text-red-700 border border-red-200',       border: 'border-l-red-500',    dot: 'bg-red-500' },
  HIGH:     { label: 'Alta',     badge: 'bg-orange-100 text-orange-700 border border-orange-200', border: 'border-l-orange-500', dot: 'bg-orange-500' },
  MEDIUM:   { label: 'Média',    badge: 'bg-amber-100 text-amber-700 border border-amber-200',   border: 'border-l-amber-400',  dot: 'bg-amber-400' },
  LOW:      { label: 'Baixa',    badge: 'bg-gray-100 text-gray-500 border border-gray-200',      border: 'border-l-gray-300',   dot: 'bg-gray-400' },
};

const FRAMEWORK_OPTIONS = ['GDPR', 'NIS2', 'DORA', 'ISO 27001', 'SOC2', 'EU_AI_ACT'];
const FRAMEWORK_DISPLAY: Record<string, string> = {
  GDPR: 'GDPR', NIS2: 'NIS2', DORA: 'DORA', 'ISO 27001': 'ISO 27001',
  SOC2: 'SOC 2', EU_AI_ACT: 'AI Act', EBA: 'EBA', EIOPA: 'EIOPA', ESMA: 'ESMA',
};

const DATE_RANGE_OPTIONS = [
  { value: 'week',  label: 'Esta semana' },
  { value: 'month', label: 'Este mês' },
  { value: 'all',   label: 'Tudo' },
] as const;

type DateRange = 'week' | 'month' | 'all';
type StatusFilter = 'ALL' | 'UNREAD' | 'READ' | 'ARCHIVED';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isWithinRange(dateStr: string, range: DateRange): boolean {
  if (range === 'all') return true;
  const now = Date.now();
  const ms = new Date(dateStr).getTime();
  if (range === 'week')  return now - ms <= 7  * 86_400_000;
  if (range === 'month') return now - ms <= 30 * 86_400_000;
  return true;
}

// Local archived state — the backend has no archive endpoint so we track it client-side
function useArchivedSet() {
  const [archived, setArchived] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setArchived(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return { archived, toggle };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div className={cn('p-2 rounded-lg', color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 flex flex-col items-center gap-4">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center">
          <Rss className="w-8 h-8 text-gray-300" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-gray-700 font-semibold text-base">Sem atualizações</p>
        <p className="text-gray-400 text-sm mt-1">
          {hasFilters
            ? 'Nenhum resultado para os filtros selecionados. Tente ajustar os critérios.'
            : 'Ainda não há atualizações regulatórias. Clique em "Carregar feed" para começar.'}
        </p>
      </div>
    </div>
  );
}

function FeedCard({
  item,
  isArchived,
  onMarkRead,
  onArchive,
  isMarkingRead,
}: {
  item: any;
  isArchived: boolean;
  onMarkRead: () => void;
  onArchive: () => void;
  isMarkingRead: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const priority = PRIORITY_CONFIG[item.importance] ?? PRIORITY_CONFIG.LOW;

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border shadow-sm transition-all',
        !item.isRead && !isArchived ? cn('border-l-4', priority.border) : 'border-gray-100',
        isArchived && 'opacity-60',
        'hover:shadow-md',
      )}
    >
      <div className="p-5">
        {/* Top row: badges */}
        <div className="flex items-center gap-2 flex-wrap mb-2.5">
          {/* Priority badge */}
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1', priority.badge)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', priority.dot)} />
            {priority.label}
          </span>
          {/* Source badge */}
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', SOURCE_COLORS[item.source] ?? SOURCE_COLORS.OTHER)}>
            {SOURCE_LABELS[item.source] ?? item.source}
          </span>
          {/* Framework chips */}
          {item.frameworks?.map((f: string) => (
            <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              {FRAMEWORK_DISPLAY[f] ?? f}
            </span>
          ))}
          {/* Unread pill */}
          {!item.isRead && !isArchived && (
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold border border-blue-200">
              NOVO
            </span>
          )}
          {isArchived && (
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
              Arquivado
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className={cn('text-sm mb-1 leading-snug', !item.isRead && !isArchived ? 'font-bold text-gray-900' : 'font-semibold text-gray-700')}>
          {item.title}
        </h3>

        {/* Summary */}
        {item.summary && (
          <p className={cn('text-sm text-gray-600 leading-relaxed', !expanded && 'line-clamp-2')}>
            {item.summary}
          </p>
        )}

        {/* Expanded: full content + source link */}
        {expanded && item.sourceUrl && (
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            Ver fonte oficial
          </a>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-3">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(item.publishedAt)}
          </span>
          <span className="text-xs text-gray-300">·</span>
          <span className="text-xs text-gray-400">{item.jurisdiction}</span>
          {!expanded && item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-xs text-emerald-600 hover:underline ml-auto"
            >
              <ExternalLink className="w-3 h-3" /> Ver fonte
            </a>
          )}
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
          {/* Expand / collapse */}
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Recolher</> : <><ChevronDown className="w-3.5 h-3.5" /> Ver detalhes</>}
          </button>

          <div className="flex items-center gap-2 ml-auto">
            {/* Mark as read */}
            {!item.isRead && !isArchived && (
              <button
                onClick={onMarkRead}
                disabled={isMarkingRead}
                className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-200 disabled:opacity-50"
              >
                {isMarkingRead ? <Loader2 className="w-3 h-3 animate-spin" /> : <BookOpen className="w-3 h-3" />}
                Marcar como lida
              </button>
            )}

            {/* Archive / unarchive */}
            <button
              onClick={onArchive}
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors border',
                isArchived
                  ? 'text-gray-600 bg-gray-50 hover:bg-gray-100 border-gray-200'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 border-gray-200',
              )}
            >
              <Archive className="w-3 h-3" />
              {isArchived ? 'Restaurar' : 'Arquivar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export default function RegulatoryFeedPage() {
  const qc = useQueryClient();

  // Filters
  const [search, setSearch]           = useState('');
  const [framework, setFramework]     = useState<string>('ALL');
  const [priority, setPriority]       = useState<string>('ALL');
  const [status, setStatus]           = useState<StatusFilter>('ALL');
  const [dateRange, setDateRange]     = useState<DateRange>('all');
  const [page, setPage]               = useState(1);
  const { archived, toggle: toggleArchive } = useArchivedSet();

  // Data
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['regulatory-feed'],
    queryFn: () => regulatoryFeedApi.list({}).then(r => r.data),
  });

  const { data: countData } = useQuery({
    queryKey: ['regulatory-feed-count'],
    queryFn: () => regulatoryFeedApi.unreadCount().then(r => r.data),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => regulatoryFeedApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['regulatory-feed'] });
      qc.invalidateQueries({ queryKey: ['regulatory-feed-count'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => regulatoryFeedApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['regulatory-feed'] });
      qc.invalidateQueries({ queryKey: ['regulatory-feed-count'] });
    },
  });

  const seedMutation = useMutation({
    mutationFn: () => regulatoryFeedApi.seed(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['regulatory-feed'] }),
  });

  // Stats (computed from full list)
  const allItems = items as any[];
  const statsTotal    = allItems.length;
  const statsCritical = allItems.filter(i => i.importance === 'CRITICAL').length;
  const statsWeek     = allItems.filter(i => isWithinRange(i.publishedAt, 'week')).length;
  const statsUnread   = allItems.filter(i => !i.isRead && !archived.has(i.id)).length;

  // Client-side filtering
  const filtered = useMemo(() => {
    let list = allItems;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(i =>
        i.title?.toLowerCase().includes(q) || i.summary?.toLowerCase().includes(q),
      );
    }

    if (framework !== 'ALL') {
      list = list.filter(i => i.frameworks?.includes(framework));
    }

    if (priority !== 'ALL') {
      list = list.filter(i => i.importance === priority);
    }

    if (status === 'UNREAD')    list = list.filter(i => !i.isRead && !archived.has(i.id));
    if (status === 'READ')      list = list.filter(i => i.isRead  && !archived.has(i.id));
    if (status === 'ARCHIVED')  list = list.filter(i => archived.has(i.id));
    if (status === 'ALL')       list = list.filter(i => !archived.has(i.id));

    if (dateRange !== 'all') {
      list = list.filter(i => isWithinRange(i.publishedAt, dateRange));
    }

    return list;
  }, [allItems, search, framework, priority, status, dateRange, archived]);

  const paginated  = filtered.slice(0, page * PAGE_SIZE);
  const hasMore    = filtered.length > paginated.length;
  const hasFilters = search.trim() !== '' || framework !== 'ALL' || priority !== 'ALL' || status !== 'ALL' || dateRange !== 'all';

  // Reset page whenever filters change
  const resetPage = () => setPage(1);

  return (
    <div className="space-y-5 pb-10">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Rss className="w-5 h-5 text-emerald-300" />
              <span className="text-emerald-200 text-xs font-medium uppercase tracking-widest">
                Inteligência Regulatória EU
              </span>
            </div>
            <h1 className="text-2xl font-bold">Atualizações Regulatórias</h1>
            <p className="text-emerald-200 text-sm mt-1">
              Fique a par das últimas alterações legislativas — EUR-Lex, ENISA, EBA, CNCS, CNPD e mais
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {statsUnread > 0 && (
              <button
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
              >
                {markAllMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <CheckCheck className="w-4 h-4" />}
                Marcar todas como lidas
              </button>
            )}
            {allItems.length === 0 && (
              <button
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
                className="flex items-center gap-2 bg-white text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-60"
              >
                {seedMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Rss className="w-4 h-4" />}
                Carregar feed
              </button>
            )}
          </div>
        </div>

        {/* Unread pulse badge */}
        {statsUnread > 0 && (
          <div className="mt-4 inline-flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-sm font-medium">{statsUnread} novas atualizações não lidas</span>
          </div>
        )}
      </div>

      {/* ── Stats row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Rss}          label="Total"        value={statsTotal}    color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={AlertTriangle} label="Críticas"    value={statsCritical} color="bg-red-50 text-red-600" />
        <StatCard icon={TrendingUp}   label="Esta semana"  value={statsWeek}     color="bg-blue-50 text-blue-600" />
        <StatCard icon={Bell}         label="Não lidas"    value={statsUnread}   color="bg-amber-50 text-amber-600" />
      </div>

      {/* ── Filter bar ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); resetPage(); }}
            placeholder="Pesquisar por título ou descrição…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-colors"
          />
        </div>

        {/* Filter chips row */}
        <div className="flex flex-wrap gap-3">

          {/* Framework */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-500 font-medium">Framework:</span>
            {(['ALL', ...FRAMEWORK_OPTIONS] as const).map(f => (
              <button
                key={f}
                onClick={() => { setFramework(f === 'ALL' ? 'ALL' : f); resetPage(); }}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-lg font-medium transition-colors border',
                  framework === f
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300',
                )}
              >
                {f === 'ALL' ? 'Todos' : (FRAMEWORK_DISPLAY[f] ?? f)}
              </button>
            ))}
          </div>

          <div className="w-px bg-gray-100 self-stretch hidden sm:block" />

          {/* Priority */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-500 font-medium">Prioridade:</span>
            {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(p => (
              <button
                key={p}
                onClick={() => { setPriority(p); resetPage(); }}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-lg font-medium transition-colors border',
                  priority === p
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300',
                )}
              >
                {p === 'ALL' ? 'Todas' : PRIORITY_CONFIG[p]?.label}
              </button>
            ))}
          </div>

          <div className="w-px bg-gray-100 self-stretch hidden sm:block" />

          {/* Status */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-500 font-medium">Estado:</span>
            {([
              ['ALL',      'Todos'],
              ['UNREAD',   'Não lida'],
              ['READ',     'Lida'],
              ['ARCHIVED', 'Arquivada'],
            ] as const).map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => { setStatus(val); resetPage(); }}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-lg font-medium transition-colors border',
                  status === val
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300',
                )}
              >
                {lbl}
              </button>
            ))}
          </div>

          <div className="w-px bg-gray-100 self-stretch hidden sm:block" />

          {/* Date range */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-500 font-medium">Período:</span>
            {DATE_RANGE_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setDateRange(value); resetPage(); }}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-lg font-medium transition-colors border',
                  dateRange === value
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Active filter summary */}
        {hasFilters && (
          <div className="flex items-center justify-between pt-1 border-t border-gray-50">
            <span className="text-xs text-gray-500">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => { setSearch(''); setFramework('ALL'); setPriority('ALL'); setStatus('ALL'); setDateRange('all'); resetPage(); }}
              className="text-xs text-emerald-600 hover:underline font-medium"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* ── Feed ────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : paginated.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map((item: any) => (
              <FeedCard
                key={item.id}
                item={item}
                isArchived={archived.has(item.id)}
                onMarkRead={() => markReadMutation.mutate(item.id)}
                onArchive={() => toggleArchive(item.id)}
                isMarkingRead={markReadMutation.isPending && (markReadMutation.variables as string) === item.id}
              />
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setPage(p => p + 1)}
                className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-sm font-medium text-gray-700 rounded-xl shadow-sm hover:shadow transition-all"
              >
                <ChevronDown className="w-4 h-4" />
                Carregar mais ({filtered.length - paginated.length} restantes)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
