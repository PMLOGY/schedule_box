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

interface LoginApiResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    uuid: string;
    email: string;
    name: string;
    role: string;
    company_id: string;
    mfa_enabled: boolean;
    email_verified: boolean;
  };
}

interface RefreshApiResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
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
        const response = await apiClient.post<LoginApiResponse>('/auth/login', {
          email,
          password,
        });
        const apiUser = response.user;
        const nameParts = apiUser.name.split(' ');
        set({
          user: {
            id: apiUser.uuid,
            email: apiUser.email,
            firstName: nameParts[0] || apiUser.name,
            lastName: nameParts.slice(1).join(' ') || '',
            role: apiUser.role,
            companyId: apiUser.company_id,
            companyName: '',
          },
          accessToken: response.access_token,
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
          const response = await apiClient.post<RefreshApiResponse>('/auth/refresh');
          set({ accessToken: response.access_token });
        } catch {
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
    },
  ),
);
