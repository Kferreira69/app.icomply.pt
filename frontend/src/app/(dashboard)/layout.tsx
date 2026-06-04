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
  const [navOpen, setNavOpen]   = useState(false);
  const [pinned, setPinned]     = useState(false);

  // Load pin preference from localStorage
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(PIN_KEY) : null;
    if (stored === 'true') { setPinned(true); setNavOpen(true); }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      sessionStorage.setItem('redirectAfterLogin', pathname);
      router.push('/login');
    }
  }, [isAuthenticated, router, pathname]);

  // Close overlay on route change (not if pinned)
  useEffect(() => {
    if (!pinned) setNavOpen(false);
  }, [pathname, pinned]);

  const togglePin = useCallback(() => {
    const next = !pinned;
    setPinned(next);
    localStorage.setItem(PIN_KEY, String(next));
    if (!next) setNavOpen(false); // unpin → close
  }, [pinned]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <CommandPalette />

      {/* ── Pinned sidebar (fixed, shifts content) ──────────────── */}
      {pinned && navOpen && (
        <div className="flex-shrink-0">
          <Sidebar onClose={() => { setNavOpen(false); }} pinned onTogglePin={togglePin} />
        </div>
      )}

      {/* ── Main area ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setNavOpen(o => !o)} menuOpen={navOpen} pinned={pinned} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* ── Overlay sidebar (doesn't shift content) ─────────────── */}
      {!pinned && navOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={() => setNavOpen(false)} />
          <div className="fixed top-0 left-0 h-full z-50 animate-in slide-in-from-left duration-200">
            <Sidebar onClose={() => setNavOpen(false)} pinned={false} onTogglePin={togglePin} />
          </div>
        </>
      )}
    </div>
  );
}
