'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, ClipboardCheck, FolderOpen, CheckSquare,
  AlertTriangle, FileText, Shield, AlertCircle, BarChart2,
  Settings, Upload, LogOut, ChevronLeft, ChevronRight,
  BookOpen, ShieldCheck, Network,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/diagnostic', label: 'Diagnóstico', icon: ClipboardCheck },
  { href: '/projects', label: 'Projetos', icon: FolderOpen },
  { href: '/tasks', label: 'Tarefas', icon: CheckSquare },
  { href: '/risks', label: 'Riscos', icon: AlertTriangle },
  { href: '/evidence', label: 'Evidências', icon: FileText },
  { href: '/audits', label: 'Auditorias', icon: Shield },
  { href: '/capa', label: 'CAPA', icon: AlertCircle },
  { href: '/reports', label: 'Relatórios', icon: BarChart2 },
  { href: '/policies', label: 'Políticas', icon: BookOpen },
  { href: '/gdpr', label: 'GDPR / ROPA', icon: ShieldCheck },
  { href: '/nis2', label: 'NIS2', icon: Network },
  { href: '/excel-import', label: 'Importar Excel', icon: Upload },
];

const settingsItems = [
  { href: '/settings/organization', label: 'Organização', icon: Settings },
  { href: '/settings/users', label: 'Utilizadores', icon: Settings },
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
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">i</span>
        </div>
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
                    ? 'bg-primary text-white'
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
                    ? 'bg-primary text-white'
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

      {/* User section */}
      <div className="border-t border-gray-700 p-3">
        {!collapsed && user && (
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
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
        <button
          onClick={logout}
          className={cn(
            'flex items-center gap-3 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg px-3 py-2 text-sm w-full transition-colors',
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
