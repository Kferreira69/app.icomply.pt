'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, ClipboardCheck, FolderOpen, CheckSquare,
  AlertTriangle, FileText, Shield, AlertCircle, BarChart2, Database,
  Settings, Upload, ChevronDown, Pin, PinOff,
  BookOpen, ShieldCheck, Network, Building2, FileCheck2,
  Activity, MessageSquareWarning, Bot, Brain,
  Briefcase, Scale, Users, Layers, Zap, ScrollText,
  GitMerge, Eye, Leaf, ShieldAlert, Award, Car,
  HardHat, ClipboardList, CalendarDays, Handshake, Rss,
  Plus, X, AlertOctagon, Grid3X3,
  GanttChart, BookTemplate, Plug2, GraduationCap,
  Star, Clock, ChevronRight, SlidersHorizontal, GripVertical,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useState, useEffect, useCallback } from 'react';
import { LocaleSwitcher } from '@/i18n/locale-switcher';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface NavLeaf  { href: string; label: string; icon: React.ElementType; badge?: string; }
interface NavDomain { key: string; label: string; icon: React.ElementType; color: string; items: NavLeaf[]; }
interface NavSection {
  label?: string;
  key?: string;          // unique key for hide/show
  type: 'domains' | 'flat' | 'flat-overflow';
  domains?: NavDomain[];
  items?: NavLeaf[];
  overflowAfter?: number;
  fixed?: boolean;       // fixed=true → cannot be hidden
}

/* ── Quick Add Modal ─────────────────────────────────────────── */
const QUICK_CREATE = [
  { label: 'Novo Risco',       href: '/risks',    icon: AlertTriangle,  color: 'bg-yellow-100 text-yellow-700' },
  { label: 'Nova Evidência',   href: '/evidence', icon: FileText,       color: 'bg-blue-100 text-blue-700' },
  { label: 'Nova Tarefa',      href: '/tasks',    icon: CheckSquare,    color: 'bg-green-100 text-green-700' },
  { label: 'Nova Auditoria',   href: '/audits',   icon: Shield,         color: 'bg-indigo-100 text-indigo-700' },
  { label: 'Nova CAPA',        href: '/capa',     icon: AlertOctagon,   color: 'bg-red-100 text-red-700' },
  { label: 'Nova Política',    href: '/policies', icon: BookOpen,       color: 'bg-purple-100 text-purple-700' },
];

function QuickAddModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xs p-4 z-10" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900">Criar novo…</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_CREATE.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.href} onClick={() => { router.push(item.href); onClose(); }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors text-center">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', item.color)}>
                  <Icon className="w-[18px] h-[18px]" />
                </div>
                <span className="text-xs font-medium text-gray-700 leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Starred hook ────────────────────────────────────────────── */
const STARRED_KEY = 'icomply_starred';

function useStarred() {
  const [starred, setStarred] = useState<string[]>([]);
  useEffect(() => {
    try { setStarred(JSON.parse(localStorage.getItem(STARRED_KEY) || '[]')); } catch { /* ignore */ }
  }, []);
  const toggle = useCallback((href: string) => {
    setStarred(prev => {
      const next = prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href];
      try { localStorage.setItem(STARRED_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);
  return { starred, toggle };
}

/* ── Recent pages hook ───────────────────────────────────────── */
const RECENT_KEY = 'icomply_recent_pages';
const MAX_RECENT = 5;
const SKIP_PREFIXES = ['/settings', '/backoffice'];

interface RecentPage { href: string; label: string; }

function useRecentPages(pathname: string, allItems: NavLeaf[]) {
  const [recents, setRecents] = useState<RecentPage[]>([]);
  useEffect(() => {
    try { setRecents(JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    if (SKIP_PREFIXES.some(p => pathname.startsWith(p))) return;
    const match = allItems.find(i => pathname === i.href || pathname.startsWith(i.href + '/'));
    if (!match) return;
    setRecents(prev => {
      const next = [
        { href: match.href, label: match.label },
        ...prev.filter(r => r.href !== match.href),
      ].slice(0, MAX_RECENT);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  return recents;
}

/* ── Nav leaf (with star button) ────────────────────────────── */
function NavItem({ item, pathname, collapsed, starred, onStar, size = 'md' }: {
  item: NavLeaf; pathname: string; collapsed: boolean;
  starred: string[]; onStar: (h: string) => void;
  size?: 'sm' | 'md';
}) {
  const Icon = item.icon;
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const isStarred = starred.includes(item.href);

  if (collapsed) {
    return (
      <Link href={item.href} title={item.label}
        className={cn('flex items-center justify-center w-10 h-10 rounded-lg mx-auto transition-colors',
          isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white')}>
        <Icon className="w-5 h-5" />
      </Link>
    );
  }

  const sizeClasses = size === 'sm'
    ? 'px-2.5 py-1.5 text-xs'
    : 'px-3 py-2 text-sm';

  return (
    <div className="group relative flex items-center">
      <Link href={item.href}
        className={cn('flex items-center gap-3 rounded-lg font-medium transition-colors flex-1 min-w-0',
          sizeClasses,
          isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white')}>
        <Icon className={cn('flex-shrink-0', size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
        <span className="truncate">{item.label}</span>
        {item.badge && (
          <span className="ml-auto text-xs bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded-full flex-shrink-0">
            {item.badge}
          </span>
        )}
      </Link>
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); onStar(item.href); }}
        title={isStarred ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        className={cn(
          'absolute right-1 p-1 rounded-md transition-all flex-shrink-0',
          isStarred
            ? 'opacity-100 text-yellow-400 hover:text-yellow-300'
            : 'opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-300',
        )}>
        <Star className={cn('w-3 h-3', isStarred && 'fill-current')} />
      </button>
    </div>
  );
}

/* ── Domain group (with star on header) ─────────────────────── */
function DomainGroup({ domain, pathname, defaultOpen, collapsed, starred, onStar }: {
  domain: NavDomain; pathname: string; defaultOpen: boolean; collapsed: boolean;
  starred: string[]; onStar: (h: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const DomainIcon = domain.icon;
  const anyActive = domain.items.some(i => pathname === i.href || pathname.startsWith(i.href + '/'));

  if (collapsed) {
    return (
      <div className="space-y-0.5">
        {domain.items.slice(0, 1).map(item => (
          <Link key={item.href} href={item.href} title={domain.label}
            className={cn('flex items-center justify-center w-10 h-10 rounded-lg mx-auto transition-colors',
              anyActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white')}>
            <DomainIcon className="w-5 h-5" />
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => setOpen(o => !o)}
        className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors group',
          anyActive ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200')}>
        <div className={cn('w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors',
          anyActive ? domain.color : 'bg-gray-700 group-hover:bg-gray-600')}>
          <DomainIcon className="w-3.5 h-3.5" />
        </div>
        <span className="flex-1 text-left truncate">{domain.label}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform flex-shrink-0', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-0.5 ml-4 pl-3 border-l border-gray-700/60 space-y-0.5">
          {domain.items.map(item => (
            <NavItem key={item.href} item={item} pathname={pathname} collapsed={false}
              starred={starred} onStar={onStar} size="sm" />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Flat section with overflow ──────────────────────────────── */
function FlatSection({ items, pathname, collapsed, starred, onStar, overflowAfter }: {
  items: NavLeaf[]; pathname: string; collapsed: boolean;
  starred: string[]; onStar: (h: string) => void;
  overflowAfter?: number;
}) {
  const hasActive = overflowAfter
    ? items.slice(overflowAfter).some(i => pathname === i.href || pathname.startsWith(i.href + '/'))
    : false;
  const [showAll, setShowAll] = useState(hasActive);

  const visible = overflowAfter ? items.slice(0, overflowAfter) : items;
  const overflow = overflowAfter ? items.slice(overflowAfter) : [];

  return (
    <div className="space-y-0.5">
      {visible.map(item => (
        <NavItem key={item.href} item={item} pathname={pathname} collapsed={collapsed}
          starred={starred} onStar={onStar} />
      ))}
      {overflow.length > 0 && !collapsed && (
        <>
          {showAll && overflow.map(item => (
            <NavItem key={item.href} item={item} pathname={pathname} collapsed={false}
              starred={starred} onStar={onStar} />
          ))}
          <button
            onClick={() => setShowAll(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors w-full"
          >
            <ChevronRight className={cn('w-3 h-3 transition-transform', showAll && 'rotate-90')} />
            {showAll ? 'Ver menos' : `Ver mais ${overflow.length}…`}
          </button>
        </>
      )}
    </div>
  );
}

/* ── Hidden sections hook ────────────────────────────────────── */
const HIDDEN_KEY = 'icomply_hidden_sections';

function useHiddenSections() {
  const [hidden, setHidden] = useState<string[]>([]);
  useEffect(() => {
    try { setHidden(JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]')); } catch { /* ignore */ }
  }, []);
  const toggle = useCallback((key: string) => {
    setHidden(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);
  return { hidden, toggle };
}

/* ── Section order hook ──────────────────────────────────────── */
const ORDER_KEY = 'icomply_section_order';

function useSectionOrder(defaultOrder: string[]) {
  const [order, setOrder] = useState<string[]>(defaultOrder);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(ORDER_KEY) || 'null');
      if (saved && Array.isArray(saved)) {
        const merged = [
          ...saved.filter((k: string) => defaultOrder.includes(k)),
          ...defaultOrder.filter(k => !saved.includes(k)),
        ];
        setOrder(merged);
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const reorder = useCallback((newOrder: string[]) => {
    setOrder(newOrder);
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(newOrder)); } catch { /* ignore */ }
  }, []);
  return { order, reorder };
}

/* ── Customize Sidebar Panel ─────────────────────────────────── */
interface SectionMeta { key: string; label: string; fixed?: boolean; }

function SortableSectionItem({ id, label, isFixed, isVisible, onToggle }: {
  id: string; label: string; isFixed?: boolean; isVisible: boolean; onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled: !!isFixed });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style}
      className={cn(
        'flex items-center gap-2 px-2 py-2.5 rounded-xl transition-colors select-none',
        isDragging ? 'bg-gray-700 shadow-lg z-50 ring-1 ring-blue-500/40' : '',
        isFixed ? 'opacity-50' : 'hover:bg-gray-700/60',
      )}>
      {isFixed ? (
        <div className="w-5 flex-shrink-0" />
      ) : (
        <button
          {...attributes} {...listeners}
          className="p-0.5 text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
          title="Arrastar para reordenar">
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      )}
      <span className="text-sm text-gray-200 flex-1 truncate">{label}</span>
      <div
        className={cn(
          'w-9 h-5 rounded-full transition-colors relative flex-shrink-0',
          isFixed || isVisible ? 'bg-blue-600' : 'bg-gray-600',
          !isFixed && 'cursor-pointer',
        )}
        onClick={() => !isFixed && onToggle()}>
        <div className={cn(
          'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
          isFixed || isVisible ? 'translate-x-4' : 'translate-x-0.5',
        )} />
      </div>
    </div>
  );
}

function CustomizePanel({ sections, hidden, onToggle, onClose, order, onReorder }: {
  sections: SectionMeta[]; hidden: string[];
  onToggle: (key: string) => void; onClose: () => void;
  order: string[]; onReorder: (o: string[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sortedSections = [...sections].sort((a, b) => {
    const ai = order.indexOf(a.key);
    const bi = order.indexOf(b.key);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = order.indexOf(active.id as string);
    const newIdx = order.indexOf(over.id as string);
    if (oldIdx !== -1 && newIdx !== -1) onReorder(arrayMove(order, oldIdx, newIdx));
  }

  return (
    <div className="fixed inset-0 z-[9998] flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative ml-14 mt-auto mb-16 z-10 bg-gray-800 rounded-2xl shadow-2xl w-72 p-4"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Personalizar sidebar</h3>
            <p className="text-xs text-gray-400 mt-0.5">Arrasta para reordenar · toggle para esconder</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-700 rounded-lg">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={sortedSections.map(s => s.key)}
            strategy={verticalListSortingStrategy}>
            <div className="space-y-0.5">
              {sortedSections.map(s => (
                <SortableSectionItem
                  key={s.key}
                  id={s.key}
                  label={s.label}
                  isFixed={s.fixed}
                  isVisible={!hidden.includes(s.key)}
                  onToggle={() => onToggle(s.key)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <p className="text-xs text-gray-500 mt-3">
          Secções fixas não podem ser escondidas nem reordenadas.
        </p>
      </div>
    </div>
  );
}

/* ── Main Sidebar ────────────────────────────────────────────── */
export function Sidebar({ collapsed = false, pinned = false, onTogglePin }: {
  collapsed?: boolean;
  pinned?: boolean;
  onTogglePin?: () => void;
} = {}) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const t = useTranslations('nav');
  const [quickAdd, setQuickAdd] = useState(false);
  const [customize, setCustomize] = useState(false);
  const { starred, toggle: toggleStar } = useStarred();
  const { hidden: hiddenSections, toggle: toggleSection } = useHiddenSections();
  const defaultSectionKeys = ['top', 'gerir', 'conformidade', 'intelligence', 'tools'];
  const { order: sectionOrder, reorder: reorderSections } = useSectionOrder(defaultSectionKeys);

  const isCCAdmin = user?.role === 'SUPER_ADMIN' &&
    user?.organization?.name?.toLowerCase().includes('contemporary constellation');

  const INTELLIGENCE_ITEMS: NavLeaf[] = [
    { href: '/approvals',          label: 'Aprovações',              icon: CheckSquare },
    { href: '/portfolio',          label: 'Portfolio GRC',           icon: LayoutDashboard },
    { href: '/raci',               label: 'Matriz RACI',             icon: Grid3X3 },
    { href: '/intake',             label: 'Intake Forms',            icon: ClipboardList },
    { href: '/action-plans',       label: 'Planos de Ação',          icon: GanttChart },
    { href: '/board-reports',      label: 'Board Reports',           icon: BarChart2 },
    { href: '/program-templates',  label: 'Templates de Programa',   icon: BookTemplate },
    { href: '/automation',         label: 'Motor de Automações',     icon: Zap },
    { href: '/compliance-monitor', label: 'Compliance Monitor',      icon: Activity },
    { href: '/regulatory-feed',    label: 'Regulatory Intelligence', icon: Rss },
    { href: '/management-body',    label: 'Órgão de Gestão',         icon: Users },
    { href: '/auditor-sessions',   label: 'Portal de Auditoria',     icon: ShieldCheck },
    { href: '/client-hub',         label: 'Client Hub',              icon: Building2 },
    { href: '/ai-tools',           label: 'AI Compliance Tools',     icon: Brain },
    { href: '/audit-templates',    label: 'Audit Templates',         icon: ClipboardList },
    { href: '/integrations',       label: 'Integration Hub',         icon: Plug2 },
    { href: '/iguard',             label: 'iGuard',                  icon: ShieldAlert },
    { href: '/academy',            label: 'Centro de Formação',      icon: GraduationCap },
  ];

  const sections: NavSection[] = [
    {
      key: 'top',
      fixed: true,
      type: 'flat',
      items: [
        { href: '/dashboard',  label: t('dashboard'),  icon: LayoutDashboard },
        { href: '/diagnostic', label: t('diagnostic'), icon: ClipboardCheck },
        { href: '/tasks',      label: t('tasks'),       icon: CheckSquare },
        { href: '/risks',      label: t('risks'),       icon: AlertTriangle },
      ],
    },
    {
      key: 'gerir',
      type: 'domains',
      label: 'Gerir',
      domains: [
        {
          key: 'projects', label: t('projectsTasks'), icon: FolderOpen, color: 'bg-sky-600 text-white',
          items: [
            { href: '/projects', label: t('projects'),      icon: FolderOpen },
            { href: '/itsm',     label: 'IT Service Mgmt',  icon: Settings },
          ],
        },
        {
          key: 'risk', label: t('riskEvidence'), icon: AlertTriangle, color: 'bg-yellow-600 text-white',
          items: [
            { href: '/evidence', label: t('evidence'), icon: FileText },
          ],
        },
        {
          key: 'audit', label: t('auditAssurance'), icon: Shield, color: 'bg-indigo-600 text-white',
          items: [
            { href: '/audits', label: t('audits'), icon: Shield },
            { href: '/capa',   label: t('capa'),   icon: AlertCircle },
          ],
        },
        {
          key: 'governance', label: t('policiesReports'), icon: BookOpen, color: 'bg-gray-600 text-white',
          items: [
            { href: '/policies',            label: t('policies'),         icon: BookOpen },
            { href: '/reports',             label: t('reports'),          icon: BarChart2 },
            { href: '/reports/time-report', label: 'Relatório de Tempo',  icon: BarChart2 },
          ],
        },
        {
          key: 'controls', label: t('unifiedControls'), icon: GitMerge, color: 'bg-rose-600 text-white',
          items: [
            { href: '/governance/controls',      label: 'Control Library',    icon: Layers },
            { href: '/governance/framework-map', label: 'Framework Map',      icon: GitMerge },
            { href: '/governance/gaps',          label: 'Gap & Impact',       icon: Zap },
            { href: '/governance/obligations',   label: 'Regulatory Horizon', icon: ScrollText },
          ],
        },
      ],
    },
    {
      key: 'conformidade',
      type: 'domains',
      label: 'Conformidade',
      domains: [
        {
          key: 'security', label: t('securityGovernance'), icon: ShieldCheck, color: 'bg-blue-600 text-white',
          items: [
            { href: '/soa',            label: 'ISO 27001 — SoA',          icon: FileCheck2 },
            { href: '/nis2',           label: 'NIS2 Compliance',           icon: Network },
            { href: '/nis2/incidents', label: '↳ Notificações Incidentes', icon: AlertTriangle },
            { href: '/dora',           label: 'DORA — Resiliência ICT',    icon: Activity },
            { href: '/dora/register',  label: '↳ Register of Information', icon: Database },
            { href: '/soc2',           label: 'SOC 2 — Trust Criteria',    icon: Award },
            { href: '/cis',            label: 'CIS Controls v8',           icon: Shield },
            { href: '/tisax',          label: 'TISAX — VDA ISA',           icon: Car },
          ],
        },
        {
          key: 'privacy', label: t('privacyGovernance'), icon: Eye, color: 'bg-purple-600 text-white',
          items: [
            { href: '/gdpr',     label: 'GDPR · ROPA · DPIA', icon: ShieldCheck },
            { href: '/iso27701', label: 'ISO 27701 — PIMS',    icon: Eye },
          ],
        },
        {
          key: 'ai', label: t('aiGovernanceDomain'), icon: Brain, color: 'bg-violet-600 text-white',
          items: [{ href: '/ai-governance', label: 'AI Act · ISO 42001', icon: Brain }],
        },
        {
          key: 'ethics', label: t('ethicsSpeak'), icon: Scale, color: 'bg-orange-600 text-white',
          items: [
            { href: '/denuncias',    label: t('denuncias'),             icon: MessageSquareWarning },
            { href: '/aml',          label: 'AML · KYC · Sanções',      icon: Scale },
            { href: '/anti-bribery', label: 'ISO 37001 · Anti-Bribery', icon: Handshake },
          ],
        },
        {
          key: 'workforce', label: t('workforceGovernance'), icon: Briefcase, color: 'bg-green-600 text-white',
          items: [
            { href: '/hr-compliance', label: t('hrCompliance'),            icon: Briefcase },
            { href: '/workforce',     label: 'ISO 45001 · OHS Compliance', icon: HardHat },
          ],
        },
        {
          key: 'thirdparty', label: t('thirdPartyGovernance'), icon: Building2, color: 'bg-teal-600 text-white',
          items: [{ href: '/vendors', label: t('vendors'), icon: Building2 }],
        },
        {
          key: 'esg', label: t('esgSustainability'), icon: Leaf, color: 'bg-emerald-600 text-white',
          items: [{ href: '/esg', label: 'CSRD · GRI · ESG Metrics', icon: Leaf }],
        },
        {
          key: 'resilience', label: t('resilienceContinuity'), icon: ShieldAlert, color: 'bg-amber-600 text-white',
          items: [{ href: '/business-continuity', label: 'ISO 22301 · BCP · DR', icon: ShieldAlert }],
        },
        {
          key: 'quality', label: t('qualityOps'), icon: ClipboardList, color: 'bg-cyan-600 text-white',
          items: [{ href: '/quality', label: 'ISO 9001 · CAPA', icon: ClipboardList }],
        },
        {
          key: 'regulatory', label: t('regulatoryChangeDomain'), icon: CalendarDays, color: 'bg-pink-600 text-white',
          items: [{ href: '/regulatory-change', label: 'Regulatory Horizon · Calendar', icon: CalendarDays }],
        },
      ],
    },
    {
      key: 'intelligence',
      type: 'flat-overflow',
      label: 'Intelligence & Insights',
      items: INTELLIGENCE_ITEMS,
      overflowAfter: 6,
    },
    {
      key: 'tools',
      type: 'flat',
      label: t('tools'),
      items: [
        { href: '/ai-assistant', label: t('aiAssistant'), icon: Bot },
        { href: '/excel-import', label: t('import'),      icon: Upload },
        ...(isCCAdmin ? [{ href: '/backoffice/licensing', label: t('backoffice'), icon: Layers }] : []),
      ],
    },
  ];

  const getDefaultOpen = (domain: NavDomain) =>
    domain.items.some(i => pathname === i.href || pathname.startsWith(i.href + '/'));

  const allNavItems: NavLeaf[] = sections.flatMap(s => {
    if (s.type === 'flat' || s.type === 'flat-overflow') return s.items ?? [];
    return (s.domains ?? []).flatMap(d => d.items);
  });

  const recents = useRecentPages(pathname, allNavItems);

  const orderedSections = [...sections].sort((a, b) => {
    const ai = a.key ? sectionOrder.indexOf(a.key) : -1;
    const bi = b.key ? sectionOrder.indexOf(b.key) : -1;
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const visibleSections = orderedSections.filter(s => s.fixed || !s.key || !hiddenSections.includes(s.key));

  const sectionMeta = orderedSections
    .filter(s => s.key && s.label)
    .map(s => ({ key: s.key!, label: s.label!, fixed: s.fixed }));

  // Starred items resolved to full NavLeaf
  const starredItems = starred
    .map(href => allNavItems.find(i => i.href === href))
    .filter(Boolean) as NavLeaf[];

  return (
    <>
      {quickAdd && <QuickAddModal onClose={() => setQuickAdd(false)} />}
      {customize && (
        <CustomizePanel
          sections={sectionMeta}
          hidden={hiddenSections}
          onToggle={toggleSection}
          onClose={() => setCustomize(false)}
          order={sectionOrder}
          onReorder={reorderSections}
        />
      )}

      <aside className={cn(
        'h-full flex flex-col bg-gray-900 text-white flex-shrink-0 shadow-2xl',
        'transition-all duration-200 ease-in-out',
        collapsed ? 'w-14' : 'w-64',
      )}>
        {/* ── Logo + Pin ──────────────────────────────────────── */}
        <div className={cn(
          'flex items-center border-b border-gray-700/60 flex-shrink-0',
          collapsed ? 'justify-center py-4 px-2' : 'gap-3 px-4 py-4',
        )}>
          <svg className="w-7 h-7 flex-shrink-0" viewBox="-20 -5 400 325" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="sl-a" gradientUnits="userSpaceOnUse" x1="96" y1="0" x2="450" y2="310">
                <stop offset="0" stopColor="#46AEC8" /><stop offset="1" stopColor="#4D77B6" />
              </linearGradient>
              <linearGradient id="sl-b" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="370" y2="310">
                <stop offset="0" stopColor="#46AEC8" /><stop offset="1" stopColor="#4D77B6" />
              </linearGradient>
            </defs>
            <path fill="url(#sl-a)" d="M446.7,50.2l-81.4,82.4-31.2,31.6L190,310.2h-.1l-90.2-89c-4.6-4.5-4.6-11.9-.1-16.4l20.9-21.2c4.5-4.6,11.8-4.6,16.4-.1l52.4,51.7L314,108.9l27-27.3,67.9-68.8c4.5-4.6,11.9-4.6,16.4-.1l21.3,21c4.5,4.5,4.6,11.9.1,16.5z" />
            <path fill="url(#sl-b)" d="M197.6.3C87.5-6.1-4.5,84.5.2,194.7c1.8,42.8,18.3,83.6,46.7,115.6l17.7-37.9C17.1,205.1,33.2,112,100.5,64.5c63.9-45.1,151.8-33.1,201.3,27.3l26.4-26.8C295.3,26.6,248.1,3.2,197.6.3zm173.2,156.1L335.7,192c-1,28.9-10.4,56.8-27,80.5l17.7,37.9C363.5,268.3,379.8,211.8,370.8,156.4z" />
          </svg>
          {!collapsed && (
            <>
              <span className="text-base font-bold text-white truncate flex-1">iComply</span>
              {onTogglePin && (
                <button onClick={onTogglePin} title={pinned ? 'Desprender' : 'Fixar aberto'}
                  className={cn('p-1.5 rounded-lg transition-colors flex-shrink-0',
                    pinned ? 'text-blue-400 bg-blue-900/40 hover:bg-blue-900/60' : 'text-gray-500 hover:text-white hover:bg-gray-700')}>
                  {pinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
                </button>
              )}
            </>
          )}
        </div>

        {/* ── Quick Add button ─────────────────────────────────── */}
        <div className="flex-shrink-0 px-2 pt-3 pb-1">
          <button onClick={() => setQuickAdd(true)}
            className={cn(
              'flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors',
              collapsed ? 'w-10 h-10 justify-center mx-auto' : 'w-full px-3 py-2 text-sm',
            )}
            title="Criar novo…">
            <Plus className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Criar novo…</span>}
          </button>
        </div>

        {/* ── Favoritos ────────────────────────────────────────── */}
        {!collapsed && starredItems.length > 0 && (
          <div className="px-2 pb-1 pt-1">
            <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Star className="w-2.5 h-2.5 fill-yellow-500 text-yellow-500" /> Favoritos
            </p>
            <div className="space-y-0.5">
              {starredItems.map(item => (
                <NavItem key={item.href} item={item} pathname={pathname} collapsed={false}
                  starred={starred} onStar={toggleStar} />
              ))}
            </div>
            <div className="border-t border-gray-700/40 mt-2" />
          </div>
        )}

        {/* ── Recente ──────────────────────────────────────────── */}
        {!collapsed && recents.length > 0 && (
          <div className="px-2 pb-1">
            <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Clock className="w-2.5 h-2.5" /> Recente
            </p>
            <div className="space-y-0.5">
              {recents.map(r => {
                const match = allNavItems.find(i => i.href === r.href);
                if (!match) return null;
                const Icon = match.icon;
                const isActive = pathname === r.href;
                return (
                  <Link key={r.href} href={r.href}
                    className={cn('flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200')}>
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{r.label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="border-t border-gray-700/40 mt-2" />
          </div>
        )}

        {/* ── Navigation ──────────────────────────────────────── */}
        <nav className="flex-1 py-2 overflow-y-auto scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-700">
          <div className={cn('space-y-4', collapsed ? 'px-1' : 'px-2')}>
            {visibleSections.map((section, si) => (
              <div key={si}>
                {section.label && !collapsed && (
                  <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                    {section.label}
                  </p>
                )}
                {collapsed && si > 0 && <div className="border-t border-gray-700/40 my-1" />}

                {(section.type === 'flat' || section.type === 'flat-overflow') && (
                  <FlatSection
                    items={section.items ?? []}
                    pathname={pathname}
                    collapsed={collapsed}
                    starred={starred}
                    onStar={toggleStar}
                    overflowAfter={section.overflowAfter}
                  />
                )}

                {section.type === 'domains' && (
                  <div className="space-y-0.5">
                    {(section.domains ?? []).map(domain => (
                      <DomainGroup key={domain.key} domain={domain} pathname={pathname}
                        defaultOpen={getDefaultOpen(domain)} collapsed={collapsed}
                        starred={starred} onStar={toggleStar} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* ── Footer ───────────────────────────────────────────── */}
        <div className="border-t border-gray-700/60 p-2 flex-shrink-0 flex items-center gap-1">
          <div className="flex-1">
            <LocaleSwitcher collapsed={collapsed} />
          </div>
          <button
            onClick={() => setCustomize(v => !v)}
            title="Personalizar sidebar"
            className={cn(
              'p-1.5 rounded-lg transition-colors flex-shrink-0',
              customize ? 'bg-blue-900/40 text-blue-400' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800',
            )}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {!collapsed && (
          <div className="px-4 py-2 text-xs text-gray-500 text-center flex-shrink-0">
            v1.0.0
          </div>
        )}
      </aside>
    </>
  );
}
