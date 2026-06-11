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
  Activity, MessageSquareWarning, Globe, Bot, Brain,
  Briefcase, Scale, Users, Layers, Zap, ScrollText,
  GitMerge, Eye, Leaf, ShieldAlert, Award, Car,
  HardHat, ClipboardList, CalendarDays, Handshake, Rss,
  Plus, X, AlertOctagon, Grid3X3,
  GanttChart, BookTemplate, Zap,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useState } from 'react';
import { LocaleSwitcher } from '@/i18n/locale-switcher';

interface NavLeaf  { href: string; label: string; icon: React.ElementType; badge?: string; }
interface NavDomain { key: string; label: string; icon: React.ElementType; color: string; items: NavLeaf[]; }
interface NavSection { label?: string; type: 'domains' | 'flat'; domains?: NavDomain[]; items?: NavLeaf[]; }

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
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xs p-4 z-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900">Criar novo…</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_CREATE.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                onClick={() => { router.push(item.href); onClose(); }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors text-center"
              >
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', item.color)}>
                  <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
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

/* ── Domain group ────────────────────────────────────────────── */
function DomainGroup({ domain, pathname, defaultOpen, collapsed }: {
  domain: NavDomain; pathname: string; defaultOpen: boolean; collapsed: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const DomainIcon = domain.icon;
  const anyActive = domain.items.some(i => pathname === i.href || pathname.startsWith(i.href + '/'));

  if (collapsed) {
    // Icon-only: show domain icon, tooltip, active indicator
    return (
      <div className="space-y-0.5">
        {domain.items.slice(0, 1).map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href} title={domain.label}
              className={cn('flex items-center justify-center w-10 h-10 rounded-lg mx-auto transition-colors',
                anyActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white',
              )}>
              <DomainIcon className="w-5 h-5" />
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => setOpen(o => !o)}
        className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors group',
          anyActive ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200',
        )}>
        <div className={cn('w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors',
          anyActive ? domain.color : 'bg-gray-700 group-hover:bg-gray-600')}>
          <DomainIcon className="w-3.5 h-3.5" />
        </div>
        <span className="flex-1 text-left truncate">{domain.label}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform flex-shrink-0', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-0.5 ml-4 pl-3 border-l border-gray-700/60 space-y-0.5">
          {domain.items.map(item => {
            const ItemIcon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href}
                className={cn('flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200',
                )}>
                <ItemIcon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.badge && <span className="ml-auto text-xs bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded-full">{item.badge}</span>}
              </Link>
            );
          })}
        </div>
      )}
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

  const isCCAdmin = user?.role === 'SUPER_ADMIN' &&
    user?.organization?.name?.toLowerCase().includes('contemporary constellation');

  const sections: NavSection[] = [
    {
      type: 'flat',
      items: [
        { href: '/dashboard',  label: t('dashboard'),  icon: LayoutDashboard },
        { href: '/diagnostic', label: t('diagnostic'), icon: ClipboardCheck },
      ],
    },
    {
      type: 'domains',
      label: t('sectionGovernance'),
      domains: [
        {
          key: 'security', label: t('securityGovernance'), icon: ShieldCheck, color: 'bg-blue-600 text-white',
          items: [
            { href: '/soa',             label: 'ISO 27001 — SoA',          icon: FileCheck2 },
            { href: '/nis2',            label: 'NIS2 Compliance',           icon: Network },
            { href: '/nis2/incidents',  label: '↳ Notificações Incidentes', icon: AlertTriangle },
            { href: '/dora',            label: 'DORA — Resiliência ICT',    icon: Activity },
            { href: '/dora/register',   label: '↳ Register of Information', icon: Database },
            { href: '/soc2',            label: 'SOC 2 — Trust Criteria',    icon: Award },
            { href: '/cis',             label: 'CIS Controls v8',           icon: Shield },
            { href: '/tisax',           label: 'TISAX — VDA ISA',           icon: Car },
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
            { href: '/denuncias',    label: t('denuncias'),              icon: MessageSquareWarning },
            { href: '/aml',          label: 'AML · KYC · Sanções',       icon: Scale },
            { href: '/anti-bribery', label: 'ISO 37001 · Anti-Bribery',  icon: Handshake },
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
      type: 'domains',
      label: t('sectionGRC'),
      domains: [
        {
          key: 'projects', label: t('projectsTasks'), icon: FolderOpen, color: 'bg-sky-600 text-white',
          items: [
            { href: '/projects', label: t('projects'),     icon: FolderOpen },
            { href: '/tasks',    label: t('tasks'),        icon: CheckSquare },
            { href: '/itsm',     label: 'IT Service Mgmt', icon: Settings },
          ],
        },
        {
          key: 'risk', label: t('riskEvidence'), icon: AlertTriangle, color: 'bg-yellow-600 text-white',
          items: [
            { href: '/risks',    label: t('risks'),    icon: AlertTriangle },
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
            { href: '/policies', label: t('policies'), icon: BookOpen },
            { href: '/reports',  label: t('reports'),  icon: BarChart2 },
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
      type: 'flat',
      label: 'Intelligence',
      items: [
        { href: '/approvals',          label: 'Aprovações',              icon: CheckSquare },
        { href: '/portfolio',          label: 'Portfolio GRC',           icon: LayoutDashboard },
        { href: '/raci',               label: 'Matriz RACI',             icon: Grid3X3 },
        { href: '/intake',             label: 'Intake Forms',            icon: ClipboardList },
        { href: '/action-plans',       label: 'Planos de Ação',          icon: GanttChart },
        { href: '/program-templates',  label: 'Templates de Programa',   icon: BookTemplate },
        { href: '/automation',         label: 'Motor de Automações',     icon: Zap },
        { href: '/compliance-monitor', label: 'Compliance Monitor',      icon: Activity },
        { href: '/regulatory-feed',    label: 'Regulatory Intelligence', icon: Rss },
        { href: '/board-reports',      label: 'Board Reports',           icon: FileText },
        { href: '/management-body',    label: 'Órgão de Gestão',         icon: Users },
        { href: '/auditor-sessions',   label: 'Portal de Auditoria',     icon: ShieldCheck },
        { href: '/client-hub',         label: 'Client Hub',              icon: Building2 },
        { href: '/ai-tools',           label: 'AI Compliance Tools',     icon: Brain },
        { href: '/audit-templates',    label: 'Audit Templates',         icon: ClipboardList },
      ],
    },
    {
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

  return (
    <>
      {quickAdd && <QuickAddModal onClose={() => setQuickAdd(false)} />}

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
                <button onClick={onTogglePin}
                  title={pinned ? 'Desprender' : 'Fixar aberto'}
                  className={cn('p-1.5 rounded-lg transition-colors flex-shrink-0',
                    pinned ? 'text-blue-400 bg-blue-900/40 hover:bg-blue-900/60' : 'text-gray-500 hover:text-white hover:bg-gray-700',
                  )}>
                  {pinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
                </button>
              )}
            </>
          )}
        </div>

        {/* ── Quick Add button ─────────────────────────────────── */}
        <div className={cn('flex-shrink-0 px-2 pt-3 pb-1')}>
          <button
            onClick={() => setQuickAdd(true)}
            className={cn(
              'flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors',
              collapsed ? 'w-10 h-10 justify-center mx-auto' : 'w-full px-3 py-2 text-sm',
            )}
            title="Criar novo…"
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Criar novo…</span>}
          </button>
        </div>

        {/* ── Navigation ──────────────────────────────────────── */}
        <nav className="flex-1 py-2 overflow-y-auto scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-700">
          <div className={cn('space-y-4', collapsed ? 'px-1' : 'px-2')}>
            {sections.map((section, si) => (
              <div key={si}>
                {section.label && !collapsed && (
                  <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                    {section.label}
                  </p>
                )}
                {collapsed && si > 0 && <div className="border-t border-gray-700/40 my-1" />}

                {section.type === 'flat' && (
                  <div className="space-y-0.5">
                    {(section.items || []).map(item => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                      return collapsed ? (
                        <Link key={item.href} href={item.href} title={item.label}
                          className={cn('flex items-center justify-center w-10 h-10 rounded-lg mx-auto transition-colors',
                            isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                          )}>
                          <Icon className="w-5 h-5" />
                        </Link>
                      ) : (
                        <Link key={item.href} href={item.href}
                          className={cn('flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                            isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white',
                          )}>
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {section.type === 'domains' && (
                  <div className="space-y-0.5">
                    {(section.domains || []).map(domain => (
                      <DomainGroup key={domain.key} domain={domain} pathname={pathname}
                        defaultOpen={getDefaultOpen(domain)} collapsed={collapsed} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* ── Footer ───────────────────────────────────────────── */}
        <div className="border-t border-gray-700/60 p-2 flex-shrink-0">
          <LocaleSwitcher collapsed={collapsed} />
        </div>
      </aside>
    </>
  );
}
