import React, { useEffect } from 'react';
import { X, Folder } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  variant?: 'default' | 'manila';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
  variant = 'default',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  }[maxWidth];

  const isManila = variant === 'manila';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6 overflow-y-auto">
      {/* Frosted Glass Backdrop */}
      <div
        className="fixed inset-0 bg-[#090A0C]/75 backdrop-blur-md modal-animate-backdrop"
        onClick={onClose}
      />

      {/* Neumorphism + Glassmorphism Combined Modal Dialog */}
      <div
        className={`relative w-full ${maxWidthClass} neu-glass-modal rounded-2xl overflow-hidden modal-animate-card z-10 max-h-[92dvh] flex flex-col my-auto`}
      >
        {/* Top Luminous Accent Line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-[#C8FF45] via-[#4C6FFF] to-transparent opacity-85" />

        {/* Header */}
        <div
          className={`px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between border-b ${
            isManila
              ? 'bg-[#E5D6BE]/80 dark:bg-[#1E1914]/80 text-[#090A0C] dark:text-[#F1F2EC] border-[#C8B496]/60 dark:border-[#46372B]'
              : 'bg-[#F1F2EC]/40 dark:bg-[#090A0C]/45 border-[#777873]/25 dark:border-[#F1F2EC]/10'
          }`}
        >
          <div className="pr-3 min-w-0">
            <h3 className="font-heading text-sm sm:text-lg font-bold tracking-tight flex items-center gap-2 text-[#090A0C] dark:text-[#F1F2EC]">
              {isManila && <Folder className="w-4 h-4 text-[#4C6FFF] dark:text-[#C8FF45] shrink-0" />}
              <span className="truncate">{title}</span>
            </h3>
            {subtitle && (
              <p className="text-[11px] sm:text-xs mt-0.5 leading-snug text-[#777873] font-medium">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="w-8 h-8 rounded-xl inline-flex items-center justify-center text-[#777873] hover:text-[#090A0C] dark:hover:text-[#C8FF45] bg-[#F1F2EC]/85 dark:bg-[#14171F]/90 border border-[#777873]/35 hover:border-[#4C6FFF] dark:hover:border-[#C8FF45]/50 shadow-[inset_1px_1px_1px_rgba(255,255,255,0.16),0_3px_0_#64748b] dark:shadow-[inset_1px_1px_1px_rgba(255,255,255,0.08),0_3px_0_#020617] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer focus:outline-none shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
