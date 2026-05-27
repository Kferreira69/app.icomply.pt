'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth-store';
import { NotificationBell } from '@/components/notifications/notification-bell';

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

export function Topbar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const t = useTranslations('nav');

  const navKey = Object.entries(PATH_TO_KEY).find(
    ([k]) => pathname === k || pathname.startsWith(k + '/'),
  )?.[1];

  const title = navKey ? t(navKey as any) : 'iComply';

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-4">
        <NotificationBell />
        {user && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-white">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-gray-900">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-500">{user.organization?.name}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
