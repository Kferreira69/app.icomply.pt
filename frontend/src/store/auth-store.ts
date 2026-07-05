import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
  avatarUrl?: string;
  organization?: { id: string; name: string; slug: string };
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  rememberMe: boolean;
  /** Epoch ms when the Remember Me token was stored (for 30-day expiry check). */
  rememberMeStoredAt: number | null;
  setUser: (user: User) => void;
  setTokens: (access: string, refresh: string, rememberMe?: boolean) => void;
  logout: () => void;
  logoutWithServer: () => Promise<void>;
}

const clearAuth = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  rememberMe: false,
  rememberMeStoredAt: null,
};

/** 30 days in milliseconds */
const REMEMBER_ME_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Decode a JWT payload without verifying the signature.
 * Returns null if the token is malformed.
 */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    // Pad to valid base64 length
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Returns the number of seconds until the JWT expires.
 * Returns 0 if already expired or token is invalid.
 */
export function secondsUntilExpiry(token: string): number {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return 0;
  const nowSec = Math.floor(Date.now() / 1000);
  return Math.max(0, payload.exp - nowSec);
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...clearAuth,

      setUser: (user) => set({ user, isAuthenticated: true }),

      setTokens: (accessToken, refreshToken, rememberMe) =>
        set((prev) => ({
          accessToken,
          refreshToken,
          isAuthenticated: true,
          // Preserve existing rememberMe flag if not explicitly passed
          rememberMe: rememberMe !== undefined ? rememberMe : prev.rememberMe,
          rememberMeStoredAt: rememberMe ? Date.now() : prev.rememberMeStoredAt,
        })),

      /** Silent local-only logout (used by interceptor on 401). */
      logout: () => {
        set(clearAuth);
        // Also clear sessionStorage in case it was used
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('icomply-auth-session');
        }
      },

      /**
       * Full logout: calls /auth/logout to revoke the server-side token
       * and clear HttpOnly cookies, then clears local state.
       */
      logoutWithServer: async () => {
        try {
          // Import lazily to avoid circular dep at module load time
          const { authApi } = await import('@/lib/api');
          await authApi.logout();
        } catch {
          // Best-effort — clear local state regardless
        } finally {
          set(clearAuth);
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('icomply-auth-session');
          }
        }
      },
    }),
    {
      name: 'icomply-auth',
      // Always use localStorage so state survives tab/window close.
      // The rememberMe flag controls whether we enforce a 30-day TTL.
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : ({} as Storage),
      ),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        rememberMe: state.rememberMe,
        rememberMeStoredAt: state.rememberMeStoredAt,
      }),
      // On rehydration: if rememberMe=false or TTL expired, clear tokens
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const { rememberMe, rememberMeStoredAt, accessToken } = state;

        // If the user did NOT check "remember me", treat localStorage like
        // sessionStorage: only keep the session alive if the page hasn't been
        // fully closed (detected by sessionStorage sentinel).
        if (!rememberMe) {
          const sentinel =
            typeof window !== 'undefined'
              ? sessionStorage.getItem('icomply-auth-session')
              : null;
          if (!sentinel && accessToken) {
            // Page was fully closed and reopened without "remember me" — log out.
            state.logout();
            return;
          }
        }

        // If rememberMe=true but TTL has elapsed (30 days), force logout.
        if (rememberMe && rememberMeStoredAt) {
          if (Date.now() - rememberMeStoredAt > REMEMBER_ME_TTL_MS) {
            state.logout();
            return;
          }
        }

        // Set the session sentinel for this browser session.
        if (typeof window !== 'undefined' && state.isAuthenticated) {
          sessionStorage.setItem('icomply-auth-session', '1');
        }
      },
    },
  ),
);

/**
 * Cross-tab logout: when another tab clears localStorage 'icomply-auth',
 * this tab will also log out and redirect to /login.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'icomply-auth' && event.newValue === null) {
      // Another tab logged out — clear state in this tab too
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
  });
}
