import React, { useEffect, useMemo, useState } from 'react';
import { Application, Employee, Empresa, User, Vacancy } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { authService } from '@/services/auth.service';
import { vacanciesService } from '@/services/vacancies.service';
import { applicationsService } from '@/services/applications.service';
import { empresaService } from '@/services/empresa.service';
import { employeesService } from '@/services/employees.service';
import { api } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { AppShell } from '@/components/layout/AppShell';
import { type SidebarSection } from '@/components/layout/Sidebar';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { EmailTemplatesEditor } from '@/components/company/EmailTemplatesEditor';
import { TelegramLinkCard } from '@/components/company/TelegramLinkCard';
import { CandidateProfileDrawer } from '@/components/candidates/CandidateProfileDrawer';
import { QuickNotifyRowBar } from '@/components/applications/QuickNotifyRowBar';
import { type NotifyChannel } from '@/services/applications.service';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { TiltGlassCard } from '@/components/ui/TiltGlassCard';
import { StackedMetricsBarChart } from '@/components/charts/StackedMetricsBarChart';
import {
  CompanyStatusDonutChart,
  buildCompanyDonutSegments,
  type DonutMode,
} from '@/components/charts/CompanyStatusDonutChart';
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
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  SlidersHorizontal,
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
  FileUser,
  Megaphone,
  Crown,
  MessageSquare,
  ExternalLink,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';

type CompanyAdminTab = 'metrics' | 'team' | 'candidates' | 'messages' | 'templates' | 'profile';

const resolveCompanyAdminTab = (tab?: string): CompanyAdminTab => {
  if (
    tab === 'metrics' ||
    tab === 'team' ||
    tab === 'candidates' ||
    tab === 'messages' ||
    tab === 'templates' ||
    tab === 'profile'
  ) {
    return tab;
  }
  return 'metrics';
};

