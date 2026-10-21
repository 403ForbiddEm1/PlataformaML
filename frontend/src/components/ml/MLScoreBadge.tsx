import React from 'react';
import { Sparkles } from 'lucide-react';

interface MLScoreBadgeProps {
  score: number;
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
  const getColor = (s: number) => {
    if (s >= 90) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: 'text-emerald-500' };
    if (s >= 75) return { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', icon: 'text-teal-500' };
    if (s >= 60) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'text-amber-500' };
    return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: 'text-rose-500' };
  };

  const style = getColor(score);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-bold',
  }[size];

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center rounded-full border ${style.bg} ${style.text} ${style.border} ${sizeClasses} ${
        onClick ? 'cursor-pointer hover:shadow-sm transition-all hover:scale-105' : ''
      }`}
      title={`Afinidad algorítmica: ${score}%. Clic para ver factores explicativos`}
    >
      <Sparkles className={`w-3.5 h-3.5 ${style.icon} animate-pulse`} />
      <span>{score}%</span>
      {showLabel && <span className="opacity-75 font-normal">Afinidad</span>}
    </div>
  );
};
