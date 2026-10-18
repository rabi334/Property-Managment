import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

export type ThemePreference = 'light' | 'dark' | 'auto';

interface ThemeState {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'auto',
      setPreference: (pref) => set({ preference: pref }),
    }),
    {
      name: 'theme-preference',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export function useResolvedScheme(): 'light' | 'dark' {
  const preference = useThemeStore((s) => s.preference);
  const systemScheme = useColorScheme();
  if (preference === 'auto') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return preference;
}
