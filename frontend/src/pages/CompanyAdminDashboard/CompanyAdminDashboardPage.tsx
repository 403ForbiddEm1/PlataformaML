import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Application, Employee, Empresa, User, Vacancy } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { authService } from '@/services/auth.service';
import { vacanciesService } from '@/services/vacancies.service';
import { applicationsService } from '@/services/applications.service';
import { empresaService } from '@/services/empresa.service';
import { employeesService } from '@/services/employees.service';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { TiltGlassCard } from '@/components/ui/TiltGlassCard';
import { StackedMetricsBarChart } from '@/components/charts/StackedMetricsBarChart';
import {
  Building2,
  Users,
  Brain,
  TrendingUp,
  UserCheck,
  UserPlus,
  ShieldCheck,
  Briefcase,
  Folder,
  ChevronRight,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Award,
  BarChart3,
  Sun,
  Moon,
  Edit3,
  Layers,
  Sparkles,
  Trash2,
  AlertTriangle,
  LogOut,
  FileUser,
  Megaphone,
  Crown,
  Menu,
  X,
} from 'lucide-react';

export const CompanyAdminDashboardPage: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'metrics' | 'team' | 'candidates' | 'profile'>('metrics');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isPageSliding, setIsPageSliding] = useState(false);
  const slideTimeoutRef = useRef<number | null>(null);
  const tabsContainerRef = useRef<HTMLDivElement | null>(null);
  const metricsTabRef = useRef<HTMLButtonElement | null>(null);
  const teamTabRef = useRef<HTMLButtonElement | null>(null);
  const candidatesTabRef = useRef<HTMLButtonElement | null>(null);
  const profileTabRef = useRef<HTMLButtonElement | null>(null);
  const [tabPillStyle, setTabPillStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  // Local data filtered for this specific company (Tenant Isolation)
  const currentEmpresaId = user?.empresaId || user?.companyId || '';
  const currentEmpresaNombre = user?.empresaNombre || user?.companyName || 'Comercio1';

  const [empresaData, setEmpresaData] = useState<Empresa | null>(null);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [hiredEmployees, setHiredEmployees] = useState<Employee[]>([]);
  const [teamSubTab, setTeamSubTab] = useState<'all' | 'rrhh' | 'hired'>('all');
  const [companyVacancies, setCompanyVacancies] = useState<Vacancy[]>([]);
  const [companyApplications, setCompanyApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal: Registrar Miembro de RRHH para la Empresa
  const [isNewHROpen, setIsNewHROpen] = useState(false);
  const [hrName, setHrName] = useState('');
  const [hrEmail, setHrEmail] = useState('');
  const [hrPhone, setHrPhone] = useState('');
  const [hrPassword, setHrPassword] = useState('');
  const [isRegisteringHR, setIsRegisteringHR] = useState(false);

  // Modal: Eliminación de empleado / colaborador (excepto el mismo administrador)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    email: string;
    type: 'rrhh' | 'hired';
  } | null>(null);
  const [isDeletingEmployee, setIsDeletingEmployee] = useState(false);

  // Company Profile Edit State
  const [editNombre, setEditNombre] = useState('');
  const [editRif, setEditRif] = useState('');
  const [editDominio, setEditDominio] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');

  // Candidates Search & Filter
  const [candidateSearch, setCandidateSearch] = useState('');
  const [vacancyFilter, setVacancyFilter] = useState('all');

  const handleSwitchTab = (nextTab: 'metrics' | 'team' | 'candidates' | 'profile') => {
    if (nextTab === activeTab) return;
    setIsPageSliding(true);
    setActiveTab(nextTab);
    if (slideTimeoutRef.current) {
      window.clearTimeout(slideTimeoutRef.current);
    }
    slideTimeoutRef.current = window.setTimeout(() => {
      setIsPageSliding(false);
    }, 520);
  };

  useLayoutEffect(() => {
    const updatePill = () => {
      const activeEl =
        activeTab === 'metrics'
          ? metricsTabRef.current
          : activeTab === 'team'
          ? teamTabRef.current
          : activeTab === 'candidates'
          ? candidatesTabRef.current
          : profileTabRef.current;
      if (!activeEl) return;
      setTabPillStyle({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
      });
    };
    updatePill();
    window.addEventListener('resize', updatePill);
    return () => window.removeEventListener('resize', updatePill);
  }, [activeTab, teamMembers.length, hiredEmployees.length, companyApplications.length]);

  useEffect(() => {
    return () => {
      if (slideTimeoutRef.current) window.clearTimeout(slideTimeoutRef.current);
    };
  }, []);

  const loadCompanyData = async () => {
    setIsLoading(true);
    try {
      const [allVacancies, allApps, allCompanies, myMembers, allEmps] = await Promise.all([
        vacanciesService.getAll().catch(() => []),
        applicationsService.getAll().catch(() => []),
        empresaService.getAll().catch(() => []),
        employeesService.getCompanyMembers(currentEmpresaId).catch(() => []),
        employeesService.getAll(currentEmpresaId).catch(() => []),
      ]);

      // Filter exclusively for this company
      const thisCompany = allCompanies.find(
        (c) =>
          (currentEmpresaId && c.id === currentEmpresaId) ||
          (currentEmpresaNombre && c.nombre.toLowerCase() === currentEmpresaNombre.toLowerCase())
      ) || {
        id: currentEmpresaId || 'emp-local',
        nombre: currentEmpresaNombre,
        dominio: user?.email?.includes('@') ? user.email.split('@')[1] : 'empresa.com',
        rif: 'J-12345678-9',
        activa: true,
        descripcion: `Portal oficial y gestión de reclutamiento de ${currentEmpresaNombre}.`,
        telefono: user?.phone || '+1 (809) 555-0100',
        creadoEn: new Date().toISOString(),
      };
      setEmpresaData(thisCompany);
      setEditNombre(thisCompany.nombre);
      setEditRif(thisCompany.rif || 'J-12345678-9');
      setEditDominio(thisCompany.dominio || (user?.email?.includes('@') ? user.email.split('@')[1] : 'empresa.com'));
      setEditTelefono(thisCompany.telefono || user?.phone || '+1 (809) 555-0100');
      setEditDescripcion(thisCompany.descripcion || '');

      setTeamMembers(myMembers);

      const myVacancies = allVacancies.filter((v) => {
        const idMatch =
          (v.empresaId && (v.empresaId === currentEmpresaId || v.companyId === currentEmpresaId)) ||
          (v.companyId && (v.companyId === currentEmpresaId || v.empresaId === currentEmpresaId));
        const nameMatch =
          currentEmpresaNombre &&
          ((v.empresaNombre && v.empresaNombre.toLowerCase().includes(currentEmpresaNombre.toLowerCase())) ||
            (v.companyName && v.companyName.toLowerCase().includes(currentEmpresaNombre.toLowerCase())));
        return idMatch || nameMatch;
      });
      setCompanyVacancies(myVacancies);

      const myVacancyIds = new Set(myVacancies.map((v) => v.id));
      const myApps = allApps.filter((a) => myVacancyIds.has(a.vacancyId));
      setCompanyApplications(myApps);

      const teamEmails = new Set(myMembers.map((m) => (m.email || '').trim().toLowerCase()).filter(Boolean));
      const hiredFromApps = await employeesService.getHiredCandidates(currentEmpresaId, myApps);
      const hiredIds = new Set(hiredFromApps.map((h) => h.id));
      const extraHired = allEmps.filter((e) => {
        if (hiredIds.has(e.id)) return false;
        if (e.id.startsWith('emp-hired-')) {
          const appId = e.id.replace('emp-hired-', '');
          const matchedApp = allApps.find((a) => a.id === appId);
          if (matchedApp && myVacancyIds.size > 0 && !myVacancyIds.has(matchedApp.vacancyId)) {
            return false;
          }
          return true;
        }
        const email = (e.email || '').trim().toLowerCase();
        return email ? !teamEmails.has(email) : true;
      });
      setHiredEmployees([...hiredFromApps, ...extraHired]);
    } catch {
      showToast('Error', 'No se pudieron sincronizar los datos locales de la empresa.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompanyData();
  }, [currentEmpresaId]);

  const handleRegisterHR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hrName || !hrEmail || !hrPassword) {
      showToast('Campos requeridos', 'Por favor ingresa nombre, correo y contraseña para el nuevo reclutador.', 'error');
      return;
    }
    if (hrPassword.length < 8 || !/[A-Za-z]/.test(hrPassword) || !/[0-9]/.test(hrPassword)) {
      showToast('Contraseña débil', 'La contraseña debe tener al menos 8 caracteres, incluyendo letras y números.', 'error');
      return;
    }
    setIsRegisteringHR(true);
    try {
      const newMember = await authService.registerHRUser({
        name: hrName,
        email: hrEmail,
        password: hrPassword,
        phone: hrPhone || '+1 (809) 555-0200',
        empresaId: currentEmpresaId,
        empresaNombre: currentEmpresaNombre,
      });

      setTeamMembers((prev) => [newMember, ...prev]);
      showToast(
        'Miembro de RRHH Registrado',
        `Se ha creado el acceso de RRHH para ${hrName} (${hrEmail}) con sus credenciales asignadas.`,
        'success'
      );
      setIsNewHROpen(false);
      setHrName('');
      setHrEmail('');
      setHrPhone('');
      setHrPassword('');
      await loadCompanyData();
    } catch (err: any) {
      showToast('Error', err?.message || 'No se pudo registrar al reclutador.', 'error');
    } finally {
      setIsRegisteringHR(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    // Validación estricta: NO permitir que el administrador se elimine a sí mismo
    const isSelf =
      deleteTarget.id === user?.id ||
      deleteTarget.email.trim().toLowerCase() === user?.email?.trim().toLowerCase();

    if (isSelf) {
      showToast('Acción no permitida', 'No puedes eliminar tu propia cuenta de administrador.', 'error');
      setDeleteTarget(null);
      return;
    }

    setIsDeletingEmployee(true);
    try {
      if (deleteTarget.type === 'rrhh') {
        authService.deleteCompanyMember(deleteTarget.id, currentEmpresaId);
        setTeamMembers((prev) => prev.filter((m) => m.id !== deleteTarget.id && m.email !== deleteTarget.email));
      } else {
        await employeesService.deleteEmployee(deleteTarget.id);
        setHiredEmployees((prev) => prev.filter((e) => e.id !== deleteTarget.id && e.email !== deleteTarget.email));
      }

      showToast(
        'Colaborador Eliminado',
        `Se ha eliminado a "${deleteTarget.name}" de la plantilla de la empresa con éxito.`,
        'success'
      );
      setDeleteTarget(null);
    } catch {
      showToast('Error', 'No se pudo completar la eliminación del colaborador.', 'error');
    } finally {
      setIsDeletingEmployee(false);
    }
  };

  const handleSaveCompanyProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (empresaData) {
      const updated = {
        ...empresaData,
        nombre: editNombre,
        rif: editRif,
        dominio: editDominio,
        telefono: editTelefono,
        descripcion: editDescripcion,
      };
      setEmpresaData(updated);
      showToast('Perfil Actualizado', 'La información corporativa de tu empresa fue guardada con éxito.', 'success');
    }
  };

  // Local calculations
  const totalCompanyApps = companyApplications.length;
  const countPreselected = companyApplications.filter(
    (a) => a.status === 'Preseleccionado' || a.status === 'Contratado'
  ).length;
  const countInReview = companyApplications.filter(
    (a) => a.status === 'En revisión' || a.status === 'Entrevista'
  ).length;
  const countReceived = companyApplications.filter((a) => a.status === 'Recibida').length;
  const avgScore =
    totalCompanyApps > 0
      ? Math.round(
          companyApplications.reduce(
            (acc, a) => acc + (typeof a.mlScore === 'number' ? a.mlScore : 85),
            0
          ) / totalCompanyApps
        )
      : 88;

  // Filtered Candidates
  const filteredCandidates = companyApplications.filter((a) => {
    const matchesSearch =
      a.candidateName.toLowerCase().includes(candidateSearch.toLowerCase()) ||
      a.candidateEmail.toLowerCase().includes(candidateSearch.toLowerCase()) ||
      a.vacancyTitle.toLowerCase().includes(candidateSearch.toLowerCase());
    const matchesVacancy = vacancyFilter === 'all' || a.vacancyId === vacancyFilter;
    return matchesSearch && matchesVacancy;
  });

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans transition-colors">
      {/* Top Header - Glassmorphic Modern Aesthetic */}
      <header className="w-full bg-[#090A0C]/85 backdrop-blur-md text-[#F1F2EC] border-b border-[#F1F2EC]/10 sticky top-0 z-30 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-3 sm:py-3.5 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl p-1.5" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-[#F1F2EC] text-base sm:text-xl tracking-tight font-['Instrument_Sans',sans-serif] truncate">
                  Panel Corporativo · {currentEmpresaNombre}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#C8FF45]/15 text-[#C8FF45] border border-[#C8FF45]/35 text-[10px] font-black uppercase tracking-wider shrink-0">
                  Admin Local
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#777873] font-medium truncate">
                RIF: {empresaData?.rif || 'J-12345678-9'} · Dominio: {empresaData?.dominio || 'empresa.com'} · Portal Empresa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <ThemeToggle />

            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigate('vacancies')}
              className="text-xs bg-slate-800 hover:bg-slate-700 border-slate-600 text-[#F1F2EC] shadow-[0_3px_0_#020617]"
            >
              <span className="sm:hidden">Vacantes</span>
              <span className="hidden sm:inline">Catálogo de Vacantes</span>
            </Button>

            {/* Logout en esquina derecha del nav top (Rojo conservado) */}
            <button
              type="button"
              onClick={() => {
                logout();
                onNavigate('login');
              }}
              className="p-2 rounded-xl text-white bg-rose-600 hover:bg-rose-500 border border-rose-500 shadow-[0_3px_0_#881337] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation: hamburguesa en móvil, píldora deslizante en desktop */}
        <div className="w-full px-4 sm:px-6 lg:px-10 py-2 border-t border-[#F1F2EC]/10 bg-[#090A0C]/75">
          {/* Versión Móvil (< md): barra compacta con botón hamburguesa */}
          <div className="md:hidden flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsMobileNavOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[#F1F2EC] hover:text-[#C8FF45] shadow-[0_3px_0_#020617] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer text-xs font-bold"
                aria-expanded={isMobileNavOpen}
                aria-label="Abrir menú de subpáginas"
              >
                {isMobileNavOpen ? <X className="w-4 h-4 text-[#C8FF45]" /> : <Menu className="w-4 h-4 text-[#C8FF45]" />}
                <span>Menú</span>
              </button>

              <span className="text-[11px] font-black uppercase tracking-wider text-[#C8FF45] truncate">
                {activeTab === 'metrics'
                  ? 'Métricas Locales'
                  : activeTab === 'team'
                  ? `Equipo de Trabajo (${teamMembers.length + hiredEmployees.length})`
                  : activeTab === 'candidates'
                  ? `Candidatos (${companyApplications.length})`
                  : 'Datos de la Empresa'}
              </span>
            </div>

            {isMobileNavOpen && (
              <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-[#090A0C]/95 border border-[#F1F2EC]/12 shadow-xl">
                {[
                  { id: 'metrics' as const, label: 'Métricas Locales', Icon: BarChart3 },
                  {
                    id: 'team' as const,
                    label: `Equipo de Trabajo (${teamMembers.length + hiredEmployees.length})`,
                    Icon: Users,
                  },
                  {
                    id: 'candidates' as const,
                    label: `Candidatos de la Empresa (${companyApplications.length})`,
                    Icon: UserCheck,
                  },
                  { id: 'profile' as const, label: 'Datos de la Empresa', Icon: Edit3 },
                ].map(({ id, label, Icon }) => {
                  const isActive = activeTab === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        handleSwitchTab(id);
                        setIsMobileNavOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-2.5 text-left uppercase tracking-wider text-[11px] font-bold transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#C8FF45] text-[#090A0C] border border-[#84cc16]'
                          : 'text-[#F1F2EC]/80 hover:bg-white/10 hover:text-[#F1F2EC]'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Versión Desktop (md+): barra de pestañas con píldora deslizante */}
          <div className="hidden md:block overflow-x-auto">
            <div
              ref={tabsContainerRef}
              className="relative inline-flex items-center gap-1.5 p-1 rounded-xl bg-[#F1F2EC]/6 border border-[#F1F2EC]/10"
            >
              {tabPillStyle.width > 0 && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1 bottom-1 left-0 rounded-lg bg-[#C8FF45] border border-[#84cc16] shadow-[0_3px_0_#3f6212] transition-[transform,width] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform z-0"
                  style={{
                    width: `${tabPillStyle.width}px`,
                    transform: `translate3d(${tabPillStyle.left}px, 0, 0)`,
                  }}
                />
              )}

              <button
                ref={metricsTabRef}
                type="button"
                onClick={() => handleSwitchTab('metrics')}
                className={`relative z-10 px-3.5 py-2 rounded-lg transition-colors duration-250 flex items-center gap-2 cursor-pointer uppercase tracking-wider text-[11px] font-bold whitespace-nowrap shrink-0 ${
                  activeTab === 'metrics'
                    ? 'text-[#090A0C]'
                    : 'text-[#777873] hover:text-[#F1F2EC]'
                }`}
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>Métricas Locales</span>
              </button>

              <button
                ref={teamTabRef}
                type="button"
                onClick={() => handleSwitchTab('team')}
                className={`relative z-10 px-3.5 py-2 rounded-lg transition-colors duration-250 flex items-center gap-2 cursor-pointer uppercase tracking-wider text-[11px] font-bold whitespace-nowrap shrink-0 ${
                  activeTab === 'team'
                    ? 'text-[#090A0C]'
                    : 'text-[#777873] hover:text-[#F1F2EC]'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Equipo de Trabajo ({teamMembers.length + hiredEmployees.length})</span>
              </button>

              <button
                ref={candidatesTabRef}
                type="button"
                onClick={() => handleSwitchTab('candidates')}
                className={`relative z-10 px-3.5 py-2 rounded-lg transition-colors duration-250 flex items-center gap-2 cursor-pointer uppercase tracking-wider text-[11px] font-bold whitespace-nowrap shrink-0 ${
                  activeTab === 'candidates'
                    ? 'text-[#090A0C]'
                    : 'text-[#777873] hover:text-[#F1F2EC]'
                }`}
              >
                <UserCheck className="w-4 h-4 shrink-0" />
                <span>Candidatos de la Empresa ({companyApplications.length})</span>
              </button>

              <button
                ref={profileTabRef}
                type="button"
                onClick={() => handleSwitchTab('profile')}
                className={`relative z-10 px-3.5 py-2 rounded-lg transition-colors duration-250 flex items-center gap-2 cursor-pointer uppercase tracking-wider text-[11px] font-bold whitespace-nowrap shrink-0 ${
                  activeTab === 'profile'
                    ? 'text-[#090A0C]'
                    : 'text-[#777873] hover:text-[#F1F2EC]'
                }`}
              >
                <Edit3 className="w-4 h-4 shrink-0" />
                <span>Datos de la Empresa</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content: Carrusel horizontal bidireccional entre subpáginas sobre partículas */}
      <main className="w-full overflow-x-hidden flex-1 bg-transparent">
        <div
          className="flex w-[400%] items-start transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
          style={{
            transform:
              activeTab === 'metrics'
                ? 'translate3d(0%, 0, 0)'
                : activeTab === 'team'
                ? 'translate3d(-25%, 0, 0)'
                : activeTab === 'candidates'
                ? 'translate3d(-50%, 0, 0)'
                : 'translate3d(-75%, 0, 0)',
          }}
        >
        {/* TAB 1: MÉTRICAS LOCALES Y RENDIMIENTO DE LA EMPRESA */}
        <div
          className={`w-1/4 shrink-0 transition-opacity duration-300 ${
            activeTab === 'metrics'
              ? 'opacity-100'
              : isPageSliding
              ? 'opacity-90 pointer-events-none'
              : 'max-h-0 overflow-hidden opacity-0 pointer-events-none'
          }`}
          aria-hidden={activeTab !== 'metrics'}
        >
          <div className="w-full flex-1 flex flex-col gap-4 sm:gap-5 px-4 py-4 sm:px-8 sm:py-5 bg-transparent">
            {/* Banner de Impacto de IA Local (sin fondo sólido para ver partículas + tarjetas glassmorphic con Tilt 3D) */}
            <section className="w-full space-y-3.5 bg-transparent">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold mb-1.5 border border-emerald-500/30">
                    <Brain className="w-3 h-3" /> Procesamiento Local con Machine Learning
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    Rendimiento Algorítmico en {currentEmpresaNombre}
                  </h2>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 max-w-2xl">
                    Estadísticas exclusivas de los candidatos evaluados por la IA en tus convocatorias y el impacto en tu proceso de reclutamiento.
                  </p>
                </div>

                <TiltGlassCard
                  maxTiltDeg={3}
                  className="px-4 py-2 rounded-xl flex items-center gap-2.5 shrink-0 !border-emerald-500/35 !bg-emerald-500/10 dark:!bg-emerald-500/[0.08]"
                >
                  <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400 relative z-10" />
                  <div className="relative z-10">
                    <span className="text-[9px] font-bold uppercase text-emerald-700 dark:text-emerald-300 block">Afinidad Media Local</span>
                    <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">{avgScore}% Concordancia</span>
                  </div>
                </TiltGlassCard>
              </div>

              {/* 4 Métricas de la Empresa */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                  {
                    label: 'Postulantes Evaluados',
                    value: totalCompanyApps,
                    subtext: '100% procesados por IA',
                    valueColor: 'text-slate-900 dark:text-white',
                    subtextColor: 'text-emerald-600 dark:text-emerald-400 font-semibold',
                    Icon: FileUser,
                  },
                  {
                    label: 'Preseleccionados',
                    value: countPreselected,
                    subtext: 'Listos para entrevista',
                    valueColor: 'text-emerald-600 dark:text-emerald-400',
                    subtextColor: 'text-slate-500 dark:text-slate-400',
                    Icon: UserCheck,
                  },
                  {
                    label: 'En Revisión',
                    value: countInReview,
                    subtext: 'Evaluados por tu equipo RRHH',
                    valueColor: 'text-amber-600 dark:text-amber-400',
                    subtextColor: 'text-slate-500 dark:text-slate-400',
                    Icon: Search,
                  },
                  {
                    label: 'Convocatorias Activas',
                    value: companyVacancies.length,
                    subtext: 'Puestos abiertos en el catálogo',
                    valueColor: 'text-sky-600 dark:text-sky-400',
                    subtextColor: 'text-slate-500 dark:text-slate-400',
                    Icon: Megaphone,
                  },
                ].map(({ label, value, subtext, valueColor, subtextColor, Icon }) => (
                  <TiltGlassCard key={label} maxTiltDeg={3} className="px-4 py-3 rounded-xl space-y-0.5">
                    <div
                      aria-hidden="true"
                      className={`pointer-events-none select-none absolute right-2 top-1/2 -translate-y-1/2 opacity-[0.22] ${valueColor}`}
                      style={{
                        WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,0.95) 20%, transparent 100%)',
                        maskImage: 'linear-gradient(to left, rgba(0,0,0,0.95) 20%, transparent 100%)',
                      }}
                    >
                      <Icon className="w-16 h-16" strokeWidth={1.6} />
                    </div>
                    <span className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 block relative z-10">
                      {label}
                    </span>
                    <span className={`text-2xl font-black block leading-tight relative z-10 ${valueColor}`}>
                      {value}
                    </span>
                    <p className={`text-[10px] relative z-10 ${subtextColor}`}>{subtext}</p>
                  </TiltGlassCard>
                ))}
              </div>
            </section>

            {/* Fila 30% / 70%: Convocatorias y Demanda de Talento + Estadística Apilada (70%) */}
            <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-10 gap-4 sm:gap-5 items-stretch">
              {/* Columna 1 (30%): Desglose por Convocatoria de la Empresa */}
              <section className="lg:col-span-3 w-full rounded-2xl glass-panel p-4 sm:p-5 space-y-3 flex flex-col">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                    <span className="truncate">Convocatorias · {currentEmpresaNombre}</span>
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    Demanda y candidatos afines por cargo.
                  </p>
                </div>

                {companyVacancies.length === 0 ? (
                  <div className="flex-1 p-4 flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-slate-300/80 dark:border-white/15 bg-white/30 dark:bg-white/[0.02] space-y-2">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Aún no hay convocatorias emitidas para {currentEmpresaNombre}.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => onNavigate('hr-dashboard')}
                      className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold border border-amber-600 shadow-[0_3px_0_#92400e]"
                    >
                      + Emitir Convocatoria en Panel RRHH
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5 max-h-[250px] overflow-y-auto pr-1">
                    {companyVacancies.map((vac) => {
                      const appsForVac = companyApplications.filter((a) => a.vacancyId === vac.id);
                      const preselectedForVac = appsForVac.filter(
                        (a) => a.status === 'Preseleccionado' || a.status === 'Contratado'
                      ).length;

                      return (
                        <TiltGlassCard
                          key={vac.id}
                          maxTiltDeg={2.5}
                          className="p-3.5 rounded-xl space-y-2 flex flex-col justify-between"
                        >
                          <div className="relative z-10 space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-bold gap-2">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 truncate">
                                {vac.department}
                              </span>
                              <span className="text-slate-600 dark:text-slate-400 font-mono text-[10px] shrink-0">
                                {vac.openings} {vac.openings === 1 ? 'plaza' : 'plazas'}
                              </span>
                            </div>
                            <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-snug truncate">
                              {vac.title}
                            </h4>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                              {vac.location} · {vac.workMode}
                            </p>
                          </div>

                          <div className="relative z-10 pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[11px]">
                            <span className="text-slate-700 dark:text-slate-300 font-semibold">
                              {appsForVac.length} postulaciones
                            </span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">
                              {preselectedForVac} preseleccionados
                            </span>
                          </div>
                        </TiltGlassCard>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Columna 2 (70%): Gráfica Apilada de Balance Local */}
              <section className="lg:col-span-7 w-full flex flex-col">
                <StackedMetricsBarChart
                  vacancies={companyVacancies}
                  applications={companyApplications}
                  companyName={currentEmpresaNombre}
                />
              </section>
            </div>
          </div>
        </div>

        {/* TAB 2: RECURSOS HUMANOS Y COLABORADORES CONTRATADOS */}
        <div
          className={`w-1/4 shrink-0 transition-opacity duration-300 ${
            activeTab === 'team'
              ? 'opacity-100'
              : isPageSliding
              ? 'opacity-90 pointer-events-none'
              : 'max-h-0 overflow-hidden opacity-0 pointer-events-none'
          }`}
          aria-hidden={activeTab !== 'team'}
        >
          <div className="w-full flex-1 flex flex-col gap-5 px-4 py-5 sm:px-8 bg-transparent">
            {/* Header del Equipo y Botón Registrar */}
            <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  <span>Equipo y Plantilla de {currentEmpresaNombre}</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
                  Supervisa a los reclutadores de RRHH asignados a tu empresa y a todos los colaboradores y candidatos contratados formalmente.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex gap-1.5 rounded-xl bg-white/50 dark:bg-white/[0.06] p-1 border border-white/70 dark:border-white/15 backdrop-blur-md text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setTeamSubTab('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      teamSubTab === 'all'
                        ? 'bg-white/90 dark:bg-slate-900/90 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 shadow-[0_3px_0_#065f46]'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    } hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none`}
                  >
                    Todos ({teamMembers.length + hiredEmployees.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeamSubTab('rrhh')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      teamSubTab === 'rrhh'
                        ? 'bg-white/90 dark:bg-slate-900/90 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 shadow-[0_3px_0_#065f46]'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    } hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none`}
                  >
                    RRHH ({teamMembers.filter((m) => m.role !== 'admin').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeamSubTab('hired')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      teamSubTab === 'hired'
                        ? 'bg-white/90 dark:bg-slate-900/90 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 shadow-[0_3px_0_#065f46]'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    } hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none`}
                  >
                    Contratados ({hiredEmployees.length})
                  </button>
                </div>

                <Button
                  size="md"
                  variant="primary"
                  leftIcon={<UserPlus className="w-5 h-5" />}
                  onClick={() => setIsNewHROpen(true)}
                  className="font-bold text-xs sm:text-sm px-5 py-2.5 cursor-pointer"
                >
                  + Registrar Miembro de RRHH
                </Button>
              </div>
            </div>

            {/* List of Team and Hired Employees */}
            <div className="w-full bg-transparent">
              {teamMembers.length === 0 && hiredEmployees.length === 0 ? (
                <div className="p-10 text-center rounded-2xl border border-dashed border-slate-300/80 dark:border-white/15 glass-panel">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Aún no has registrado miembros en tu equipo ni hay candidatos contratados.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
                  {/* Miembros del Equipo (en filtro RRHH se excluye al Administrador) */}
                  {(teamSubTab === 'all' || teamSubTab === 'rrhh') &&
                    teamMembers
                      .filter((member) => teamSubTab !== 'rrhh' || member.role !== 'admin')
                      .map((member) => {
                      const isSelf =
                        member.id === user?.id ||
                        member.email?.trim().toLowerCase() === user?.email?.trim().toLowerCase();

                      return (
                        <TiltGlassCard
                          key={`member-${member.id}`}
                          maxTiltDeg={2.5}
                          className="p-5 rounded-2xl space-y-4"
                        >
                          <div className="relative z-10 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3.5">
                              {member.role === 'admin' ? (
                                <div
                                  className="w-12 h-12 rounded-xl bg-amber-400/20 dark:bg-amber-400/15 border border-amber-400/50 text-amber-500 dark:text-amber-400 flex items-center justify-center shadow-xs shrink-0"
                                  title="Administrador Corporativo"
                                >
                                  <Crown className="w-6 h-6" />
                                </div>
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white font-black text-base flex items-center justify-center shadow-xs shrink-0">
                                  {member.avatar || member.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <h4 className="font-black text-slate-900 dark:text-slate-100 text-base">{member.name}</h4>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                  member.role === 'admin'
                                    ? 'text-sky-700 dark:text-sky-400'
                                    : 'text-emerald-700 dark:text-emerald-400'
                                }`}>
                                  {member.role === 'admin'
                                    ? 'Administrador Corporativo'
                                    : 'Reclutador / Evaluador RRHH'}
                                </span>
                              </div>
                            </div>

                            {isSelf ? (
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-300 bg-slate-200/70 dark:bg-white/10 px-2.5 py-1 rounded-lg">
                                Tú (Admin)
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    id: member.id,
                                    name: member.name,
                                    email: member.email,
                                    type: 'rrhh',
                                  })
                                }
                                className="p-2 rounded-xl text-red-600 dark:text-white bg-red-50/90 hover:bg-red-100 dark:bg-red-600 dark:hover:bg-red-500 border border-red-300 dark:border-red-500 shadow-[0_3px_0_#991b1b] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
                                title="Eliminar miembro de RRHH"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div className="relative z-10 space-y-2 text-xs pt-2 border-t border-slate-200/60 dark:border-white/10">
                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-mono">{member.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{member.phone || '+1 (809) 555-0200'}</span>
                            </div>
                          </div>

                          <div className="relative z-10 pt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            <span>Alta: {new Date(member.createdAt).toLocaleDateString()}</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Activo ✓</span>
                          </div>
                        </TiltGlassCard>
                      );
                    })}

                  {/* Colaboradores Contratados */}
                  {(teamSubTab === 'all' || teamSubTab === 'hired') &&
                    hiredEmployees.map((emp) => {
                      const isSelf =
                        emp.id === user?.id ||
                        emp.email?.trim().toLowerCase() === user?.email?.trim().toLowerCase();

                      return (
                        <TiltGlassCard
                          key={`hired-${emp.id}`}
                          maxTiltDeg={2.5}
                          className="p-5 rounded-2xl space-y-4 !border-emerald-500/35"
                        >
                          <div className="relative z-10 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3.5">
                              {emp.avatar &&
                              (emp.avatar.startsWith('data:image/') ||
                                emp.avatar.startsWith('http') ||
                                emp.avatar.startsWith('/')) ? (
                                <img
                                  src={emp.avatar}
                                  alt={emp.name}
                                  className="w-12 h-12 rounded-xl object-cover shadow-xs border border-white/50 dark:border-white/15"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-sky-600 text-white font-black text-base flex items-center justify-center shadow-xs">
                                  {emp.avatar || emp.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <h4 className="font-black text-slate-900 dark:text-slate-100 text-base">{emp.name}</h4>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                                  {emp.role} · {emp.department}
                                </span>
                              </div>
                            </div>

                            {isSelf ? (
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-300 bg-slate-200/70 dark:bg-white/10 px-2.5 py-1 rounded-lg">
                                Tú (Admin)
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    id: emp.id,
                                    name: emp.name,
                                    email: emp.email,
                                    type: 'hired',
                                  })
                                }
                                className="p-2 rounded-xl text-red-600 dark:text-white bg-red-50/90 hover:bg-red-100 dark:bg-red-600 dark:hover:bg-red-500 border border-red-300 dark:border-red-500 shadow-[0_3px_0_#991b1b] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
                                title="Eliminar colaborador"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div className="relative z-10 space-y-2 text-xs pt-2 border-t border-slate-200/60 dark:border-white/10">
                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-mono">{emp.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{emp.phone || '+1 (809) 555-0100'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold">
                              <span>Sueldo asignado:</span>
                              <span>RD$ {(emp.salary || 0).toLocaleString('es-DO')} / mes</span>
                            </div>
                          </div>

                          <div className="relative z-10 pt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            <span>Contratación: {new Date(emp.hiredDate).toLocaleDateString()}</span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold text-[10px]">
                              {emp.status}
                            </span>
                          </div>
                        </TiltGlassCard>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TAB 3: CANDIDATOS AFILIADOS A LA EMPRESA */}
        <div
          className={`w-1/4 shrink-0 transition-opacity duration-300 ${
            activeTab === 'candidates'
              ? 'opacity-100'
              : isPageSliding
              ? 'opacity-90 pointer-events-none'
              : 'max-h-0 overflow-hidden opacity-0 pointer-events-none'
          }`}
          aria-hidden={activeTab !== 'candidates'}
        >
          <div className="w-full flex-1 flex flex-col gap-5 px-4 py-5 sm:px-8 bg-transparent">
            {/* Header and Search Filters */}
            <div className="w-full space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <UserCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    <span>Candidatos Postulados a {currentEmpresaNombre}</span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Visualiza y audita a los postulantes que han remitido su CV a tus convocatorias laborales con su calificación de afinidad IA.
                  </p>
                </div>

                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/55 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 border border-white/70 dark:border-white/15 backdrop-blur-md">
                  {filteredCandidates.length} postulantes encontrados
                </span>
              </div>

              {/* Filters Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Buscar candidato por nombre o correo..."
                    value={candidateSearch}
                    onChange={(e) => setCandidateSearch(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs bg-white/60 dark:bg-white/[0.06] backdrop-blur-md border border-white/70 dark:border-white/15 text-slate-900 dark:text-slate-100 placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <select
                    value={vacancyFilter}
                    onChange={(e) => setVacancyFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white/60 dark:bg-white/[0.06] backdrop-blur-md border border-white/70 dark:border-white/15 text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    <option value="all" className="text-slate-900 dark:bg-slate-900 dark:text-slate-100">Todas las Convocatorias de la Empresa</option>
                    {companyVacancies.map((v) => (
                      <option key={v.id} value={v.id} className="text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                        {v.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Table of Candidates */}
            <TiltGlassCard maxTiltDeg={0.8} className="w-full rounded-2xl">
              <div className="relative z-10 w-full overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="border-b border-slate-200/70 dark:border-white/10 text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Candidato</th>
                      <th className="px-6 py-4">Convocatoria</th>
                      <th className="px-6 py-4">Afinidad IA</th>
                      <th className="px-6 py-4">Estado en la Empresa</th>
                      <th className="px-6 py-4">Contacto</th>
                      <th className="px-6 py-4">Fecha Postulación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50 dark:divide-white/10">
                    {filteredCandidates.map((app) => (
                      <tr key={app.id} className="hover:bg-white/40 dark:hover:bg-white/[0.04] transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                            {app.candidateName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span>{app.candidateName}</span>
                            <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-normal">{app.candidateEmail}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">
                          {app.vacancyTitle}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-black text-xs border border-emerald-500/30">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            {typeof app.mlScore === 'number' ? app.mlScore : 85}% Afinidad
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              app.status === 'Preseleccionado' || app.status === 'Contratado'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/35'
                                : app.status === 'En revisión' || app.status === 'Entrevista'
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/35'
                                : app.status === 'Recibida'
                                ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/35'
                                : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/35'
                            }`}
                          >
                            {app.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                          {app.candidatePhone || '+1 (809) 000-0000'}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-[11px]">
                          {app.appliedDate}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TiltGlassCard>
          </div>
        </div>

        {/* TAB 4: FICHA INSTITUCIONAL Y CONFIGURACIÓN DE LA EMPRESA */}
        <div
          className={`w-1/4 shrink-0 transition-opacity duration-300 ${
            activeTab === 'profile'
              ? 'opacity-100'
              : isPageSliding
              ? 'opacity-90 pointer-events-none'
              : 'max-h-0 overflow-hidden opacity-0 pointer-events-none'
          }`}
          aria-hidden={activeTab !== 'profile'}
        >
          <div className="w-full flex-1 px-4 py-5 sm:px-8 bg-transparent">
            <TiltGlassCard maxTiltDeg={1.2} className="max-w-3xl p-6 sm:p-8 rounded-2xl space-y-6">
              <div className="relative z-10">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  <span>Ficha Institucional y Datos Corporativos</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Esta información se muestra a los candidatos al explorar tus convocatorias y en los expedientes de contratación oficial.
                </p>
              </div>

              <form onSubmit={handleSaveCompanyProfile} className="relative z-10 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Razón Social / Nombre Comercial *"
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    required
                  />
                  <Input
                    label="RIF / Identificación Fiscal *"
                    value={editRif}
                    onChange={(e) => setEditRif(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Dominio Web Corporativo"
                    value={editDominio}
                    onChange={(e) => setEditDominio(e.target.value)}
                  />
                  <Input
                    label="Teléfono Central"
                    value={editTelefono}
                    onChange={(e) => setEditTelefono(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Descripción Institucional de la Empresa
                  </label>
                  <textarea
                    rows={4}
                    value={editDescripcion}
                    onChange={(e) => setEditDescripcion(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white/60 dark:bg-white/[0.06] backdrop-blur-md border border-white/70 dark:border-white/15 text-slate-900 dark:text-slate-100 leading-relaxed font-normal"
                    placeholder="Describe los valores, misión y sector tecnológico de la empresa..."
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" variant="primary" size="md" className="font-bold px-6">
                    Guardar Cambios Institucionales
                  </Button>
                </div>
              </form>
            </TiltGlassCard>
          </div>
        </div>
        </div>
      </main>

      {/* MODAL: REGISTRAR MIEMBRO DE RRHH PARA LA EMPRESA */}
      <Modal
        isOpen={isNewHROpen}
        onClose={() => setIsNewHROpen(false)}
        title={`Registrar Reclutador de RRHH · ${currentEmpresaNombre}`}
        subtitle="Generación de credenciales para evaluadores y analistas de talento humano de tu empresa."
        maxWidth="md"
        variant="manila"
      >
        <form onSubmit={handleRegisterHR} className="space-y-4 pt-1">
          <Input
            label="Nombre Completo del Reclutador *"
            placeholder="Lic. Carlos Arismendi"
            value={hrName}
            onChange={(e) => setHrName(e.target.value)}
            required
          />

          <Input
            label="Correo Corporativo (@empresa) *"
            type="email"
            placeholder={`reclutador@${empresaData?.dominio || 'nexo.com'}`}
            value={hrEmail}
            onChange={(e) => setHrEmail(e.target.value)}
            required
          />

          <Input
            label="Teléfono / WhatsApp de Contacto"
            placeholder="+1 (809) 555-0244"
            value={hrPhone}
            onChange={(e) => setHrPhone(e.target.value)}
          />

          <Input
            label="Contraseña de Acceso del Reclutador *"
            type="password"
            placeholder="Mínimo 8 caracteres (letras y números)"
            value={hrPassword}
            onChange={(e) => setHrPassword(e.target.value)}
            required
          />

          <div className="pt-2 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsNewHROpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isRegisteringHR}
              className="font-bold px-5"
            >
              Crear Acceso de RRHH
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CONFIRMAR ELIMINACIÓN DE EMPLEADO / COLABORADOR */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => !isDeletingEmployee && setDeleteTarget(null)}
        title="Confirmar Desvinculación de Colaborador"
        subtitle="Esta acción desvinculará al colaborador del equipo de la empresa."
        maxWidth="md"
        variant="manila"
      >
        <div className="space-y-4 pt-1">
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="text-xs text-red-900 dark:text-red-200 space-y-1">
              <p className="font-bold">
                ¿Estás seguro de que deseas eliminar a {deleteTarget?.name}?
              </p>
              <p className="text-red-700 dark:text-red-300">
                Correo: <span className="font-mono font-semibold">{deleteTarget?.email}</span>
              </p>
              <p className="text-[11px] text-red-600/80 dark:text-red-400/80">
                Se revocarán sus accesos inmediatos y ya no figurará en la nómina ni en los expedientes de personal de {currentEmpresaNombre}.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeletingEmployee}
              onClick={() => setDeleteTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              isLoading={isDeletingEmployee}
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 shadow-[0_4px_0_#991b1b]"
            >
              Sí, Eliminar Colaborador
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
