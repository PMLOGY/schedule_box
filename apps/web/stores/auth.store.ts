import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/lib/api-client';

export interface User {
  id: string; // UUID
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: string; // UUID
  companyName: string;
}

interface LoginResponse {
  user: User;
  accessToken: string;
}

interface RefreshResponse {
  accessToken: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  refreshToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      // login() throws on error - caller must catch
      login: async (email: string, password: string) => {
        const response = await apiClient.post<LoginResponse>('/auth/login', {
          email,
          password,
        });
        set({
          user: response.user,
          accessToken: response.accessToken,
          isAuthenticated: true,
        });
      },

      logout: () => {
        // Fire-and-forget logout API call, catch errors silently
        apiClient.post('/auth/logout').catch(() => {
          // Ignore errors - we're logging out anyway
        });
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        });
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },

      setAccessToken: (token: string | null) => {
        set({ accessToken: token });
      },

      refreshToken: async () => {
        try {
          const response = await apiClient.post<RefreshResponse>('/auth/refresh');
          set({ accessToken: response.accessToken });
        } catch (_error) {
          // Refresh failed - clear state
          get().logout();
        }
      },
    }),
    {
      name: 'schedulebox-auth',
      partialize: (state) => ({
        // Only persist user - NOT tokens (accessToken in memory only)
        user: state.user,
      }),
    }
  )
);
