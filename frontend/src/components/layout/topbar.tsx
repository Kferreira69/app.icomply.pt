'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth-store';
import { NotificationBell } from '@/components/notifications/notification-bell';
import {
  Search, Settings, CreditCard, Bell, Webhook, ShieldCheck, Shield,
  Brain, Users, Globe, ScrollText, LogOut, ChevronDown, Menu, X,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Map URL path segments to nav translation keys
const PATH_TO_KEY: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/diagnostic': 'diagnostic',
  '/projects': 'projects',
  '/tasks': 'tasks',
  '/risks': 'risks',
  '/evidence': 'evidence',
  '/audits': 'audits',
  '/capa': 'capa',
  '/reports': 'reports',
  '/excel-import': 'import',
  '/policies': 'policies',
  '/gdpr': 'gdpr',
  '/nis2': 'nis2',
  '/dora': 'dora',
  '/vendors': 'vendors',
  '/soa': 'soa',
  '/denuncias': 'denuncias',
  '/ai-assistant': 'aiAssistant',
  '/settings/organization': 'organization',
  '/settings/users': 'users',
  '/settings/trust-center': 'trustCenter',
  '/settings/translations': 'translations',
};

interface TopbarProps {
  onMenuClick?: () => void;
  menuOpen?: boolean;
  pinned?: boolean;
}

export function Topbar({ onMenuClick, menuOpen, pinned }: TopbarProps = {}) {
  const pathname = usePathname();
  const { user, logoutWithServer } = useAuthStore();
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const navKey = Object.entries(PATH_TO_KEY).find(
    ([k]) => pathname === k || pathname.startsWith(k + '/'),
  )?.[1];
  const title = navKey ? t(navKey as any) : 'iComply';

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const settingsLinks = [
    { href: '/settings/organization', label: t('organization'), icon: Settings },
    { href: '/settings/billing',       label: t('billing'),       icon: CreditCard },
    { href: '/settings/notifications', label: t('notifications'), icon: Bell },
    { href: '/settings/webhooks',      label: t('webhooks'),      icon: Webhook },
    { href: '/settings/roles',         label: t('roles'),         icon: ShieldCheck },
    { href: '/settings/sso',           label: 'SSO',              icon: Shield },
    { href: '/settings/ai-usage',      label: 'Utilização IA',    icon: Brain },
    { href: '/settings/users',         label: t('users'),         icon: Users },
    { href: '/settings/trust-center',  label: t('trustCenter'),   icon: Globe },
    { href: '/settings/translations',  label: t('translations'),  icon: ScrollText },
  ];

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
      {/* Left: hamburger + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className={cn(
            'p-2 rounded-xl transition-colors',
            pinned && menuOpen ? 'bg-primary text-white' : menuOpen ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
          )}
          title="Menu de navegação"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Cmd+K search hint */}
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, metaKey: true, bubbles: true }))}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-400 text-sm transition-colors">
          <Search className="w-3.5 h-3.5" />
          <span className="text-xs text-gray-500">Pesquisar</span>
          <kbd className="text-[10px] bg-gray-200 px-1 rounded text-gray-400">⌘K</kbd>
        </button>

        {/* Notification bell */}
        <NotificationBell />

        {/* User menu */}
        {user && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpen(o => !o)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-sm transition-colors',
                open ? 'bg-gray-100' : 'hover:bg-gray-50',
              )}
            >
              {/* Avatar */}
              <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </div>
              {/* Name */}
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900 leading-tight">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-gray-400 leading-tight">{user.organization?.name}</p>
              </div>
              <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 transition-transform duration-150', open && 'rotate-180')} />
            </button>

            {/* Dropdown — appears below, right-aligned */}
            {open && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                {/* User header */}
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <p className="text-sm font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-gray-400">{user.organization?.name}</p>
                </div>

                {/* Settings label */}
                <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {t('settings')}
                </p>

                {/* Settings links */}
                <div className="px-2 pb-2">
                  {settingsLinks.map(item => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                      <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                          isActive ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100',
                        )}>
                        <Icon className="w-4 h-4 flex-shrink-0 opacity-70" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>

                {/* Logout */}
                <div className="border-t border-gray-100 p-2">
                  <button
                    onClick={() => { setOpen(false); logoutWithServer(); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                    {t('logout')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
