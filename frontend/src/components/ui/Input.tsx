import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  isPassword?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  isPassword = false,
  className,
  type = 'text',
  id,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-[#090A0C]/85 dark:text-[#F1F2EC]/90 tracking-tight"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center group">
        {leftIcon && (
          <div className="absolute left-3.5 z-10 text-[#646661] dark:text-[#777873] group-focus-within:text-[#2563EB] dark:group-focus-within:text-[#C8FF45] pointer-events-none flex items-center transition-colors">
            {leftIcon}
          </div>
        )}

        <input
          id={inputId}
          type={isPassword ? (showPassword ? 'text' : 'password') : type}
          className={twMerge(
            clsx(
              'w-full px-3.5 py-2.5 bg-[#F1F2EC]/88 dark:bg-[#090A0C]/80 text-[#090A0C] dark:text-[#F1F2EC] border border-[#777873]/35 dark:border-[#777873]/40 rounded-xl text-sm font-normal transition-[background-color,border-color,box-shadow,transform] duration-180 outline-none shadow-[inset_0_1px_2px_rgba(9,10,12,0.06)]',
              'hover:border-[#777873]/70 dark:hover:border-[#F1F2EC]/30',
              'placeholder:text-[#777873]',
              'focus:bg-white dark:focus:bg-[#090A0C]/95 focus:border-[#4C6FFF] dark:focus:border-[#C8FF45] focus:ring-3 focus:ring-[#4C6FFF]/15 dark:focus:ring-[#C8FF45]/15 focus:translate-x-[1px]',
              leftIcon && 'pl-10',
              isPassword && 'pr-10',
              error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/15',
              className
            )
          )}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 z-10 text-[#646661] dark:text-[#777873] hover:text-[#090A0C] dark:hover:text-[#C8FF45] focus:outline-none p-1 transition-colors cursor-pointer"
            tabIndex={-1}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>

      {error ? (
        <p className="text-xs text-rose-500 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[#777873]">{helperText}</p>
      ) : null}
    </div>
  );
};
