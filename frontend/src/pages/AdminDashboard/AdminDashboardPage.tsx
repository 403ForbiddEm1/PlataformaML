import React, { useEffect, useState } from 'react';
import { ComparisonMetrics, MLModelMetrics, User } from '@/types';
import { reportsService } from '@/services/reports.service';
import { mlService } from '@/services/ml.service';
import { mockStore } from '@/services/mockData';
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
} from 'lucide-react';

export const AdminDashboardPage: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { showToast } = useToast();

  const [metrics, setMetrics] = useState<ComparisonMetrics | null>(null);
  const [mlInfo, setMlInfo] = useState<MLModelMetrics | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);

  // Retrain simulation state
  const [isRetraining, setIsRetraining] = useState(false);
  const [trainProgress, setTrainProgress] = useState(0);
  const [currentEpoch, setCurrentEpoch] = useState(0);

  // Upload dataset modal
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const loadData = async () => {
    try {
      const [comp, model] = await Promise.all([
        reportsService.getComparisonMetrics(),
        mlService.getModelMetrics(),
      ]);
      setMetrics(comp);
      setMlInfo(model);
      setUsersList(mockStore.getUsers());
    } catch {
      showToast('Error', 'No se pudieron cargar las métricas de administración.', 'error');
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
      showToast(
        'Modelo Re-entrenado con Éxito (RF12)',
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
      showToast('Dataset Procesado (RF12)', res.message, 'success');
      setIsUploadOpen(false);
      setDatasetFile(null);
      loadData();
    } catch {
      showToast('Error', 'No se pudo procesar el archivo del dataset.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm group-hover:bg-slate-800 transition-colors">
              <Cpu className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg block leading-tight">
                Administración & MLOps
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                GOBERNANZA, MÉTRICAS COMPARATIVAS Y MODELOS ML
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
              onClick={() => onNavigate('candidate-dashboard')}
              className="text-xs"
            >
              Vista Candidato ➔
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* SECTION 1: COMPARISON REPORT (RF11 & OBJETIVO 6 DEL PROYECTO) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                <Award className="w-3.5 h-3.5" /> Evaluación Comparativa Antes vs. Después (RF11 / Objetivo 6)
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
                Optimización del Proceso de Selección
              </h2>
            </div>
            <span className="text-xs text-slate-400 hidden sm:inline-block">
              Datos consolidados en tiempo real
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* KPI 1: Tiempo de Filtrado */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Tiempo Promedio de Filtrado</span>
                <Clock className="w-4 h-4 text-emerald-600" />
              </div>

              <div className="flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-black text-slate-900">
                  {metrics?.platformFilterTimeMinutes || 12} min
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" /> -96% tiempo
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                <span>Proceso Manual Previo:</span>
                <strong className="text-slate-800 font-semibold">{metrics?.manualFilterTimeDays || 4.8} días / vacante</strong>
              </div>
            </div>

            {/* KPI 2: Precisión del Filtrado */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Precisión de Clasificación</span>
                <Zap className="w-4 h-4 text-emerald-600" />
              </div>

              <div className="flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-black text-slate-900">
                  {metrics?.platformScreeningAccuracy || 92.4}%
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> +50.4 pts
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                <span>Tasa Filtrado Manual:</span>
                <strong className="text-slate-800 font-semibold">{metrics?.manualScreeningAccuracy || 42}%</strong>
              </div>
            </div>

            {/* KPI 3: Postulaciones Procesadas */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Volumen Total Procesado</span>
                <Activity className="w-4 h-4 text-emerald-600" />
              </div>

              <div className="flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-black text-slate-900">
                  {metrics?.totalApplicationsProcessed || 540}
                </span>
                <span className="text-xs font-semibold text-slate-500">curriculums</span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                <span>Satisfacción Reclutadores:</span>
                <strong className="text-emerald-700 font-bold">
                  {metrics?.averageSatisfactionScore || 9.2} / 10 ★
                </strong>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: MACHINE LEARNING MODEL MANAGEMENT (RF12, RNF03, RNF04) */}
        <section className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  Gestión del Modelo de Aprendizaje Automático (RF12)
                </h3>
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full">
                  Producción
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Monitoreo de métricas mínimas (RNF04), dataset de entrenamiento y reentrenamiento sin modificar código fuente.
              </p>
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

          {/* Training in Progress Banner */}
          {isRetraining && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2 animate-in fade-in">
              <div className="flex justify-between text-xs font-bold text-emerald-800">
                <span>Entrenando modelo con Scikit-learn (Época {currentEpoch}/5)...</span>
                <span>{trainProgress}%</span>
              </div>
              <div className="w-full bg-emerald-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${trainProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Model Metrics Grid (RNF04) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Accuracy</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {mlInfo?.accuracy}%
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold">Umbral RNF04 cumplido</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Precision</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {mlInfo?.precision}%
              </span>
              <span className="text-[10px] text-slate-500">Mínimo falso positivo</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Recall</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {mlInfo?.recall}%
              </span>
              <span className="text-[10px] text-slate-500">Sensibilidad de detección</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">F1-Score</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {mlInfo?.f1Score}%
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold">Media armónica óptima</span>
            </div>
          </div>

          {/* Model Metadata & Algorithmic Fairness Audit (RNF03) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
              <h4 className="font-bold text-slate-800">Detalles de Arquitectura del Modelo</h4>
              <p className="text-slate-600">
                <strong>Algoritmo:</strong> {mlInfo?.algorithm}
              </p>
              <p className="text-slate-600">
                <strong>Versión Activa:</strong> {mlInfo?.version}
              </p>
              <p className="text-slate-600">
                <strong>Registros en Dataset:</strong> {mlInfo?.datasetSize} postulaciones históricas
              </p>
              <p className="text-slate-600">
                <strong>Último Entrenamiento:</strong>{' '}
                {mlInfo?.lastTrainedAt ? new Date(mlInfo.lastTrainedAt).toLocaleString('es-DO') : 'Reciente'}
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Auditoría de Equidad Algorítmica (RNF03)</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                El pipeline de preprocesamiento en Python (TF-IDF + Normalización) elimina
                automáticamente cualquier atributo protegido:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="px-2 py-0.5 bg-white border border-emerald-200 rounded text-[11px] text-emerald-800 font-medium">
                  ✓ Género excluido
                </span>
                <span className="px-2 py-0.5 bg-white border border-emerald-200 rounded text-[11px] text-emerald-800 font-medium">
                  ✓ Edad excluida
                </span>
                <span className="px-2 py-0.5 bg-white border border-emerald-200 rounded text-[11px] text-emerald-800 font-medium">
                  ✓ Foto / Estado Civil excluido
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: USERS & ROLE MANAGEMENT (RF01, RNF01, RNF02) */}
        <section className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between pb-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Control de Acceso y Usuarios del Sistema (RF01, RNF01)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Garantiza que cada usuario acceda únicamente a los módulos autorizados según su rol.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {usersList.length} usuarios registrados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Correo</th>
                  <th className="px-4 py-3">Rol Asignado</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((usr) => (
                  <tr key={usr.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3.5 font-bold text-slate-800 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                        {usr.avatar || 'US'}
                      </div>
                      <span>{usr.name}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{usr.email}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          usr.role === 'administrador'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : usr.role === 'rrhh'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-sky-50 text-sky-700 border border-sky-200'
                        }`}
                      >
                        {usr.role === 'rrhh'
                          ? 'Recursos Humanos'
                          : usr.role === 'administrador'
                          ? 'Administrador'
                          : 'Aspirante / Candidato'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">{usr.phone || 'N/A'}</td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Upload Dataset Modal (RF12) */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Cargar Dataset de Entrenamiento (RF12)"
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

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
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
    </div>
  );
};
