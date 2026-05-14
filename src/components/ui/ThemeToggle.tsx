import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { cn } from '../../utils/helpers';

type Theme = 'dark' | 'light';
const STORAGE_KEY = 'ailinc-theme';

const readInitialTheme = (): Theme => {
  if (typeof document === 'undefined') return 'dark';
  const attr = document.documentElement.getAttribute('data-theme');
  return attr === 'light' ? 'light' : 'dark';
};

const applyTheme = (theme: Theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* localStorage unavailable — ignore */
  }
};

const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      className={cn(
        'group relative flex h-9 w-[68px] items-center rounded-full p-1',
        'border border-themed-2 bg-ink-1/60 transition-colors',
        'hover:border-brand-cyan/40 focus:outline-none',
        'focus-visible:ring-2 focus-visible:ring-brand-cyan/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-0'
      )}
    >
      {/* sliding indicator */}
      <motion.span
        aria-hidden
        layout
        transition={{ type: 'spring', stiffness: 600, damping: 36 }}
        className={cn(
          'absolute top-1 left-1 h-7 w-7 rounded-full',
          'bg-brand-grad shadow-[0_4px_16px_-4px_rgba(0,224,255,0.6)]',
          isDark ? 'translate-x-0' : 'translate-x-[28px]'
        )}
        style={{ transform: `translateX(${isDark ? 0 : 28}px)` }}
      />

      {/* icons */}
      <span className="relative flex h-7 w-7 items-center justify-center">
        <Moon
          className={cn(
            'h-3.5 w-3.5 transition-colors',
            isDark ? 'text-white' : 'text-text-mute'
          )}
          strokeWidth={2}
        />
      </span>
      <span className="relative flex h-7 w-7 items-center justify-center">
        <Sun
          className={cn(
            'h-3.5 w-3.5 transition-colors',
            !isDark ? 'text-white' : 'text-text-mute'
          )}
          strokeWidth={2}
        />
      </span>
    </button>
  );
};

export default ThemeToggle;
