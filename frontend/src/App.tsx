import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { LoginPage } from '@/pages/Login/LoginPage';
import { PublicApplicationPage } from '@/pages/PortalVacante/PublicApplicationPage';
import { SuccessRegistrationPage } from '@/pages/PortalVacante/SuccessRegistrationPage';
import { CandidateDashboardPage } from '@/pages/CandidatePortal/CandidateDashboardPage';
import { HRDashboardPage } from '@/pages/HRDashboard/HRDashboardPage';
import { GlobalAdminDashboardPage } from '@/pages/GlobalAdminDashboard/GlobalAdminDashboardPage';
import { CompanyAdminDashboardPage } from '@/pages/CompanyAdminDashboard/CompanyAdminDashboardPage';
import { VacanciesCatalogPage } from '@/pages/VacanciesCatalog/VacanciesCatalogPage';
import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { StatsLoaderOverlay } from '@/components/ui/StatsLoaderOverlay';
import { TokenActionModal, type EmailTokenAction } from '@/components/auth/TokenActionModal';
import { Vacancy, UserRole } from '@/types';

interface LoaderOverlayState {
  mounted: boolean;
  exiting: boolean;
  mode: 'login-enter' | 'logout-exit';
}

const MainApp: React.FC = () => {
  const { user, logout } = useAuth();

  // Navigation state (Starts at Vacancies Catalog or Login)
  const [currentView, setCurrentView] = useState<string>('vacancies');
  const [targetTab, setTargetTab] = useState<string | undefined>(undefined);
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);
  const [emailTokenAction, setEmailTokenAction] = useState<EmailTokenAction>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token')?.trim();
    if (!token) return null;
    const action = (params.get('action') || '').toLowerCase();
    const path = window.location.pathname.toLowerCase();
    if (action === 'verify-email' || path.includes('verify-email')) return { type: 'verify-email', token };
    if (action === 'reset-password' || path.includes('reset-password')) return { type: 'reset-password', token };
    if (action === 'accept-invitation' || path.includes('accept-invitation')) return { type: 'accept-invitation', token };
    return null;
  });
  const [loaderState, setLoaderState] = useState<LoaderOverlayState>({
    mounted: false,
    exiting: false,
    mode: 'login-enter',
  });

  // Track latest auth state synchronously so logout clicks in the same tick trigger the transition loader
  const wasAuthenticatedRef = useRef<boolean>(Boolean(user));
  const transitionRunIdRef = useRef<number>(0);

  useEffect(() => {
    wasAuthenticatedRef.current = Boolean(user);
  }, [user]);

  // Success view state
  const [successData, setSuccessData] = useState({
    email: '',
    name: '',
    vacancyTitle: '',
  });

  const runAuthTransition = useCallback(
    (targetView: string, mode: 'login-enter' | 'logout-exit', minDurationMs = 700) => {
      const runId = ++transitionRunIdRef.current;

      setLoaderState({
        mounted: true,
        exiting: false,
        mode,
      });

      const minTimer = new Promise<void>((resolve) => {
        window.setTimeout(resolve, minDurationMs);
      });

      // Wait one frame so the fullscreen overlay covers before swapping the underlying view
      window.requestAnimationFrame(() => {
        if (transitionRunIdRef.current !== runId) return;
        setCurrentView(targetView);

        minTimer.then(() => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
              if (transitionRunIdRef.current !== runId) return;
              setLoaderState((prev) => ({ ...prev, exiting: true }));

              window.setTimeout(() => {
                if (transitionRunIdRef.current !== runId) return;
                setLoaderState((prev) => ({ ...prev, mounted: false, exiting: false }));
              }, 420);
            });
          });
        });
      });
    },
    []
  );

  const handleNavigate = useCallback(
    (nextView: string, initialTab?: string) => {
      // Logout transition: user was authenticated and navigates back to login
      if (nextView === 'login' && (wasAuthenticatedRef.current || Boolean(user))) {
        wasAuthenticatedRef.current = false;
        setTargetTab(undefined);
        if (user) logout();
        runAuthTransition('login', 'logout-exit', 680);
        return;
      }
      setTargetTab(initialTab);
      setCurrentView(nextView);
    },
    [logout, runAuthTransition, user]
  );

  const handlePostulationSuccess = (email: string, candidateName: string, vacancyTitle: string) => {
    setSuccessData({ email, name: candidateName, vacancyTitle });
    setCurrentView('apply-success');
  };

  const handleLoginSuccess = (role: UserRole) => {
    wasAuthenticatedRef.current = true;
    const targetView =
      role === 'candidato'
        ? 'candidate-dashboard'
        : role === 'rrhh'
        ? 'hr-dashboard'
        : role === 'admin' || role === 'administrador'
        ? 'company-admin-dashboard'
        : 'global-admin-dashboard';

    runAuthTransition(targetView, 'login-enter', 760);
  };

  const handleApplyToVacancy = (vac: Vacancy) => {
    setSelectedVacancy(vac);
    setCurrentView('apply');
  };

  const isPreparingView = loaderState.mounted && !loaderState.exiting;

  return (
    <div className="min-h-screen relative flex flex-col bg-[#F1F2EC] dark:bg-[#090A0C] text-[#090A0C] dark:text-[#F1F2EC] transition-colors overflow-x-clip">
      {/* Global Ambient Vector & Particle Stage (Disabled on Login, which manages its own half-panel particles) */}
      {currentView !== 'login' && <AmbientBackground />}

      {/* Fullscreen Statistics + Bouncing Ball Transition Loader (Post-Login & Logout only) */}
      <StatsLoaderOverlay
        isMounted={loaderState.mounted}
        isExiting={loaderState.exiting}
        mode={loaderState.mode}
      />

      {/* Email link handler (?token= for verify-email, reset-password, accept-invitation) */}
      <TokenActionModal
        action={emailTokenAction}
        onClose={() => {
          setEmailTokenAction(null);
          if (typeof window !== 'undefined' && window.location.search) {
            window.history.replaceState({}, '', '/');
          }
        }}
        onAuthenticated={handleLoginSuccess}
        onGoToLogin={() => handleNavigate('login')}
      />

      {/* Screen Renderer (Pauses entrance animations until loader begins fading out) */}
      <div
        key={currentView}
        className={`relative z-[2] flex-1 flex flex-col ${isPreparingView ? 'entrance-paused' : ''}`}
      >
        {currentView === 'login' && (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            onGoToVacancies={() => handleNavigate('vacancies')}
          />
        )}

        {currentView === 'apply' && selectedVacancy && (
          <PublicApplicationPage
            vacancy={selectedVacancy}
            onNavigate={handleNavigate}
            onPostulationSuccess={handlePostulationSuccess}
          />
        )}

        {currentView === 'apply-success' && (
          <SuccessRegistrationPage
            email={successData.email}
            candidateName={successData.name}
            vacancyTitle={successData.vacancyTitle}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'candidate-dashboard' && (
          <CandidateDashboardPage
            onNavigate={handleNavigate}
            onApplyVacancy={handleApplyToVacancy}
            initialTab={targetTab}
          />
        )}

        {currentView === 'hr-dashboard' && (
          <HRDashboardPage onNavigate={handleNavigate} initialTab={targetTab} />
        )}

        {(currentView === 'global-admin-dashboard' || currentView === 'admin-dashboard') && (
          user?.role === 'superadmin' ? (
            <GlobalAdminDashboardPage onNavigate={handleNavigate} initialTab={targetTab} />
          ) : (
            <CompanyAdminDashboardPage onNavigate={handleNavigate} initialTab={targetTab} />
          )
        )}

        {currentView === 'company-admin-dashboard' && (
          <CompanyAdminDashboardPage onNavigate={handleNavigate} initialTab={targetTab} />
        )}

        {(currentView === 'vacancies' || currentView === 'home') && (
          <VacanciesCatalogPage
            onNavigate={handleNavigate}
            onSelectVacancy={handleApplyToVacancy}
          />
        )}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
