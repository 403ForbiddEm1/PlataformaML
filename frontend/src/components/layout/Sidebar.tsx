import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ExternalLink, LifeBuoy, Lock, LogOut, Pin, PinOff, X } from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';

/* ----------------------------------------------------------------------------
 * Sidebar fluido con coreografía orgánica (Emil Kowalski)
 *  - Se abre y cierra al pasar / quitar el mouse en modo automático ('auto').
 *  - Con el control inferior de la barra se puede fijar ABIERTO ('open')
 *    o fijar CERRADO ('closed'), sin botones intrusivos en la página normal.
 *  - Píldora activa deslizante + halo hover que sigue al cursor con inercia.
 *  - Botón inferior de "Contactar con Soporte" para enviar tickets al Superadmin.
 * -------------------------------------------------------------------------- */

const RAIL = 68;
const FULL = 272;
const MODE_KEY = 'ml_sidebar_lock_mode';

export type SidebarLockMode = 'auto' | 'open' | 'closed';

export interface SidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string;
  external?: boolean;
}

export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

export function useSidebarState() {
  const [lockMode, setLockModeState] = useState<SidebarLockMode>(() => {
    try {
      const saved = localStorage.getItem(MODE_KEY);
      if (saved === 'open' || saved === 'closed' || saved === 'auto') return saved;
      if (localStorage.getItem('ml_sidebar_pinned') === '1') return 'open';
      return 'auto';
    } catch {
      return 'auto';
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const setLockMode = useCallback((next: SidebarLockMode) => {
    setLockModeState(next);
    try {
      localStorage.setItem(MODE_KEY, next);
      localStorage.setItem('ml_sidebar_pinned', next === 'open' ? '1' : '0');
    } catch {
      /* sin almacenamiento */
    }
  }, []);

  const pinned = lockMode === 'open';

  const togglePin = useCallback(() => {
    setLockModeState((prev) => {
      const next: SidebarLockMode = prev === 'open' ? 'auto' : 'open';
      try {
        localStorage.setItem(MODE_KEY, next);
        localStorage.setItem('ml_sidebar_pinned', next === 'open' ? '1' : '0');
      } catch {}
      return next;
    });
  }, []);

  return { lockMode, setLockMode, pinned, togglePin, mobileOpen, setMobileOpen };
}

export const SIDEBAR_RAIL_PX = RAIL;
export const SIDEBAR_FULL_PX = FULL;

interface SidebarProps {
  sections: SidebarSection[];
  activeId: string;
  onSelect: (id: string) => void;
  brandSubtitle: string;
  contextLabel?: string;
  userName?: string;
  userRoleLabel?: string;
  userAvatarUrl?: string | null;
  userInitials?: string;
  onLogout: () => void;
  onBrandClick?: () => void;
  onOpenSupport?: () => void;
  lockMode: SidebarLockMode;
  onChangeLockMode: (mode: SidebarLockMode) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sections,
  activeId,
  onSelect,
  brandSubtitle,
  contextLabel,
  userName,
  userRoleLabel,
  userAvatarUrl,
  userInitials,
  onLogout,
  onBrandClick,
  onOpenSupport,
  lockMode,
  onChangeLockMode,
  mobileOpen,
  onMobileClose,
}) => {
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const leaveTimer = useRef<number | null>(null);

  // Refs para la píldora deslizante activa y el halo de hover
  const navRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [activePill, setActivePill] = useState<{ top: number; height: number; ready: boolean }>({
    top: 0,
    height: 42,
    ready: false,
  });
  const [hoverPill, setHoverPill] = useState<{ top: number; height: number; visible: boolean }>({
    top: 0,
    height: 42,
    visible: false,
  });

  const clearLeaveTimer = () => {
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
  };

  useEffect(() => clearLeaveTimer, []);

  const handleEnter = () => {
    clearLeaveTimer();
    if (lockMode === 'closed') return;
    setHovered(true);
  };

  const handleLeave = () => {
    clearLeaveTimer();
    setHoverPill((prev) => ({ ...prev, visible: false }));
    leaveTimer.current = window.setTimeout(() => setHovered(false), 140);
  };

  const expanded =
    mobileOpen ||
    lockMode === 'open' ||
    (lockMode === 'auto' && (hovered || focusWithin));

  const floating = expanded && lockMode !== 'open' && !mobileOpen;

  // Medición de la píldora activa para que se deslice con fluidez entre ítems
  const measureActivePill = useCallback(() => {
    const btn = itemRefs.current[activeId];
    const nav = navRef.current;
    if (!btn || !nav) return;
    const navRect = nav.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const top = btnRect.top - navRect.top + nav.scrollTop;
    setActivePill({ top, height: btnRect.height, ready: true });
  }, [activeId]);

  useLayoutEffect(() => {
    measureActivePill();
  }, [measureActivePill, sections, expanded]);

  useEffect(() => {
    window.addEventListener('resize', measureActivePill);
    return () => window.removeEventListener('resize', measureActivePill);
  }, [measureActivePill]);

  const handleItemMouseEnter = (id: string) => {
    const btn = itemRefs.current[id];
    const nav = navRef.current;
    if (!btn || !nav) return;
    const navRect = nav.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const top = btnRect.top - navRect.top + nav.scrollTop;
    setHoverPill({ top, height: btnRect.height, visible: true });
  };

  const asideClasses = [
    'app-sidebar-shell fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden select-none',
    'bg-[#170F09]/98 dark:bg-[#090A0C]/96 backdrop-blur-xl border-r border-[#8C6D4F]/30 dark:border-[#F1F2EC]/10 text-[#F6EEE2] dark:text-[#F1F2EC]',
    mobileOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full',
    'md:translate-x-0',
    floating ? 'shadow-[14px_0_44px_-8px_rgba(23,15,9,0.65)] dark:shadow-[14px_0_44px_-8px_rgba(0,0,0,0.68)]' : '',
  ].join(' ');

  const labelClass = (visible: boolean) =>
    `app-sidebar-label whitespace-nowrap ${
      visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'
    }`;

  // Acción al pulsar el icono del riel inferior cuando está contraído
  const handleRailLockClick = () => {
    if (lockMode === 'closed') {
      // Si estaba fijado cerrado, lo desbloquea a automático y lo abre
      onChangeLockMode('auto');
      setHovered(true);
    } else if (lockMode === 'open') {
      // Si estaba fijado abierto, lo pasa a automático y lo contrae
      onChangeLockMode('auto');
      setHovered(false);
    } else {
      // Si estaba en auto, lo fija abierto
      onChangeLockMode('open');
    }
  };

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-[#090A0C]/70 backdrop-blur-sm md:hidden animate-pop-in"
          aria-hidden="true"
        />
      )}

      <aside
        data-expanded={expanded ? 'true' : 'false'}
        className={asideClasses}
        style={{ width: FULL }}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={() => {
          if (lockMode !== 'closed') setFocusWithin(true);
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(false);
        }}
        aria-label="Navegación principal"
      >
        {/* Divisor derecho del riel cuando está contraído en 68px */}
        <div
          aria-hidden="true"
          className={`hidden md:block absolute inset-y-0 w-px bg-[#C8B193]/28 dark:bg-[#F1F2EC]/14 app-sidebar-rail-edge pointer-events-none ${
            expanded ? 'opacity-0' : 'opacity-100'
          }`}
          style={{
            left: RAIL - 1,
            transform: expanded ? `translate3d(${FULL - RAIL}px, 0, 0)` : 'translate3d(0, 0, 0)',
          }}
        />

        {/* Marca (sin botón superior de pin, solo logo + nombre) */}
        <div className="flex items-center h-16 shrink-0 border-b border-[#C8B193]/20 dark:border-[#F1F2EC]/10">
          <button
            type="button"
            onClick={onBrandClick}
            className="press flex items-center min-w-0 flex-1 h-full cursor-pointer group"
            aria-label="Ir al inicio"
          >
            <span className="flex items-center justify-center shrink-0" style={{ width: RAIL }}>
              <BrandLogo className="w-9 h-9 rounded-xl p-1.5 transition-transform duration-200 group-hover:scale-105" />
            </span>
            <span className={`flex flex-col text-left min-w-0 pr-3 ${labelClass(expanded)}`}>
              <span className="font-heading font-bold text-[15px] leading-none tracking-tight text-[#F6EEE2] dark:text-[#F1F2EC] group-hover:text-[#C8FF45] transition-colors">
                PlataformaML
              </span>
              <span className="mt-1.5 text-[9px] font-mono-tabular font-semibold uppercase tracking-[0.14em] text-[#E6B87A] dark:text-[#C8FF45] truncate">
                {brandSubtitle}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={onMobileClose}
            className="press md:hidden mr-3 p-2 rounded-lg text-slate-300 hover:text-white bg-white/10 border border-white/15 cursor-pointer"
            aria-label="Cerrar menú"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contexto (empresa) */}
        {contextLabel && (
          <div className="shrink-0 flex items-center h-11 border-b border-[#C8B193]/15 dark:border-[#F1F2EC]/8">
            <span className="flex items-center justify-center shrink-0" style={{ width: RAIL }}>
              <span className="w-2 h-2 rounded-full bg-[#C8FF45] shadow-[0_0_0_3px_rgba(200,255,69,0.18)]" />
            </span>
            <span className={`text-[11px] font-semibold text-[#F6EEE2]/85 dark:text-[#F1F2EC]/85 truncate pr-4 ${labelClass(expanded)}`}>
              {contextLabel}
            </span>
          </div>
        )}

        {/* Navegación con píldora deslizante orgánica perfectamente centrada */}
        <nav
          ref={navRef}
          onMouseLeave={() => setHoverPill((prev) => ({ ...prev, visible: false }))}
          className="relative flex-1 overflow-y-auto overflow-x-hidden py-2.5"
          aria-label="Secciones"
        >
          {/* Halo flotante que sigue el mouse (top-0 evita el desfase del padding-top) */}
          <div
            aria-hidden="true"
            className="app-sidebar-hover-pill pointer-events-none absolute top-0 left-2 right-2 rounded-xl bg-white/[0.06] dark:bg-[#F1F2EC]/[0.055]"
            style={{
              height: hoverPill.height,
              opacity: hoverPill.visible ? 1 : 0,
              transform: `translate3d(0, ${hoverPill.top}px, 0)`,
            }}
          />

          {/* Píldora activa deslizante + barra luminosa centrada (top-0) */}
          <div
            aria-hidden="true"
            className="app-sidebar-active-pill pointer-events-none absolute top-0 left-2 right-2 rounded-xl bg-[#0B5D46]/60 dark:bg-[#C8FF45]/14 border border-[#C8FF45]/30 dark:border-[#C8FF45]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
            style={{
              height: activePill.height,
              opacity: activePill.ready ? 1 : 0,
              transform: `translate3d(0, ${activePill.top}px, 0)`,
            }}
          >
            <span className="absolute -left-2 top-2 bottom-2 w-[3.5px] rounded-r-full bg-[#C8FF45] shadow-[0_0_10px_rgba(200,255,69,0.6)]" />
          </div>

          {sections.map((section, si) => (
            <div key={si} className="py-1 relative z-10">
              {section.title && (
                <div className="h-7 flex items-center">
                  <span
                    className={`px-5 text-[10px] font-mono-tabular font-semibold uppercase tracking-[0.16em] text-[#B8A286] dark:text-[#777873] ${labelClass(expanded)}`}
                    style={{ paddingLeft: RAIL - 20 }}
                  >
                    {section.title}
                  </span>
                </div>
              )}
              {section.items.map((item) => {
                const active = item.id === activeId;
                const Icon = item.icon;
                const hasBadge = item.badge !== undefined && item.badge !== 0 && item.badge !== '';
                return (
                  <button
                    key={item.id}
                    ref={(el) => {
                      itemRefs.current[item.id] = el;
                    }}
                    type="button"
                    onMouseEnter={() => handleItemMouseEnter(item.id)}
                    onClick={() => {
                      onSelect(item.id);
                      onMobileClose();
                    }}
                    title={expanded ? undefined : item.label}
                    aria-current={active ? 'page' : undefined}
                    className={`relative w-full h-11 flex items-center text-left cursor-pointer group transition-colors duration-150 ${
                      active
                        ? 'text-[#F6EEE2] dark:text-[#F1F2EC]'
                        : 'text-[#C8B193] dark:text-[#9A9B94] hover:text-[#F6EEE2] dark:hover:text-[#F1F2EC]'
                    }`}
                  >
                    <span className="relative flex items-center justify-center shrink-0" style={{ width: RAIL }}>
                      <Icon
                        className={`w-[18px] h-[18px] transition-transform duration-200 group-hover:scale-110 group-active:scale-95 ${
                          active ? 'text-[#C8FF45]' : 'group-hover:text-[#C8FF45]'
                        }`}
                        strokeWidth={active ? 2.2 : 1.85}
                      />
                      {hasBadge && !expanded && (
                        <span className="absolute top-2.5 right-[18px] w-2 h-2 rounded-full bg-[#C8FF45] ring-2 ring-[#261B12] dark:ring-[#090A0C]" />
                      )}
                    </span>
                    <span
                      className={`flex-1 min-w-0 text-[13px] font-semibold truncate ${labelClass(expanded)}`}
                    >
                      {item.label}
                    </span>
                    {item.external && (
                      <ExternalLink
                        className={`w-3.5 h-3.5 mr-4 shrink-0 text-[#B8A286] dark:text-[#777873] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${labelClass(expanded)}`}
                      />
                    )}
                    {hasBadge && (
                      <span
                        className={`mr-4 shrink-0 min-w-[22px] text-center text-[10px] font-mono-tabular font-bold px-1.5 py-0.5 rounded-md ${labelClass(expanded)} ${
                          active
                            ? 'bg-[#C8FF45] text-[#090A0C]'
                            : 'bg-white/10 text-[#F6EEE2] dark:text-[#F1F2EC] border border-white/15'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Pie del Sidebar: Contactar con Soporte + Usuario + Fijar Abierto/Cerrado + Cerrar sesión */}
        <div className="shrink-0 border-t border-[#C8B193]/20 dark:border-[#F1F2EC]/10 bg-black/15">
          {/* Botón Contactar con Soporte (Ticket al Superadmin) */}
          {onOpenSupport && (
            <button
              type="button"
              onClick={() => {
                onOpenSupport();
                onMobileClose();
              }}
              title={expanded ? undefined : 'Contactar con Soporte'}
              className="press w-full h-11 flex items-center text-left cursor-pointer group border-b border-[#C8B193]/15 dark:border-[#F1F2EC]/8 bg-[#0B5D46]/25 hover:bg-[#0B5D46]/45 dark:bg-[#4C6FFF]/15 dark:hover:bg-[#4C6FFF]/25 text-[#F6EEE2] dark:text-[#F1F2EC]"
            >
              <span className="flex items-center justify-center shrink-0" style={{ width: RAIL }}>
                <LifeBuoy className="w-[18px] h-[18px] text-[#C8FF45] transition-transform duration-200 group-hover:rotate-12 group-hover:scale-110" />
              </span>
              <span className={`flex-1 min-w-0 text-xs font-bold truncate ${labelClass(expanded)}`}>
                Contactar con Soporte
              </span>
              <span
                className={`mr-3.5 px-1.5 py-0.5 rounded text-[9px] font-mono-tabular font-bold uppercase bg-[#C8FF45]/20 text-[#C8FF45] border border-[#C8FF45]/35 ${labelClass(expanded)}`}
              >
                Ticket
              </span>
            </button>
          )}

          {/* Usuario activo */}
          {userName && (
            <div className="flex items-center h-13">
              <span className="flex items-center justify-center shrink-0" style={{ width: RAIL }}>
                {userAvatarUrl ? (
                  <img
                    src={userAvatarUrl}
                    alt={userName}
                    className="w-8 h-8 rounded-lg object-cover border border-[#C8FF45]/45"
                  />
                ) : (
                  <span className="w-8 h-8 rounded-lg bg-[#0B5D46] dark:bg-[#4C6FFF] text-[#F1F2EC] font-bold text-[11px] flex items-center justify-center">
                    {userInitials || userName.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </span>
              <span className={`flex flex-col min-w-0 pr-4 ${labelClass(expanded)}`}>
                <span className="text-xs font-semibold text-[#F6EEE2] dark:text-[#F1F2EC] truncate">{userName}</span>
                {userRoleLabel && (
                  <span className="text-[9px] font-mono-tabular uppercase tracking-wider text-[#E6B87A] dark:text-[#C8FF45] truncate">
                    {userRoleLabel}
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Control inferior para fijar abierto, fijar cerrado o dejar automático con el mouse */}
          <div className="hidden md:flex items-center h-10 border-t border-[#C8B193]/15 dark:border-[#F1F2EC]/8">
            <button
              type="button"
              onClick={handleRailLockClick}
              className="press flex items-center justify-center h-full shrink-0 text-[#C8B193] dark:text-[#9A9B94] hover:text-[#C8FF45] cursor-pointer"
              style={{ width: RAIL }}
              title={
                lockMode === 'open'
                  ? 'Sidebar fijado abierto (clic para modo automático)'
                  : lockMode === 'closed'
                  ? 'Sidebar fijado cerrado (clic para desbloquear)'
                  : 'Modo automático con el mouse (clic para fijar abierto)'
              }
            >
              {lockMode === 'open' ? (
                <Pin className="w-4 h-4 text-[#C8FF45]" />
              ) : lockMode === 'closed' ? (
                <Lock className="w-4 h-4 text-amber-400" />
              ) : (
                <PinOff className="w-4 h-4" />
              )}
            </button>

            <div className={`flex items-center gap-1 pr-3 flex-1 min-w-0 ${labelClass(expanded)}`}>
              <button
                type="button"
                onClick={() => {
                  if (lockMode === 'open') {
                    onChangeLockMode('auto');
                  } else {
                    onChangeLockMode('open');
                  }
                }}
                className={`press flex-1 py-1 px-2 rounded-lg text-[10px] font-bold text-center cursor-pointer border ${
                  lockMode === 'open'
                    ? 'bg-[#C8FF45] text-[#090A0C] border-[#C8FF45]'
                    : 'bg-white/[0.06] text-[#D5C3AA] dark:text-[#9A9B94] border-white/10 hover:text-white'
                }`}
                title="Dejar el sidebar siempre abierto"
              >
                {lockMode === 'open' ? 'Fijado abierto' : 'Fijar abierto'}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (lockMode === 'closed') {
                    onChangeLockMode('auto');
                  } else {
                    onChangeLockMode('closed');
                    setHovered(false);
                    setFocusWithin(false);
                  }
                }}
                className={`press flex-1 py-1 px-2 rounded-lg text-[10px] font-bold text-center cursor-pointer border ${
                  lockMode === 'closed'
                    ? 'bg-amber-400 text-[#090A0C] border-amber-400'
                    : 'bg-white/[0.06] text-[#D5C3AA] dark:text-[#9A9B94] border-white/10 hover:text-white'
                }`}
                title="Contraer y fijar cerrado (no se abre al pasar el mouse hasta desbloquear)"
              >
                {lockMode === 'closed' ? 'Fijado cerrado' : 'Fijar cerrado'}
              </button>
            </div>
          </div>

          {/* Cerrar sesión */}
          <button
            type="button"
            onClick={onLogout}
            className="press w-full h-11 flex items-center text-rose-300 hover:text-white hover:bg-rose-600/85 cursor-pointer border-t border-[#C8B193]/15 dark:border-[#F1F2EC]/8"
            title={expanded ? undefined : 'Cerrar sesión'}
          >
            <span className="flex items-center justify-center shrink-0" style={{ width: RAIL }}>
              <LogOut className="w-4 h-4" />
            </span>
            <span className={`text-xs font-bold ${labelClass(expanded)}`}>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};
