import React from 'react';
import { ArrowLeft, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { getDashboardViewForRole, getRoleSidebarConfig } from '@/config/roleNavigation';

interface NavbarProps {
  onNavigate: (view: string, initialTab?: string) => void;
  currentView: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const dashboardView = getDashboardViewForRole(user?.role);
  const roleNav = isAuthenticated ? getRoleSidebarConfig(user) : null;

  return (
    <header className="sticky top-0 z-40 bg-[#090A0C]/88 backdrop-blur-md border-b border-[#F1F2EC]/10 text-[#F1F2EC] transition-colors">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 h-[68px] sm:h-16 flex items-center justify-between gap-2.5 sm:gap-4">
        {/* Brand Mark */}
        <div
          onClick={() => onNavigate('vacancies')}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none group shrink-0"
        >
          <BrandLogo className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl p-1 group-hover:scale-105 transition-transform" />
          <div className="flex flex-col">
            <span className="font-heading font-bold text-[#F1F2EC] tracking-tight text-base leading-none group-hover:text-[#C8FF45] transition-colors">
              PlataformaML
            </span>
            <span className="hidden sm:block text-xs tracking-[0.1em] font-mono-tabular font-semibold text-[#C8FF45] uppercase mt-1">
              EXPEDIENTES
            </span>
          </div>
        </div>

        {/* Right Side Controls (Clean public controls, or single clear return button when authenticated) */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <ThemeToggle />

          {isAuthenticated && roleNav ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate(dashboardView)}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#C8FF45] hover:bg-[#d5ff6b] text-[#090A0C] border border-[#84cc16] shadow-[0_3px_0_#3f6212] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{roleNav.backButtonLabel}</span>
                <span className="sm:hidden">Mi Panel</span>
              </button>

              <div
                onClick={() => onNavigate(dashboardView)}
                className="hidden sm:flex items-center gap-2 pl-2 py-1 pr-3 rounded-xl border border-[#F1F2EC]/12 hover:border-[#C8FF45]/60 bg-[#F1F2EC]/5 cursor-pointer transition-all"
              >
                <div className="w-6 h-6 rounded-lg bg-[#4C6FFF] text-[#F1F2EC] font-bold text-xs flex items-center justify-center">
                  {user?.avatar || 'US'}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-[#F1F2EC] leading-tight">
                    {user?.name.split(' ')[0]}
                  </span>
                  <span className="text-xs text-[#C8FF45] font-mono-tabular leading-tight">
                    {roleNav.roleLabel}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  logout();
                  onNavigate('login');
                }}
                className="min-h-[40px] px-2.5 py-1.5 text-xs font-semibold text-white rounded-xl border border-rose-500 bg-rose-600 hover:bg-rose-500 shadow-[0_3px_0_#881337] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer inline-flex items-center gap-1.5"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Cerrar sesión</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="min-h-[40px] text-xs font-semibold text-[#F1F2EC] hover:text-[#C8FF45] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 shadow-[0_3px_0_#020617] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <LogIn className="w-4 h-4 text-[#C8FF45] shrink-0" />
                <span>Ingresar</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="hidden! sm:inline-flex! min-h-[40px] btn-3d-primary text-xs py-1.5 px-3 sm:px-3.5"
              >
                Registrarme
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
