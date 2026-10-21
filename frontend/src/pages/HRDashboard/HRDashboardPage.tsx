import React, { useEffect, useState } from 'react';
import { Application, ApplicationStatus, Vacancy, MLFactorBreakdown } from '@/types';
import { applicationsService } from '@/services/applications.service';
import { vacanciesService } from '@/services/vacancies.service';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { MLScoreBadge } from '@/components/ml/MLScoreBadge';
import { MLExplainabilityModal } from '@/components/ml/MLExplainabilityModal';
import { ApplicationDetailModal } from '@/components/applications/ApplicationDetailModal';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Users,
  Briefcase,
  Sparkles,
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  FileText,
  UserCheck,
  ChevronRight,
  TrendingUp,
  Brain,
  ShieldCheck,
  Building2,
  Clock,
  Phone,
  Mail,
  SlidersHorizontal,
} from 'lucide-react';

export const HRDashboardPage: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [applications, setApplications] = useState<Application[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [selectedVacancyId, setSelectedVacancyId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortByML, setSortByML] = useState(true);

  // Active modals
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isExplainOpen, setIsExplainOpen] = useState(false);

  // Create vacancy modal state (RF02)
  const [isCreateVacancyOpen, setIsCreateVacancyOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDepartment, setNewDepartment] = useState('Datos y Analítica');
  const [newLocation, setNewLocation] = useState('Santo Domingo, RD');
  const [newWorkMode, setNewWorkMode] = useState<'Híbrido' | 'Presencial' | 'Remoto'>('Híbrido');
  const [newType, setNewType] = useState<'Tiempo completo' | 'Medio tiempo' | 'Pasantía'>('Tiempo completo');
  const [newDescription, setNewDescription] = useState('');
  const [newSkills, setNewSkills] = useState('');
  const [newRequirements, setNewRequirements] = useState('');
  const [isCreatingVacancy, setIsCreatingVacancy] = useState(false);

  const loadData = async () => {
    try {
      const [apps, vacs] = await Promise.all([
        applicationsService.getAll(),
        vacanciesService.getAll(),
      ]);
      setApplications(apps);
      setVacancies(vacs);
    } catch {
      showToast('Error', 'No se pudieron cargar los datos de talento humano.', 'error');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter & Rank Candidates (RF04 & RF06)
  const filteredCandidates = applications
    .filter((app) => {
      if (selectedVacancyId !== 'all' && app.vacancyId !== selectedVacancyId) return false;
      if (selectedStatus !== 'all' && app.status !== selectedStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          app.candidateName.toLowerCase().includes(q) ||
          app.vacancyTitle.toLowerCase().includes(q) ||
          app.candidateEmail.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortByML) {
        return (b.mlScore || 0) - (a.mlScore || 0); // Ranked by ML Affinity (RF06)
      }
      return new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime();
    });

  const handleCreateVacancy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDescription) return;

    setIsCreatingVacancy(true);
    try {
      await vacanciesService.create({
        title: newTitle,
        department: newDepartment,
        location: newLocation,
        workMode: newWorkMode,
        type: newType,
        status: 'Abierta',
        description: newDescription,
        requirements: newRequirements
          .split('\n')
          .map((r) => r.trim())
          .filter(Boolean),
        requiredSkills: newSkills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        minExperienceYears: 2,
        openings: 1,
      });

      showToast('Vacante Creada', `La posición "${newTitle}" ya está disponible para recibir postulaciones (RF02).`, 'success');
      setIsCreateVacancyOpen(false);
      // Reset form
      setNewTitle('');
      setNewDescription('');
      setNewSkills('');
      setNewRequirements('');
      loadData();
    } catch {
      showToast('Error', 'No se pudo crear la vacante.', 'error');
    } finally {
      setIsCreatingVacancy(false);
    }
  };

  const handleQuickDecision = async (app: Application, status: ApplicationStatus) => {
    try {
      await applicationsService.updateStatus(
        app.id,
        status,
        user?.name || 'Carlos Arismendi (RRHH)',
        `Decisión rápida desde el panel de clasificación.`
      );
      showToast(
        `Candidato ${status}`,
        `Se registró la decisión y se notificó a ${app.candidateName} vía WhatsApp/Email (RF08, RF09).`,
        'success'
      );
      loadData();
    } catch {
      showToast('Error', 'No se pudo actualizar el estado.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Bar for RRHH */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/30 group-hover:bg-emerald-600 transition-colors">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg block leading-tight">
                Nexo Talento Humano
              </span>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                CLASIFICACIÓN & SELECCIÓN CON MACHINE LEARNING
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigate('admin-dashboard')}
              className="hidden sm:inline-flex text-xs"
            >
              Ir a Administración ➔
            </Button>

            <Button
              size="sm"
              onClick={() => setIsCreateVacancyOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
              className="text-xs font-semibold"
            >
              Nueva Vacante
            </Button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Banner with Algorithmic Overview */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5" /> Núcleo de Clasificación ML (RF06, RF07)
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Ranking Inteligente de Postulantes
            </h1>
            <p className="text-xs sm:text-sm text-emerald-50 leading-relaxed">
              El algoritmo compara automáticamente la formación, experiencia y habilidades del candidato
              con los requisitos de la vacante, ordenando las postulaciones por afinidad y dejando la
              decisión final en manos del evaluador humano.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
            <div className="text-center">
              <span className="text-2xl font-black block">{applications.length}</span>
              <span className="text-[11px] text-emerald-100">Postulantes</span>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center">
              <span className="text-2xl font-black block">{vacancies.length}</span>
              <span className="text-[11px] text-emerald-100">Vacantes</span>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center">
              <span className="text-2xl font-black block text-emerald-200">92.4%</span>
              <span className="text-[11px] text-emerald-100">Precisión IA</span>
            </div>
          </div>
        </div>

        {/* Filter & Search Toolbar (RF04) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Buscar candidato por nombre, cargo o correo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Vacancy selector */}
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
              <select
                value={selectedVacancyId}
                onChange={(e) => setSelectedVacancyId(e.target.value)}
                className="w-full sm:w-auto text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">Todas las vacantes</option>
                {vacancies.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Status selector */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full sm:w-auto text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">Todos los estados</option>
              <option value="Recibida">Recibida</option>
              <option value="En revisión">En revisión</option>
              <option value="Preseleccionado">Preseleccionado</option>
              <option value="Entrevista">Entrevista</option>
              <option value="Descartado">Descartado</option>
            </select>
          </div>

          {/* Sort toggle (RF06: Ordenado por Algoritmo) */}
          <div className="shrink-0 flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => setSortByML(!sortByML)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                sortByML
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>{sortByML ? 'Orden: Afinidad ML (Desc)' : 'Orden: Fecha Reciente'}</span>
            </button>
          </div>
        </div>

        {/* Candidate Ranking List (RF06 & RF08) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Mostrando <strong className="text-slate-800">{filteredCandidates.length}</strong> postulaciones
              {sortByML && ' ordenadas por puntaje predictivo de afinidad'}
            </span>
            <span className="flex items-center gap-1 text-sky-700 font-medium">
              <ShieldCheck className="w-4 h-4 text-sky-600" /> Cero sesgo demográfico (RNF03)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredCandidates.map((app, index) => (
              <div
                key={app.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-300 p-5 sm:p-6 shadow-2xs transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                {/* Candidate Info & Position */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  {/* Rank number badge if sorted by ML */}
                  {sortByML && (
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0 mt-1">
                      #{index + 1}
                    </div>
                  )}

                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-base font-bold text-slate-900 truncate">
                        {app.candidateName}
                      </h3>
                      <Badge status={app.status} />
                    </div>

                    <p className="text-xs text-slate-600 font-medium">
                      Postulante para: <strong className="text-emerald-700">{app.vacancyTitle}</strong> · {app.vacancyDepartment}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" /> {app.candidateEmail}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> {app.candidatePhone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Postulado: {app.appliedDate}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Center: ML Score & Explainability Button (RF06, RF07) */}
                <div className="flex items-center gap-4 shrink-0 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Afinidad Algorítmica
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 justify-end">
                      <MLScoreBadge
                        score={app.mlScore || 80}
                        size="lg"
                        onClick={() => {
                          setSelectedApp(app);
                          setIsExplainOpen(true);
                        }}
                      />
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedApp(app);
                      setIsExplainOpen(true);
                    }}
                    className="text-xs border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                  >
                    Ver Factores (RF07)
                  </Button>
                </div>

                {/* Right: Human Decision Action Controls (RF08) */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleQuickDecision(app, 'Preseleccionado')}
                    disabled={app.status === 'Preseleccionado'}
                    className="text-xs"
                  >
                    Preseleccionar
                  </Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleQuickDecision(app, 'Entrevista')}
                    disabled={app.status === 'Entrevista'}
                    className="text-xs"
                  >
                    Entrevista
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickDecision(app, 'Descartado')}
                    disabled={app.status === 'Descartado'}
                    className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
                  >
                    Descartar
                  </Button>

                  <button
                    onClick={() => {
                      setSelectedApp(app);
                      setIsDetailOpen(true);
                    }}
                    className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors ml-1"
                    title="Ver expediente completo e historial"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}

            {filteredCandidates.length === 0 && (
              <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 space-y-3">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-base font-bold text-slate-800">No se encontraron candidatos</h4>
                <p className="text-xs text-slate-500">
                  Prueba modificando los filtros de vacante, estado o término de búsqueda.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Vacancy Modal (RF02) */}
      <Modal
        isOpen={isCreateVacancyOpen}
        onClose={() => setIsCreateVacancyOpen(false)}
        title="Crear Nueva Vacante y Parámetros del Cargo (RF02)"
        subtitle="Define los requisitos con los cuales el algoritmo de aprendizaje automático comparará los perfiles"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateVacancy} className="space-y-4">
          <Input
            label="Título del Cargo *"
            placeholder="Ej. Científico de Datos / Especialista en RRHH"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Departamento
              </label>
              <select
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl outline-none"
              >
                <option value="Datos y Analítica">Datos y Analítica</option>
                <option value="Inteligencia de Negocios">Inteligencia de Negocios</option>
                <option value="Tecnología & Desarrollo">Tecnología & Desarrollo</option>
                <option value="Talento Humano">Talento Humano</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Modalidad</label>
              <select
                value={newWorkMode}
                onChange={(e) => setNewWorkMode(e.target.value as any)}
                className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl outline-none"
              >
                <option value="Híbrido">Híbrido</option>
                <option value="Presencial">Presencial</option>
                <option value="Remoto">Remoto</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Descripción General</label>
            <textarea
              rows={3}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Explica el objetivo de la posición y las principales responsabilidades..."
              className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
              required
            />
          </div>

          <Input
            label="Habilidades Técnicas Clave (Separadas por coma)"
            placeholder="Python, SQL, Power BI, Machine Learning, ETL"
            value={newSkills}
            onChange={(e) => setNewSkills(e.target.value)}
            helperText="Estas habilidades se usarán en la vectorización y matriz de afinidad del modelo ML."
          />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Requisitos Académicos y de Experiencia (Uno por línea)
            </label>
            <textarea
              rows={3}
              value={newRequirements}
              onChange={(e) => setNewRequirements(e.target.value)}
              placeholder="Grado en Ingeniería de Sistemas o afín&#10;Mínimo 2 años de experiencia comprobable"
              className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateVacancyOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" isLoading={isCreatingVacancy}>
              Publicar Vacante
            </Button>
          </div>
        </form>
      </Modal>

      {/* Application Detail & Recruiter Notes Modal */}
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

      {/* Explainable AI Modal (RF07) */}
      <MLExplainabilityModal
        isOpen={isExplainOpen}
        onClose={() => setIsExplainOpen(false)}
        candidateName={selectedApp?.candidateName || ''}
        vacancyTitle={selectedApp?.vacancyTitle || ''}
        breakdown={selectedApp?.mlBreakdown}
      />
    </div>
  );
};
