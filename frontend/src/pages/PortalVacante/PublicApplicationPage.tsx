import React, { useState, useEffect } from 'react';
import { Vacancy } from '@/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FileUploader } from '@/components/ui/FileUploader';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import {
  MapPin,
  Building2,
  Clock,
  TrendingUp,
  Mail,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Lock,
  UserCheck,
  AlertCircle,
  LogIn,
  UserPlus,
  Folder,
} from 'lucide-react';
import { applicationsService } from '@/services/applications.service';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import confetti from 'canvas-confetti';

interface PublicApplicationPageProps {
  vacancy: Vacancy;
  onNavigate: (view: string) => void;
  onPostulationSuccess: (email: string, candidateName: string, vacancyTitle: string) => void;
}

export const PublicApplicationPage: React.FC<PublicApplicationPageProps> = ({
  vacancy,
  onNavigate,
  onPostulationSuccess,
}) => {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [phone, setPhone] = useState(user?.phone || '+1 (809) 555-0198');
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.phone) {
      setPhone(user.phone);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated || !user) {
      showToast('Autenticación requerida', 'Debes iniciar sesión con tu cuenta de candidato.', 'error');
      onNavigate('login');
      return;
    }

    if (user.role !== 'candidato') {
      showToast('Rol no autorizado', 'Solo los usuarios con rol de Candidato pueden postularse.', 'error');
      return;
    }

    if (!cvFile) {
      showToast('Currículum requerido', 'Por favor adjunta tu CV para que el modelo de IA pueda evaluar tu perfil.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const nameParts = user.name.split(' ');
      const firstName = nameParts[0] || user.name;
      const lastName = nameParts.slice(1).join(' ') || '';

      await applicationsService.submitApplication({
        vacancyId: vacancy.id,
        email: user.email,
        firstName,
        lastName,
        age: user.age || 26,
        phone,
        idCardFile,
        cvFile,
      });

      // Celebration effect
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#C8FF45', '#4C6FFF', '#F1F2EC', '#a3e635'],
        });
      } catch {}

      showToast(
        '¡Postulación Recibida!',
        'Hemos registrado tu postulación de forma segura con tu cuenta verificada.',
        'success'
      );

      onPostulationSuccess(user.email, user.name, vacancy.title);
    } catch {
      showToast('Error', 'No se pudo enviar la postulación. Intenta nuevamente.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCandidate = isAuthenticated && user?.role === 'candidato';

  return (
    <div className="min-h-dvh bg-transparent flex flex-col font-sans transition-colors">
      <Navbar onNavigate={onNavigate} currentView="apply" />

      <main className="flex-1 w-full flex flex-col bg-transparent">
        {/* Unified Dossier Canvas: Fits cleanly inside 1 viewport on desktop & scales on ultrawide */}
        <div className="w-full max-w-[1680px] mx-auto 2xl:border-x border-b border-[#c8b193] dark:border-[#4d3c2e] flex-1 flex flex-col">
          {/* Top Row: Compact Manila Folder Header + Breadcrumb */}
          <div className="w-full border-b-2 border-[#c8b193] dark:border-[#4d3c2e] bg-[#e5d4bc] dark:bg-[#2c221a]">
            {/* Combined Breadcrumb & Manila Folder Tab Strip */}
            <div className="w-full px-4 sm:px-6 lg:px-10 py-2 border-b border-[#c8b193]/70 dark:border-[#4d3c2e]/70 bg-[#dfcbaf] dark:bg-[#382b20] flex flex-wrap items-center justify-between gap-2">
              <nav className="flex items-center gap-1.5 text-[11px] sm:text-xs text-[#70553b] dark:text-[#c4a482] font-semibold min-w-0">
                <Folder className="w-3.5 h-3.5 text-[#7d5634] dark:text-[#dfc3a1] shrink-0" />
                <button
                  type="button"
                  onClick={() => onNavigate('vacancies')}
                  className="hover:text-[#090A0C] dark:hover:text-[#C8FF45] transition-colors cursor-pointer truncate"
                >
                  {vacancy.empresaNombre || 'PlataformaML'}
                </button>
                <ChevronRight className="w-3 h-3 text-[#a88a6b] dark:text-[#6e543e] shrink-0" />
                <button
                  type="button"
                  onClick={() => onNavigate('vacancies')}
                  className="hover:text-[#090A0C] dark:hover:text-[#C8FF45] transition-colors cursor-pointer hidden sm:inline"
                >
                  Convocatorias
                </button>
                <ChevronRight className="w-3 h-3 text-[#a88a6b] dark:text-[#6e543e] hidden sm:inline shrink-0" />
                <span className="text-[#3a2818] dark:text-[#ebdcc8] font-bold truncate max-w-[180px] sm:max-w-xs">
                  {vacancy.title}
                </span>
              </nav>

              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden md:inline font-mono text-[10px] text-[#795b3d] dark:text-[#cbb399]">
                  ID: VAC-{(vacancy.id || '01').slice(0, 6).toUpperCase()}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#f6eee2] dark:bg-[#1d1612] border border-[#d9c7ab] dark:border-[#463629] text-[10px] sm:text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Convocatoria abierta
                </span>
              </div>
            </div>

            {/* Compact Horizontal Job Title & Metadata Row */}
            <div className="w-full px-4 sm:px-6 lg:px-10 py-3 sm:py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 lg:gap-4">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f6eee2] dark:bg-[#1d1612] text-[#543b23] dark:text-[#ebdcc8] font-bold text-[11px] border border-[#d9c7ab] dark:border-[#463629]">
                    <Building2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    {vacancy.empresaNombre || 'PlataformaML Corporativo'}
                  </span>
                  <span className="text-[11px] text-[#70553b] dark:text-[#baa085] font-semibold">
                    · {vacancy.department}
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl lg:text-[28px] font-bold text-[#3a2818] dark:text-[#f8eee0] tracking-tight leading-tight">
                  {vacancy.title}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#6d4f31] dark:text-[#dec9a7] shrink-0">
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#f6eee2]/80 dark:bg-[#1d1612]/80 border border-[#d9c7ab]/80 dark:border-[#463629]">
                  <MapPin className="w-3 h-3 text-[#8d6741] dark:text-[#c4a482]" />
                  {vacancy.location}
                </span>
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#f6eee2]/80 dark:bg-[#1d1612]/80 border border-[#d9c7ab]/80 dark:border-[#463629]">
                  <Building2 className="w-3 h-3 text-[#8d6741] dark:text-[#c4a482]" />
                  {vacancy.workMode}
                </span>
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#f6eee2]/80 dark:bg-[#1d1612]/80 border border-[#d9c7ab]/80 dark:border-[#463629]">
                  <Clock className="w-3 h-3 text-[#8d6741] dark:text-[#c4a482]" />
                  {vacancy.type}
                </span>
                {vacancy.openings && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold font-mono-tabular">
                    {vacancy.openings} {vacancy.openings === 1 ? 'plaza' : 'plazas'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row: Grid with Shared Internal Borders (Divide Left Form & Right Process) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x-2 divide-[#c8b193] dark:divide-[#4d3c2e] w-full flex-1 items-stretch">
            {/* Left Cell: Postulation Form or Auth Gate */}
            <div className="lg:col-span-8 p-4 sm:p-6 lg:px-8 lg:py-5 space-y-3.5 bg-white dark:bg-slate-900 flex flex-col justify-center">
              {!isAuthenticated ? (
                /* Security Gate: Candidate must be logged in to prevent spoofing */
                <div className="text-center py-10 px-4 space-y-6">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/70 dark:border-emerald-800 shadow-xs">
                    <ShieldCheck className="w-8 h-8" />
                  </div>

                  <div className="max-w-md mx-auto space-y-2">
                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                      Inicia sesión para postularte
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      Para garantizar la trazabilidad de tu postulación y proteger tus datos personales, debes acceder con tu cuenta verificada de candidato. No se admiten postulaciones anónimas.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <Button
                      onClick={() => onNavigate('login')}
                      size="lg"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-semibold px-6 cursor-pointer"
                    >
                      <LogIn className="w-4 h-4" /> Iniciar Sesión
                    </Button>
                    <Button
                      onClick={() => onNavigate('login')}
                      variant="outline"
                      size="lg"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-semibold px-6 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" /> Crear Cuenta de Candidato
                    </Button>
                  </div>

                  <div className="pt-4 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Tu postulación quedará enlazada exclusivamente a tu identidad verificada</span>
                  </div>
                </div>
              ) : !isCandidate ? (
                /* Wrong Role Gate */
                <div className="text-center py-8 px-4 space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Acceso exclusivo para Candidatos
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Actualmente has iniciado sesión como <strong>{user?.role}</strong> ({user?.name}). Para postularte
                    a esta vacante debes usar una cuenta de tipo Candidato.
                  </p>
                  <Button
                    onClick={() => onNavigate('login')}
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                  >
                    Cambiar de cuenta
                  </Button>
                </div>
              ) : (
                /* Authenticated Candidate Form */
                <>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-[#C8FF45] text-[11px] font-semibold border border-emerald-500/30 dark:border-[#C8FF45]/35 mb-1">
                      <UserCheck className="w-3 h-3" /> Identidad Verificada
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-[#090A0C] dark:text-[#F1F2EC] leading-snug">
                      Confirmar postulación a {vacancy.title}
                    </h2>
                    <p className="text-xs text-[#777873] mt-0.5">
                      Tu postulación será enviada a <strong className="text-[#090A0C] dark:text-[#F1F2EC]">{vacancy.empresaNombre || 'la empresa convocante'}</strong> vinculada a tu cuenta.
                    </p>
                  </div>

                  {/* Candidate Verified Identity Strip + Phone inline on desktop */}
                  <div className="glass-panel rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#4C6FFF] text-[#F1F2EC] font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                        {user?.avatar || user?.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-[#090A0C] dark:text-[#F1F2EC] text-xs sm:text-sm truncate">
                          {user?.name}
                        </h4>
                        <p className="text-[11px] text-[#777873] truncate">{user?.email}</p>
                      </div>
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-700 dark:text-[#C8FF45] bg-emerald-500/15 dark:bg-[#C8FF45]/15 px-2.5 py-1 rounded-full self-start sm:self-auto border border-emerald-500/30 dark:border-[#C8FF45]/35 shrink-0">
                      Candidato Autenticado
                    </span>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <Input
                      label="Teléfono de contacto / WhatsApp *"
                      type="tel"
                      placeholder="+1 (809) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />

                    {/* Uploaders Section with Affordance */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#090A0C] dark:text-[#F1F2EC]">
                        Documentos requeridos para evaluación algorítmica
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FileUploader
                          type="idCard"
                          label="Cédula de Identidad (PDF/JPG)"
                          sublabel="Identidad oficial · Máx. 5 MB"
                          selectedFile={idCardFile}
                          onFileSelect={setIdCardFile}
                        />

                        <FileUploader
                          type="cv"
                          label="Currículum Vitae *"
                          sublabel="PDF o Word para IA · Máx. 5 MB"
                          selectedFile={cvFile}
                          onFileSelect={setCvFile}
                        />
                      </div>
                    </div>

                    {/* Legal disclaimer - RNF03: Ética y Privacidad */}
                    <p className="text-[11px] text-[#777873] leading-snug">
                      Al enviar tu postulación, confirmas que la información suministrada es veraz y autorizas
                      el procesamiento de tu CV mediante algoritmos de afinidad profesional sin sesgos demográficos.
                    </p>

                    {/* Primary Submit CTA with Strong Affordance */}
                    <Button
                      type="submit"
                      size="lg"
                      fullWidth
                      isLoading={isSubmitting}
                      className="font-bold text-sm sm:text-base py-2.5 sm:py-3 cursor-pointer"
                    >
                      Enviar Postulación Segura
                    </Button>
                  </form>
                </>
              )}
            </div>

            {/* Right Cell: Unified Manila Folder Selection Process (Shared Borders) */}
            <div className="lg:col-span-4 bg-[#e5d4bc] dark:bg-[#2c221a] flex flex-col divide-y divide-[#c8b193]/70 dark:divide-[#4d3c2e]/70">
              {/* Folder Top Tab Strip */}
              <div className="px-4 sm:px-5 py-2.5 bg-[#dfcbaf] dark:bg-[#382b20] flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-black text-[#422e1c] dark:text-[#f3e7d6] uppercase tracking-wider">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                  <span>Proceso de Selección IA</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#cbb597]/40 dark:bg-[#1d1612] text-[#553920] dark:text-[#eedec9] truncate max-w-[130px]">
                  {vacancy.empresaNombre || 'PLATAFORMAML'}
                </span>
              </div>

              {/* Top Section: Proceso ágil con Machine Learning */}
              <div className="p-4 sm:p-5 space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-[#3a2818] dark:text-[#f8eee0] leading-snug">
                    Proceso ágil con Machine Learning
                  </h3>
                </div>
                <p className="text-[11px] sm:text-xs text-[#6d4f31] dark:text-[#dec9a7] leading-snug">
                  El modelo de afinidad profesional evalúa tu concordancia técnica con <strong className="text-[#3a2818] dark:text-[#f8eee0] font-bold">{vacancy.title}</strong>, reduciendo la respuesta de días a minutos.
                </p>
              </div>

              {/* Bottom Section: Flujo de Selección Transparente */}
              <div className="p-4 sm:p-5 space-y-2.5 bg-[#ecdcc6]/50 dark:bg-[#231b14] flex-1 flex flex-col justify-center">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-[#422e1c] dark:text-[#f3e7d6] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  <span>Flujo de Selección Transparente</span>
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#f6eee2]/90 dark:bg-[#1a140f] border border-[#d9c7ab]/80 dark:border-[#382b20]">
                    <div className="w-6 h-6 rounded-lg bg-[#dfcbaf] dark:bg-[#2c221a] text-[#543b23] dark:text-[#dec9a7] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                      <Mail className="w-3 h-3" />
                    </div>
                    <div>
                      <p className="font-bold text-[#3a2818] dark:text-[#f8eee0] text-[11px] sm:text-xs">1. Recepción y Scoring</p>
                      <p className="text-[#70553b] dark:text-[#baa085] text-[10px] sm:text-[11px] leading-tight">
                        Clasificación algorítmica objetiva del CV.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#f6eee2]/90 dark:bg-[#1a140f] border border-[#d9c7ab]/80 dark:border-[#382b20]">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                      <MessageSquare className="w-3 h-3" />
                    </div>
                    <div>
                      <p className="font-bold text-[#3a2818] dark:text-[#f8eee0] text-[11px] sm:text-xs">2. Notificación Automatizada</p>
                      <p className="text-[#70553b] dark:text-[#baa085] text-[10px] sm:text-[11px] leading-tight">
                        Confirmación instantánea de postulación.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#f6eee2]/90 dark:bg-[#1a140f] border border-[#d9c7ab]/80 dark:border-[#382b20]">
                    <div className="w-6 h-6 rounded-lg bg-sky-500/15 dark:bg-sky-500/20 text-sky-800 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                      <ShieldCheck className="w-3 h-3" />
                    </div>
                    <div>
                      <p className="font-bold text-[#3a2818] dark:text-[#f8eee0] text-[11px] sm:text-xs">3. Decisión Humana Responsable</p>
                      <p className="text-[#70553b] dark:text-[#baa085] text-[10px] sm:text-[11px] leading-tight">
                        El reclutador valida la explicación del modelo antes de avanzar.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
