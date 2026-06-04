'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { CommandPalette } from '@/components/ui/command-palette';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      sessionStorage.setItem('redirectAfterLogin', pathname);
      router.push('/login');
    }
  }, [isAuthenticated, router, pathname]);

  // Close nav on route change
  useEffect(() => { setNavOpen(false); }, [pathname]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <CommandPalette />

      {/* Topbar — full width, has hamburger on left */}
      <Topbar onMenuClick={() => setNavOpen(o => !o)} menuOpen={navOpen} />

      {/* Content area — full width */}
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>

      {/* Navigation overlay — slides in from left */}
      {navOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            onClick={() => setNavOpen(false)}
          />
          {/* Sidebar panel */}
          <div className="fixed top-0 left-0 h-full z-50 animate-in slide-in-from-left duration-200">
            <Sidebar onClose={() => setNavOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
