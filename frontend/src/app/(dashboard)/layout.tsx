'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { CommandPalette } from '@/components/ui/command-palette';

const PIN_KEY = 'icomply-nav-pinned';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  // collapsed = icon-only (56px) | expanded = full labels (256px)
  const [collapsed, setCollapsed] = useState(false);
  const [pinned, setPinned]       = useState(false);

  // Load pin preference — pinned = always expanded
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(PIN_KEY) : null;
    if (stored === 'true') { setPinned(true); setCollapsed(false); }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      sessionStorage.setItem('redirectAfterLogin', pathname);
      router.push('/login');
    }
  }, [isAuthenticated, router, pathname]);

  // On mobile (<768px) collapse after navigation
  useEffect(() => {
    if (!pinned && window.innerWidth < 768) setCollapsed(true);
  }, [pathname, pinned]);

  const toggleCollapsed = useCallback(() => {
    if (pinned) return; // pinned = always expanded, hamburger does nothing
    setCollapsed(c => !c);
  }, [pinned]);

  const togglePin = useCallback(() => {
    const next = !pinned;
    setPinned(next);
    localStorage.setItem(PIN_KEY, String(next));
    if (next) setCollapsed(false);  // pin → expand
  }, [pinned]);

  if (!isAuthenticated) return null;

  const expanded = !collapsed;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <CommandPalette />

      {/* Sidebar — ALWAYS visible, never hides */}
      <Sidebar collapsed={collapsed} pinned={pinned} onTogglePin={togglePin} />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          onMenuClick={toggleCollapsed}
          menuOpen={expanded}
          pinned={pinned}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
