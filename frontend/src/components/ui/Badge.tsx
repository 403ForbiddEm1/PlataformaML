import React from 'react';
import { ApplicationStatus } from '@/types';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps {
  status?: ApplicationStatus | string;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'danger' | 'purple';
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
  let label = children || status;

  if (status) {
    switch (status) {
      case 'Preseleccionado':
      case 'Contratado':
        resolvedVariant = 'success';
        break;
      case 'En revisión':
        resolvedVariant = 'warning';
        break;
      case 'Recibida':
        resolvedVariant = 'info';
        break;
      case 'Entrevista':
        resolvedVariant = 'purple';
        break;
      case 'Descartado':
        resolvedVariant = 'danger';
        break;
      default:
        resolvedVariant = 'default';
    }
  }

  const styles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/60',
    info: 'bg-sky-50 text-sky-700 border-sky-200/60',
    purple: 'bg-purple-50 text-purple-700 border-purple-200/60',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/60',
    default: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const dotStyles = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    info: 'bg-sky-500',
    purple: 'bg-purple-500',
    danger: 'bg-rose-500',
    default: 'bg-slate-400',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
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
