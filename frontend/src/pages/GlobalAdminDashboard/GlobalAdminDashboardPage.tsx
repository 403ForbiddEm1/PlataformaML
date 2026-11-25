import React, { useEffect, useMemo, useState } from 'react';
import { Application, ComparisonMetrics, Empresa, MLModelMetrics, User, Vacancy } from '@/types';
import { reportsService } from '@/services/reports.service';
import { mlService } from '@/services/ml.service';
import { authService } from '@/services/auth.service';
import { empresaService } from '@/services/empresa.service';
import { applicationsService } from '@/services/applications.service';
import { vacanciesService } from '@/services/vacancies.service';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { AppShell } from '@/components/layout/AppShell';
import { type SidebarSection } from '@/components/layout/Sidebar';
import { SuperadminTicketsPanel } from '@/components/support/SuperadminTicketsPanel';
import { supportService } from '@/services/support.service';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { TiltGlassCard } from '@/components/ui/TiltGlassCard';
import { api } from '@/services/api';
import { CompanyPublicProfileModal } from '@/components/company/CompanyPublicProfileModal';
import { UserProfileReadOnlyModal } from '@/components/admin/UserProfileReadOnlyModal';
import {
  Brain,
  Cpu,
  RefreshCw,
  UploadCloud,
  ShieldCheck,
  Users,
  CheckCircle2,
  Clock,
  Activity,
  Award,
  Zap,
  Lock,
  Building2,
  PlusCircle,
  Sun,
  Moon,
  Search,
  Filter,
  Layers,
  Sliders,
  Database,
  BarChart3,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Folder,
  Trash2,
  AlertTriangle,
  LogOut,
  LifeBuoy,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';

export const GlobalAdminDashboardPage: React.FC<{ onNavigate: (view: string, initialTab?: string) => void; initialTab?: string }> = ({
  onNavigate,
  initialTab,
}) => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (user && user.role !== 'superadmin') {
      onNavigate(user.role === 'admin' || user.role === 'administrador' ? 'company-admin-dashboard' : 'vacancies');
    }
  }, [user]);

  const [activeTab, setActiveTab] = useState<'mlops' | 'companies' | 'directory' | 'tickets'>(() =>
    initialTab === 'companies' || initialTab === 'directory' || initialTab === 'tickets'
      ? initialTab
      : 'mlops'
  );

  useEffect(() => {
    if (
      initialTab === 'mlops' ||
      initialTab === 'companies' ||
      initialTab === 'directory' ||
      initialTab === 'tickets'
    ) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [openTicketsCount, setOpenTicketsCount] = useState<number>(0);

  useEffect(() => {
    const refreshTicketCount = () => {
      supportService.getTickets().then((list) => {
        setOpenTicketsCount(list.filter((t) => t.estado !== 'Resuelto').length);
      });
    };
    refreshTicketCount();
    window.addEventListener('support-tickets-updated', refreshTicketCount);
    return () => window.removeEventListener('support-tickets-updated', refreshTicketCount);
  }, []);
  const [metrics, setMetrics] = useState<ComparisonMetrics | null>(null);
  const [mlInfo, setMlInfo] = useState<MLModelMetrics | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [companiesList, setCompaniesList] = useState<Empresa[]>([]);
  const [applicationsList, setApplicationsList] = useState<Application[]>([]);
  const [vacanciesList, setVacanciesList] = useState<Vacancy[]>([]);
  const [expandedAdminIds, setExpandedAdminIds] = useState<Record<string, boolean>>({});
  const [isDirectoryFiltersOpen, setIsDirectoryFiltersOpen] = useState(false);
  const [expandedDirectoryUserId, setExpandedDirectoryUserId] = useState<string | null>(null);

  // Retrain simulation state
  const [isRetraining, setIsRetraining] = useState(false);
  const [trainProgress, setTrainProgress] = useState(0);
  const [currentEpoch, setCurrentEpoch] = useState(0);

  // Hyperparameters
  const [epochs, setEpochs] = useState(5);
  const [batchSize, setBatchSize] = useState(32);
  const [learningRate, setLearningRate] = useState(0.01);
  const [thresholdTfIdf, setThresholdTfIdf] = useState(70);

  // Upload dataset modal
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // New Company Modal (Lugar 2 de Registro de Empresa: Panel del Admin Global)
  const [isNewCompanyOpen, setIsNewCompanyOpen] = useState(false);
  const [newCompName, setNewCompName] = useState('');
  const [newCompRif, setNewCompRif] = useState('');
  const [newCompDomain, setNewCompDomain] = useState('');
  const [newCompAdmin, setNewCompAdmin] = useState('');
  const [newCompEmail, setNewCompEmail] = useState('');
  const [newCompPhone, setNewCompPhone] = useState('');
  const [newCompPassword, setNewCompPassword] = useState('empresa2026*');
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');

  // Modal para eliminar cualquier usuario (Superadmin)
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Modales de solo lectura para ver perfiles de empresas y usuarios (Superadmin)
  const [viewingCompanyId, setViewingCompanyId] = useState<string | null>(null);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  // Plazos de vigencia por empresa (Superadmin)
  const [deadlineDrafts, setDeadlineDrafts] = useState<Record<string, string>>({});

  const vacancyById = useMemo(() => {
    const map = new Map<string, Vacancy>();
    for (const v of vacanciesList) {
      map.set(v.id, v);
    }
    return map;
  }, [vacanciesList]);

  const companyById = useMemo(() => {
    const map = new Map<string, Empresa>();
    for (const c of companiesList) {
      map.set(c.id, c);
    }
    return map;
  }, [companiesList]);

  const getApplicationCompanyInfo = (app: Application): { id?: string; name?: string } => {
    const vac = vacancyById.get(app.vacancyId);
    const id = app.empresaId || (app as any).companyId || vac?.empresaId || vac?.companyId;
    const compName =
      app.empresaNombre ||
      (app as any).companyName ||
      vac?.empresaNombre ||
      vac?.companyName ||
      (id ? companyById.get(id)?.nombre : undefined);
    return { id, name: compName };
  };

  const hiredCompanyByCandidate = useMemo(() => {
    const map = new Map<string, { id?: string; name: string }>();
    for (const app of applicationsList) {
      if ((app.status || '').toLowerCase().trim() !== 'contratado') continue;
      const info = getApplicationCompanyInfo(app);
      if (!info.name && !info.id) continue;
      const entry = {
        id: info.id,
        name: info.name || (info.id ? companyById.get(info.id)?.nombre : undefined) || 'Empresa Afiliada',
      };
      if (app.candidateId) {
        map.set(`id:${app.candidateId}`, entry);
      }
      const cleanEmail = (app.candidateEmail || '').trim().toLowerCase();
      if (cleanEmail) {
        map.set(`email:${cleanEmail}`, entry);
      }
    }
    return map;
  }, [applicationsList, vacancyById, companyById]);

  const resolveUserCompanyInfo = (usr: User): { id?: string; name: string | null } => {
    const explicitName = usr.empresaNombre || usr.companyName;
    const explicitId = (usr.empresaId || usr.companyId) ?? undefined;
    if (explicitName) {
      return { id: explicitId, name: explicitName };
    }
    if (explicitId) {
      const found = companyById.get(explicitId);
      if (found?.nombre) return { id: found.id, name: found.nombre };
    }

    // Sincronizar candidato con la empresa que lo contrató
    if (usr.role === 'candidato') {
      const cleanEmail = (usr.email || '').trim().toLowerCase();
      const hiredEntry =
        hiredCompanyByCandidate.get(`id:${usr.id}`) ||
        (cleanEmail ? hiredCompanyByCandidate.get(`email:${cleanEmail}`) : undefined);
      if (hiredEntry) {
        return { id: hiredEntry.id, name: hiredEntry.name };
      }
    }

    // Si es Admin Empresa y no tiene empresaNombre explícito
    if (usr.role === 'admin') {
      try {
        const credsStr = localStorage.getItem('nexo_local_credentials');
        if (credsStr) {
          const creds = JSON.parse(credsStr);
          const cUser = creds[usr.email.toLowerCase().trim()]?.user;
          if (cUser?.empresaNombre) return { id: cUser.empresaId || explicitId, name: cUser.empresaNombre };
        }
      } catch {}
      if (companiesList.length > 0) {
        return { id: companiesList[0].id, name: companiesList[0].nombre };
      }
      return { id: explicitId, name: 'Comercio1' };
    }
    return { id: explicitId, name: null };
  };

  const resolveUserCompany = (usr: User): string | null => {
    return resolveUserCompanyInfo(usr).name;
  };

  const getCompanyAnalytics = (companyId?: string, companyName?: string | null) => {
    const normTargetName = (companyName || '').trim().toLowerCase();
    const matchesCompany = (empId?: string, empName?: string | null) => {
      if (companyId && empId && empId === companyId) return true;
      const clean = (empName || '').trim().toLowerCase();
      if (normTargetName && clean && (clean === normTargetName || clean.includes(normTargetName) || normTargetName.includes(clean))) {
        return true;
      }
      return false;
    };

    const companyObj = companiesList.find((c) => matchesCompany(c.id, c.nombre));
    const resolvedCompId = companyId || companyObj?.id;
    const resolvedCompName = companyName || companyObj?.nombre || 'Empresa';

    const totalPageCandidates = usersList.filter((u) => u.role === 'candidato').length;
    const totalPageApplications = applicationsList.length;
    const totalPageHR = usersList.filter((u) => u.role === 'rrhh').length;

    const companyApps = applicationsList.filter((app) => {
      const info = getApplicationCompanyInfo(app);
      return matchesCompany(info.id, info.name);
    });

    const uniqueCandidateKeys = new Set<string>();
    let companyHiredCount = 0;
    for (const app of companyApps) {
      const key = (app.candidateEmail || '').trim().toLowerCase() || app.candidateId || app.id;
      uniqueCandidateKeys.add(key);
      if ((app.status || '').toLowerCase().trim() === 'contratado') {
        companyHiredCount += 1;
      }
    }

    const companyVacanciesCount = vacanciesList.filter((v) =>
      matchesCompany(v.empresaId || v.companyId, v.empresaNombre || v.companyName)
    ).length;

    const companyHRWorkers = usersList.filter((u) => {
      if (u.role !== 'rrhh') return false;
      const info = resolveUserCompanyInfo(u);
      return matchesCompany((info.id || u.empresaId || u.companyId) ?? undefined, info.name);
    });
    const companyHRCount = Math.max(companyHRWorkers.length, companyObj?.rrhhCount ?? 0);

    return {
      companyId: resolvedCompId,
      companyName: resolvedCompName,
      companyApplicationsCount: companyApps.length,
      companyCandidatesCount: uniqueCandidateKeys.size,
      companyHiredCount,
      companyVacanciesCount,
      companyHRCount,
      companyHRWorkers,
      totalPageCandidates,
      totalPageApplications,
      totalPageHR,
    };
  };

  const toggleAdminExpand = (adminId: string) => {
    setExpandedAdminIds((prev) => ({
      ...prev,
      [adminId]: !prev[adminId],
    }));
  };

  const handleSwitchTab = (nextTab: 'mlops' | 'companies' | 'directory' | 'tickets') => {
    setActiveTab(nextTab);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      await authService.deleteUser(userToDelete.id, userToDelete.email);
      setUsersList((prev) => prev.filter((u) => u.id !== userToDelete.id && u.email.toLowerCase().trim() !== userToDelete.email.toLowerCase().trim()));
      showToast('Usuario Eliminado', `El usuario "${userToDelete.name}" ha sido eliminado exitosamente del sistema.`, 'success');
    } catch {
      showToast('Error', 'No se pudo completar la eliminación del usuario.', 'error');
    } finally {
      setIsDeletingUser(false);
      setIsDeleteUserModalOpen(false);
      setUserToDelete(null);
    }
  };

  const loadData = async () => {
    try {
      const [comp, model, users, companies, apps, vacs] = await Promise.all([
        reportsService.getComparisonMetrics().catch((e) => {
          console.warn('[REPORTS] Error cargando métricas:', e);
          return null;
        }),
        mlService.getModelMetrics().catch((e) => {
          console.warn('[ML] Error cargando modelo:', e);
          return null;
        }),
        authService.getUsers().catch((e) => {
          console.warn('[USERS] Error cargando usuarios:', e);
          return [];
        }),
        empresaService.getAll().catch((e) => {
          console.warn('[COMPANIES] Error cargando empresas:', e);
          return [];
        }),
        applicationsService.getAll().catch(() => []),
        vacanciesService.getAll().catch(() => []),
      ]);
      if (comp) setMetrics(comp);
      if (model) setMlInfo(model);
      setUsersList(users || []);
      setCompaniesList(companies || []);
      setApplicationsList(apps || []);
      setVacanciesList(vacs || []);
    } catch (err: any) {
      console.error('[GLOBAL_ADMIN] Error cargando datos:', err);
      showToast('Error', 'No se pudieron cargar los datos de administración global.', 'error');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRetrainModel = async () => {
    setIsRetraining(true);
    setTrainProgress(25);
    setCurrentEpoch(1);

    try {
      await mlService.retrainModel();
      setTrainProgress(80);
      const freshMetrics = await mlService.getModelMetrics();
      setMlInfo(freshMetrics);
      setTrainProgress(100);
      showToast(
        'Re-entrenamiento Real Completado',
        `Modelo entrenado en Python Scikit-Learn (${freshMetrics.algorithm}). Accuracy real: ${freshMetrics.accuracy}% | F1: ${freshMetrics.f1Score}%.`,
        'success'
      );
    } catch (err: any) {
      showToast(
        'Error al re-entrenar',
        err?.message || 'El microservicio Python de ML no respondió al re-entrenamiento.',
        'error'
      );
    } finally {
      setIsRetraining(false);
    }
  };

  const handleUploadDataset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!datasetFile) {
      showToast('Archivo requerido', 'Selecciona un dataset en formato CSV o JSON.', 'error');
      return;
    }
    setIsUploading(true);
    try {
      await mlService.uploadDataset(datasetFile);
      showToast('Dataset Cargado', `Dataset ${datasetFile.name} procesado y añadido a la base de conocimiento.`, 'success');
      setIsUploadOpen(false);
      setDatasetFile(null);
      loadData();
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName || !newCompEmail || !newCompAdmin) {
      showToast('Campos requeridos', 'Ingresa el nombre de la empresa, correo y nombre del administrador.', 'error');
      return;
    }
    setIsCreatingCompany(true);
    try {
      await empresaService.registerCompany({
        nombreEmpresa: newCompName,
        rif: newCompRif || 'J-99887766-0',
        dominio: newCompDomain || `${newCompName.toLowerCase().replace(/\s+/g, '')}.com`,
        adminName: newCompAdmin,
        adminEmail: newCompEmail,
        phone: newCompPhone || '+1 (809) 555-0100',
        password: newCompPassword,
      });

      // Recargar y auto-aprobar al registrar desde el panel de SuperAdmin para habilitar acceso inmediato
      const freshList = await empresaService.getAll().catch(() => []);
      const created = freshList.find(
        (c) => c.nombre.trim().toLowerCase() === newCompName.trim().toLowerCase()
      );
      if (created && created.estado === 'PENDIENTE_APROBACION') {
        await empresaService.approveCompany(created.id).catch((e) => {
          console.warn('[APPROVE] No se pudo auto-aprobar la empresa:', e);
        });
      }

      showToast(
        'Empresa Registrada y Habilitada',
        `La empresa "${newCompName}" y su administrador corporativo (${newCompEmail}) han sido dados de alta y habilitados exitosamente.`,
        'success'
      );

      setIsNewCompanyOpen(false);
      setNewCompName('');
      setNewCompRif('');
      setNewCompDomain('');
      setNewCompAdmin('');
      setNewCompEmail('');
      setNewCompPhone('');
      await loadData();
    } catch (err: any) {
      console.error('[REGISTER_COMPANY] Error al registrar empresa:', err);
      showToast('Error', err?.message || 'No se pudo registrar la empresa en el sistema.', 'error');
    } finally {
      setIsCreatingCompany(false);
    }
  };

  const handleApproveCompany = async (id: string, name: string) => {
    try {
      await empresaService.approveCompany(id);
      showToast(
        'Empresa Aprobada',
        `La empresa "${name}" ha sido aprobada. Su administrador corporativo ya puede ingresar al sistema.`,
        'success'
      );
      await loadData();
    } catch (err: any) {
      showToast('Error', err?.message || 'No se pudo aprobar la empresa.', 'error');
    }
  };

  const handleToggleCompanyStatus = async (id: string, activate: boolean, name: string) => {
    try {
      if (activate) {
        await empresaService.activateCompany(id);
        showToast('Empresa Activada', `La empresa "${name}" ha sido reactivada.`, 'success');
      } else {
        await empresaService.deactivateCompany(id, 'Pausada desde panel de SuperAdmin');
        showToast('Empresa Pausada', `El acceso de "${name}" ha sido suspendido.`, 'info');
      }
      await loadData();
    } catch (err: any) {
      showToast('Error', err?.message || 'No se pudo cambiar el estado de la empresa.', 'error');
    }
  };

  const handleSetCompanyDeadline = async (id: string, name: string, dateStr: string | null) => {
    try {
      const iso = dateStr ? new Date(`${dateStr}T23:59:59.000Z`).toISOString() : null;
      await api.patch(`/admin/companies/${id}/status`, { activaHasta: iso });
      showToast(
        iso ? 'Plazo de vigencia guardado' : 'Plazo eliminado',
        iso
          ? `La empresa "${name}" estará activa hasta el ${dateStr}.`
          : `La empresa "${name}" ya no tiene fecha de desactivación automática.`,
        'success'
      );
      await loadData();
    } catch (err: any) {
      showToast('Error', err?.message || 'No se pudo guardar el plazo de vigencia.', 'error');
    }
  };

  const rolePriority: Record<string, number> = {
    superadmin: 0,
    admin: 1,
    administrador: 1,
    rrhh: 2,
    candidato: 3,
  };

  // Filtered and hierarchy-sorted users (Superadmin -> Admin -> RRHH -> Candidato)
  const filteredUsers = usersList
    .filter((u) => {
      const resolvedComp = resolveUserCompanyInfo(u);
      const matchesSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (resolvedComp.name && resolvedComp.name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;
      const matchesCompany =
        selectedCompanyFilter === 'all' ||
        u.empresaId === selectedCompanyFilter ||
        resolvedComp.id === selectedCompanyFilter;

      return matchesSearch && matchesRole && matchesCompany;
    })
    .sort((a, b) => {
      const rankA = rolePriority[a.role] ?? 99;
      const rankB = rolePriority[b.role] ?? 99;
      if (rankA !== rankB) return rankA - rankB;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const sidebarSections: SidebarSection[] = [
    {
      title: 'GOBERNANZA GLOBAL',
      items: [
        { id: 'mlops', label: 'MLOps & Motor IA', icon: Brain },
        { id: 'companies', label: 'Empresas afiliadas', icon: Building2, badge: companiesList.length },
        { id: 'directory', label: 'Usuarios registrados', icon: Users, badge: usersList.length },
        { id: 'tickets', label: 'Tickets de Soporte', icon: LifeBuoy, badge: openTicketsCount || undefined },
      ],
    },
    {
      title: 'PORTAL',
      items: [
        { id: 'external-vacancies', label: 'Portal público', icon: ExternalLink, external: true },
      ],
    },
  ];

  const activeTitle =
    activeTab === 'mlops'
      ? 'MLOps & Entrenamiento de IA'
      : activeTab === 'companies'
      ? 'Directorio de Empresas'
      : activeTab === 'directory'
      ? 'Usuarios Registrados'
      : 'Tickets de Soporte & Quejas';

  if (user && user.role !== 'superadmin') {
    return null;
  }

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
        brandSubtitle="SUPERADMIN GLOBAL"
        crumbRoot="Administrador Global"
        title={activeTitle}
        roleLabel="Superadmin"
        onSupportClick={() => handleSwitchTab('tickets')}
        onLogout={() => {
          logout();
          onNavigate('login');
        }}
        onBrandClick={() => onNavigate('vacancies')}
      >
        <div className="w-full flex-1">
          {/* TAB 1: MLOPS & MOTOR DE IA GLOBAL */}
          {activeTab === 'mlops' && (
            <div className="animate-page-enter-left w-full flex-1 flex flex-col divide-y divide-slate-200/50 dark:divide-white/10">
            {/* Real ML Telemetry Banner (100% from Python ML Service + Neon DB) */}
            <section className="w-full p-6 sm:p-10 bg-white/15 dark:bg-transparent backdrop-blur-[2px] text-slate-900 dark:text-white space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-white/10">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-2 border border-emerald-500/30">
                    <Activity className="w-3.5 h-3.5" /> Métricas Reales del Motor de Machine Learning
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    Telemetría Real de Modelos Entrenados
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
                    Todos los indicadores provienen directamente de las evaluaciones reales del microservicio Python (Scikit-Learn) y registros de predicción en Neon PostgreSQL.
                  </p>
                </div>

                <TiltGlassCard
                  maxTiltDeg={3.5}
                  className={`px-5 py-3 rounded-2xl flex items-center gap-3 shrink-0 ${
                    mlInfo?.mlServiceOnline
                      ? '!border-emerald-500/30 !bg-emerald-500/10 dark:!bg-emerald-500/[0.08]'
                      : '!border-amber-500/30 !bg-amber-500/10 dark:!bg-amber-500/[0.08]'
                  }`}
                >
                  <Cpu
                    className={`w-7 h-7 relative z-10 ${
                      mlInfo?.mlServiceOnline
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  />
                  <div className="relative z-10">
                    <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300 block">
                      Estado del Microservicio ML
                    </span>
                    <span
                      className={`text-lg font-black ${
                        mlInfo?.mlServiceOnline
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {mlInfo?.mlServiceOnline ? 'En Línea · Modelo Activo' : 'Sin conexión / Sin entrenar'}
                    </span>
                  </div>
                </TiltGlassCard>
              </div>

              {/* 3 Real Telemetry Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <TiltGlassCard maxTiltDeg={3.5} className="p-5 rounded-2xl space-y-2">
                  <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block relative z-10">
                    ROC-AUC Real (Test Set)
                  </span>
                  <div className="flex items-baseline gap-2 relative z-10">
                    <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                      {mlInfo?.rocAuc ?? 0}%
                    </span>
                    {mlInfo?.rawMetrics?.baseline_cosine?.roc_auc != null && (
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        (Base coseno: {Math.round(mlInfo.rawMetrics.baseline_cosine.roc_auc * 1000) / 10}%)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 relative z-10">
                    Capacidad discriminativa real medida en validación sobre {mlInfo?.rawMetrics?.n_test ?? 0} pares de prueba.
                  </p>
                </TiltGlassCard>

                <TiltGlassCard maxTiltDeg={3.5} className="p-5 rounded-2xl space-y-2">
                  <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block relative z-10">
                    Predicciones ML Registradas
                  </span>
                  <div className="flex items-baseline gap-2 relative z-10">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">
                      {mlInfo?.totalPredictions ?? 0}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      inferencias reales
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 relative z-10">
                    Conteo exacto de evaluaciones en la tabla PrediccionML ({applicationsList.length} postulaciones totales en BD).
                  </p>
                </TiltGlassCard>

                <TiltGlassCard maxTiltDeg={3.5} className="p-5 rounded-2xl space-y-2">
                  <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block relative z-10">
                    Dataset de Entrenamiento
                  </span>
                  <div className="flex items-baseline gap-2 relative z-10">
                    <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                      {mlInfo?.datasetSize ?? 0}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      pares vacante-CV
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 relative z-10">
                    {mlInfo?.rawMetrics?.n_train ?? 0} entrenamiento · {mlInfo?.rawMetrics?.n_test ?? 0} prueba · {mlInfo?.totalDatasets ?? 0} datasets en BD.
                  </p>
                </TiltGlassCard>
              </div>
            </section>

            {/* MLOps Governance & Re-training Controls */}
            <section className="w-full p-6 sm:p-10 space-y-8 bg-white/15 dark:bg-transparent backdrop-blur-[2px]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-white/10">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                    <Cpu className="w-4 h-4 text-emerald-500" />
                    <span>Pipeline MLOps (Python Scikit-Learn + TF-IDF Vectorizer)</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                    Herramientas de Entrenamiento y Calibración del Modelo
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Ajuste de hiperparámetros, re-entrenamiento continuo y carga de datasets de conocimiento.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<UploadCloud className="w-4 h-4" />}
                    onClick={() => setIsUploadOpen(true)}
                    className="text-xs font-bold cursor-pointer backdrop-blur-md"
                  >
                    Cargar Nuevo Dataset
                  </Button>

                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<RefreshCw className={`w-4 h-4 ${isRetraining ? 'animate-spin' : ''}`} />}
                    onClick={handleRetrainModel}
                    isLoading={isRetraining}
                    className="text-xs font-bold cursor-pointer"
                  >
                    Re-entrenar Modelo Ahora
                  </Button>
                </div>
              </div>

              {/* Retrain Live Progress Bar */}
              {isRetraining && (
                <TiltGlassCard
                  maxTiltDeg={1.8}
                  className="p-5 rounded-2xl !border-emerald-500/40 space-y-3 animate-in fade-in"
                >
                  <div className="flex justify-between text-xs font-black text-emerald-800 dark:text-emerald-300 relative z-10">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                      Optimizando hiperparámetros y recalculando matrices (Época {currentEpoch}/{epochs})...
                    </span>
                    <span>{trainProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200/70 dark:bg-white/10 h-2.5 rounded-full overflow-hidden relative z-10">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${trainProgress}%` }}
                    />
                  </div>
                </TiltGlassCard>
              )}

              {/* 4 Model Performance Cards with Glass-Neumorphism & Minimal 3D Tilt */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <TiltGlassCard maxTiltDeg={3.5} className="p-5 rounded-2xl">
                  <span className="text-[11px] font-bold uppercase text-[#70553b] dark:text-slate-400 block relative z-10">Accuracy Global</span>
                  <span className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1 block relative z-10">
                    {mlInfo?.accuracy ?? 0}%
                  </span>
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold relative z-10">
                    {mlInfo?.isRealModel ? 'Medido en conjunto de prueba' : 'Sin modelo entrenado'}
                  </span>
                </TiltGlassCard>

                <TiltGlassCard maxTiltDeg={3.5} className="p-5 rounded-2xl">
                  <span className="text-[11px] font-bold uppercase text-[#70553b] dark:text-slate-400 block relative z-10">Precision</span>
                  <span className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1 block relative z-10">
                    {mlInfo?.precision ?? 0}%
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-400 relative z-10">
                    Exactitud sobre positivos predichos
                  </span>
                </TiltGlassCard>

                <TiltGlassCard maxTiltDeg={3.5} className="p-5 rounded-2xl">
                  <span className="text-[11px] font-bold uppercase text-[#70553b] dark:text-slate-400 block relative z-10">Recall</span>
                  <span className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1 block relative z-10">
                    {mlInfo?.recall ?? 0}%
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-400 relative z-10">
                    Sensibilidad de detección real
                  </span>
                </TiltGlassCard>

                <TiltGlassCard maxTiltDeg={3.5} className="p-5 rounded-2xl">
                  <span className="text-[11px] font-bold uppercase text-[#70553b] dark:text-slate-400 block relative z-10">F1-Score</span>
                  <span className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1 block relative z-10">
                    {mlInfo?.f1Score ?? 0}%
                  </span>
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold relative z-10">
                    Criterio de selección de modelo
                  </span>
                </TiltGlassCard>
              </div>

              {/* Comparativa Real de los Modelos de Scikit-Learn */}
              {mlInfo?.rawMetrics?.comparison && (
                <TiltGlassCard maxTiltDeg={1.2} className="p-6 rounded-3xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 relative z-10">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Comparativa Real de Modelos Entrenados (Scikit-Learn)</span>
                      </h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        Criterio real: {mlInfo.rawMetrics.selection_criterion || 'Mayor promedio F1 en validación cruzada'}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold">
                      Modelo ganador: {mlInfo.rawMetrics.selected_model || mlInfo.algorithm}
                    </span>
                  </div>

                  <div className="overflow-x-auto relative z-10">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200/70 dark:border-white/10 text-xs uppercase font-black text-slate-500 dark:text-slate-400">
                        <tr>
                          <th className="py-2.5 pr-4">Modelo</th>
                          <th className="py-2.5 px-3">CV F1 (5-Fold)</th>
                          <th className="py-2.5 px-3">CV ROC-AUC</th>
                          <th className="py-2.5 px-3">Test Accuracy</th>
                          <th className="py-2.5 px-3">Test Precision</th>
                          <th className="py-2.5 px-3">Test Recall</th>
                          <th className="py-2.5 px-3">Test F1</th>
                          <th className="py-2.5 pl-3">Test ROC-AUC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/50 dark:divide-white/10 font-mono">
                        {Object.entries(mlInfo.rawMetrics.comparison as Record<string, any>).map(([modelKey, data]) => {
                          const isSelected = mlInfo.rawMetrics?.selected_model === modelKey;
                          const cv = data?.cv_train || {};
                          const t = data?.test || {};
                          const pct = (v: any) => (typeof v === 'number' ? `${Math.round(v * 1000) / 10}%` : '—');
                          return (
                            <tr
                              key={modelKey}
                              className={isSelected ? 'bg-emerald-500/10 font-bold' : ''}
                            >
                              <td className="py-2.5 pr-4 font-sans font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <span>{modelKey.replace(/_/g, ' ')}</span>
                                {isSelected && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-xs uppercase font-black">
                                    Activo
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                                {cv.f1_mean != null ? `${Math.round(cv.f1_mean * 1000) / 10}% ± ${Math.round((cv.f1_std || 0) * 1000) / 10}%` : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{pct(cv.roc_auc_mean)}</td>
                              <td className="py-2.5 px-3 text-slate-900 dark:text-slate-100">{pct(t.accuracy)}</td>
                              <td className="py-2.5 px-3 text-slate-900 dark:text-slate-100">{pct(t.precision)}</td>
                              <td className="py-2.5 px-3 text-slate-900 dark:text-slate-100">{pct(t.recall)}</td>
                              <td className="py-2.5 px-3 text-emerald-700 dark:text-emerald-400 font-bold">{pct(t.f1)}</td>
                              <td className="py-2.5 pl-3 text-slate-900 dark:text-slate-100">{pct(t.roc_auc)}</td>
                            </tr>
                          );
                        })}
                        {mlInfo.rawMetrics.baseline_cosine && (
                          <tr className="text-slate-500 dark:text-slate-400">
                            <td className="py-2.5 pr-4 font-sans font-semibold italic">
                              Línea base coseno (umbral {mlInfo.rawMetrics.baseline_cosine.threshold})
                            </td>
                            <td className="py-2.5 px-3">—</td>
                            <td className="py-2.5 px-3">—</td>
                            <td className="py-2.5 px-3">{Math.round((mlInfo.rawMetrics.baseline_cosine.accuracy || 0) * 1000) / 10}%</td>
                            <td className="py-2.5 px-3">{Math.round((mlInfo.rawMetrics.baseline_cosine.precision || 0) * 1000) / 10}%</td>
                            <td className="py-2.5 px-3">{Math.round((mlInfo.rawMetrics.baseline_cosine.recall || 0) * 1000) / 10}%</td>
                            <td className="py-2.5 px-3">{Math.round((mlInfo.rawMetrics.baseline_cosine.f1 || 0) * 1000) / 10}%</td>
                            <td className="py-2.5 pl-3">{Math.round((mlInfo.rawMetrics.baseline_cosine.roc_auc || 0) * 1000) / 10}%</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </TiltGlassCard>
              )}

              {/* Hyperparameter Tuner & Ethical Audit Grid */}
              <TiltGlassCard
                maxTiltDeg={1.4}
                className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/70 dark:divide-white/10 rounded-3xl"
              >
                {/* Left: Hyperparameters Control */}
                <div className="lg:col-span-6 p-6 sm:p-8 space-y-4 bg-white/10 dark:bg-transparent relative z-10">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      Hiperparámetros del Modelo
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs pt-1">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Épocas de Entrenamiento
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={epochs}
                        onChange={(e) => setEpochs(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300/70 dark:border-white/10 bg-white/55 dark:bg-black/25 backdrop-blur-md text-slate-900 dark:text-slate-100 font-bold shadow-[inset_2px_2px_6px_rgba(15,23,42,0.08),inset_-2px_-2px_6px_rgba(255,255,255,0.65)] dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.55),inset_-1px_-1px_4px_rgba(255,255,255,0.06)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Batch Size
                      </label>
                      <input
                        type="number"
                        min="8"
                        max="128"
                        step="8"
                        value={batchSize}
                        onChange={(e) => setBatchSize(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300/70 dark:border-white/10 bg-white/55 dark:bg-black/25 backdrop-blur-md text-slate-900 dark:text-slate-100 font-bold shadow-[inset_2px_2px_6px_rgba(15,23,42,0.08),inset_-2px_-2px_6px_rgba(255,255,255,0.65)] dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.55),inset_-1px_-1px_4px_rgba(255,255,255,0.06)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Learning Rate
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={learningRate}
                        onChange={(e) => setLearningRate(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300/70 dark:border-white/10 bg-white/55 dark:bg-black/25 backdrop-blur-md text-slate-900 dark:text-slate-100 font-bold shadow-[inset_2px_2px_6px_rgba(15,23,42,0.08),inset_-2px_-2px_6px_rgba(255,255,255,0.65)] dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.55),inset_-1px_-1px_4px_rgba(255,255,255,0.06)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Umbral Afinidad (%)
                      </label>
                      <input
                        type="number"
                        min="50"
                        max="95"
                        value={thresholdTfIdf}
                        onChange={(e) => setThresholdTfIdf(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300/70 dark:border-white/10 bg-white/55 dark:bg-black/25 backdrop-blur-md text-slate-900 dark:text-slate-100 font-bold shadow-[inset_2px_2px_6px_rgba(15,23,42,0.08),inset_-2px_-2px_6px_rgba(255,255,255,0.65)] dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.55),inset_-1px_-1px_4px_rgba(255,255,255,0.06)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                    Arquitectura actual: <strong>{mlInfo?.algorithm || 'RandomForestClassifier'}</strong> con extracción semántica TF-IDF normalizada.
                  </p>
                </div>

                {/* Right: RNF03 Auditoría Ética */}
                <div className="lg:col-span-6 p-6 sm:p-8 space-y-4 bg-transparent flex flex-col justify-between relative z-10">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-extrabold text-sm uppercase tracking-wider">
                      <ShieldCheck className="w-5 h-5 text-emerald-500" />
                      <span>Auditoría Ética y Equidad Algorítmica (RNF03)</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      El microservicio de IA elimina de manera estricta cualquier variable demográfica protegida antes del scoring:
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <span className="px-3 py-1.5 bg-emerald-500/10 dark:bg-emerald-500/15 backdrop-blur-md text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/25">
                        ✓ Género excluido
                      </span>
                      <span className="px-3 py-1.5 bg-emerald-500/10 dark:bg-emerald-500/15 backdrop-blur-md text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/25">
                        ✓ Edad excluida
                      </span>
                      <span className="px-3 py-1.5 bg-emerald-500/10 dark:bg-emerald-500/15 backdrop-blur-md text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/25">
                        ✓ Fotografía / Estado Civil excluido
                      </span>
                      <span className="px-3 py-1.5 bg-emerald-500/10 dark:bg-emerald-500/15 backdrop-blur-md text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/25">
                        ✓ Inferencia ciega por competencias
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/45 dark:bg-black/25 backdrop-blur-md border border-slate-300/60 dark:border-white/10 shadow-[inset_2px_2px_6px_rgba(15,23,42,0.06),inset_-2px_-2px_6px_rgba(255,255,255,0.6)] dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.45),inset_-1px_-1px_4px_rgba(255,255,255,0.05)] text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
                    <span>Dataset Activo: {mlInfo?.datasetSize} CVs estructurados</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">Verificado</span>
                  </div>
                </div>
              </TiltGlassCard>
            </section>
            </div>
          )}

          {/* TAB 2: DIRECTORIO DE TODAS LAS EMPRESAS (MULTI-EMPRESA) */}
          {activeTab === 'companies' && (
            <div className="animate-page-enter-left w-full flex-1 flex flex-col divide-y-2 divide-[#c8b193] dark:divide-[#4d3c2e]">
            {/* Header de Empresas y Botón Registrar */}
            <div className="w-full p-6 sm:p-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#faf7f2]/70 dark:bg-slate-900">
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                  Directorio Global de Empresas Afiliadas
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                  Como Administrador Global, puedes auditar todas las empresas participantes y dar de alta nuevas organizaciones directamente.
                </p>
              </div>

              {/* Botón Destacado: Lugar 2 de Registro de Empresa */}
              <Button
                size="md"
                variant="primary"
                leftIcon={<PlusCircle className="w-5 h-5" />}
                onClick={() => setIsNewCompanyOpen(true)}
                className="font-bold text-xs sm:text-sm px-5 py-2.5 cursor-pointer"
              >
                + Registrar Nueva Empresa
              </Button>
            </div>

            {/* Grid of Companies with Shared Borders (Transparent background to reveal particles) */}
            <div className="w-full p-6 sm:p-10 bg-transparent">
              {companiesList.length === 0 ? (
                <div className="w-full p-12 text-center rounded-2xl border-2 border-dashed border-[#c8b193] dark:border-[#4d3c2e] bg-[#faf7f2]/50 dark:bg-slate-800/30">
                  <Building2 className="w-12 h-12 mx-auto text-[#70553b] dark:text-slate-400 mb-3 opacity-60" />
                  <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">No hay empresas registradas aún</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-4">
                    La plataforma se encuentra en estado limpio. Haz clic en el botón superior para dar de alta la primera empresa u organización.
                  </p>
                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<PlusCircle className="w-4 h-4" />}
                    onClick={() => setIsNewCompanyOpen(true)}
                    className="font-bold text-xs"
                  >
                    + Registrar Nueva Empresa
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                  {companiesList.map((comp) => {
                    const isPending = comp.estado === 'PENDIENTE_APROBACION';
                    const isSuspended = comp.estado === 'SUSPENDIDA';
                    const isActive = comp.activa || comp.estado === 'ACTIVA';

                    const companyStats = getCompanyAnalytics(comp.id, comp.nombre);
                    const matchedAdminCount = usersList.filter((u) => {
                      if (u.role !== 'admin') return false;
                      const info = resolveUserCompanyInfo(u);
                      const uId = info.id || u.empresaId || u.companyId;
                      if (uId && uId === comp.id) return true;
                      const uName = (info.name || '').trim().toLowerCase();
                      const cName = (comp.nombre || '').trim().toLowerCase();
                      return Boolean(uName && cName && (uName === cName || uName.includes(cName) || cName.includes(uName)));
                    }).length;
                    const adminCount = Math.max(matchedAdminCount, comp.adminsCount ?? 0);
                    const hrCount = companyStats.companyHRCount;

                    return (
                      <div
                        key={comp.id}
                        className="bg-[#fcfaf6] dark:bg-slate-800/60 border-2 border-[#c8b193] dark:border-[#4d3c2e] rounded-2xl p-6 space-y-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all"
                      >
                        <div className="space-y-3.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white font-black text-base flex items-center justify-center shadow-xs shrink-0">
                              {comp.nombre.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              {isPending && (
                                <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-300 dark:border-amber-700">
                                  Pendiente de Aprobación
                                </span>
                              )}
                              {isActive && (
                                <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                                  Empresa Activa
                                </span>
                              )}
                              {isSuspended && (
                                <span className="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-800">
                                  Suspendida
                                </span>
                              )}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-black text-slate-900 dark:text-slate-100 text-lg leading-tight">
                              {comp.nombre}
                            </h4>
                            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                              {comp.dominio || 'dominio.com'}
                            </p>
                            {comp.rif && (
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                                RIF: {comp.rif}
                              </p>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {comp.descripcion || 'Empresa participante en el proceso de reclutamiento inteligente.'}
                          </p>
                        </div>

                        {/* Afiliados y Métricas de la Empresa */}
                        <div className="pt-3 border-t border-[#c8b193]/60 dark:border-[#4d3c2e]/60 space-y-2 text-xs">
                          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 font-medium">
                            <span>Reclutadores de RRHH:</span>
                            <strong className="text-slate-900 dark:text-slate-100">
                              {hrCount} {hrCount === 1 ? 'miembro' : 'miembros'}
                            </strong>
                          </div>
                          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 font-medium">
                            <span>Admins Corporativos:</span>
                            <strong className="text-slate-900 dark:text-slate-100">
                              {adminCount} {adminCount === 1 ? 'asignado' : 'asignados'}
                            </strong>
                          </div>
                          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                            <span>Alta: {new Date(comp.creadoEn).toLocaleDateString()}</span>
                            <span className="text-emerald-600 font-bold">Estado: {comp.estado || 'ACTIVA'}</span>
                          </div>

                          {/* Plazo de desactivación automática (Superadmin) */}
                          <div className="pt-2 border-t border-[#c8b193]/40 dark:border-[#4d3c2e]/40 space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                              <span>Plazo de vigencia (opcional):</span>
                              {(comp as any).activaHasta && (
                                <span className="text-amber-700 dark:text-amber-400 font-mono">
                                  Hasta {new Date((comp as any).activaHasta).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="date"
                                value={
                                  deadlineDrafts[comp.id] ??
                                  ((comp as any).activaHasta
                                    ? new Date((comp as any).activaHasta).toISOString().slice(0, 10)
                                    : '')
                                }
                                onChange={(e) =>
                                  setDeadlineDrafts((prev) => ({ ...prev, [comp.id]: e.target.value }))
                                }
                                className="flex-1 min-w-0 px-2 py-1 rounded-lg text-[11px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleSetCompanyDeadline(
                                    comp.id,
                                    comp.nombre,
                                    deadlineDrafts[comp.id] ||
                                      ((comp as any).activaHasta
                                        ? new Date((comp as any).activaHasta).toISOString().slice(0, 10)
                                        : null)
                                  )
                                }
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shrink-0"
                              >
                                Fijar
                              </button>
                              {(comp as any).activaHasta && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeadlineDrafts((prev) => ({ ...prev, [comp.id]: '' }));
                                    handleSetCompanyDeadline(comp.id, comp.nombre, null);
                                  }}
                                  className="px-2 py-1 rounded-lg text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 cursor-pointer shrink-0"
                                  title="Quitar plazo"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Acciones de SuperAdmin para Empresas Pendientes o Activas */}
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<Eye className="w-4 h-4" />}
                            onClick={() => setViewingCompanyId(comp.id)}
                            className="w-full font-bold text-xs mt-3 cursor-pointer"
                          >
                            Ver Perfil (Solo lectura)
                          </Button>
                          {isPending && (
                            <Button
                              size="sm"
                              variant="primary"
                              leftIcon={<CheckCircle2 className="w-4 h-4" />}
                              onClick={() => handleApproveCompany(comp.id, comp.nombre)}
                              className="w-full font-bold text-xs mt-3 bg-amber-500 hover:bg-amber-400 border border-amber-600 text-slate-950 shadow-[0_4px_0_#92400e] hover:shadow-[0_5px_0_#92400e] cursor-pointer"
                            >
                              Aprobar y Habilitar Acceso
                            </Button>
                          )}
                          {isActive && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleToggleCompanyStatus(comp.id, false, comp.nombre)}
                              className="w-full font-bold text-xs mt-3 text-white dark:text-white hover:text-rose-100 cursor-pointer"
                            >
                              Pausar Acceso
                            </Button>
                          )}
                          {isSuspended && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleToggleCompanyStatus(comp.id, true, comp.nombre)}
                              className="w-full font-bold text-xs mt-3 cursor-pointer"
                            >
                              Reactivar Empresa
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            </div>
          )}

          {/* TAB 3: USUARIOS REGISTRADOS */}
          {activeTab === 'directory' && (
            <div className="animate-page-enter-left w-full flex-1 flex flex-col divide-y-2 divide-[#c8b193] dark:divide-[#4d3c2e]">
            {/* Header and Search Filters */}
            <div className="w-full p-6 sm:p-10 space-y-4 bg-[#faf7f2]/70 dark:bg-slate-900">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Users className="w-6 h-6 text-emerald-600" />
                    <span>Usuarios Registrados</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Visualiza y gestiona todos los administradores de empresa, reclutadores de RRHH y candidatos registrados en el ecosistema.
                  </p>
                </div>

                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {filteredUsers.length} usuarios filtrados
                </span>
              </div>

              {/* Filters Bar */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o correo..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full min-h-[42px] pl-9 pr-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsDirectoryFiltersOpen((prev) => !prev)}
                    className="sm:hidden inline-flex items-center justify-between gap-2 min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 cursor-pointer"
                    aria-expanded={isDirectoryFiltersOpen}
                  >
                    <span className="inline-flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Filtros (Rol / Empresa)</span>
                    </span>
                    {isDirectoryFiltersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                <div className={`${isDirectoryFiltersOpen ? 'grid' : 'hidden sm:grid'} grid-cols-1 sm:grid-cols-2 gap-3`}>
                  <div>
                    <select
                      value={selectedRoleFilter}
                      onChange={(e) => setSelectedRoleFilter(e.target.value)}
                      className="w-full min-h-[42px] px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold"
                    >
                      <option value="all">Todos los Roles</option>
                      <option value="superadmin">Superadmin Global</option>
                      <option value="admin">Admin Empresa (Local)</option>
                      <option value="rrhh">Recursos Humanos (RRHH)</option>
                      <option value="candidato">Candidatos</option>
                    </select>
                  </div>

                  <div>
                    <select
                      value={selectedCompanyFilter}
                      onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                      className="w-full min-h-[42px] px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold"
                    >
                      <option value="all">Todas las Empresas</option>
                      {companiesList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Stacked Cards (md:hidden) */}
            <div className="md:hidden p-4 space-y-3 bg-white/45 dark:bg-[#0B0E14]/45">
              {filteredUsers.map((usr) => {
                const userCompanyInfo = resolveUserCompanyInfo(usr);
                const userCompany = userCompanyInfo.name;
                const isSelf = (usr.email || '').toLowerCase().trim() === (user?.email || '').toLowerCase().trim();
                const isCompanyAdmin = usr.role === 'admin';
                const isDetailsOpen = expandedDirectoryUserId === usr.id;
                const analytics = isCompanyAdmin ? getCompanyAnalytics(userCompanyInfo.id, userCompany) : null;

                return (
                  <div
                    key={usr.id}
                    className="rounded-2xl border border-[#c8b193]/60 dark:border-white/15 bg-white/80 dark:bg-slate-900/75 p-4 space-y-3 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {usr.avatar || usr.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{usr.name}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 font-mono truncate">{usr.email}</p>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold border ${
                          usr.role === 'superadmin'
                            ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300'
                            : usr.role === 'admin'
                            ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300'
                            : usr.role === 'rrhh'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300'
                        }`}
                      >
                        {usr.role === 'superadmin'
                          ? 'Admin Global'
                          : usr.role === 'admin'
                          ? 'Admin Empresa'
                          : usr.role === 'rrhh'
                          ? 'RRHH'
                          : 'Candidato'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-600 dark:text-slate-300 truncate">
                        {userCompany ? `Empresa: ${userCompany}` : 'Ecosistema Global'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedDirectoryUserId(isDetailsOpen ? null : usr.id)}
                        className="inline-flex items-center gap-1.5 min-h-[42px] px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 cursor-pointer shrink-0"
                        aria-expanded={isDetailsOpen}
                      >
                        <span>{isDetailsOpen ? 'Ocultar detalles' : 'Ver detalles'}</span>
                        {isDetailsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {isDetailsOpen && (
                      <div className="pt-3 border-t border-slate-200/70 dark:border-white/10 space-y-3 text-xs">
                        <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                          <div>
                            <span className="font-bold block text-slate-500 dark:text-slate-400">Teléfono</span>
                            <span className="font-mono">{usr.phone || 'No registrado'}</span>
                          </div>
                          <div>
                            <span className="font-bold block text-slate-500 dark:text-slate-400">Fecha de Alta</span>
                            <span>{new Date(usr.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {analytics && (
                          <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 space-y-1.5">
                            <p className="font-bold text-slate-800 dark:text-slate-100">
                              Estadísticas de {analytics.companyName}
                            </p>
                            <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-300">
                              <span>Postulaciones: <strong>{analytics.companyApplicationsCount}</strong></span>
                              <span>RRHH: <strong>{analytics.companyHRCount}</strong></span>
                              <span>Contratados: <strong>{analytics.companyHiredCount}</strong></span>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setViewingUserId(usr.id)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold border bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver perfil</span>
                          </button>

                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => {
                                setUserToDelete(usr);
                                setIsDeleteUserModalOpen(true);
                              }}
                              className="inline-flex items-center justify-center gap-1.5 min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 dark:text-white bg-rose-50 hover:bg-rose-100 dark:bg-rose-600 dark:hover:bg-rose-500 border border-rose-300 dark:border-rose-500 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Eliminar</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Table of Users (Desktop md+) */}
            <div className="hidden md:block w-full overflow-x-auto bg-white/55 dark:bg-[#0B0E14]/45 backdrop-blur-xl">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead className="bg-[#fcfaf6]/70 dark:bg-white/[0.04] backdrop-blur-md border-b border-[#c8b193]/60 dark:border-white/10 text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Usuario</th>
                    <th className="px-6 py-4">Correo</th>
                    <th className="px-6 py-4">Empresa Afiliada</th>
                    <th className="px-6 py-4">Rol Asignado</th>
                    <th className="px-6 py-4">Teléfono</th>
                    <th className="px-6 py-4">Fecha de Alta</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c8b193]/40 dark:divide-white/10">
                  {filteredUsers.map((usr) => {
                    const userCompanyInfo = resolveUserCompanyInfo(usr);
                    const userCompany = userCompanyInfo.name;
                    const isSelf = (usr.email || '').toLowerCase().trim() === (user?.email || '').toLowerCase().trim();
                    const isCompanyAdmin = usr.role === 'admin';
                    const isExpanded = isCompanyAdmin && !!expandedAdminIds[usr.id];

                    const analytics = isCompanyAdmin
                      ? getCompanyAnalytics(userCompanyInfo.id, userCompany)
                      : null;

                    const pageAppsBaseline = analytics
                      ? Math.max(analytics.totalPageApplications, analytics.totalPageCandidates)
                      : 0;
                    const appsPct =
                      analytics && pageAppsBaseline > 0
                        ? Math.round((analytics.companyApplicationsCount / pageAppsBaseline) * 100)
                        : 0;
                    const hrBaseline = analytics
                      ? Math.max(analytics.totalPageHR, analytics.companyHRCount)
                      : 0;
                    const hrPct =
                      analytics && hrBaseline > 0
                        ? Math.round((analytics.companyHRCount / hrBaseline) * 100)
                        : 0;
                    const hiredPct =
                      analytics && analytics.totalPageCandidates > 0
                        ? Math.round((analytics.companyHiredCount / analytics.totalPageCandidates) * 100)
                        : 0;

                    return (
                      <React.Fragment key={usr.id}>
                        <tr className="hover:bg-[#faf7f2]/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {usr.avatar || usr.name.slice(0, 2).toUpperCase()}
                            </div>
                            <span>{usr.name}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-mono text-xs">
                            {usr.email}
                          </td>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-200 font-medium">
                            {userCompany ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold">
                                <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>{userCompany}</span>
                                {usr.role === 'candidato' && (
                                  <span className="ml-1 text-xs font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                                    Contratado
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 italic">Ecosistema Global</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                                usr.role === 'superadmin'
                                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300'
                                  : usr.role === 'admin'
                                  ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300'
                                  : usr.role === 'rrhh'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300'
                              }`}
                            >
                              {usr.role === 'superadmin'
                                ? 'Admin Global'
                                : usr.role === 'admin'
                                ? 'Admin Empresa'
                                : usr.role === 'rrhh'
                                ? 'Recursos Humanos'
                                : 'Candidato'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">
                            {usr.phone || 'No registrado'}
                          </td>
                          <td className="px-6 py-4 text-slate-500 text-[11px]">
                            {new Date(usr.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setViewingUserId(usr.id)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 transition-all cursor-pointer"
                                title={`Ver perfil completo de ${usr.name} (solo lectura)`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Ver perfil</span>
                              </button>

                              {isCompanyAdmin && (
                                <button
                                  type="button"
                                  onClick={() => toggleAdminExpand(usr.id)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                    isExpanded
                                      ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-400/60'
                                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                                  }`}
                                  title="Ver más información estadística de la empresa"
                                >
                                  <span>{isExpanded ? 'Ocultar' : 'Ver más'}</span>
                                  <ChevronRight
                                    className={`w-3.5 h-3.5 transition-transform duration-300 ease-out ${
                                      isExpanded ? 'rotate-90 text-sky-400' : 'rotate-0'
                                    }`}
                                  />
                                </button>
                              )}

                              {isSelf ? (
                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 italic px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md">
                                  Tú (Superadmin)
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setUserToDelete(usr);
                                    setIsDeleteUserModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-rose-600 dark:text-white bg-rose-50 hover:bg-rose-100 dark:bg-rose-600 dark:hover:bg-rose-500 border border-rose-300 dark:border-rose-500 shadow-[0_3px_0_#881337] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
                                  title={`Eliminar usuario ${usr.name}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {isCompanyAdmin && analytics && (
                          <tr className="bg-transparent">
                            <td colSpan={7} className="p-0 border-0">
                              <div
                                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                                  isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                                }`}
                              >
                                <div className="overflow-hidden">
                                  <div
                                    className={`w-full grid grid-cols-1 lg:grid-cols-2 lg:divide-x divide-y lg:divide-y-0 divide-slate-200/60 dark:divide-white/10 bg-white/55 dark:bg-white/[0.04] backdrop-blur-xl border-y border-white/40 dark:border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_32px_rgba(0,0,0,0.28)] transition-transform duration-300 ease-out ${
                                      isExpanded ? 'translate-y-0' : '-translate-y-4'
                                    }`}
                                  >
                                    {/* Izquierda: Estadística de Círculos por Capas de Cebolla (centro vacío) */}
                                    <div className="flex flex-col sm:flex-row items-center gap-6 px-6 py-5 h-full">
                                      <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
                                        <svg viewBox="0 0 180 180" className="w-40 h-40 -rotate-90">
                                          {[
                                            {
                                              r: 72,
                                              pct: appsPct,
                                              stroke: '#1d4ed8',
                                              track: 'rgba(29, 78, 216, 0.22)',
                                            },
                                            {
                                              r: 53,
                                              pct: hrPct,
                                              stroke: '#a855f7',
                                              track: 'rgba(168, 85, 247, 0.22)',
                                            },
                                            {
                                              r: 34,
                                              pct: hiredPct,
                                              stroke: '#10b981',
                                              track: 'rgba(16, 185, 129, 0.22)',
                                            },
                                          ].map((ring, rIdx) => {
                                            const circ = 2 * Math.PI * ring.r;
                                            const activePct = isExpanded ? ring.pct : 0;
                                            const offset = circ - (circ * Math.min(100, Math.max(0, activePct))) / 100;
                                            return (
                                              <g key={rIdx}>
                                                <circle
                                                  cx="90"
                                                  cy="90"
                                                  r={ring.r}
                                                  fill="none"
                                                  stroke={ring.track}
                                                  strokeWidth="12"
                                                />
                                                <circle
                                                  cx="90"
                                                  cy="90"
                                                  r={ring.r}
                                                  fill="none"
                                                  stroke={ring.stroke}
                                                  strokeWidth="12"
                                                  strokeLinecap="round"
                                                  strokeDasharray={circ}
                                                  strokeDashoffset={offset}
                                                  className="transition-[stroke-dashoffset] duration-700 ease-out"
                                                />
                                              </g>
                                            );
                                          })}
                                        </svg>
                                      </div>

                                      <div className="space-y-3 flex-1 w-full">
                                        <div>
                                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                            <Layers className="w-3.5 h-3.5 text-purple-400" />
                                            <span>Participación por Capas vs Total de la Página</span>
                                          </h4>
                                          <p className="text-[11px] text-slate-600 dark:text-slate-300/80">
                                            Comparativa concéntrica de {analytics.companyName} frente al ecosistema completo.
                                          </p>
                                        </div>

                                        <div className="space-y-2.5 text-[11px]">
                                          <div className="flex items-center justify-between gap-3">
                                            <span className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                                              <span className="w-2.5 h-2.5 rounded-full bg-blue-700 shrink-0" />
                                              Capa Exterior · Postulaciones
                                            </span>
                                            <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
                                              {analytics.companyApplicationsCount} / {pageAppsBaseline} ({appsPct}%)
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between gap-3">
                                            <span className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                                              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                                              Capa Media · Recursos Humanos
                                            </span>
                                            <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                                              {analytics.companyHRCount} / {hrBaseline} ({hrPct}%)
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between gap-3">
                                            <span className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                                              Capa Interna · Contratados
                                            </span>
                                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                              {analytics.companyHiredCount} / {analytics.totalPageCandidates} ({hiredPct}%)
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Derecha: Resumen Operativo Glassmorphic enfocado en Trabajadores RRHH afiliados */}
                                    <div className="flex flex-col justify-between h-full bg-white/30 dark:bg-white/[0.02]">
                                      <div className="px-6 py-3 bg-white/40 dark:bg-white/[0.04] border-b border-slate-200/60 dark:border-white/10 flex items-center justify-between">
                                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-100">
                                          Resumen Operativo · {analytics.companyName}
                                        </span>
                                        <span className="text-xs font-mono text-slate-500 dark:text-slate-300">
                                          Admin: {usr.name}
                                        </span>
                                      </div>
                                      <div className="px-6 py-5 flex-1 flex flex-col justify-center space-y-3">
                                        <div className="flex items-center justify-between text-xs">
                                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                                            Trabajadores de RRHH Afiliados
                                          </span>
                                          <span className="font-mono font-black text-purple-600 dark:text-purple-400 text-sm">
                                            {analytics.companyHRCount} {analytics.companyHRCount === 1 ? 'trabajador' : 'trabajadores'}
                                          </span>
                                        </div>
                                        {analytics.companyHRWorkers.length > 0 && (
                                          <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex flex-wrap items-center gap-1.5">
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">Equipo RRHH:</span>
                                            {analytics.companyHRWorkers.map((hr) => (
                                              <span
                                                key={hr.id}
                                                className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 backdrop-blur-sm"
                                              >
                                                {hr.name}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </div>
          )}

          {/* TAB 4: TICKETS DE SOPORTE & QUEJAS */}
          {activeTab === 'tickets' && (
            <div className="animate-page-enter-left w-full flex-1 flex flex-col">
              <SuperadminTicketsPanel />
            </div>
          )}
        </div>
      </AppShell>

      {/* MODAL 1: REGISTRAR NUEVA EMPRESA (LUGAR 2 DE REGISTRO) */}
      <Modal
        isOpen={isNewCompanyOpen}
        onClose={() => setIsNewCompanyOpen(false)}
        title="Alta Administrativa de Empresa (Multi-Tenant)"
        subtitle="Registro directo de organizaciones y generación de credenciales del Administrador Corporativo."
        maxWidth="lg"
        variant="manila"
      >
        <form onSubmit={handleCreateCompany} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Nombre Comercial de la Empresa *"
              placeholder="Ej: Innova Cloud Tech S.A."
              value={newCompName}
              onChange={(e) => setNewCompName(e.target.value)}
              required
            />
            <Input
              label="RIF / Cédula Jurídica *"
              placeholder="J-40192837-1"
              value={newCompRif}
              onChange={(e) => setNewCompRif(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Dominio Web Corporativo"
              placeholder="innovacloud.com"
              value={newCompDomain}
              onChange={(e) => setNewCompDomain(e.target.value)}
            />
            <Input
              label="Teléfono Corporativo"
              placeholder="+1 (809) 555-0155"
              value={newCompPhone}
              onChange={(e) => setNewCompPhone(e.target.value)}
            />
          </div>

          <div className="p-4 rounded-2xl bg-[#faf7f2] dark:bg-slate-800/60 border border-[#c8b193]/60 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>Administrador Corporativo Asignado</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nombre del Administrador *"
                placeholder="Ing. Sofía Velásquez"
                value={newCompAdmin}
                onChange={(e) => setNewCompAdmin(e.target.value)}
                required
              />
              <Input
                label="Correo Corporativo *"
                type="email"
                placeholder="sofia.admin@empresa.com"
                value={newCompEmail}
                onChange={(e) => setNewCompEmail(e.target.value)}
                required
              />
            </div>
            <Input
              label="Contraseña Inicial Asignada"
              type="text"
              value={newCompPassword}
              onChange={(e) => setNewCompPassword(e.target.value)}
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsNewCompanyOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isCreatingCompany}
              className="font-bold px-6"
            >
              Dar de Alta Empresa
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: CARGAR DATASET PARA ENTRENAMIENTO MLOPS */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Alimentar Pipeline de Entrenamiento con Nuevo Dataset"
        subtitle="Carga de datos curriculares estructurados para re-entrenar el clasificador Scikit-Learn."
        maxWidth="md"
        variant="manila"
      >
        <form onSubmit={handleUploadDataset} className="space-y-4 pt-1">
          <div className="p-6 border-2 border-dashed border-[#c8b193] dark:border-slate-700 rounded-2xl text-center space-y-3 bg-[#faf7f2] dark:bg-slate-800/40">
            <UploadCloud className="w-10 h-10 mx-auto text-emerald-600" />
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Selecciona archivo CSV o JSON con historial de evaluaciones
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Columnas requeridas: habilidades, experiencia_meses, grado_academico, score_final
              </p>
            </div>
            <input
              type="file"
              accept=".csv,.json"
              onChange={(e) => setDatasetFile(e.target.files?.[0] || null)}
              className="text-xs"
            />
          </div>

          <div className="flex justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsUploadOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isUploading}
              disabled={!datasetFile}
              className="font-bold px-5"
            >
              Procesar Dataset
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: CONFIRMAR ELIMINACIÓN DE USUARIO (SUPERADMIN) */}
      <Modal
        isOpen={isDeleteUserModalOpen}
        onClose={() => {
          if (!isDeletingUser) {
            setIsDeleteUserModalOpen(false);
            setUserToDelete(null);
          }
        }}
        title="Eliminar Usuario del Sistema"
        subtitle="Confirmación de revocación de cuenta y eliminación de registros."
        maxWidth="md"
        variant="manila"
      >
        <div className="space-y-4 pt-1">
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold text-rose-900 dark:text-rose-200 block">
                ¿Estás seguro de que deseas eliminar a este usuario?
              </span>
              <p className="text-rose-700 dark:text-rose-300 leading-relaxed">
                Esta acción revocará de inmediato las credenciales y el acceso a la plataforma para{' '}
                <strong className="font-bold">{userToDelete?.name}</strong> ({userToDelete?.email}).
              </p>
            </div>
          </div>

          {userToDelete && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Rol:</span>
                <span className="font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  {userToDelete.role}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Empresa:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {resolveUserCompany(userToDelete) || 'Ecosistema Global'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Correo:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {userToDelete.email}
                </span>
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2.5 border-t border-[#c8b193]/30 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeletingUser}
              onClick={() => {
                setIsDeleteUserModalOpen(false);
                setUserToDelete(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              isLoading={isDeletingUser}
              onClick={handleConfirmDeleteUser}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 shadow-[0_4px_0_#9f1239]"
            >
              Eliminar Usuario
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Perfil Público de Empresa (Solo lectura para Superadmin) */}
      <CompanyPublicProfileModal
        companyId={viewingCompanyId}
        isOpen={Boolean(viewingCompanyId)}
        onClose={() => setViewingCompanyId(null)}
      />

      {/* Modal de Perfil de Usuario / Candidato (Solo lectura para Superadmin) */}
      <UserProfileReadOnlyModal
        userId={viewingUserId}
        isOpen={Boolean(viewingUserId)}
        onClose={() => setViewingUserId(null)}
        onViewCompany={(cid) => {
          setViewingUserId(null);
          setViewingCompanyId(cid);
        }}
      />
    </div>
  );
};
