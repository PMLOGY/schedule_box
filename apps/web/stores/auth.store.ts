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
  organizationId?: string; // Organization UUID if user belongs to org
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

interface SwitchLocationResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  company: {
    uuid: string;
    name: string;
    slug: string;
  };
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  refreshToken: () => Promise<void>;
  switchLocation: (companyUuid: string) => Promise<void>;
  setHasHydrated: (hydrated: boolean) => void;
  startBackgroundRefresh: () => void;
  stopBackgroundRefresh: () => void;
}

// Module-level variable to hold the refresh interval ID (not persisted in state)
let backgroundRefreshIntervalId: ReturnType<typeof setInterval> | null = null;

const BACKGROUND_REFRESH_INTERVAL_MS = 12 * 60 * 1000; // 12 minutes

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setHasHydrated: (hydrated: boolean) => {
        set({ _hasHydrated: hydrated });
      },

      startBackgroundRefresh: () => {
        // Clear any existing interval to avoid duplicates
        if (backgroundRefreshIntervalId !== null) {
          clearInterval(backgroundRefreshIntervalId);
        }
        backgroundRefreshIntervalId = setInterval(() => {
          const state = get();
          if (state.isAuthenticated) {
            state.refreshToken();
          }
        }, BACKGROUND_REFRESH_INTERVAL_MS);
      },

      stopBackgroundRefresh: () => {
        if (backgroundRefreshIntervalId !== null) {
          clearInterval(backgroundRefreshIntervalId);
          backgroundRefreshIntervalId = null;
        }
      },

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
        // Start background refresh after successful login
        get().startBackgroundRefresh();
      },

      logout: () => {
        // Stop background refresh before clearing state
        get().stopBackgroundRefresh();
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

      switchLocation: async (companyUuid: string) => {
        const currentUser = get().user;
        if (!currentUser) return;

        const response = await apiClient.post<SwitchLocationResponse>('/auth/switch-location', {
          company_uuid: companyUuid,
        });
        set({
          accessToken: response.access_token,
          user: {
            ...currentUser,
            companyId: response.company.uuid,
            companyName: response.company.name,
          },
        });
      },
    }),
    {
      name: 'schedulebox-auth',
      partialize: (state) => ({
        // Persist auth state so dashboard survives page refresh
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Mark hydration complete
        state?.setHasHydrated(true);
        // Resume background refresh if user was authenticated before reload
        if (state?.isAuthenticated) {
          state.startBackgroundRefresh();
        }
      },
    },
  ),
);
