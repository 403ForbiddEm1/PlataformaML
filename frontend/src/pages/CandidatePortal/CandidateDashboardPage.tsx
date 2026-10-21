import React, { useEffect, useState } from 'react';
import { Application, ApplicationStatus, CandidateProfile, Vacancy, NotificationItem } from '@/types';
import { applicationsService } from '@/services/applications.service';
import { candidatesService } from '@/services/candidates.service';
import { vacanciesService } from '@/services/vacancies.service';
import { notificationsService } from '@/services/notifications.service';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ApplicationDetailModal } from '@/components/applications/ApplicationDetailModal';
import { MLExplainabilityModal } from '@/components/ml/MLExplainabilityModal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  User,
  Search,
  Bell,
  ChevronRight,
  LogOut,
  HelpCircle,
  Mail,
  MessageSquare,
  BarChart3,
  Database,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Plus,
  Shield,
  FileText,
} from 'lucide-react';

interface CandidateDashboardPageProps {
  onNavigate: (view: string) => void;
  onApplyVacancy: (vacancy: Vacancy) => void;
}

export const CandidateDashboardPage: React.FC<CandidateDashboardPageProps> = ({
  onNavigate,
  onApplyVacancy,
}) => {
  const { user, logout, switchRoleDemo } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'applications' | 'profile' | 'vacancies' | 'notifications'>(
    'applications'
  );

  const [applications, setApplications] = useState<Application[]>([]);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Modals state
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isExplainOpen, setIsExplainOpen] = useState(false);

  // Profile edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editSkills, setEditSkills] = useState('');

  const loadData = async () => {
    try {
      const email = user?.email || 'valeria.mendoza@correo.com';
      const [apps, prof, vacs, notifs] = await Promise.all([
        applicationsService.getByCandidateEmail(email),
        candidatesService.getProfile(),
        vacanciesService.getAll(),
        notificationsService.getNotifications(),
      ]);
      setApplications(apps);
      setProfile(prof);
      setEditBio(prof.bio);
      setEditSkills(prof.skills.join(', '));
      setVacancies(vacs);
      setNotifications(notifs);
    } catch {
      showToast('Error', 'No se pudieron cargar los datos del portal.', 'error');
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const filteredApplications = applications.filter((app) => {
    if (statusFilter === 'todos') return true;
    return app.status.toLowerCase() === statusFilter.toLowerCase();
  });

  const activeCount = applications.length;
  const preselectedCount = applications.filter((a) => a.status === 'Preseleccionado').length;
  const inReviewCount = applications.filter((a) => a.status === 'En revisión').length;

  const handleSaveProfile = async () => {
    try {
      const updated = await candidatesService.updateProfile({
        bio: editBio,
        skills: editSkills.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setProfile(updated);
      setIsEditingProfile(false);
      showToast('Perfil actualizado', 'Tus datos estructurados se guardaron con éxito (RF05).', 'success');
    } catch {
      showToast('Error', 'No se pudo actualizar el perfil.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left Sidebar (Exact layout from Screenshot 6) */}
        <aside className="w-full md:w-64 bg-white border-r border-slate-200/90 flex flex-col shrink-0">
          {/* Brand header */}
          <div
            onClick={() => onNavigate('home')}
            className="p-6 border-b border-slate-100 flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/30 group-hover:bg-emerald-600 transition-colors">
              <svg
                className="w-5 h-5"
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
              <span className="font-extrabold text-slate-900 tracking-tight text-base leading-tight">
                Nexo Tecnología
              </span>
              <span className="text-[9px] tracking-wider font-semibold text-emerald-600 uppercase">
                PORTAL DE TALENTO
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="p-4 flex-1 space-y-6">
            <div>
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                MI ESPACIO
              </p>
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('applications')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'applications'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Briefcase className="w-4 h-4 text-emerald-600" />
                    <span>Mis Postulaciones</span>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {applications.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'profile'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Mi perfil</span>
                </button>

                <button
                  onClick={() => setActiveTab('vacancies')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'vacancies'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  <span>Explorar vacantes</span>
                </button>

                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'notifications'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4" />
                    <span>Notificaciones</span>
                  </div>
                  {notifications.length > 0 && (
                    <span className="bg-sky-100 text-sky-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {notifications.length}
                    </span>
                  )}
                </button>
              </nav>
            </div>

            {/* Help Card (Screenshot 6) */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                <HelpCircle className="w-4 h-4 text-emerald-600" />
                <span>Estamos para ayudarte</span>
              </div>
              <p className="text-slate-500 leading-snug">
                Resuelve tus dudas sobre el proceso de selección.
              </p>
              <button
                onClick={() =>
                  alert('Soporte Nexo: Canal de contacto disponible vía WhatsApp al +1 (809) 555-0199')
                }
                className="text-emerald-600 font-bold hover:underline flex items-center gap-1 pt-1"
              >
                <span>Contactar a Talento</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* Logout button (Screenshot 6) */}
          <div className="p-4 border-t border-slate-100">
            <button
              onClick={() => {
                logout();
                onNavigate('login');
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar (Screenshot 6) */}
          <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Portal del candidato</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-800 font-semibold">
                {activeTab === 'applications'
                  ? 'Mis Postulaciones'
                  : activeTab === 'profile'
                  ? 'Mi Perfil'
                  : activeTab === 'vacancies'
                  ? 'Explorar Vacantes'
                  : 'Notificaciones'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span className="hidden sm:inline-block text-[11px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-medium">
                Vista de ejemplo
              </span>

              <button
                onClick={() => setActiveTab('notifications')}
                className="relative text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                title="Notificaciones"
              >
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </button>

              {/* User Avatar Badge (Screenshot 6) */}
              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-100">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                  VM
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 leading-tight">
                    Valeria Mendoza
                  </span>
                  <span className="text-[10px] text-slate-400">Candidata</span>
                </div>
              </div>
            </div>
          </header>

          {/* Subheader Greeting (Screenshot 6) */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Hola, Valeria 👋
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Cada postulación es una nueva oportunidad. Aquí puedes seguir tu progreso.
                </p>
              </div>

              {/* Fast switch to other roles for demo review */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    switchRoleDemo('rrhh');
                    onNavigate('hr-dashboard');
                  }}
                  className="text-xs"
                >
                  Ver como RRHH ➔
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    switchRoleDemo('administrador');
                    onNavigate('admin-dashboard');
                  }}
                  className="text-xs"
                >
                  Ver como Admin ➔
                </Button>
              </div>
            </div>

            {/* TAB: APPLICATIONS (Screenshot 6) */}
            {activeTab === 'applications' && (
              <div className="space-y-6">
                {/* 3 Metric KPI Cards (Screenshot 6) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Card 1 */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Postulaciones activas</p>
                      <p className="text-3xl font-black text-slate-900 mt-1">{activeCount}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">En Nexo Tecnología</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Briefcase className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Preseleccionadas</p>
                      <p className="text-3xl font-black text-slate-900 mt-1">{preselectedCount}</p>
                      <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Tu perfil avanza</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 font-medium">En revisión</p>
                      <p className="text-3xl font-black text-slate-900 mt-1">{inReviewCount}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Estamos conociendo tu perfil</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Applications Table Card (Screenshot 6) */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Mis Postulaciones</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Consulta el estado de tus procesos de selección.
                      </p>
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="todos">Todos los estados</option>
                        <option value="Preseleccionado">Preseleccionado</option>
                        <option value="En revisión">En revisión</option>
                        <option value="Recibida">Recibida</option>
                      </select>
                    </div>
                  </div>

                  {/* Table (Screenshot 6) */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-3.5">Cargo</th>
                          <th className="px-6 py-3.5">Fecha de Postulación</th>
                          <th className="px-6 py-3.5">Estado Actual</th>
                          <th className="px-6 py-3.5 text-right">Detalle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredApplications.map((app) => (
                          <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                            {/* Cargo */}
                            <td className="px-6 py-4.5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                  {app.vacancyTitle.toLowerCase().includes('datos') ? (
                                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                                  ) : app.vacancyTitle.toLowerCase().includes('inteligencia') ? (
                                    <Clock className="w-4 h-4 text-amber-600" />
                                  ) : (
                                    <Database className="w-4 h-4 text-sky-600" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 text-xs sm:text-sm">
                                    {app.vacancyTitle}
                                  </p>
                                  <p className="text-[11px] text-slate-500 mt-0.5">
                                    {app.vacancyDepartment}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Fecha */}
                            <td className="px-6 py-4.5 text-slate-600 font-medium">
                              {app.appliedDate}
                            </td>

                            {/* Estado Actual */}
                            <td className="px-6 py-4.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    app.status === 'Preseleccionado'
                                      ? 'bg-emerald-500'
                                      : app.status === 'En revisión'
                                      ? 'bg-amber-500'
                                      : 'bg-sky-500'
                                  }`}
                                />
                                <span
                                  className={`font-semibold ${
                                    app.status === 'Preseleccionado'
                                      ? 'text-emerald-700'
                                      : app.status === 'En revisión'
                                      ? 'text-amber-700'
                                      : 'text-sky-700'
                                  }`}
                                >
                                  {app.status}
                                </span>
                              </div>
                            </td>

                            {/* Detalle */}
                            <td className="px-6 py-4.5 text-right">
                              <button
                                onClick={() => {
                                  setSelectedApp(app);
                                  setIsDetailOpen(true);
                                }}
                                className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-emerald-600 transition-colors text-xs"
                              >
                                <span>Ver detalle</span>
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Bottom status */}
                  <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Mostrando {filteredApplications.length} de {applications.length} postulaciones
                    </span>
                    <span className="font-semibold text-slate-600">Nexo Tecnología</span>
                  </div>
                </div>

                {/* Bottom Informational Cards (Screenshot 6) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card 1: Perfil al día */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm">
                      <User className="w-4 h-4 text-emerald-600" />
                      <span>Tu perfil, siempre al día</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Mantén tu currículum y teléfono actualizados para que podamos contactarte.
                    </p>
                    <button
                      onClick={() => setActiveTab('profile')}
                      className="text-xs font-bold text-emerald-600 hover:underline pt-1 inline-flex items-center gap-1"
                    >
                      <span>Revisar mi perfil</span>
                      <span>→</span>
                    </button>
                  </div>

                  {/* Card 2: Alertas WhatsApp y Correo */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm">
                      <Mail className="w-4 h-4 text-emerald-600" />
                      <span>No te pierdas ninguna novedad</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Te avisaremos por correo o WhatsApp cuando tu postulación cambie de estado.
                    </p>
                    <p className="text-xs font-semibold text-slate-700 pt-1">
                      valeria.mendoza@correo.com
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PROFILE (RF05 - Estructuración de los datos del perfil) */}
            {activeTab === 'profile' && profile && (
              <div className="space-y-6">
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        Perfil Estructurado del Postulante (RF05)
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Datos ordenados y normalizados que alimentan los algoritmos de afinidad.
                      </p>
                    </div>

                    {!isEditingProfile ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditingProfile(true)}
                      >
                        Editar Datos
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsEditingProfile(false)}
                        >
                          Cancelar
                        </Button>
                        <Button size="sm" onClick={handleSaveProfile}>
                          Guardar Cambios
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Summary / Bio */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Extracto Profesional
                    </label>
                    {isEditingProfile ? (
                      <textarea
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        rows={3}
                        className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    ) : (
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {profile.bio}
                      </p>
                    )}
                  </div>

                  {/* Formación y Experiencia */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Educación */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-700 uppercase">
                        Formación Académica
                      </h3>
                      <div className="space-y-2">
                        {profile.education.map((edu, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1"
                          >
                            <p className="text-xs font-bold text-slate-800">{edu.degree}</p>
                            <p className="text-[11px] text-slate-500">{edu.institution}</p>
                            <span className="text-[10px] bg-slate-200/70 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                              Año: {edu.graduationYear}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Experiencia */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-700 uppercase">
                        Experiencia Laboral
                      </h3>
                      <div className="space-y-2">
                        {profile.experience.map((exp, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1"
                          >
                            <div className="flex justify-between items-start">
                              <p className="text-xs font-bold text-slate-800">{exp.role}</p>
                              <span className="text-[10px] text-slate-500 font-medium">
                                {exp.period}
                              </span>
                            </div>
                            <p className="text-[11px] text-emerald-700 font-semibold">
                              {exp.company}
                            </p>
                            <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                              {exp.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Habilidades Técnicas */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Habilidades y Herramientas Normalizadas
                    </label>
                    {isEditingProfile ? (
                      <Input
                        value={editSkills}
                        onChange={(e) => setEditSkills(e.target.value)}
                        helperText="Separa las habilidades con comas (Ej. Python, SQL, Power BI)"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {profile.skills.map((skill) => (
                          <span
                            key={skill}
                            className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium"
                          >
                            ✓ {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: EXPLORAR VACANTES */}
            {activeTab === 'vacancies' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    Oportunidades Abiertas en Nexo Tecnología
                  </h2>
                  <span className="text-xs text-slate-500">
                    {vacancies.length} vacantes disponibles
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vacancies.map((vac) => {
                    const alreadyApplied = applications.some((a) => a.vacancyId === vac.id);
                    return (
                      <div
                        key={vac.id}
                        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-base font-bold text-slate-900">{vac.title}</h3>
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                              {vac.workMode}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{vac.department} · {vac.location}</p>
                          <p className="text-xs text-slate-600 line-clamp-2 mt-2">
                            {vac.description}
                          </p>

                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {vac.requiredSkills.map((s) => (
                              <span
                                key={s}
                                className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs text-slate-400">
                            {vac.appliedCount} postulaciones recibidas
                          </span>
                          {alreadyApplied ? (
                            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Ya te postulaste
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => onApplyVacancy(vac)}
                              className="text-xs"
                            >
                              Postularme ahora ➔
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: NOTIFICACIONES (RF09) */}
            {activeTab === 'notifications' && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Bandeja de Notificaciones Automáticas (RF09)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Historial de mensajes remitidos automáticamente a través de WhatsApp y Correo
                    Electrónico.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 flex items-start gap-3.5"
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          notif.channel === 'WhatsApp'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-sky-100 text-sky-700'
                        }`}
                      >
                        {notif.channel === 'WhatsApp' ? (
                          <MessageSquare className="w-5 h-5" />
                        ) : (
                          <Mail className="w-5 h-5" />
                        )}
                      </div>

                      <div className="flex-1 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{notif.title}</span>
                            <span
                              className={`text-[10px] px-2 py-0.2 rounded-full font-semibold ${
                                notif.channel === 'WhatsApp'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-sky-50 text-sky-700 border border-sky-200'
                              }`}
                            >
                              Canal {notif.channel}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">{notif.timestamp}</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">{notif.message}</p>
                        <p className="text-[10px] text-slate-400">Destinatario: {notif.recipient}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <ApplicationDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        application={selectedApp}
        onStatusUpdated={loadData}
        onOpenExplainability={() => {
          setIsDetailOpen(false);
          setIsExplainOpen(true);
        }}
      />

      {/* Explainability Modal (RF07) */}
      <MLExplainabilityModal
        isOpen={isExplainOpen}
        onClose={() => setIsExplainOpen(false)}
        candidateName={selectedApp?.candidateName || 'Valeria Mendoza'}
        vacancyTitle={selectedApp?.vacancyTitle || 'Analista de Datos'}
        breakdown={selectedApp?.mlBreakdown}
      />
    </div>
  );
};
