import React from 'react';
import { Sparkles } from 'lucide-react';

interface MLScoreBadgeProps {
  score?: number | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onClick?: () => void;
}

export const MLScoreBadge: React.FC<MLScoreBadgeProps> = ({
  score,
  size = 'md',
  showLabel = true,
  onClick,
}) => {
  const isEvaluated = typeof score === 'number' && !Number.isNaN(score);

  const getColor = (s: number) => {
    if (s >= 90)
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/50',
        text: 'text-emerald-800 dark:text-emerald-300',
        border: 'border-emerald-300 dark:border-emerald-800',
        icon: 'text-emerald-600 dark:text-emerald-400',
      };
    if (s >= 75)
      return {
        bg: 'bg-teal-50 dark:bg-teal-950/50',
        text: 'text-teal-800 dark:text-teal-300',
        border: 'border-teal-300 dark:border-teal-800',
        icon: 'text-teal-600 dark:text-teal-400',
      };
    if (s >= 60)
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/50',
        text: 'text-amber-800 dark:text-amber-300',
        border: 'border-amber-300 dark:border-amber-800',
        icon: 'text-amber-600 dark:text-amber-400',
      };
    return {
      bg: 'bg-rose-50 dark:bg-rose-950/50',
      text: 'text-rose-800 dark:text-rose-300',
      border: 'border-rose-300 dark:border-rose-800',
      icon: 'text-rose-600 dark:text-rose-400',
    };
  };

  const style = isEvaluated
    ? getColor(score as number)
    : {
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-600 dark:text-slate-400',
        border: 'border-slate-300 dark:border-slate-700',
        icon: 'text-slate-400',
      };

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
    lg: 'text-xs sm:text-sm px-3 py-1.5 gap-1.5 font-bold',
  }[size];

  return (
    <div
      onClick={onClick}
      data-numeric="true"
      className={`inline-flex items-center rounded-lg border tabular-nums ${style.bg} ${style.text} ${style.border} ${sizeClasses} ${
        onClick
          ? 'cursor-pointer hover:shadow-xs transition-all duration-150 hover:-translate-y-[1px]'
          : ''
      }`}
      title={
        isEvaluated
          ? `Afinidad algorítmica: ${score}%. Clic para ver acta de factores explicativos`
          : 'Sin evaluar por el modelo de IA'
      }
    >
      <Sparkles className={`w-3.5 h-3.5 ${style.icon} shrink-0`} />
      {isEvaluated ? (
        <>
          <span className="font-mono-tabular font-bold">{score}%</span>
          {showLabel && <span className="opacity-80 font-medium">Afinidad</span>}
        </>
      ) : (
        <span className="font-medium">Sin evaluar</span>
      )}
    </div>
  );
};
