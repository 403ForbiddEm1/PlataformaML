import React, { useEffect, useState } from 'react';
import { ComparisonMetrics, Empresa, MLModelMetrics, User } from '@/types';
import { reportsService } from '@/services/reports.service';
import { mlService } from '@/services/ml.service';
import { authService } from '@/services/auth.service';
import { empresaService } from '@/services/empresa.service';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import {
  Brain,
  TrendingDown,
  TrendingUp,
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
  FileCheck,
  Building2,
  PlusCircle,
  Sun,
  Moon,
  UserPlus,
} from 'lucide-react';

export const AdminDashboardPage: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'mlops' | 'companies' | 'users'>('mlops');
  const [metrics, setMetrics] = useState<ComparisonMetrics | null>(null);
  const [mlInfo, setMlInfo] = useState<MLModelMetrics | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [companiesList, setCompaniesList] = useState<Empresa[]>([]);

  // Retrain simulation state
  const [isRetraining, setIsRetraining] = useState(false);
  const [trainProgress, setTrainProgress] = useState(0);
  const [currentEpoch, setCurrentEpoch] = useState(0);

  // Upload dataset modal
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // New Company Modal
  const [isNewCompanyOpen, setIsNewCompanyOpen] = useState(false);
  const [newCompName, setNewCompName] = useState('');
  const [newCompRif, setNewCompRif] = useState('');
  const [newCompDomain, setNewCompDomain] = useState('');
  const [newCompAdmin, setNewCompAdmin] = useState('');
  const [newCompEmail, setNewCompEmail] = useState('');
  const [newCompPhone, setNewCompPhone] = useState('');
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);

  // New HR User Modal (Empresas registran a sus reclutadores de RRHH)
  const [isNewHROpen, setIsNewHROpen] = useState(false);
  const [newHRName, setNewHRName] = useState('');
  const [newHREmail, setNewHREmail] = useState('');
  const [newHRPhone, setNewHRPhone] = useState('');
  const [newHRPassword, setNewHRPassword] = useState('');
  const [newHREmpresaId, setNewHREmpresaId] = useState('');
  const [isCreatingHR, setIsCreatingHR] = useState(false);

  const loadData = async () => {
    try {
      const [comp, model, users, companies] = await Promise.all([
        reportsService.getComparisonMetrics(),
        mlService.getModelMetrics(),
        authService.getUsers(),
        empresaService.getAll(),
      ]);
      setMetrics(comp);
      setMlInfo(model);
      setUsersList(users);
      setCompaniesList(companies);
    } catch {
      showToast('Error', 'No se pudieron cargar los datos de administración.', 'error');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRetrainModel = async () => {
    setIsRetraining(true);
    setTrainProgress(0);
    setCurrentEpoch(0);

    try {
      const updated = await mlService.retrainModel((prog, epoch) => {
        setTrainProgress(prog);
        setCurrentEpoch(epoch);
      });
      setMlInfo(updated);
      // RF12: Retraining complete
      showToast(
        'Modelo Re-entrenado con Éxito',
        `Nueva versión ${updated.version} generada con Accuracy del ${updated.accuracy}% y F1 del ${updated.f1Score}%.`,
        'success'
      );
    } catch {
      showToast('Error', 'Ocurrió un problema durante el entrenamiento.', 'error');
    } finally {
      setIsRetraining(false);
    }
  };

  const handleDatasetUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!datasetFile) return;

    setIsUploading(true);
    try {
      const res = await mlService.uploadDataset(datasetFile);
      // RF12: Dataset upload complete
      showToast('Dataset Procesado', res.message, 'success');
      setIsUploadOpen(false);
      setDatasetFile(null);
      loadData();
    } catch {
      showToast('Error', 'No se pudo procesar el archivo del dataset.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName || !newCompEmail) return;

    setIsCreatingCompany(true);
    try {
      await empresaService.registerCompany({
        nombreEmpresa: newCompName,
        rif: newCompRif,
        dominio: newCompDomain,
        adminName: newCompAdmin || 'Admin ' + newCompName,
        adminEmail: newCompEmail,
        password: 'password123',
        phone: newCompPhone,
      });
      showToast('Empresa Creada', `Se dio de alta a ${newCompName} y su usuario administrador.`, 'success');
      setIsNewCompanyOpen(false);
      setNewCompName('');
      setNewCompRif('');
      setNewCompDomain('');
      setNewCompEmail('');
      loadData();
    } catch {
      showToast('Error', 'No se pudo registrar la empresa.', 'error');
    } finally {
      setIsCreatingCompany(false);
    }
  };

  const handleRegisterHR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHRName || !newHREmail || !newHRPassword) {
      showToast('Campos requeridos', 'Ingresa nombre, correo y contraseña del reclutador.', 'error');
      return;
    }

    setIsCreatingHR(true);
    try {
      const targetEmpresa =
        companiesList.find((c) => c.id === (newHREmpresaId || user?.empresaId)) ||
        companiesList.find((c) => c.id === user?.empresaId) ||
        companiesList[0];

      await authService.registerHRUser({
        name: newHRName,
        email: newHREmail,
        password: newHRPassword,
        phone: newHRPhone,
        empresaId: targetEmpresa?.id || user?.empresaId || 'emp-01',
        empresaNombre: targetEmpresa?.nombre || user?.empresaNombre || 'Nexo Tecnología S.A.',
      });

      showToast(
        'Reclutador de RRHH Registrado',
        `Se otorgó acceso a ${newHRName} para gestionar convocatorias y colaboradores de ${targetEmpresa?.nombre || 'la empresa'}.`,
        'success'
      );

      setIsNewHROpen(false);
      setNewHRName('');
      setNewHREmail('');
      setNewHRPhone('');
      setNewHRPassword('');
      loadData();
    } catch {
      showToast('Error', 'No se pudo registrar al usuario de recursos humanos.', 'error');
    } finally {
      setIsCreatingHR(false);
    }
  };

  const isSuperAdmin = user?.role === 'superadmin';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm group-hover:bg-slate-800 transition-colors">
              <Cpu className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 dark:text-slate-100 tracking-tight text-base sm:text-lg block leading-tight">
                {isSuperAdmin ? 'Panel Superadministrador Global' : `Panel Admin · ${user?.empresaNombre || 'Empresa'}`}
              </span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                GOBERNANZA MULTI-EMPRESA, MÉTRICAS Y MACHINE LEARNING
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-amber-300 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all border border-slate-200/80 dark:border-slate-700 shadow-[0_3px_0_#64748b] dark:shadow-[0_3px_0_#020617] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none flex items-center justify-center cursor-pointer"
              title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label="Alternar modo oscuro"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigate('hr-dashboard')}
              className="text-xs"
            >
              Ir a Talento Humano ➔
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onNavigate('vacancies')}
              className="text-xs"
            >
              Ver Portal Público
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-6 text-xs font-bold border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('mlops')}
            className={`py-3 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'mlops'
                ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Brain className="w-4 h-4" /> MLOps & Comparativa de Tiempos
          </button>

          <button
            onClick={() => setActiveTab('companies')}
            className={`py-3 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'companies'
                ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" /> Empresas Registradas ({companiesList.length})
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'users'
                ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            {isSuperAdmin
              ? `Usuarios y Permisos (${usersList.length})`
              : `Equipo de Recursos Humanos (${usersList.filter((u) => u.empresaId === user?.empresaId).length})`}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-8">
        {/* TAB 1: MLOPS & COMPARATIVA DE TIEMPOS */}
        {activeTab === 'mlops' && (
          <>
            {/* Impact Metrics Banner */}
            <section className="bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2 border border-emerald-500/30">
                    <Activity className="w-3.5 h-3.5" /> Objetivo 6: Evaluación de Impacto y Optimización
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                    Optimización del Proceso: Antes vs. Después
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Comparativa empírica entre el filtrado manual tradicional y la plataforma con Machine Learning.
                  </p>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 rounded-2xl flex items-center gap-3">
                  <Zap className="w-6 h-6 text-emerald-400" />
                  <div>
                    <span className="text-[10px] font-bold uppercase text-emerald-300 block">Reducción Total</span>
                    <span className="text-2xl font-black text-emerald-400">
                      -{metrics?.timeReductionPercentage}% tiempo
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 space-y-2">
                  <span className="text-xs font-bold uppercase text-slate-400 block">Tiempo de Triaje por Vacante</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-rose-400">{metrics?.manualFilterTimeDays} días</span>
                    <span className="text-slate-400 text-xs">➔</span>
                    <span className="text-2xl font-black text-emerald-400">{metrics?.platformFilterTimeMinutes} min</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    De ~115 horas de espera en triaje preliminar a clasificación algorítmica instantánea.
                  </p>
                </div>

                <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 space-y-2">
                  <span className="text-xs font-bold uppercase text-slate-400 block">Precisión en Selección</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-400">{metrics?.manualScreeningAccuracy}%</span>
                    <span className="text-slate-400 text-xs">➔</span>
                    <span className="text-2xl font-black text-emerald-400">{metrics?.platformScreeningAccuracy}%</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Mayor concordancia de competencias evaluadas mediante similitud vectorial TF-IDF.
                  </p>
                </div>

                <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 space-y-2">
                  <span className="text-xs font-bold uppercase text-slate-400 block">Satisfacción del Reclutador</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-400">{metrics?.averageSatisfactionScore} / 5.0</span>
                    <span className="text-xs text-slate-400">Estrellas</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {/* RNF03: Auditoría sin sesgos */}
                    {metrics?.totalApplicationsProcessed} postulaciones procesadas sin sesgos demográficos.
                  </p>
                </div>
              </div>
            </section>

            {/* Model Architecture & MLOps Section (RF04, RF12) */}
            <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                    <Cpu className="w-4 h-4 text-emerald-500" />
                    <span>Microservicio ML (Python FastAPI + Scikit-Learn)</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                    Gobernanza del Modelo RandomForest
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<UploadCloud className="w-4 h-4" />}
                    onClick={() => setIsUploadOpen(true)}
                    className="text-xs"
                  >
                    Cargar Dataset
                  </Button>

                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<RefreshCw className={`w-4 h-4 ${isRetraining ? 'animate-spin' : ''}`} />}
                    onClick={handleRetrainModel}
                    isLoading={isRetraining}
                    className="text-xs font-bold"
                  >
                    Re-entrenar Modelo
                  </Button>
                </div>
              </div>

              {isRetraining && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2 animate-in fade-in">
                  <div className="flex justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <span>Entrenando modelo con Scikit-learn (Época {currentEpoch}/5)...</span>
                    <span>{trainProgress}%</span>
                  </div>
                  <div className="w-full bg-emerald-200 dark:bg-emerald-900/60 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${trainProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-400 block">Accuracy</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 block">
                    {mlInfo?.accuracy}%
                  </span>
                  {/* RNF04: Umbral cumplido */}
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">Umbral de precisión cumplido</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-400 block">Precision</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 block">
                    {mlInfo?.precision}%
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Mínimo falso positivo</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-400 block">Recall</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 block">
                    {mlInfo?.recall}%
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Sensibilidad de detección</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-400 block">F1-Score</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 block">
                    {mlInfo?.f1Score}%
                  </span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">Media armónica óptima</span>
                </div>
              </div>

              {/* Model Metadata & Algorithmic Fairness Audit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-2">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100">Detalles de Arquitectura del Modelo</h4>
                  <p className="text-slate-600 dark:text-slate-300">
                    <strong className="text-slate-700 dark:text-slate-200">Algoritmo:</strong> {mlInfo?.algorithm}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    <strong className="text-slate-700 dark:text-slate-200">Versión Activa:</strong> {mlInfo?.version}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    <strong className="text-slate-700 dark:text-slate-200">Registros en Dataset:</strong> {mlInfo?.datasetSize} postulaciones históricas
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    <strong className="text-slate-700 dark:text-slate-200">Último Entrenamiento:</strong>{' '}
                    {mlInfo?.lastTrainedAt ? new Date(mlInfo.lastTrainedAt).toLocaleString('es-DO') : 'Reciente'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/40 space-y-2 shadow-xs">
                  <div className="flex items-center gap-1.5 text-emerald-900 dark:text-emerald-300 font-bold">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    {/* RNF03: Auditoría de equidad */}
                    <span>Auditoría de Equidad Algorítmica</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    El pipeline en Python elimina automáticamente cualquier atributo protegido:
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="px-2.5 py-1 bg-white dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-500/50 rounded-lg text-[11px] text-emerald-800 dark:text-emerald-200 font-semibold shadow-2xs">
                      ✓ Género excluido
                    </span>
                    <span className="px-2.5 py-1 bg-white dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-500/50 rounded-lg text-[11px] text-emerald-800 dark:text-emerald-200 font-semibold shadow-2xs">
                      ✓ Edad excluida
                    </span>
                    <span className="px-2.5 py-1 bg-white dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-500/50 rounded-lg text-[11px] text-emerald-800 dark:text-emerald-200 font-semibold shadow-2xs">
                      ✓ Foto / Estado Civil excluido
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* TAB 2: GESTIÓN DE EMPRESAS (MULTI-TENANT) */}
        {activeTab === 'companies' && (
          <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Empresas Afiliadas a la Plataforma (Multi-Tenant)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Cada empresa opera de forma aislada, gestionando sus vacantes, postulaciones y equipo de reclutadores.
                </p>
              </div>

              <Button
                size="sm"
                variant="primary"
                leftIcon={<PlusCircle className="w-4 h-4" />}
                onClick={() => setIsNewCompanyOpen(true)}
                className="text-xs font-bold"
              >
                Afiliar Nueva Empresa
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {companiesList.map((comp) => (
                <div
                  key={comp.id}
                  className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white font-bold flex items-center justify-center shadow-xs">
                        {comp.nombre.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                        {comp.activa ? 'Activa' : 'Pausada'}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">{comp.nombre}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{comp.dominio || 'Sin dominio web'}</p>
                      {comp.rif && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">RIF: {comp.rif}</p>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                      {comp.descripcion || 'Empresa participante en el proceso de reclutamiento inteligente.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Alta: {new Date(comp.creadoEn).toLocaleDateString()}</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">ID: {comp.id}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TAB 3: USERS & ROLE MANAGEMENT (EMPRESAS GESTIONAN SUS RRHH) */}
        {activeTab === 'users' && (
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs p-6 sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    {isSuperAdmin
                      ? 'Control de Acceso Basado en Roles (RBAC - Multi-Tenant)'
                      : `Equipo de Recursos Humanos · ${user?.empresaNombre || 'Nexo Tecnología S.A.'}`}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {isSuperAdmin
                    ? 'Supervisión global de usuarios en la plataforma. Las empresas administran y registran exclusivamente a sus propios reclutadores de RRHH.'
                    : 'Como Administrador Corporativo, tienes la facultad exclusiva de registrar, auditar y gestionar el personal de Recursos Humanos asignado a tu empresa.'}
                </p>
              </div>

              <Button
                size="sm"
                variant="primary"
                leftIcon={<UserPlus className="w-4 h-4" />}
                onClick={() => {
                  setNewHREmpresaId(user?.empresaId || 'emp-01');
                  setIsNewHROpen(true);
                }}
                className="text-xs font-bold shrink-0"
              >
                Registrar Reclutador de RRHH
              </Button>
            </div>

            {/* User count badge */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                Mostrando{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {
                    (isSuperAdmin
                      ? usersList
                      : usersList.filter((u) => u.empresaId === user?.empresaId || u.id === user?.id)
                    ).length
                  }
                </strong>{' '}
                usuarios autorizados
              </span>

              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                Aislamiento Multi-Tenant Activo
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3">Correo Corporativo</th>
                    <th className="px-4 py-3">Empresa Vinculada</th>
                    <th className="px-4 py-3">Rol Asignado</th>
                    <th className="px-4 py-3">Teléfono</th>
                    <th className="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(isSuperAdmin
                    ? usersList
                    : usersList.filter((u) => u.empresaId === user?.empresaId || u.id === user?.id)
                  ).map((usr) => (
                    <tr key={usr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-[10px]">
                          {usr.avatar || 'US'}
                        </div>
                        <span>{usr.name}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 font-mono text-[11px]">{usr.email}</td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                        {usr.empresaNombre ? (
                          <span className="font-semibold text-slate-700 dark:text-slate-200">{usr.empresaNombre}</span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic">Global / Sin empresa</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            usr.role === 'superadmin'
                              ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : usr.role === 'admin'
                              ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                              : usr.role === 'rrhh'
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                          }`}
                        >
                          {usr.role === 'superadmin'
                            ? '🛡️ Superadmin'
                            : usr.role === 'admin'
                            ? '🏢 Admin Empresa'
                            : usr.role === 'rrhh'
                            ? '💼 RRHH Reclutador'
                            : '👤 Candidato'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">{usr.phone || 'N/A'}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* RF12: Upload Dataset Modal */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Cargar Dataset de Entrenamiento"
        subtitle="Sube datos históricos de postulaciones en formato .csv o .json para entrenar el modelo de afinidad"
      >
        <form onSubmit={handleDatasetUpload} className="space-y-4">
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center space-y-2 hover:border-emerald-300 transition-colors">
            <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">
              Selecciona o arrastra el archivo de datos (.csv / .json)
            </p>
            <p className="text-[11px] text-slate-400">
              El pipeline validará que contenga columnas de habilidades, experiencia y formación.
            </p>
            <input
              type="file"
              accept=".csv,.json"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setDatasetFile(e.target.files[0]);
                }
              }}
              className="pt-2 text-xs text-slate-500 mx-auto block"
            />
          </div>

          {datasetFile && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
              <span>Archivo seleccionado: <strong>{datasetFile.name}</strong></span>
              <span>{(datasetFile.size / 1024).toFixed(1)} KB</span>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
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
              size="sm"
              isLoading={isUploading}
              disabled={!datasetFile}
            >
              Procesar y Cargar
            </Button>
          </div>
        </form>
      </Modal>

      {/* New Company Modal */}
      <Modal
        isOpen={isNewCompanyOpen}
        onClose={() => setIsNewCompanyOpen(false)}
        title="Afiliar Nueva Empresa"
        subtitle="Registra una nueva empresa y genera su cuenta de Administrador corporativo"
      >
        <form onSubmit={handleCreateCompany} className="space-y-3">
          <Input
            label="Nombre de la Empresa"
            value={newCompName}
            onChange={(e) => setNewCompName(e.target.value)}
            placeholder="Ej. Finanzas del Caribe S.A."
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="RIF / Identificación"
              value={newCompRif}
              onChange={(e) => setNewCompRif(e.target.value)}
              placeholder="J-50192831-2"
            />
            <Input
              label="Dominio Web"
              value={newCompDomain}
              onChange={(e) => setNewCompDomain(e.target.value)}
              placeholder="finanzascaribe.com"
            />
          </div>
          <Input
            label="Nombre del Administrador"
            value={newCompAdmin}
            onChange={(e) => setNewCompAdmin(e.target.value)}
            placeholder="Lic. Laura Rodríguez"
            required
          />
          <Input
            label="Correo del Administrador"
            type="email"
            value={newCompEmail}
            onChange={(e) => setNewCompEmail(e.target.value)}
            placeholder="admin@finanzascaribe.com"
            required
          />
          <Input
            label="Teléfono"
            value={newCompPhone}
            onChange={(e) => setNewCompPhone(e.target.value)}
            placeholder="+1 (809) 555-0150"
          />

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsNewCompanyOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" isLoading={isCreatingCompany}>
              Guardar Empresa
            </Button>
          </div>
        </form>
      </Modal>

      {/* Register New HR Recruiter Modal */}
      <Modal
        isOpen={isNewHROpen}
        onClose={() => setIsNewHROpen(false)}
        title="Registrar Reclutador de Recursos Humanos"
        subtitle={
          isSuperAdmin
            ? 'Da de alta a un usuario con rol RRHH y vincúlalo a una empresa afiliada'
            : `Da de alta a un nuevo reclutador de RRHH para ${user?.empresaNombre || 'tu empresa'}`
        }
      >
        <form onSubmit={handleRegisterHR} className="space-y-4">
          <Input
            label="Nombre Completo del Reclutador *"
            value={newHRName}
            onChange={(e) => setNewHRName(e.target.value)}
            placeholder="Ej. Lic. Mariana Valenzuela"
            required
          />

          <Input
            label="Correo Electrónico Institucional *"
            type="email"
            value={newHREmail}
            onChange={(e) => setNewHREmail(e.target.value)}
            placeholder="mariana.rrhh@empresa.com"
            required
          />

          <Input
            label="Teléfono de Contacto"
            value={newHRPhone}
            onChange={(e) => setNewHRPhone(e.target.value)}
            placeholder="+1 (809) 555-0320"
          />

          <Input
            label="Contraseña de Acceso del Reclutador *"
            type="password"
            value={newHRPassword}
            onChange={(e) => setNewHRPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres (letras y números)"
            required
          />

          {isSuperAdmin ? (
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Empresa Afiliada *
              </label>
              <select
                value={newHREmpresaId || user?.empresaId || 'emp-01'}
                onChange={(e) => setNewHREmpresaId(e.target.value)}
                className="w-full text-xs p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
              >
                {companiesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.id})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Empresa Vinculada (Exclusiva)
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {user?.empresaNombre || 'Nexo Tecnología S.A.'}
              </span>
            </div>
          )}

          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
            <span>Rol asignado por defecto:</span>
            <span className="font-bold">💼 RRHH (Reclutador Corporativo)</span>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsNewHROpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" isLoading={isCreatingHR}>
              Registrar Reclutador
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

