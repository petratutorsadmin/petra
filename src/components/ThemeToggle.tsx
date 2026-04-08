'use client';

import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon, Eye } from 'lucide-react';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center p-2 rounded-none hover:bg-surface/50 text-text-muted hover:text-text-primary transition-colors border border-transparent hover:border-text-muted/20"
      aria-label="Toggle light/dark mode"
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5" />
      ) : theme === 'light' ? (
        <Moon className="w-5 h-5" />
      ) : (
        <Eye className="w-5 h-5" />
      )}
    </button>
  );
};
