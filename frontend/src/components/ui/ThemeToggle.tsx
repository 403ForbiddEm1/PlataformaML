import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', size = 'md' }) => {
  const { isDark, toggleTheme } = useTheme();
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const padding = size === 'sm' ? 'p-1.5' : 'p-2';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle-btn rounded-lg text-slate-400 hover:text-amber-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center cursor-pointer select-none overflow-hidden relative ${padding} ${className}`}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {isDark ? (
        <Sun key="sun-icon" className={`${iconSize} text-amber-400 theme-toggle-icon`} />
      ) : (
        <Moon key="moon-icon" className={`${iconSize} text-slate-300 theme-toggle-icon`} />
      )}
    </button>
  );
};
