import Link from 'next/link';
import { Building2, Users, Lock } from 'lucide-react';

const SETTINGS_TABS = [
  { href: '/settings/organization', label: 'Organização', icon: Building2 },
  { href: '/settings/users', label: 'Utilizadores', icon: Users },
  { href: '/settings/security', label: 'Segurança', icon: Lock },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-6">
      {/* Sidebar nav */}
      <nav className="w-48 flex-shrink-0">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {SETTINGS_TABS.map(tab => (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 hover:text-primary border-b border-gray-100 last:border-0 transition-colors"
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Page content */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
