import React from 'react';
import { ArrowUpRight, ShieldCheck, Briefcase, UserCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';

interface NavbarProps {
  onNavigate: (view: string) => void;
  currentView: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentView }) => {
  const { user, isAuthenticated, logout, switchRoleDemo } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={() => onNavigate('home')}
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/30 group-hover:bg-emerald-600 transition-colors">
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="7" height="7" x="3" y="3" rx="1.5" />
              <rect width="7" height="7" x="14" y="3" rx="1.5" />
              <rect width="7" height="7" x="14" y="14" rx="1.5" />
              <rect width="7" height="7" x="3" y="14" rx="1.5" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-slate-900 tracking-tight text-lg leading-tight">
              Nexo Tecnología
            </span>
            <span className="text-[10px] tracking-wider font-semibold text-emerald-600 uppercase">
              PORTAL DE TALENTO
            </span>
          </div>
        </div>

        {/* Center / Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <button
            onClick={() => onNavigate('vacancies')}
            className={`transition-colors hover:text-emerald-600 ${
              currentView === 'vacancies' || currentView === 'apply'
                ? 'text-emerald-600 font-semibold'
                : ''
            }`}
          >
            Nuestras vacantes
          </button>

          {isAuthenticated && (
            <>
              {user?.role === 'candidato' && (
                <button
                  onClick={() => onNavigate('candidate-dashboard')}
                  className={`transition-colors hover:text-emerald-600 ${
                    currentView === 'candidate-dashboard' ? 'text-emerald-600 font-semibold' : ''
                  }`}
                >
                  Mis Postulaciones
                </button>
              )}

              {user?.role === 'rrhh' && (
                <button
                  onClick={() => onNavigate('hr-dashboard')}
                  className={`transition-colors hover:text-emerald-600 ${
                    currentView === 'hr-dashboard' ? 'text-emerald-600 font-semibold' : ''
                  }`}
                >
                  Panel de Talento Humano (IA)
                </button>
              )}

              {user?.role === 'administrador' && (
                <button
                  onClick={() => onNavigate('admin-dashboard')}
                  className={`transition-colors hover:text-emerald-600 ${
                    currentView === 'admin-dashboard' ? 'text-emerald-600 font-semibold' : ''
                  }`}
                >
                  Panel de Administración
                </button>
              )}
            </>
          )}
        </nav>

        {/* Right side actions & Role Selector Bar */}
        <div className="flex items-center gap-3">
          {/* Quick Demo Role Switcher Dropdown */}
          <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <span className="px-2 text-slate-400 font-normal">Rol demo:</span>
            <button
              onClick={() => {
                switchRoleDemo('candidato');
                onNavigate('candidate-dashboard');
              }}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                user?.role === 'candidato'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'hover:text-slate-900'
              }`}
            >
              Candidato
            </button>
            <button
              onClick={() => {
                switchRoleDemo('rrhh');
                onNavigate('hr-dashboard');
              }}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                user?.role === 'rrhh'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'hover:text-slate-900'
              }`}
            >
              RRHH
            </button>
            <button
              onClick={() => {
                switchRoleDemo('administrador');
                onNavigate('admin-dashboard');
              }}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                user?.role === 'administrador'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'hover:text-slate-900'
              }`}
            >
              Admin
            </button>
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div
                onClick={() => {
                  if (user?.role === 'candidato') onNavigate('candidate-dashboard');
                  else if (user?.role === 'rrhh') onNavigate('hr-dashboard');
                  else onNavigate('admin-dashboard');
                }}
                className="flex items-center gap-2.5 pl-2 py-1 pr-3 rounded-full border border-slate-200 hover:border-emerald-300 bg-white cursor-pointer transition-all shadow-xs"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                  {user?.avatar || 'US'}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 leading-tight">
                    {user?.name.split(' ')[0]}
                  </span>
                  <span className="text-[10px] text-slate-500 capitalize">
                    {user?.role === 'rrhh' ? 'Talento Humano' : user?.role}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  logout();
                  onNavigate('login');
                }}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onNavigate('login')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-emerald-600 transition-colors py-2 px-3 rounded-xl hover:bg-slate-50"
            >
              <span>Ingresar a mi cuenta</span>
              <ArrowUpRight className="w-4 h-4 stroke-[2.2]" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
