import React, { useState } from 'react';
import { ChevronRight, Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import { SupportTicketModal } from '@/components/support/SupportTicketModal';
import {
  Sidebar,
  SIDEBAR_FULL_PX,
  SIDEBAR_RAIL_PX,
  useSidebarState,
  type SidebarSection,
} from '@/components/layout/Sidebar';

export interface AppShellProps {
  sections: SidebarSection[];
  activeId: string;
  onSelect: (id: string) => void;
  /** Texto bajo "PlataformaML" en la marca (ej. "EXPEDIENTE DE CANDIDATO") */
  brandSubtitle: string;
  /** Raíz de las migas de pan (ej. "Portal del candidato") */
  crumbRoot: string;
  /** Título de la sección activa */
  title: string;
  /** Etiqueta del rol que se muestra bajo el nombre (ej. "Administrador") */
  roleLabel: string;
  /** Nombre de la empresa (si aplica) */
  contextLabel?: string;
  /** Foto de perfil personalizada si difiere de user.photoUrl */
  userAvatarUrl?: string | null;
  /** Si se provee, reemplaza la apertura del modal de soporte (ej. Superadmin va a bandeja de tickets) */
  onSupportClick?: () => void;
  onLogout: () => void;
  onBrandClick?: () => void;
  /** Contenido extra en la barra superior, antes del selector de tema */
  topbarExtra?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Estructura común de todos los paneles autenticados:
 * sidebar auto-ocultable con el mouse (y fijable abierto/cerrado desde su pie)
 * + barra superior limpia sin botones duplicados de abrir sidebar.
 */
export const AppShell: React.FC<AppShellProps> = ({
  sections,
  activeId,
  onSelect,
  brandSubtitle,
  crumbRoot,
  title,
  roleLabel,
  contextLabel,
  userAvatarUrl,
  onSupportClick,
  onLogout,
  onBrandClick,
  topbarExtra,
  children,
}) => {
  const { user } = useAuth();
  const { lockMode, setLockMode, pinned, mobileOpen, setMobileOpen } = useSidebarState();
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : undefined;

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans">
      <Sidebar
        sections={sections}
        activeId={activeId}
        onSelect={onSelect}
        brandSubtitle={brandSubtitle}
        contextLabel={contextLabel}
        userName={user?.name}
        userRoleLabel={roleLabel}
        userAvatarUrl={userAvatarUrl ?? user?.photoUrl}
        userInitials={initials}
        onLogout={onLogout}
        onBrandClick={onBrandClick}
        onOpenSupport={() => {
          if (onSupportClick) {
            onSupportClick();
          } else {
            setIsSupportOpen(true);
          }
        }}
        lockMode={lockMode}
        onChangeLockMode={setLockMode}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Zona de contenido: reserva el riel y se desplaza únicamente cuando la barra está fijada abierta */}
      <div
        className="app-content-shift flex-1 flex flex-col min-w-0 max-md:!pl-0"
        style={{ paddingLeft: pinned ? SIDEBAR_FULL_PX : SIDEBAR_RAIL_PX }}
      >
        <header className="h-14 sm:h-16 sticky top-0 z-30 bg-[#F6EEE2]/88 dark:bg-[#090A0C]/84 backdrop-blur-md border-b border-[#C8B193]/80 dark:border-[#F1F2EC]/10 px-3 sm:px-8 flex items-center justify-between gap-3 text-[#3A2818] dark:text-[#F1F2EC]">
          <div className="flex items-center gap-2 text-xs min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="press md:hidden min-h-[42px] min-w-[42px] p-2 -ml-1 inline-flex items-center justify-center rounded-xl bg-[#EFE5D4] dark:bg-slate-800/80 border border-[#C8B193] dark:border-slate-700 text-[#3A2818] dark:text-[#F1F2EC] cursor-pointer shrink-0"
              aria-label="Abrir menú de navegación"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="hidden sm:inline font-medium text-[#70553B] dark:text-[#777873] shrink-0">{crumbRoot}</span>
            <ChevronRight className="hidden sm:inline w-3.5 h-3.5 text-[#9A7F61] dark:text-[#777873] shrink-0" />
            <span className="font-heading font-bold text-[#0B5D46] dark:text-[#C8FF45] truncate">{title}</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {topbarExtra}
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 min-w-0 flex flex-col">
          {children}
        </main>
      </div>

      <SupportTicketModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        defaultModule={`${crumbRoot} · ${title}`}
      />
    </div>
  );
};
