/**
 * authStore.ts — Global auth state managed via Zustand.
 * Will hold JWT token, user profile, and expiry info.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthUser {
  id: string;
  walletAddress: string;
  name: string;
  role: 'admin' | 'officer' | 'user';
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken) =>
        set({ user, accessToken, isAuthenticated: true }),

      clearAuth: () =>
        set({ user: null, accessToken: null, isAuthenticated: false }),
    }),
    {
      name: 'land-registry-auth',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      // Only persist non-sensitive parts
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
