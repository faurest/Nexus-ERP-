import React, { useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useThemeStore();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <button
      onClick={toggleTheme}
      className={`relative w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 ${
        isDark ? 'bg-nexus-surface border border-nexus-border' : 'bg-slate-200 border border-slate-300'
      }`}
      aria-label="Toggle Theme"
    >
      <div 
        className={`w-6 h-6 rounded-full flex items-center justify-center transform transition-transform duration-300 ${
          isDark ? 'translate-x-6 bg-slate-800' : 'translate-x-0 bg-white shadow-sm'
        }`}
      >
        {isDark ? <Moon size={12} className="text-nexus-accent" /> : <Sun size={12} className="text-amber-500" />}
      </div>
    </button>
  );
}
