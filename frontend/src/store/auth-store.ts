import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  setUser: (user: User) => void;
  setTokens: (access: string, refresh: string) => void;
  logout: () => void;
  logoutWithServer: () => Promise<void>;
}

const clearAuth = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...clearAuth,

      setUser: (user) => set({ user, isAuthenticated: true }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isAuthenticated: true }),

      /** Silent local-only logout (used by interceptor on 401). */
      logout: () => set(clearAuth),

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
        }
      },
    }),
    {
      name: 'icomply-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
