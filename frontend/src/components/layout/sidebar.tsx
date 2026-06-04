'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, ClipboardCheck, FolderOpen, CheckSquare,
  AlertTriangle, FileText, Shield, AlertCircle, BarChart2, Database,
  Settings, Upload, ChevronLeft, ChevronDown,
  BookOpen, ShieldCheck, Network, Building2, FileCheck2,
  Activity, MessageSquareWarning, Globe, Bot, Brain,
  Briefcase, Scale, Users, Layers, Zap, ScrollText,
  GitMerge, Eye, Leaf, ShieldAlert, Award, Car,
  HardHat, ClipboardList, CalendarDays, Handshake, Rss,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useState } from 'react';
import { LocaleSwitcher } from '@/i18n/locale-switcher';

// ── Types ─────────────────────────────────────────────────────

interface NavLeaf {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavDomain {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;        // tailwind bg + text classes for active indicator
  items: NavLeaf[];
}

interface NavSection {
  label?: string;
  type: 'domains' | 'flat';
  domains?: NavDomain[];
  items?: NavLeaf[];
}

// ── Collapsed leaf link ───────────────────────────────────────

function CollapsedLink({ item, isActive }: { item: NavLeaf; isActive: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={item.label}
      className={cn(
        'flex items-center justify-center w-10 h-10 rounded-lg mx-auto transition-colors',
        isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white',
      )}
    >
      <Icon className="w-5 h-5" />
    </Link>
  );
}

// ── Domain group (expanded sidebar) ──────────────────────────

function DomainGroup({
  domain,
  pathname,
  defaultOpen,
}: {
  domain: NavDomain;
  pathname: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const DomainIcon = domain.icon;

  const anyActive = domain.items.some(
    i => pathname === i.href || pathname.startsWith(i.href + '/'),
  );

  return (
    <div>
      {/* Domain header */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors group',
          anyActive
            ? 'bg-gray-800 text-white'
            : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200',
        )}
      >
        <div className={cn(
          'w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors',
          anyActive ? domain.color : 'bg-gray-700 group-hover:bg-gray-600',
        )}>
          <DomainIcon className="w-3.5 h-3.5" />
        </div>
        <span className="flex-1 text-left truncate">{domain.label}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform flex-shrink-0', open ? 'rotate-180' : '')} />
      </button>

      {/* Domain children */}
      {open && (
        <div className="mt-0.5 ml-4 pl-3 border-l border-gray-700/60 space-y-0.5">
          {domain.items.map(item => {
            const ItemIcon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200',
                )}
              >
                <ItemIcon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto text-xs bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main sidebar ──────────────────────────────────────────────

export function Sidebar({ onClose }: { onClose?: () => void } = {}) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const collapsed = false; // Always expanded — sidebar is now an overlay
  const t = useTranslations('nav');

  const isCCAdmin = user?.role === 'SUPER_ADMIN' &&
    user?.organization?.name?.toLowerCase().includes('contemporary constellation');

  // ── Navigation structure ────────────────────────────────────

  const sections: NavSection[] = [
    // ── Top-level flat items
    {
      type: 'flat',
      items: [
        { href: '/dashboard',  label: t('dashboard'),  icon: LayoutDashboard },
        { href: '/diagnostic', label: t('diagnostic'), icon: ClipboardCheck },
      ],
    },

    // ── Governance Domains
    {
      type: 'domains',
      label: t('sectionGovernance'),
      domains: [
        {
          key: 'security',
          label: t('securityGovernance'),
          icon: ShieldCheck,
          color: 'bg-blue-600 text-white',
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
          key: 'privacy',
          label: t('privacyGovernance'),
          icon: Eye,
          color: 'bg-purple-600 text-white',
          items: [
            { href: '/gdpr',     label: 'GDPR · ROPA · DPIA',   icon: ShieldCheck },
            { href: '/iso27701', label: 'ISO 27701 — PIMS',      icon: Eye },
          ],
        },
        {
          key: 'ai',
          label: t('aiGovernanceDomain'),
          icon: Brain,
          color: 'bg-violet-600 text-white',
          items: [
            { href: '/ai-governance', label: 'AI Act · ISO 42001', icon: Brain },
          ],
        },
        {
          key: 'ethics',
          label: t('ethicsSpeak'),
          icon: Scale,
          color: 'bg-orange-600 text-white',
          items: [
            { href: '/denuncias',      label: t('denuncias'),             icon: MessageSquareWarning },
            { href: '/aml',            label: 'AML · KYC · Sanções',          icon: Scale },
            { href: '/anti-bribery',   label: 'ISO 37001 · Anti-Bribery',     icon: Handshake },
          ],
        },
        {
          key: 'workforce',
          label: t('workforceGovernance'),
          icon: Briefcase,
          color: 'bg-green-600 text-white',
          items: [
            { href: '/hr-compliance', label: t('hrCompliance'),             icon: Briefcase },
            { href: '/workforce',     label: 'ISO 45001 · OHS Compliance',     icon: HardHat },
          ],
        },
        {
          key: 'thirdparty',
          label: t('thirdPartyGovernance'),
          icon: Building2,
          color: 'bg-teal-600 text-white',
          items: [
            { href: '/vendors', label: t('vendors'), icon: Building2 },
          ],
        },
        {
          key: 'esg',
          label: t('esgSustainability'),
          icon: Leaf,
          color: 'bg-emerald-600 text-white',
          items: [
            { href: '/esg', label: 'CSRD · GRI · ESG Metrics', icon: Leaf },
          ],
        },
        {
          key: 'resilience',
          label: t('resilienceContinuity'),
          icon: ShieldAlert,
          color: 'bg-amber-600 text-white',
          items: [
            { href: '/business-continuity', label: 'ISO 22301 · BCP · DR', icon: ShieldAlert },
          ],
        },
        {
          key: 'quality',
          label: t('qualityOps'),
          icon: ClipboardList,
          color: 'bg-cyan-600 text-white',
          items: [
            { href: '/quality', label: 'ISO 9001 · CAPA', icon: ClipboardList },
          ],
        },
        {
          key: 'regulatory',
          label: t('regulatoryChangeDomain'),
          icon: CalendarDays,
          color: 'bg-pink-600 text-white',
          items: [
            { href: '/regulatory-change', label: 'Regulatory Horizon · Calendar', icon: CalendarDays },
          ],
        },
      ],
    },

    // ── GRC Operations
    {
      type: 'domains',
      label: t('sectionGRC'),
      domains: [
        {
          key: 'projects',
          label: t('projectsTasks'),
          icon: FolderOpen,
          color: 'bg-sky-600 text-white',
          items: [
            { href: '/projects', label: t('projects'), icon: FolderOpen },
            { href: '/tasks',    label: t('tasks'),    icon: CheckSquare },
            { href: '/itsm',     label: 'IT Service Mgmt', icon: Settings },
          ],
        },
        {
          key: 'risk',
          label: t('riskEvidence'),
          icon: AlertTriangle,
          color: 'bg-yellow-600 text-white',
          items: [
            { href: '/risks',    label: t('risks'),    icon: AlertTriangle },
            { href: '/evidence', label: t('evidence'), icon: FileText },
          ],
        },
        {
          key: 'audit',
          label: t('auditAssurance'),
          icon: Shield,
          color: 'bg-indigo-600 text-white',
          items: [
            { href: '/audits',   label: t('audits'),  icon: Shield },
            { href: '/capa',     label: t('capa'),    icon: AlertCircle },
          ],
        },
        {
          key: 'governance',
          label: t('policiesReports'),
          icon: BookOpen,
          color: 'bg-gray-600 text-white',
          items: [
            { href: '/policies', label: t('policies'), icon: BookOpen },
            { href: '/reports',  label: t('reports'),  icon: BarChart2 },
          ],
        },
        {
          key: 'controls',
          label: t('unifiedControls'),
          icon: GitMerge,
          color: 'bg-rose-600 text-white',
          items: [
            { href: '/governance/controls',      label: 'Control Library',      icon: Layers },
            { href: '/governance/framework-map', label: 'Framework Map',        icon: GitMerge },
            { href: '/governance/gaps',          label: 'Gap & Impact',         icon: Zap },
            { href: '/governance/obligations',   label: 'Regulatory Horizon',   icon: ScrollText },
          ],
        },
      ],
    },

    // ── Intelligence & Operations
    {
      type: 'flat',
      label: 'Intelligence',
      items: [
        { href: '/compliance-monitor', label: 'Compliance Monitor',     icon: Activity },
        { href: '/regulatory-feed',    label: 'Regulatory Intelligence', icon: Rss },
        { href: '/board-reports',      label: 'Board Reports',           icon: FileText },
        { href: '/management-body',    label: 'Órgão de Gestão',         icon: Users },
        { href: '/auditor-sessions',   label: 'Portal de Auditoria',     icon: ShieldCheck },
        { href: '/client-hub',         label: 'Client Hub',              icon: Building2 },
        { href: '/ai-tools',           label: 'AI Compliance Tools',     icon: Brain },
        { href: '/audit-templates',    label: 'Audit Templates',          icon: ClipboardList },
      ],
    },

    // ── Tools (flat)
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

  // ── Which domains are open by default (has active child)
  const getDefaultOpen = (domain: NavDomain) =>
    domain.items.some(i => pathname === i.href || pathname.startsWith(i.href + '/'));

  return (
    <aside className="w-72 h-full flex flex-col bg-gray-900 text-white flex-shrink-0 shadow-2xl">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-700/60 flex-shrink-0">
        <svg className="w-8 h-8 flex-shrink-0" viewBox="-20 -5 400 325" xmlns="http://www.w3.org/2000/svg">
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
        {!collapsed && <span className="text-lg font-bold text-white truncate flex-1">iComply</span>}
        {onClose && (
          <button onClick={onClose} className="ml-auto p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0">
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-700">
        <div className="space-y-4 px-2">
            {sections.map((section, si) => (
              <div key={si}>
                {/* Section label */}
                {section.label && (
                  <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                    {section.label}
                  </p>
                )}

                {section.type === 'flat' && (
                  <div className="space-y-0.5">
                    {(section.items || []).map(item => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-300 hover:bg-gray-800 hover:text-white',
                          )}
                        >
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
                      <DomainGroup
                        key={domain.key}
                        domain={domain}
                        pathname={pathname}
                        defaultOpen={getDefaultOpen(domain)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}

          </div>
      </nav>

      {/* Language switcher only — user menu moved to topbar */}
      <div className="border-t border-gray-700/60 p-2 flex-shrink-0">
        <LocaleSwitcher collapsed={collapsed} />
      </div>

    </aside>
  );
}
