'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, Users, Lock, CreditCard, Plug, ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';

const SETTINGS_TABS = [
  { href: '/settings/organization',  label: 'Organização',    icon: Building2  },
  { href: '/settings/users',         label: 'Utilizadores',   icon: Users       },
  { href: '/settings/security',      label: 'Segurança',      icon: Lock        },
  { href: '/settings/billing',       label: 'Faturação',      icon: CreditCard  },
  { href: '/settings/integrations',  label: 'Integrações',    icon: Plug        },
  { href: '/settings/audit-log',     label: 'Registo de Auditoria', icon: ScrollText },
];

// Sub-pages every authenticated user (not just ADMIN/SUPER_ADMIN) may reach.
const OPEN_TO_ALL_USERS = ['/settings/profile', '/settings/notifications', '/settings/sso'];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;
    const isOpenRoute = OPEN_TO_ALL_USERS.some(route => pathname?.includes(route));
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    if (!isOpenRoute && !isAdmin) router.push('/dashboard');
  }, [user, pathname, router]);

  return (
    <div className="flex gap-6">
      {/* Sidebar nav */}
      <nav className="w-48 flex-shrink-0">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {SETTINGS_TABS.map(tab => {
            const active = pathname?.includes(tab.href) ?? false;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 text-sm border-b border-gray-100 last:border-0 transition-colors',
                  active
                    ? 'text-primary bg-primary/5 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-primary',
                )}
              >
                <tab.icon className={cn('w-4 h-4', active ? 'text-primary' : 'text-gray-400')} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Page content */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
