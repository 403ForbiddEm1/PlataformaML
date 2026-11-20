import React from 'react';
import { ApplicationStatus } from '@/types';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps {
  status?: ApplicationStatus | string;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'danger' | 'purple' | 'indigo';
  showDot?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  status,
  variant,
  showDot = true,
  className,
  children,
}) => {
  let resolvedVariant = variant || 'default';
  const label = children || status;

  if (status) {
    switch (status) {
      case 'Contratado':
        resolvedVariant = 'success';
        break;
      case 'Preseleccionado':
        resolvedVariant = 'indigo';
        break;
      case 'En revisión':
        resolvedVariant = 'info';
        break;
      case 'Entrevista':
        resolvedVariant = 'warning';
        break;
      case 'Recibida':
        resolvedVariant = 'default';
        break;
      case 'Descartado':
        resolvedVariant = 'danger';
        break;
      default:
        resolvedVariant = 'default';
    }
  }

  const styles = {
    success:
      'bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-800/70',
    indigo:
      'bg-indigo-50/90 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border-indigo-300/80 dark:border-indigo-800/70',
    warning:
      'bg-amber-50/90 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300/80 dark:border-amber-800/70',
    info:
      'bg-sky-50/90 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 border-sky-300/80 dark:border-sky-800/70',
    purple:
      'bg-purple-50/90 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-300/80 dark:border-purple-800/70',
    danger:
      'bg-rose-50/90 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-300/80 dark:border-rose-800/70',
    default:
      'bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border-slate-300/80 dark:border-slate-700',
  };

  const dotStyles = {
    success: 'bg-emerald-600 dark:bg-emerald-400',
    indigo: 'bg-indigo-600 dark:bg-indigo-400',
    warning: 'bg-amber-600 dark:bg-amber-400',
    info: 'bg-sky-600 dark:bg-sky-400',
    purple: 'bg-purple-600 dark:bg-purple-400',
    danger: 'bg-rose-600 dark:bg-rose-400',
    default: 'bg-slate-500 dark:bg-slate-400',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'stamp-badge inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border tracking-tight transition-colors tabular-nums',
          styles[resolvedVariant],
          className
        )
      )}
    >
      {showDot && (
        <span
          className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotStyles[resolvedVariant])}
        />
      )}
      {label}
    </span>
  );
};
