import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@/types/database';
import { authService } from '@/services/auth.service';
import { setTokenGetter } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),

      login: async (email, password) => {
        const { user, token } = await authService.login({ email, password });
        set({ user, token, isAuthenticated: true });
      },

      register: async (email, password, full_name, phone) => {
        const { user, token } = await authService.register({ email, password, full_name, phone });
        set({ user, token, isAuthenticated: true });
      },

      logout: async () => {
        await authService.logout();
        set({ user: null, token: null, isAuthenticated: false });
      },

      loadUser: async () => {
        try {
          set({ isLoading: true });
          const user = await authService.getCurrentUser();
          set({ user, isAuthenticated: !!user, isLoading: false });
        } catch {
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);

// Wire API client to use token from store
setTokenGetter(() => useAuthStore.getState().token);
