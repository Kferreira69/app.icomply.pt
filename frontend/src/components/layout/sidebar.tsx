'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, ClipboardCheck, FolderOpen, CheckSquare,
  AlertTriangle, FileText, Shield, AlertCircle, BarChart2,
  Settings, Upload, LogOut, ChevronLeft, ChevronRight,
  BookOpen, ShieldCheck, Network, Building2, FileCheck2,
  Activity, MessageSquareWarning,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useState } from 'react';
import { LocaleSwitcher } from '@/i18n/locale-switcher';

const navItems = [
  { href: '/dashboard',    label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/diagnostic',   label: 'Diagnóstico',     icon: ClipboardCheck },
  { href: '/projects',     label: 'Projetos',         icon: FolderOpen },
  { href: '/tasks',        label: 'Tarefas',          icon: CheckSquare },
  { href: '/risks',        label: 'Riscos',           icon: AlertTriangle },
  { href: '/evidence',     label: 'Evidências',       icon: FileText },
  { href: '/audits',       label: 'Auditorias',       icon: Shield },
  { href: '/capa',         label: 'CAPA',             icon: AlertCircle },
  { href: '/reports',      label: 'Relatórios',       icon: BarChart2 },
  { href: '/policies',     label: 'Políticas',        icon: BookOpen },
  { href: '/gdpr',         label: 'GDPR / ROPA',      icon: ShieldCheck },
  { href: '/nis2',         label: 'NIS2',             icon: Network },
  { href: '/dora',         label: 'DORA',             icon: Activity },
  { href: '/denuncias',    label: 'Canal Denúncias',  icon: MessageSquareWarning },
  { href: '/vendors',      label: 'Fornecedores',     icon: Building2 },
  { href: '/soa',          label: 'SoA ISO 27001',    icon: FileCheck2 },
  { href: '/excel-import', label: 'Importar Excel',   icon: Upload },
];

const settingsItems = [
  { href: '/settings/organization',  label: 'Organização',  icon: Settings },
  { href: '/settings/users',         label: 'Utilizadores', icon: Settings },
  { href: '/settings/translations',  label: 'Traduções',    icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'relative flex flex-col bg-gray-900 text-white transition-all duration-300 ease-in-out flex-shrink-0',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-700">
        {/* SVG icon mark */}
        <svg
          className="w-8 h-8 flex-shrink-0"
          viewBox="-20 -5 400 325"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="sl-a" gradientUnits="userSpaceOnUse" x1="96" y1="0" x2="450" y2="310">
              <stop offset="0" stopColor="#46AEC8" />
              <stop offset="1" stopColor="#4D77B6" />
            </linearGradient>
            <linearGradient id="sl-b" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="370" y2="310">
              <stop offset="0" stopColor="#46AEC8" />
              <stop offset="1" stopColor="#4D77B6" />
            </linearGradient>
          </defs>
          <path fill="url(#sl-a)" d="M446.7,50.2l-81.4,82.4-31.2,31.6L190,310.2h-.1l-90.2-89c-4.6-4.5-4.6-11.9-.1-16.4l20.9-21.2c4.5-4.6,11.8-4.6,16.4-.1l52.4,51.7L314,108.9l27-27.3,67.9-68.8c4.5-4.6,11.9-4.6,16.4-.1l21.3,21c4.5,4.5,4.6,11.9.1,16.5z" />
          <path fill="url(#sl-b)" d="M197.6.3C87.5-6.1-4.5,84.5.2,194.7c1.8,42.8,18.3,83.6,46.7,115.6l17.7-37.9C17.1,205.1,33.2,112,100.5,64.5c63.9-45.1,151.8-33.1,201.3,27.3l26.4-26.8C295.3,26.6,248.1,3.2,197.6.3zm173.2,156.1L335.7,192c-1,28.9-10.4,56.8-27,80.5l17.7,37.9C363.5,268.3,379.8,211.8,370.8,156.4z" />
        </svg>
        {!collapsed && (
          <span className="text-lg font-bold text-white truncate">iComply</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="space-y-1 px-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white',
                )}
                title={collapsed ? label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Settings section */}
        {!collapsed && (
          <div className="mt-6 px-2">
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Configurações
            </p>
            {settingsItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname === href
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white',
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* User + locale section */}
      <div className="border-t border-gray-700 p-3">
        {!collapsed && user && (
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-400 truncate">{user.role}</p>
            </div>
          </div>
        )}

        {/* Locale switcher */}
        <LocaleSwitcher collapsed={collapsed} />

        <button
          onClick={logout}
          className={cn(
            'flex items-center gap-3 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg px-3 py-2 text-sm w-full transition-colors mt-1',
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 bg-gray-800 border border-gray-600 rounded-full p-1 text-gray-400 hover:text-white transition-colors z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}
