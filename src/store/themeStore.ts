import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: true, // Default to dark as per original design
      toggleTheme: () => set((state) => ({ isDark: !state.isDark })),
    }),
    {
      name: 'nexus-theme',
    }
  )
);
