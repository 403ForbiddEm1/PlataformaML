import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { BrandLogo } from '@/components/ui/BrandLogo';

interface NavbarProps {
  onNavigate: (view: string) => void;
  currentView: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentView }) => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-[#090A0C]/85 backdrop-blur-md border-b border-[#F1F2EC]/10 text-[#F1F2EC] transition-colors">
      <div className="max-w-7xl 2xl:max-w-[1560px] mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Mark */}
        <div
          onClick={() => onNavigate('vacancies')}
          className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none group shrink-0"
        >
          <BrandLogo className="w-8 h-8 rounded-xl p-1 group-hover:scale-105 transition-transform" />
          <div className="flex flex-col">
            <span className="font-heading font-bold text-[#F1F2EC] tracking-tight text-sm sm:text-base leading-none group-hover:text-[#C8FF45] transition-colors">
              PlataformaML
            </span>
            <span className="hidden sm:block text-[9px] tracking-[0.14em] font-mono-tabular font-semibold text-[#C8FF45] uppercase mt-1">
              EXPEDIENTES
            </span>
          </div>
        </div>

        {/* Center Navigation Tabs (Only visible when a user session is active) */}
        {isAuthenticated && (
          <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-xl bg-[#F1F2EC]/5 border border-[#F1F2EC]/10 text-xs font-medium">
            <button
              type="button"
              onClick={() => onNavigate('vacancies')}
              className={`px-3.5 py-1.5 rounded-lg transition-all duration-180 cursor-pointer ${
                currentView === 'vacancies' || currentView === 'apply'
                  ? 'bg-[#C8FF45] text-[#090A0C] font-semibold border border-[#84cc16] shadow-[0_3px_0_#3f6212] active:translate-y-[2px] active:shadow-none'
                  : 'text-[#777873] hover:text-[#F1F2EC] hover:bg-slate-800 hover:shadow-[0_2px_0_#020617] active:translate-y-[1px] active:shadow-none'
              }`}
            >
              Convocatorias Activas
            </button>

            {user?.role === 'candidato' && (
              <button
                type="button"
                onClick={() => onNavigate('candidate-dashboard')}
                className={`px-3.5 py-1.5 rounded-lg transition-all duration-180 cursor-pointer ${
                  currentView === 'candidate-dashboard'
                    ? 'bg-[#C8FF45] text-[#090A0C] font-semibold border border-[#84cc16] shadow-[0_3px_0_#3f6212] active:translate-y-[2px] active:shadow-none'
                    : 'text-[#777873] hover:text-[#F1F2EC] hover:bg-slate-800 hover:shadow-[0_2px_0_#020617] active:translate-y-[1px] active:shadow-none'
                }`}
              >
                Mi Expediente & Postulaciones
              </button>
            )}

            {user?.role === 'rrhh' && (
              <button
                type="button"
                onClick={() => onNavigate('hr-dashboard')}
                className={`px-3.5 py-1.5 rounded-lg transition-all duration-180 cursor-pointer ${
                  currentView === 'hr-dashboard'
                    ? 'bg-[#C8FF45] text-[#090A0C] font-semibold border border-[#84cc16] shadow-[0_3px_0_#3f6212] active:translate-y-[2px] active:shadow-none'
                    : 'text-[#777873] hover:text-[#F1F2EC] hover:bg-slate-800 hover:shadow-[0_2px_0_#020617] active:translate-y-[1px] active:shadow-none'
                }`}
              >
                Mesa de Evaluación ({user.empresaNombre || 'Empresa'})
              </button>
            )}

            {(user?.role === 'admin' || user?.role === 'administrador') && (
              <button
                type="button"
                onClick={() => onNavigate('company-admin-dashboard')}
                className={`px-3.5 py-1.5 rounded-lg transition-all duration-180 cursor-pointer ${
                  currentView === 'company-admin-dashboard'
                    ? 'bg-[#C8FF45] text-[#090A0C] font-semibold border border-[#84cc16] shadow-[0_3px_0_#3f6212] active:translate-y-[2px] active:shadow-none'
                    : 'text-[#777873] hover:text-[#F1F2EC] hover:bg-slate-800 hover:shadow-[0_2px_0_#020617] active:translate-y-[1px] active:shadow-none'
                }`}
              >
                Administración Empresa
              </button>
            )}

            {user?.role === 'superadmin' && (
              <button
                type="button"
                onClick={() => onNavigate('global-admin-dashboard')}
                className={`px-3.5 py-1.5 rounded-lg transition-all duration-180 cursor-pointer ${
                  currentView === 'global-admin-dashboard' || currentView === 'admin-dashboard'
                    ? 'bg-[#C8FF45] text-[#090A0C] font-semibold border border-[#84cc16] shadow-[0_3px_0_#3f6212] active:translate-y-[2px] active:shadow-none'
                    : 'text-[#777873] hover:text-[#F1F2EC] hover:bg-slate-800 hover:shadow-[0_2px_0_#020617] active:translate-y-[1px] active:shadow-none'
                }`}
              >
                Superadmin & MLOps
              </button>
            )}
          </nav>
        )}

        {/* Right Side Controls (Logout strictly at the far right corner with Red Exit preserved) */}
        <div className="flex items-center gap-2.5">
          <ThemeToggle />

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div
                onClick={() => {
                  if (user?.role === 'candidato') onNavigate('candidate-dashboard');
                  else if (user?.role === 'rrhh') onNavigate('hr-dashboard');
                  else onNavigate('admin-dashboard');
                }}
                className="flex items-center gap-2 pl-2 py-1 pr-3 rounded-xl border border-[#F1F2EC]/12 hover:border-[#C8FF45]/60 bg-[#F1F2EC]/5 cursor-pointer transition-all hover:translate-x-[2px]"
              >
                <div className="w-6 h-6 rounded-lg bg-[#4C6FFF] text-[#F1F2EC] font-bold text-[11px] flex items-center justify-center">
                  {user?.avatar || 'US'}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-[#F1F2EC] leading-tight">
                    {user?.name.split(' ')[0]}
                  </span>
                  <span className="text-[9px] text-[#C8FF45] font-mono-tabular uppercase tracking-wider">
                    {user?.role === 'superadmin'
                      ? 'Superadmin'
                      : user?.role === 'admin'
                      ? 'Admin'
                      : user?.role === 'rrhh'
                      ? 'RRHH'
                      : 'Candidato'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  logout();
                  onNavigate('login');
                }}
                className="px-2.5 py-1.5 text-xs font-semibold text-white rounded-xl border border-rose-500 bg-rose-600 hover:bg-rose-500 shadow-[0_3px_0_#881337] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer inline-flex items-center gap-1.5"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cerrar sesión</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="text-xs font-semibold text-[#F1F2EC] hover:text-[#C8FF45] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 shadow-[0_3px_0_#020617] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
              >
                Ingresar
              </button>
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="btn-3d-primary text-xs py-1.5 px-3 sm:px-3.5"
              >
                Registrarme
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation Strip (< md) only when logged in */}
      {isAuthenticated && (
        <nav className="md:hidden border-t border-[#F1F2EC]/10 px-3 py-2 flex items-center gap-1.5 overflow-x-auto bg-[#090A0C]/60 text-[11px] font-medium">
          <button
            type="button"
            onClick={() => onNavigate('vacancies')}
            className={`px-3 py-1 rounded-lg whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              currentView === 'vacancies' || currentView === 'apply'
                ? 'bg-[#C8FF45] text-[#090A0C] font-semibold shadow-[0_3px_0_#3f6212] active:translate-y-[2px] active:shadow-none'
                : 'text-[#777873] hover:text-[#F1F2EC] bg-slate-800 shadow-[0_2px_0_#020617] active:translate-y-[1px] active:shadow-none'
            }`}
          >
            Convocatorias Activas
          </button>

          {user?.role === 'candidato' && (
            <button
              type="button"
              onClick={() => onNavigate('candidate-dashboard')}
              className={`px-3 py-1 rounded-lg whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                currentView === 'candidate-dashboard'
                  ? 'bg-[#C8FF45] text-[#090A0C] font-semibold shadow-[0_3px_0_#3f6212] active:translate-y-[2px] active:shadow-none'
                  : 'text-[#777873] hover:text-[#F1F2EC] bg-slate-800 shadow-[0_2px_0_#020617] active:translate-y-[1px] active:shadow-none'
              }`}
            >
              Mi Expediente
            </button>
          )}

          {user?.role === 'rrhh' && (
            <button
              type="button"
              onClick={() => onNavigate('hr-dashboard')}
              className={`px-3 py-1 rounded-lg whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                currentView === 'hr-dashboard'
                  ? 'bg-[#C8FF45] text-[#090A0C] font-semibold shadow-[0_3px_0_#3f6212] active:translate-y-[2px] active:shadow-none'
                  : 'text-[#777873] hover:text-[#F1F2EC] bg-slate-800 shadow-[0_2px_0_#020617] active:translate-y-[1px] active:shadow-none'
              }`}
            >
              Mesa RRHH
            </button>
          )}

          {(user?.role === 'admin' || user?.role === 'administrador') && (
            <button
              type="button"
              onClick={() => onNavigate('company-admin-dashboard')}
              className={`px-3 py-1 rounded-lg whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                currentView === 'company-admin-dashboard'
                  ? 'bg-[#C8FF45] text-[#090A0C] font-semibold shadow-[0_3px_0_#3f6212] active:translate-y-[2px] active:shadow-none'
                  : 'text-[#777873] hover:text-[#F1F2EC] bg-slate-800 shadow-[0_2px_0_#020617] active:translate-y-[1px] active:shadow-none'
              }`}
            >
              Admin Empresa
            </button>
          )}

          {user?.role === 'superadmin' && (
            <button
              type="button"
              onClick={() => onNavigate('global-admin-dashboard')}
              className={`px-3 py-1 rounded-lg whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                currentView === 'global-admin-dashboard' || currentView === 'admin-dashboard'
                  ? 'bg-[#C8FF45] text-[#090A0C] font-semibold shadow-[0_3px_0_#3f6212] active:translate-y-[2px] active:shadow-none'
                  : 'text-[#777873] hover:text-[#F1F2EC] bg-slate-800 shadow-[0_2px_0_#020617] active:translate-y-[1px] active:shadow-none'
              }`}
            >
              Superadmin & MLOps
            </button>
          )}
        </nav>
      )}
    </header>
  );
};
