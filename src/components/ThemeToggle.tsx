import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';
import { cn } from '../lib/utils';

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: 'light', icon: Sun, label: 'Clair' },
    { value: 'system', icon: Monitor, label: 'Système' },
    { value: 'dark', icon: Moon, label: 'Sombre' },
  ] as const;

  return (
    <div className="flex bg-surface-hover/50 p-1 rounded-xl border border-border/10">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => setTheme(option.value)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
            theme === option.value
              ? 'bg-surface text-nexus-primary shadow-sm border border-border/10'
              : 'text-text-muted hover:text-text-main hover:bg-surface-hover'
          )}
        >
          <option.icon size={12} />
          <span className="hidden sm:inline">{option.label}</span>
        </button>
      ))}
    </div>
  );
};
