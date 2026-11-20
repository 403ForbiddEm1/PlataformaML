import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex flex-row items-center justify-center font-semibold select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4C6FFF] focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none transition-all duration-180 ease-out tracking-tight';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 rounded-lg gap-1.5',
    md: 'text-xs sm:text-sm px-4 py-2.5 rounded-xl gap-2 font-semibold',
    lg: 'text-sm sm:text-base px-5 py-3 rounded-xl gap-2.5 font-semibold',
  };

  const variantStyles = {
    primary:
      'bg-[#C8FF45] hover:bg-[#D5FF6E] text-[#090A0C] border border-[#84cc16] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_4px_0_#3f6212] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_5px_0_#3f6212] hover:-translate-y-[1px] active:translate-y-[3px] active:shadow-none',
    secondary:
      'bg-[#4C6FFF] hover:bg-[#6180FF] text-[#F1F2EC] border border-[#2563eb] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_4px_0_#1e40af] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_5px_0_#1e40af] hover:-translate-y-[1px] active:translate-y-[3px] active:shadow-none',
    outline:
      'bg-[#F1F2EC] dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 text-[#090A0C] dark:text-[#F1F2EC] border border-[#777873]/45 dark:border-slate-600 hover:border-[#4C6FFF] dark:hover:border-[#C8FF45]/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_3px_0_#64748b] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_3px_0_#020617] hover:-translate-y-[1px] active:translate-y-[3px] active:shadow-none',
    ghost:
      'text-[#777873] hover:bg-slate-200/80 dark:text-[#777873] dark:hover:bg-slate-800 hover:text-[#090A0C] dark:hover:text-[#F1F2EC] border border-transparent hover:border-[#777873]/25 hover:shadow-[0_3px_0_#64748b] dark:hover:shadow-[0_3px_0_#020617] active:translate-y-[2px] active:shadow-none',
    danger:
      'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white border border-rose-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_4px_0_#881337] hover:-translate-y-[1px] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_5px_0_#881337] active:translate-y-[3px] active:shadow-none',
    success:
      'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white border border-emerald-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_4px_0_#065f46] hover:-translate-y-[1px] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_5px_0_#065f46] active:translate-y-[3px] active:shadow-none',
  };

  return (
    <button
      className={twMerge(
        clsx(
          baseStyles,
          sizeStyles[size],
          variantStyles[variant],
          fullWidth && 'w-full',
          className
        )
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
      ) : (
        leftIcon
      )}
      <span className="inline-flex items-center gap-2">{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
