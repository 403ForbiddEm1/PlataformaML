import React, { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { LoginPage } from '@/pages/Login/LoginPage';
import { PublicApplicationPage } from '@/pages/PortalVacante/PublicApplicationPage';
import { SuccessRegistrationPage } from '@/pages/PortalVacante/SuccessRegistrationPage';
import { CandidateDashboardPage } from '@/pages/CandidatePortal/CandidateDashboardPage';
import { HRDashboardPage } from '@/pages/HRDashboard/HRDashboardPage';
import { AdminDashboardPage } from '@/pages/AdminDashboard/AdminDashboardPage';
import { VacanciesCatalogPage } from '@/pages/VacanciesCatalog/VacanciesCatalogPage';
import { INITIAL_VACANCIES, mockStore } from '@/services/mockData';
import { Vacancy, UserRole } from '@/types';
import { RefreshCcw, LayoutDashboard, UserCheck, Shield, Sparkles } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, isAuthenticated, switchRoleDemo } = useAuth();

  // Navigation state
  const [currentView, setCurrentView] = useState<string>('apply'); // Starts at Vacancy Form (Screenshot 3) or 'login'
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy>(INITIAL_VACANCIES[0]); // Analista de Datos

  // Success view state
  const [successData, setSuccessData] = useState({
    email: '',
    name: '',
    vacancyTitle: '',
  });

  const handlePostulationSuccess = (email: string, candidateName: string, vacancyTitle: string) => {
    setSuccessData({ email, name: candidateName, vacancyTitle });
    setCurrentView('apply-success');
  };

  const handleLoginSuccess = (role: UserRole) => {
    if (role === 'candidato') setCurrentView('candidate-dashboard');
    else if (role === 'rrhh') setCurrentView('hr-dashboard');
    else setCurrentView('admin-dashboard');
  };

  const handleApplyToVacancy = (vac: Vacancy) => {
    setSelectedVacancy(vac);
    setCurrentView('apply');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Quick Navigation Floating Bar for easy reviewer evaluation */}
      <div className="bg-slate-900 text-white text-xs px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-bold text-slate-200">Nexo Plataforma ML</span>
          <span className="text-slate-400 hidden sm:inline">| Navegación Rápida de Pantallas:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setCurrentView('login')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              currentView === 'login'
                ? 'bg-emerald-500 text-white font-bold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            1. Login / Roles
          </button>

          <button
            onClick={() => setCurrentView('apply')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              currentView === 'apply'
                ? 'bg-emerald-500 text-white font-bold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            2. Formulario Postulación
          </button>

          <button
            onClick={() => {
              setSuccessData({
                email: 'valeria.mendoza@correo.com',
                name: 'Valeria Mendoza',
                vacancyTitle: 'Analista de Datos',
              });
              setCurrentView('apply-success');
            }}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              currentView === 'apply-success'
                ? 'bg-emerald-500 text-white font-bold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            3. Éxito / Registro
          </button>

          <button
            onClick={() => {
              switchRoleDemo('candidato');
              setCurrentView('candidate-dashboard');
            }}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              currentView === 'candidate-dashboard'
                ? 'bg-emerald-500 text-white font-bold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            4. Portal Candidato
          </button>

          <button
            onClick={() => {
              switchRoleDemo('rrhh');
              setCurrentView('hr-dashboard');
            }}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              currentView === 'hr-dashboard'
                ? 'bg-emerald-500 text-white font-bold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            5. Talento Humano (IA)
          </button>

          <button
            onClick={() => {
              switchRoleDemo('administrador');
              setCurrentView('admin-dashboard');
            }}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              currentView === 'admin-dashboard'
                ? 'bg-emerald-500 text-white font-bold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            6. Administración (ML)
          </button>

          <button
            onClick={() => {
              mockStore.resetToDefaults();
              window.location.reload();
            }}
            className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            title="Reiniciar datos de demostración"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Screen Renderer */}
      <div className="flex-1 flex flex-col">
        {currentView === 'login' && (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            onGoToVacancies={() => setCurrentView('vacancies')}
          />
        )}

        {currentView === 'apply' && (
          <PublicApplicationPage
            vacancy={selectedVacancy}
            onNavigate={setCurrentView}
            onPostulationSuccess={handlePostulationSuccess}
          />
        )}

        {currentView === 'apply-success' && (
          <SuccessRegistrationPage
            email={successData.email}
            candidateName={successData.name}
            vacancyTitle={successData.vacancyTitle}
            onNavigate={setCurrentView}
          />
        )}

        {currentView === 'candidate-dashboard' && (
          <CandidateDashboardPage
            onNavigate={setCurrentView}
            onApplyVacancy={handleApplyToVacancy}
          />
        )}

        {currentView === 'hr-dashboard' && (
          <HRDashboardPage onNavigate={setCurrentView} />
        )}

        {currentView === 'admin-dashboard' && (
          <AdminDashboardPage onNavigate={setCurrentView} />
        )}

        {currentView === 'vacancies' && (
          <VacanciesCatalogPage
            onNavigate={setCurrentView}
            onSelectVacancy={handleApplyToVacancy}
          />
        )}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ToastProvider>
  );
}