export const CompanyAdminDashboardPage: React.FC<{
  onNavigate: (view: string, initialTab?: string) => void;
  initialTab?: string;
}> = ({ onNavigate, initialTab }) => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<CompanyAdminTab>(() => resolveCompanyAdminTab(initialTab));

  useEffect(() => {
    if (initialTab) {
      setActiveTab(resolveCompanyAdminTab(initialTab));
    }
  }, [initialTab]);

  const [donutMode, setDonutMode] = useState<DonutMode>('applicants');
  const [hoveredDonutId, setHoveredDonutId] = useState<string | null>(null);
  const [pinnedDonutId, setPinnedDonutId] = useState<string | null>(null);
  const [isCandidateFiltersOpen, setIsCandidateFiltersOpen] = useState(false);
  const [expandedCandidateCardId, setExpandedCandidateCardId] = useState<string | null>(null);
  const [profileDrawerApp, setProfileDrawerApp] = useState<Application | null>(null);
  const [focusChatAppId, setFocusChatAppId] = useState<string | undefined>(undefined);

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

  // Company Profile Edit State + Cover (Portada Horizontal) & Square Logo (4x4)
  const [editNombre, setEditNombre] = useState('');
  const [editRif, setEditRif] = useState('');
  const [editDominio, setEditDominio] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editVisibilidad, setEditVisibilidad] = useState<'PUBLICO' | 'SOLO_REGISTRADOS' | 'NADIE'>('PUBLICO');
  const [companyCoverUrl, setCompanyCoverUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem(`nexo_company_cover_${currentEmpresaId || currentEmpresaNombre}`) || null;
    } catch {
      return null;
    }
  });
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem(`nexo_company_logo_${currentEmpresaId || currentEmpresaNombre}`) || null;
    } catch {
      return null;
    }
  });

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setCompanyCoverUrl(dataUrl);
      try {
        localStorage.setItem(`nexo_company_cover_${currentEmpresaId || currentEmpresaNombre}`, dataUrl);
      } catch {}
      showToast('Portada actualizada', 'La imagen horizontal de portada de la empresa se guardó correctamente.', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setCompanyLogoUrl(dataUrl);
      try {
        localStorage.setItem(`nexo_company_logo_${currentEmpresaId || currentEmpresaNombre}`, dataUrl);
      } catch {}
      showToast('Logo actualizado', 'El logo 4x4 de la empresa fue guardado con éxito.', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Candidates Search & Filter
  const [candidateSearch, setCandidateSearch] = useState('');
  const [vacancyFilter, setVacancyFilter] = useState('all');
  const [expandedNotifyAppId, setExpandedNotifyAppId] = useState<string | null>(null);
  const [autoNotifyChannel, setAutoNotifyChannel] = useState<NotifyChannel>('AMBOS');
  const [isBulkRejecting, setIsBulkRejecting] = useState(false);

  const handleSwitchTab = (nextTab: 'metrics' | 'team' | 'candidates' | 'messages' | 'templates' | 'profile') => {
    setActiveTab(nextTab);
  };

  const loadCompanyData = async () => {
    setIsLoading(true);
    try {
      const [allVacancies, allApps, allCompanies, myMembers, allEmps, myCompanyMe] = await Promise.all([
        vacanciesService.getAll().catch(() => []),
        applicationsService.getAll().catch(() => []),
        empresaService.getAll().catch(() => []),
        employeesService.getCompanyMembers(currentEmpresaId).catch(() => []),
        employeesService.getAll(currentEmpresaId).catch(() => []),
        api.get<any>('/company/me').then((r) => r.data).catch(() => null),
      ]);

      if (myCompanyMe?.visibilidadPerfil) {
        setEditVisibilidad(myCompanyMe.visibilidadPerfil);
      }
      if (myCompanyMe?.descripcion) {
        setEditDescripcion(myCompanyMe.descripcion);
      }

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

  const donutSegments = useMemo(
    () =>
      buildCompanyDonutSegments({
        mode: donutMode,
        vacancies: companyVacancies,
        applications: companyApplications,
        employees: hiredEmployees,
      }),
    [donutMode, companyVacancies, companyApplications, hiredEmployees]
  );

  const activeDonutSegment = useMemo(() => {
    const activeId = hoveredDonutId ?? pinnedDonutId;
    return activeId ? donutSegments.find((s) => s.id === activeId) ?? null : null;
  }, [donutSegments, hoveredDonutId, pinnedDonutId]);

  const handleRegisterHR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hrName.trim() || !hrEmail.trim()) {
      showToast('Campos requeridos', 'Ingresa el nombre y el correo electrónico del reclutador de RRHH.', 'error');
      return;
    }
    setIsRegisteringHR(true);
    try {
      await authService.registerHRUser({
        name: hrName.trim(),
        email: hrEmail.trim(),
        password: hrPassword.trim() || 'Password123!',
        phone: hrPhone.trim() || undefined,
        empresaId: currentEmpresaId,
        empresaNombre: currentEmpresaNombre,
      });

      showToast(
        'Invitación de RRHH enviada por correo',
        `Se envió un correo de confirmación a ${hrEmail}. Aparecerá en tu Equipo de Trabajo en cuanto acepte su invitación.`,
        'success',
      );
      setIsNewHROpen(false);
      setHrName('');
      setHrEmail('');
      setHrPhone('');
      setHrPassword('');
      await loadCompanyData();
    } catch (err: any) {
      showToast('Error', err?.message || 'No se pudo enviar la invitación al reclutador.', 'error');
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

  const handleSaveCompanyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch('/company/me', {
        razonSocial: editNombre.trim() || undefined,
        telefonoContacto: editTelefono.trim() || undefined,
        sitioWeb: editDominio.trim()
          ? editDominio.trim().startsWith('http')
            ? editDominio.trim()
            : `https://${editDominio.trim()}`
          : '',
        descripcion: editDescripcion.trim(),
        visibilidadPerfil: editVisibilidad,
      });

      if (empresaData) {
        setEmpresaData({
          ...empresaData,
          nombre: editNombre,
          rif: editRif,
          dominio: editDominio,
          telefono: editTelefono,
          descripcion: editDescripcion,
        });
      }
      showToast(
        'Perfil Actualizado en BD',
        'La información y privacidad del perfil de tu empresa fueron guardadas en Neon.',
        'success'
      );
    } catch (err: any) {
      showToast('Error al guardar', err?.message || 'No se pudieron guardar los cambios en el servidor.', 'error');
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
            (acc, a) => acc + (typeof a.mlScore === 'number' ? a.mlScore : 0),
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

  const sidebarSections: SidebarSection[] = [
    {
      title: 'GESTIÓN DE EMPRESA',
      items: [
        { id: 'metrics', label: 'Métricas Locales', icon: BarChart3 },
        { id: 'team', label: 'Equipo de Trabajo', icon: Users, badge: teamMembers.length + hiredEmployees.length },
        { id: 'candidates', label: 'Candidatos', icon: UserCheck, badge: companyApplications.length },
        { id: 'messages', label: 'Mensajes y Telegram', icon: MessageSquare },
      ],
    },
    {
      title: 'CONFIGURACIÓN',
      items: [
        { id: 'templates', label: 'Plantillas de Avisos', icon: Mail },
        { id: 'profile', label: 'Empresa y Telegram', icon: Building2 },
      ],
    },
    {
      title: 'PORTAL',
      items: [
        { id: 'external-vacancies', label: 'Catálogo de Vacantes', icon: ExternalLink, external: true },
      ],
    },
  ];

  const activeTitle =
    activeTab === 'metrics'
      ? 'Métricas Locales'
      : activeTab === 'team'
      ? 'Equipo de Trabajo'
      : activeTab === 'candidates'
      ? 'Candidatos de la Empresa'
      : activeTab === 'messages'
      ? 'Mensajes con Candidatos'
      : activeTab === 'templates'
      ? 'Plantillas de Notificación'
      : 'Datos y Telegram de Empresa';

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans transition-colors">
      <AppShell
        sections={sidebarSections}
        activeId={activeTab}
        onSelect={(id) => {
          if (id === 'external-vacancies') {
            onNavigate('vacancies');
            return;
          }
          handleSwitchTab(id as typeof activeTab);
        }}
        brandSubtitle="ADMIN CORPORATIVO"
        crumbRoot={currentEmpresaNombre}
        title={activeTitle}
        roleLabel="Admin Local"
        contextLabel={`RIF ${empresaData?.rif || 'J-12345678-9'}`}
        onLogout={() => {
          logout();
          onNavigate('login');
        }}
        onBrandClick={() => onNavigate('vacancies')}
      >
        <div className="w-full flex-1">
          {/* TAB 1: MÉTRICAS LOCALES Y RENDIMIENTO DE LA EMPRESA */}
          {activeTab === 'metrics' && (
            <div className="animate-page-enter-left w-full flex-1 flex flex-col gap-4 sm:gap-5 px-4 py-4 sm:px-8 sm:py-5 bg-transparent">
            {/* Banner de Impacto de IA Local (sin fondo sólido para ver partículas + tarjetas glassmorphic con Tilt 3D) */}
            <section className="w-full space-y-3.5 bg-transparent">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-1.5 border border-emerald-500/30">
                    <Brain className="w-3.5 h-3.5" /> Procesamiento Local con Machine Learning
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    Rendimiento Algorítmico en {currentEmpresaNombre}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5 max-w-2xl">
                    Estadísticas exclusivas de los candidatos evaluados por la IA en tus convocatorias y el impacto en tu proceso de reclutamiento.
                  </p>
                </div>

                <TiltGlassCard
                  maxTiltDeg={3}
                  className="px-4 py-2 rounded-xl flex items-center gap-2.5 shrink-0 !border-emerald-500/35 !bg-emerald-500/10 dark:!bg-emerald-500/[0.08]"
                >
                  <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400 relative z-10" />
                  <div className="relative z-10">
                    <span className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300 block">Afinidad Media Local</span>
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
                    <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 block relative z-10">
                      {label}
                    </span>
                    <span className={`text-2xl font-black block leading-tight relative z-10 ${valueColor}`}>
                      {value}
                    </span>
                    <p className={`text-xs relative z-10 ${subtextColor}`}>{subtext}</p>
                  </TiltGlassCard>
                ))}
              </div>
            </section>

            {/* Fila 40% / 60%: Torta Interactiva por Convocatoria / Rol Activo + Resumen Detallado */}
            <CompanyStatusDonutChart
              mode={donutMode}
              onModeChange={(nextMode) => {
                setDonutMode(nextMode);
                setPinnedDonutId(null);
                setHoveredDonutId(null);
              }}
              segments={donutSegments}
              hoveredSegmentId={hoveredDonutId}
              pinnedSegmentId={pinnedDonutId}
              onHoverSegment={setHoveredDonutId}
              onTogglePinSegment={setPinnedDonutId}
              companyName={currentEmpresaNombre}
            />

            {/* Gráfica de Columnas Sincronizada: Nivel de Afinidad en Escalera + Calidad vs Plazas */}
            <StackedMetricsBarChart
              mode={donutMode}
              segments={donutSegments}
              activeSegment={activeDonutSegment}
              vacancies={companyVacancies}
              applications={companyApplications}
              companyName={currentEmpresaNombre}
              onClearSegment={() => {
                setPinnedDonutId(null);
                setHoveredDonutId(null);
              }}
            />
            </div>
          )}

          {/* TAB 2: RECURSOS HUMANOS Y COLABORADORES CONTRATADOS */}
          {activeTab === 'team' && (
            <div className="animate-page-enter-left w-full flex-1 flex flex-col gap-5 px-4 py-5 sm:px-8 bg-transparent">
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
                                <span className={`text-xs font-bold uppercase tracking-wider ${
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
                              <span className="text-xs font-bold text-slate-500 dark:text-slate-300 bg-slate-200/70 dark:bg-white/10 px-2.5 py-1 rounded-lg">
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
                                <span className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                                  {emp.role} · {emp.department}
                                </span>
                              </div>
                            </div>

                            {isSelf ? (
                              <span className="text-xs font-bold text-slate-500 dark:text-slate-300 bg-slate-200/70 dark:bg-white/10 px-2.5 py-1 rounded-lg">
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
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold text-xs">
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
          )}

          {/* TAB 3: CANDIDATOS AFILIADOS A LA EMPRESA */}
          {activeTab === 'candidates' && (
            <div className="animate-page-enter-left w-full flex-1 flex flex-col gap-5 px-4 py-5 sm:px-8 bg-transparent">
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

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={autoNotifyChannel}
                    onChange={(e) => setAutoNotifyChannel(e.target.value as NotifyChannel)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/70 dark:bg-slate-900 border border-slate-300 dark:border-white/15 text-slate-800 dark:text-slate-100 cursor-pointer"
                    title="Canal automático de notificaciones"
                  >
                    <option value="AMBOS">Auto: Telegram + Correo</option>
                    <option value="TELEGRAM">Auto: Solo Telegram / Chat</option>
                    <option value="CORREO">Auto: Solo Correo</option>
                  </select>

                  {(() => {
                    const below50 = filteredCandidates.filter(
                      (a) =>
                        typeof a.mlScore === 'number' &&
                        a.mlScore < 50 &&
                        a.status !== 'Descartado' &&
                        a.status !== 'Contratado'
                    );
                    return (
                      <button
                        type="button"
                        disabled={below50.length === 0 || isBulkRejecting}
                        onClick={async () => {
                          if (
                            !window.confirm(
                              `¿Descartar automáticamente a los ${below50.length} candidatos con afinidad menor a 50% y enviarles notificación (${autoNotifyChannel})?`
                            )
                          ) {
                            return;
                          }
                          setIsBulkRejecting(true);
                          try {
                            const res = await applicationsService.bulkRejectBelow50({
                              vacancyId: vacancyFilter !== 'all' ? vacancyFilter : undefined,
                              threshold: 50,
                              channel: autoNotifyChannel,
                              companyLogoUrl: companyLogoUrl || undefined,
                            });
                            showToast(
                              'Descarte masivo completado',
                              `Se descartaron y notificaron ${res.rejectedCount} postulantes por debajo del 50%.`,
                              'success'
                            );
                            await loadCompanyData();
                          } catch (err: any) {
                            showToast('Error', err?.message || 'No se pudo completar el descarte masivo.', 'error');
                          } finally {
                            setIsBulkRejecting(false);
                          }
                        }}
                        className="press inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-40 cursor-pointer shadow-xs"
                        title="Cancela y notifica automáticamente a todos los postulantes con menos de 50% de afinidad ML"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>
                          {isBulkRejecting ? 'Descartando...' : `Descartar < 50% (${below50.length})`}
                        </span>
                      </button>
                    );
                  })()}

                  <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/55 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 border border-white/70 dark:border-white/15 backdrop-blur-md">
                    {filteredCandidates.length} postulantes
                  </span>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="space-y-3 pt-1">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Buscar candidato por nombre o correo..."
                      value={candidateSearch}
                      onChange={(e) => setCandidateSearch(e.target.value)}
                      className="w-full min-h-[42px] pl-9 pr-3.5 py-2.5 rounded-xl text-xs bg-white/60 dark:bg-white/[0.06] backdrop-blur-md border border-white/70 dark:border-white/15 text-slate-900 dark:text-slate-100 placeholder:text-slate-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCandidateFiltersOpen((prev) => !prev)}
                    className="sm:hidden inline-flex items-center justify-between gap-2 min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold bg-white/60 dark:bg-white/[0.06] border border-white/70 dark:border-white/15 text-slate-900 dark:text-slate-100 cursor-pointer"
                    aria-expanded={isCandidateFiltersOpen}
                  >
                    <span className="inline-flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Filtros (Convocatoria)</span>
                    </span>
                    {isCandidateFiltersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                <div className={`${isCandidateFiltersOpen ? 'block' : 'hidden sm:block'}`}>
                  <select
                    value={vacancyFilter}
                    onChange={(e) => setVacancyFilter(e.target.value)}
                    className="w-full min-h-[42px] px-3.5 py-2.5 rounded-xl text-xs bg-white/60 dark:bg-white/[0.06] backdrop-blur-md border border-white/70 dark:border-white/15 text-slate-900 dark:text-slate-100 font-semibold"
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

            {/* Mobile Stacked Cards (md:hidden) */}
            <div className="md:hidden space-y-3">
              {filteredCandidates.map((app) => {
                const scoreVal = typeof app.mlScore === 'number' ? app.mlScore : 0;
                const isDetailsOpen = expandedCandidateCardId === app.id;
                const isNotifyOpen = expandedNotifyAppId === app.id;

                return (
                  <TiltGlassCard key={app.id} maxTiltDeg={0} className="rounded-2xl p-4 space-y-3">
                    <div className="relative z-10 flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setProfileDrawerApp(app)}
                        className="flex items-center gap-3 text-left min-w-0 cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {app.candidateName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                            {app.candidateName}
                          </p>
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
                            {app.vacancyTitle}
                          </p>
                        </div>
                      </button>

                      <span
                        className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-black text-xs border ${
                          scoreVal < 50
                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                            : 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {scoreVal}%
                      </span>
                    </div>

                    <div className="relative z-10 flex items-center justify-between gap-2">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
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

                      <button
                        type="button"
                        onClick={() => setExpandedCandidateCardId(isDetailsOpen ? null : app.id)}
                        className="inline-flex items-center gap-1.5 min-h-[42px] px-3 py-1.5 rounded-xl text-xs font-bold bg-white/75 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 cursor-pointer"
                        aria-expanded={isDetailsOpen}
                      >
                        <span>{isDetailsOpen ? 'Ocultar detalles' : 'Ver detalles'}</span>
                        {isDetailsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {isDetailsOpen && (
                      <div className="relative z-10 pt-3 border-t border-slate-200/60 dark:border-white/10 space-y-3 text-xs">
                        <div className="space-y-1 text-slate-600 dark:text-slate-300">
                          <p className="truncate"><strong className="text-slate-800 dark:text-slate-100">Correo:</strong> {app.candidateEmail}</p>
                          <p className="font-mono"><strong className="font-sans text-slate-800 dark:text-slate-100">Contacto:</strong> {app.candidatePhone || '+1 (809) 000-0000'}</p>
                          <p><strong className="text-slate-800 dark:text-slate-100">Postulación:</strong> {app.appliedDate}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setProfileDrawerApp(app)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold bg-white/80 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 cursor-pointer"
                          >
                            <FileUser className="w-3.5 h-3.5" />
                            <span>Ver Perfil</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedNotifyAppId(isNotifyOpen ? null : app.id)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 cursor-pointer"
                          >
                            <Megaphone className="w-3.5 h-3.5" />
                            <span>Notificar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setFocusChatAppId(app.id);
                              setActiveTab('messages');
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold bg-[#0B5D46] hover:bg-[#094B38] text-white dark:bg-[#C8FF45] dark:text-[#090A0C] cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Chatear</span>
                          </button>
                        </div>

                        {isNotifyOpen && (
                          <QuickNotifyRowBar
                            application={app}
                            defaultChannel={autoNotifyChannel}
                            companyLogoUrl={companyLogoUrl}
                            onSuccess={() => loadCompanyData()}
                            onClose={() => setExpandedNotifyAppId(null)}
                          />
                        )}
                      </div>
                    )}
                  </TiltGlassCard>
                );
              })}
            </div>

            {/* Table of Candidates (Desktop md+) */}
            <TiltGlassCard maxTiltDeg={0.8} className="hidden md:block w-full rounded-2xl">
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
                      <th className="px-6 py-4 text-right">Acciones / Chat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50 dark:divide-white/10">
                    {filteredCandidates.map((app) => {
                      const isNotifyOpen = expandedNotifyAppId === app.id;
                      const scoreVal = typeof app.mlScore === 'number' ? app.mlScore : 0;
                      return (
                      <React.Fragment key={app.id}>
                      <tr
                        onClick={() => setExpandedNotifyAppId(isNotifyOpen ? null : app.id)}
                        className={`transition-colors cursor-pointer group ${
                          isNotifyOpen
                            ? 'bg-emerald-500/8 dark:bg-[#C8FF45]/[0.06]'
                            : 'hover:bg-white/40 dark:hover:bg-white/[0.04]'
                        }`}
                        title="Clic en foto/nombre para abrir perfil · Clic en cualquier otro lado para notificación rápida"
                      >
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProfileDrawerApp(app);
                            }}
                            className="flex items-center gap-3 text-left cursor-pointer group/name"
                            title="Abrir perfil del candidato"
                          >
                            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {app.candidateName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="group-hover/name:text-[#0B5D46] dark:group-hover/name:text-[#C8FF45] underline decoration-transparent group-hover/name:decoration-current underline-offset-4 transition-colors">
                                {app.candidateName}
                              </span>
                              <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-normal">{app.candidateEmail}</span>
                            </div>
                          </button>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">
                          {app.vacancyTitle}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-black text-xs border ${
                              scoreVal < 50
                                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                                : 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            {scoreVal}% Afinidad
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
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
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFocusChatAppId(app.id);
                              setActiveTab('messages');
                            }}
                            className="press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0B5D46] hover:bg-[#094B38] text-white dark:bg-[#C8FF45] dark:hover:bg-[#d5ff6b] dark:text-[#090A0C] cursor-pointer shadow-xs"
                            title="Abrir chat con este postulante"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Chatear</span>
                          </button>
                        </td>
                      </tr>
                      {isNotifyOpen && (
                        <tr>
                          <td colSpan={7} className="px-4 py-3 bg-transparent">
                            <QuickNotifyRowBar
                              application={app}
                              defaultChannel={autoNotifyChannel}
                              companyLogoUrl={companyLogoUrl}
                              onSuccess={() => loadCompanyData()}
                              onClose={() => setExpandedNotifyAppId(null)}
                            />
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TiltGlassCard>
            </div>
          )}

          {/* TAB: MENSAJES WEB <-> TELEGRAM */}
          {activeTab === 'messages' && (
            <div className="animate-page-enter-left w-full flex-1 px-4 py-5 sm:px-8 space-y-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#3a2818] dark:text-[#F1F2EC] tracking-tight">
                  Mensajes con Candidatos
                </h2>
                <p className="text-xs sm:text-sm text-[#70553b] dark:text-slate-400 mt-1">
                  Supervisa o participa directamente en las conversaciones por postulación vinculadas al Telegram corporativo.
                </p>
              </div>
              <ChatPanel focusApplicationId={focusChatAppId} />
            </div>
          )}

          {/* TAB: PLANTILLAS DE NOTIFICACIÓN */}
          {activeTab === 'templates' && (
            <div className="animate-page-enter-left w-full flex-1 px-4 py-5 sm:px-8">
              <EmailTemplatesEditor companyName={currentEmpresaNombre} />
            </div>
          )}

          {/* TAB 4: FICHA INSTITUCIONAL Y CONFIGURACIÓN DE LA EMPRESA */}
          {activeTab === 'profile' && (
            <div className="animate-page-enter-left w-full flex-1 px-4 py-5 sm:px-8 bg-transparent grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              <TiltGlassCard maxTiltDeg={1.2} className="xl:col-span-7 p-6 sm:p-8 rounded-2xl space-y-6">
              <div className="relative z-10">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  <span>Ficha Institucional y Datos Corporativos</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Personaliza la portada horizontal, el logo cuadrado (4x4) y los datos oficiales de tu empresa.
                </p>
              </div>

              {/* Portada Horizontal + Logo 4x4 de la Empresa (Administrado por el Admin) */}
              <div className="relative z-10 pb-8">
                {/* Imagen Horizontal de Portada */}
                <div className="relative h-36 sm:h-44 w-full rounded-2xl overflow-hidden border-2 border-[#C8B193] dark:border-[#232D42] bg-gradient-to-r from-[#170F09] via-[#2E1E12] to-[#0B5D46] shadow-md group">
                  {companyCoverUrl ? (
                    <img
                      src={companyCoverUrl}
                      alt={`Portada de ${editNombre || currentEmpresaNombre}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#E6B87A]/80 dark:text-[#C8FF45]/75 p-4 text-center">
                      <ImageIcon className="w-7 h-7 mb-1 opacity-80" />
                      <span className="text-xs font-bold">Portada Horizontal de la Empresa</span>
                      <span className="text-xs opacity-75">Formato horizontal recomendado (1200 × 360 px)</span>
                    </div>
                  )}

                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <label className="press px-3 py-1.5 rounded-xl bg-[#170F09]/85 hover:bg-[#170F09] text-[#F6EEE2] border border-[#C8B193]/40 text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer backdrop-blur-md shadow-sm">
                      <Camera className="w-3.5 h-3.5 text-[#C8FF45]" />
                      <span>{companyCoverUrl ? 'Cambiar Portada' : 'Subir Portada Horizontal'}</span>
                      <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                    </label>
                    {companyCoverUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setCompanyCoverUrl(null);
                          localStorage.removeItem(`nexo_company_cover_${currentEmpresaId || currentEmpresaNombre}`);
                        }}
                        className="press p-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white cursor-pointer"
                        title="Quitar portada"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Logo Cuadrado 4x4 superpuesto abajo a la izquierda */}
                <div className="absolute -bottom-2 left-5 flex items-end gap-3.5">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 aspect-square rounded-2xl overflow-hidden border-4 border-[#FCFBF8] dark:border-[#111622] bg-[#170F09] text-[#C8FF45] shadow-lg flex items-center justify-center group">
                    {companyLogoUrl ? (
                      <img
                        src={companyLogoUrl}
                        alt={`Logo de ${editNombre || currentEmpresaNombre}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-1">
                        <span className="text-lg sm:text-xl font-black tracking-tight">
                          {(editNombre || currentEmpresaNombre || 'EM').slice(0, 2).toUpperCase()}
                        </span>
                        <span className="text-xs font-mono-tabular uppercase text-[#E6B87A]">Logo 4x4</span>
                      </div>
                    )}

                    <label
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold cursor-pointer gap-0.5"
                      title="Subir logo cuadrado (4x4) de la empresa"
                    >
                      <Camera className="w-4 h-4 text-[#C8FF45]" />
                      <span>Logo 4x4</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  </div>

                  <div className="pb-1">
                    <label className="press inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EFE5D4] hover:bg-[#E5D6BE] dark:bg-white/10 dark:hover:bg-white/15 border border-[#C8B193] dark:border-white/15 text-[11px] font-bold text-[#3A2818] dark:text-[#C8FF45] cursor-pointer">
                      <Camera className="w-3 h-3" />
                      <span>{companyLogoUrl ? 'Cambiar Logo (4x4)' : 'Subir Logo (4x4)'}</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  </div>
                </div>
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

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Visibilidad del Perfil Público e Historial de Vacantes
                  </label>
                  <select
                    value={editVisibilidad}
                    onChange={(e) => setEditVisibilidad(e.target.value as 'PUBLICO' | 'SOLO_REGISTRADOS' | 'NADIE')}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/70 dark:bg-slate-900 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="PUBLICO">Público — Visible para visitantes sin cuenta y usuarios registrados</option>
                    <option value="SOLO_REGISTRADOS">Solo registrados — Solo usuarios con cuenta pueden ver el perfil</option>
                    <option value="NADIE">Privado (Nadie) — Oculto para visitantes y candidatos</option>
                  </select>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Controla quién puede consultar los datos de tu empresa, tus vacantes activas y tu historial de convocatorias.
                  </p>
                </div>

                <div className="pt-2">
                  <Button type="submit" variant="primary" size="md" className="font-bold px-6">
                    Guardar Cambios Institucionales
                  </Button>
                </div>
              </form>
            </TiltGlassCard>

            <TelegramLinkCard canManage={true} className="xl:col-span-5" />
          </div>
          )}
        </div>
      </AppShell>

      {/* CAJÓN IZQUIERDO DE PERFIL DE CANDIDATO (SOLO LECTURA) */}
      <CandidateProfileDrawer
        isOpen={Boolean(profileDrawerApp)}
        onClose={() => setProfileDrawerApp(null)}
        application={profileDrawerApp}
        onOpenChat={(app) => {
          setProfileDrawerApp(null);
          setFocusChatAppId(app.id);
          setActiveTab('messages');
        }}
      />

      {/* MODAL: REGISTRAR E INVITAR MIEMBRO DE RRHH POR CORREO */}
      <Modal
        isOpen={isNewHROpen}
        onClose={() => setIsNewHROpen(false)}
        title={`Registrar e Invitar Reclutador de RRHH · ${currentEmpresaNombre}`}
        subtitle="Se enviará un correo de confirmación al reclutador para que active su registro. Todas las notificaciones y mensajes saldrán del correo y Telegram de la empresa."
        maxWidth="md"
        variant="manila"
      >
        <form onSubmit={handleRegisterHR} className="space-y-4 pt-1">
          <Input
            label="Nombre Completo del Reclutador *"
            placeholder="Ej. Ana Morales"
            value={hrName}
            onChange={(e) => setHrName(e.target.value)}
            required
          />

          <Input
            label="Correo Electrónico del Reclutador (donde recibirá la confirmación) *"
            type="email"
            placeholder="reclutador@correo.com"
            value={hrEmail}
            onChange={(e) => setHrEmail(e.target.value)}
            required
          />

          <Input
            label="Teléfono / Telegram de Contacto (opcional)"
            placeholder="+58 412 0000000"
            value={hrPhone}
            onChange={(e) => setHrPhone(e.target.value)}
          />

          <div className="p-3 rounded-xl bg-[#EFE5D4]/75 dark:bg-slate-900/70 border border-[#C8B193] dark:border-slate-700 text-[11px] text-[#3A2818] dark:text-slate-300 leading-relaxed">
            Al pulsar <strong>Enviar Invitación por Correo</strong>, le llegará un enlace único de confirmación a su bandeja de entrada para que defina su clave y confirme su registro en RRHH.
          </div>

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
              Enviar Invitación por Correo
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
