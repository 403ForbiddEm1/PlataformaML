import React, { useState } from 'react';
import { UserRole } from '@/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { TiltGlassCard } from '@/components/ui/TiltGlassCard';
import {
  Lock,
  Building2,
  UserPlus,
  ShieldCheck,
  KeyRound,
  Check,
  ArrowLeft,
  ArrowRight,
  Laptop,
  FileText,
  FileCheck2,
  Briefcase,
  Cpu,
  Mail,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { authService } from '@/services/auth.service';
import { empresaService } from '@/services/empresa.service';

interface LoginPageProps {
  onLoginSuccess: (role: UserRole) => void;
  onNavigateRegister?: () => void;
  onGoToVacancies?: () => void;
}

type AuthPanelMode = 'login' | 'register-candidate' | 'register-company';

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onGoToVacancies,
}) => {
  const { login, register } = useAuth();
  const { isDark } = useTheme();
  const { showToast } = useToast();

  // Animated split-diagonal mode: triggers diagonal slide ONLY when opening Candidato or Empresa signup
  const [authMode, setAuthMode] = useState<AuthPanelMode>('login');
  const [isRecoverMode, setIsRecoverMode] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Inline password recovery state
  const [recoverEmail, setRecoverEmail] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);

  // Register Candidate state (RF01, RF05)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Register Company state (RF01, Multi-Tenant)
  const [compName, setCompName] = useState('');
  const [compRif, setCompRif] = useState('');
  const [compDomain, setCompDomain] = useState('');
  const [compAdminName, setCompAdminName] = useState('');
  const [compAdminEmail, setCompAdminEmail] = useState('');
  const [compAdminPhone, setCompAdminPhone] = useState('');
  const [compPassword, setCompPassword] = useState('');
  const [isRegisteringCompany, setIsRegisteringCompany] = useState(false);

  const isRegisterMode = authMode !== 'login';

  const openCandidateRegister = () => {
    setIsRecoverMode(false);
    setAuthMode('register-candidate');
  };

  const openCompanyRegister = () => {
    setIsRecoverMode(false);
    setAuthMode('register-company');
  };

  const backToLogin = () => {
    setAuthMode('login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Campos requeridos', 'Por favor ingresa tu correo y contraseña.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const loggedInUser = await login({ email, password });

      const roleTitles: Record<UserRole, string> = {
        candidato: 'Candidato',
        rrhh: `Reclutador / Talento Humano (${loggedInUser.empresaNombre || 'Empresa'})`,
        admin: `Administrador de Empresa (${loggedInUser.empresaNombre || 'Empresa'})`,
        administrador: `Administrador de Empresa (${loggedInUser.empresaNombre || 'Empresa'})`,
        superadmin: 'Superadministrador de la Plataforma',
      };

      showToast(
        '¡Acceso Autorizado!',
        `Has iniciado sesión como ${roleTitles[loggedInUser.role] || loggedInUser.role}.`,
        'success'
      );
      onLoginSuccess(loggedInUser.role);
    } catch (err: any) {
      showToast(
        'Error al ingresar',
        err?.message || 'Credenciales inválidas. Verifica tu correo y contraseña.',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoverEmail) return;
    setIsRecovering(true);
    try {
      await authService.recoverPassword(recoverEmail);
      showToast(
        'Correo de recuperación enviado',
        'Hemos enviado un enlace seguro para restablecer tu clave.',
        'success'
      );
      setIsRecoverMode(false);
      setRecoverEmail('');
    } finally {
      setIsRecovering(false);
    }
  };

  const handleRegisterCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) return;
    setIsRegistering(true);
    try {
      await register({
        name: regName,
        email: regEmail,
        password: regPassword,
        phone: regPhone,
      });
      showToast('Registro exitoso', 'Tu cuenta de candidato ha sido creada.', 'success');
      onLoginSuccess('candidato');
    } catch {
      showToast('Error', 'No se pudo completar el registro de candidato.', 'error');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRegisterCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName || !compAdminEmail || !compPassword) {
      showToast('Campos incompletos', 'Completa los datos de la empresa y del administrador.', 'error');
      return;
    }
    setIsRegisteringCompany(true);
    try {
      const result = await empresaService.registerCompany({
        nombreEmpresa: compName,
        rif: compRif,
        dominio: compDomain,
        adminName: compAdminName,
        adminEmail: compAdminEmail,
        password: compPassword,
        phone: compAdminPhone,
      });
      showToast(
        'Empresa Registrada',
        `La solicitud de afiliación de "${result.empresa.nombre}" fue enviada. Tu cuenta se encuentra en revisión y el Administrador Global la habilitará en breve.`,
        'success'
      );
      setAuthMode('login');
      setCompName('');
      setCompRif('');
      setCompDomain('');
      setCompAdminName('');
      setCompAdminEmail('');
      setCompAdminPhone('');
      setCompPassword('');
    } catch (err: any) {
      showToast('Error', err?.message || 'No se pudo completar el registro de la empresa.', 'error');
    } finally {
      setIsRegisteringCompany(false);
    }
  };

  return (
    <div className="relative min-h-dvh lg:h-dvh w-full bg-[#F1F2EC] dark:bg-[#090A0C] text-[#090A0C] dark:text-[#F1F2EC] flex flex-col overflow-x-hidden lg:overflow-hidden select-none transition-colors duration-300">
      {/* =====================================================================
          1. BACKGROUND WORKSPACE PHOTO + GRADIENT + FLOATING VECTOR PARTICLES
         ===================================================================== */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className={`absolute inset-0 transition-opacity duration-500 ease-out ${
            isRegisterMode ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div
            className="absolute inset-y-0 left-0 w-full lg:w-[68%] bg-cover bg-center bg-no-repeat opacity-55 dark:opacity-75 lg:opacity-70 lg:dark:opacity-90"
            style={{
              backgroundImage: `url('/login-bg.png')`,
              filter: 'grayscale(100%) contrast(1.08)',
            }}
          />

          <div
            className="absolute inset-0 transition-opacity duration-300"
            style={{
              background: isDark
                ? 'linear-gradient(90deg, rgba(9, 10, 12, 0.16) 0%, rgba(9, 10, 12, 0.42) 40%, rgba(9, 10, 12, 0.85) 66%, #090A0C 84%, #090A0C 100%)'
                : 'linear-gradient(90deg, rgba(241, 242, 236, 0.14) 0%, rgba(241, 242, 236, 0.42) 40%, rgba(241, 242, 236, 0.86) 66%, #F1F2EC 84%, #F1F2EC 100%)',
            }}
          />

          <div
            className="absolute inset-0 transition-opacity duration-300"
            style={{
              background: isDark
                ? 'linear-gradient(180deg, rgba(9, 10, 12, 0.52) 0%, rgba(9, 10, 12, 0.06) 45%, rgba(9, 10, 12, 0.64) 100%)'
                : 'linear-gradient(180deg, rgba(241, 242, 236, 0.52) 0%, rgba(241, 242, 236, 0.08) 45%, rgba(241, 242, 236, 0.64) 100%)',
            }}
          />
        </div>

        {/* Partículas activas únicamente en modo Registro, restringidas a la mitad derecha (lado oscuro/limpio) */}
        {isRegisterMode && (
          <div className="absolute inset-y-0 left-0 lg:left-1/2 right-0 overflow-hidden pointer-events-none">
            <div
              className="ambient-vector-particle absolute top-[12%] left-[18%] text-[#4C6FFF] dark:text-[#C8FF45] dark:drop-shadow-[0_0_8px_rgba(200,255,69,0.5)]"
              style={{ '--anim-duration': '7.2s', '--anim-delay': '0.2s', '--move-x': '20px', '--move-y': '-26px', '--move-rot': '8deg' } as React.CSSProperties}
            >
              <Laptop className="w-4 h-4" />
            </div>
            <div
              className="ambient-vector-particle absolute top-[24%] right-[12%] text-[#4C6FFF]/80 dark:text-[#C8FF45] dark:drop-shadow-[0_0_8px_rgba(200,255,69,0.45)]"
              style={{ '--anim-duration': '8.4s', '--anim-delay': '1.1s', '--move-x': '-18px', '--move-y': '-22px', '--move-rot': '-10deg' } as React.CSSProperties}
            >
              <FileText className="w-4 h-4" />
            </div>
            <div
              className="ambient-vector-particle absolute top-[58%] left-[12%] text-[#4C6FFF] dark:drop-shadow-[0_0_8px_rgba(76,111,255,0.5)]"
              style={{ '--anim-duration': '7.8s', '--anim-delay': '0.7s', '--move-x': '22px', '--move-y': '-20px', '--move-rot': '6deg' } as React.CSSProperties}
            >
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div
              className="ambient-vector-particle absolute bottom-[16%] right-[14%] text-[#090A0C]/65 dark:text-[#C8FF45] dark:drop-shadow-[0_0_8px_rgba(200,255,69,0.5)]"
              style={{ '--anim-duration': '8.1s', '--anim-delay': '1.8s', '--move-x': '-24px', '--move-y': '-28px', '--move-rot': '-8deg' } as React.CSSProperties}
            >
              <Briefcase className="w-4 h-4" />
            </div>
            <div
              className="ambient-vector-particle absolute top-[44%] right-[24%] text-[#4C6FFF]/85 dark:text-[#C8FF45]/90 dark:drop-shadow-[0_0_8px_rgba(200,255,69,0.4)]"
              style={{ '--anim-duration': '6.9s', '--anim-delay': '0.5s', '--move-x': '18px', '--move-y': '-24px', '--move-rot': '10deg' } as React.CSSProperties}
            >
              <Cpu className="w-4 h-4" />
            </div>
            <div
              className="ambient-vector-particle absolute bottom-[28%] left-[32%] text-[#4C6FFF]/75 dark:text-[#C8FF45]/80 dark:drop-shadow-[0_0_8px_rgba(200,255,69,0.35)]"
              style={{ '--anim-duration': '7.6s', '--anim-delay': '1.4s', '--move-x': '16px', '--move-y': '-22px', '--move-rot': '-6deg' } as React.CSSProperties}
            >
              <Laptop className="w-3.5 h-3.5" />
            </div>
            <span
              className="ambient-vector-particle absolute top-[18%] right-[30%] w-1.5 h-1.5 rounded-full bg-[#6A8E00] dark:bg-[#C8FF45] shadow-[0_0_8px_#C8FF45]"
              style={{ '--anim-duration': '6.1s', '--anim-delay': '0.4s', '--move-x': '14px', '--move-y': '-22px', '--move-rot': '0deg' } as React.CSSProperties}
            />
            <span
              className="ambient-vector-particle absolute top-[48%] left-[24%] w-1.5 h-1.5 rounded-full bg-[#4C6FFF] shadow-[0_0_8px_#4C6FFF]"
              style={{ '--anim-duration': '6.8s', '--anim-delay': '1.2s', '--move-x': '-16px', '--move-y': '-20px', '--move-rot': '0deg' } as React.CSSProperties}
            />
            <span
              className="ambient-vector-particle absolute bottom-[22%] right-[36%] w-1.5 h-1.5 rounded-full bg-[#6A8E00] dark:bg-[#C8FF45] shadow-[0_0_8px_#C8FF45]"
              style={{ '--anim-duration': '5.9s', '--anim-delay': '0.9s', '--move-x': '18px', '--move-y': '-24px', '--move-rot': '0deg' } as React.CSSProperties}
            />
            <span
              className="ambient-vector-particle absolute top-[72%] right-[16%] w-1.5 h-1.5 rounded-full bg-[#4C6FFF] shadow-[0_0_8px_#4C6FFF]"
              style={{ '--anim-duration': '6.5s', '--anim-delay': '1.9s', '--move-x': '-14px', '--move-y': '-22px', '--move-rot': '0deg' } as React.CSSProperties}
            />
          </div>
        )}
      </div>

      {/* =====================================================================
          2. SHARED-BORDER UNIFIED FRAME (Full-Width & Full-Height Shared Borders)
         ===================================================================== */}
      <div className="relative z-10 w-full flex-1 min-h-0 flex flex-col border-x border-[#090A0C]/16 dark:border-[#F1F2EC]/14">
        {/* TOP NAVIGATION BAR (Shares Top/Left/Right Borders with Auth Stage) */}
        <header className="w-full px-5 sm:px-8 lg:px-12 py-3 sm:py-3.5 border-b border-[#090A0C]/16 dark:border-[#F1F2EC]/14 bg-[#F1F2EC]/45 dark:bg-[#090A0C]/45 backdrop-blur-xl flex items-center justify-between gap-3 shrink-0">
          <div
            onClick={onGoToVacancies}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group min-w-0"
          >
            <BrandLogo className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl p-1 sm:p-1.5 group-hover:scale-105 transition-transform" />
            <div className="flex flex-col min-w-0">
              <span className="font-heading font-bold text-[#090A0C] dark:text-[#F1F2EC] text-base sm:text-lg leading-none tracking-tight group-hover:text-[#4C6FFF] dark:group-hover:text-[#C8FF45] transition-colors truncate">
                PlataformaML
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono-tabular tracking-[0.12em] sm:tracking-[0.14em] font-semibold text-[#4C6FFF] dark:text-[#C8FF45] uppercase mt-0.5 sm:mt-1 truncate">
                ECOSISTEMA MULTI-EMPRESA
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <ThemeToggle />
            {onGoToVacancies && (
              <button
                type="button"
                onClick={onGoToVacancies}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-medium text-[#090A0C] dark:text-[#F1F2EC] bg-[#090A0C]/8 dark:bg-[#F1F2EC]/10 hover:bg-[#090A0C]/12 dark:hover:bg-[#F1F2EC]/15 border border-[#090A0C]/20 dark:border-[#F1F2EC]/16 hover:border-[#4C6FFF]/60 dark:hover:border-[#C8FF45]/50 backdrop-blur-md shadow-[0_3px_0_#64748b] dark:shadow-[0_3px_0_#0f172a] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#4C6FFF] dark:text-[#C8FF45]" />
                <span className="hidden sm:inline">Explorar convocatorias</span>
                <span className="sm:hidden">Vacantes</span>
              </button>
            )}
          </div>
        </header>

        {/* =====================================================================
            3. SPLIT-DIAGONAL AUTH STAGE (Shares All 4 Borders + Animated Border Beam)
           ===================================================================== */}
        <main
          className={`flex-1 min-h-0 relative overflow-hidden bg-[#F1F2EC]/18 dark:bg-[#090A0C]/24 backdrop-blur-[2px] login-auth-stage login-animated-perimeter grid grid-cols-1 lg:grid-cols-2 ${
            isRegisterMode ? 'is-register' : ''
          }`}
        >
          {/* LEFT HALF: SIGN IN / INLINE PASSWORD RECOVERY */}
          <section
            className={`login-form-pane--login relative z-10 flex flex-col justify-center px-5 sm:px-10 lg:pl-12 lg:pr-14 xl:pl-16 xl:pr-16 py-6 sm:py-8 overflow-y-auto ${
              isRegisterMode ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <div className="w-full max-w-md mx-auto space-y-4">
              {!isRecoverMode ? (
                <>
                  {/* Card Header (Clean, without PORTAL DE ACCESO UNIFICADO) */}
                  <div className="space-y-1.5">
                    <h1 className="font-heading text-2xl sm:text-3xl xl:text-[32px] font-bold text-[#090A0C] dark:text-[#F1F2EC] tracking-tight leading-tight">
                      Iniciar sesión
                    </h1>
                    <p className="text-xs text-[#777873] font-normal leading-snug">
                      Ingresa tus credenciales para acceder a tu expediente, mesa de evaluación o consola corporativa.
                    </p>
                  </div>

                  {/* Login Form */}
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <Input
                      label="Correo electrónico"
                      type="email"
                      placeholder="nombre@empresa.com"
                      leftIcon={<Mail className="w-4 h-4" />}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-white/75! dark:bg-black/35! backdrop-blur-md! text-[#090A0C]! dark:text-[#F1F2EC]! border-slate-300/70! dark:border-white/14! shadow-[inset_2px_2px_6px_rgba(15,23,42,0.06),inset_-2px_-2px_6px_rgba(255,255,255,0.6)]! dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.5),inset_-1px_-1px_4px_rgba(255,255,255,0.05)]! focus:border-[#4C6FFF]! dark:focus:border-[#C8FF45]!"
                      required
                    />

                    <div className="space-y-1">
                      <Input
                        label="Contraseña"
                        type="password"
                        placeholder="••••••••"
                        isPassword
                        leftIcon={<Lock className="w-4 h-4" />}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-white/75! dark:bg-black/35! backdrop-blur-md! text-[#090A0C]! dark:text-[#F1F2EC]! border-slate-300/70! dark:border-white/14! shadow-[inset_2px_2px_6px_rgba(15,23,42,0.06),inset_-2px_-2px_6px_rgba(255,255,255,0.6)]! dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.5),inset_-1px_-1px_4px_rgba(255,255,255,0.05)]! focus:border-[#4C6FFF]! dark:focus:border-[#C8FF45]!"
                        required
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setIsRecoverMode(true)}
                          className="text-[11px] sm:text-xs font-medium text-[#777873] hover:text-[#4C6FFF] dark:hover:text-[#C8FF45] transition-colors cursor-pointer"
                        >
                          ¿Olvidaste tu contraseña?
                        </button>
                      </div>
                    </div>

                    <div className="pt-1">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-2.5 sm:py-3 px-5 rounded-xl bg-[#C8FF45] hover:bg-[#D5FF6B] text-[#090A0C] font-heading font-bold text-sm tracking-tight border border-[#84cc16] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_0_#3f6212] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_5px_0_#3f6212] hover:-translate-y-[1px] active:translate-y-[3px] active:shadow-none transition-all duration-150 inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <span>{isLoading ? 'Verificando credenciales...' : 'Ingresar a PlataformaML'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>

                  {/* Registration Triggers -> Slides Inclined Diagonal Panel to Left */}
                  <div className="space-y-2.5 pt-3 border-t border-[#090A0C]/12 dark:border-[#F1F2EC]/12">
                    <p className="text-[11px] font-medium text-[#777873] text-center">
                      ¿Aún no tienes cuenta en la plataforma?
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={openCandidateRegister}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#090A0C] hover:text-[#090A0C] dark:text-[#C8FF45] dark:hover:text-white !bg-white/85 hover:!bg-white dark:!bg-[#12151C]/85 dark:hover:!bg-[#1B202B] backdrop-blur-xs border border-[#090A0C]/18 dark:border-[#C8FF45]/45 hover:border-[#4C6FFF] dark:hover:border-[#C8FF45] shadow-[0_3px_0_#64748b] dark:shadow-[0_3px_0_#3f6212] hover:shadow-[0_4px_0_#475569] dark:hover:shadow-[0_4px_0_#3f6212] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none transition-all duration-150 cursor-pointer group"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-[#4C6FFF] dark:text-[#C8FF45] group-hover:text-[#090A0C] dark:group-hover:text-white shrink-0" />
                        <span>Soy Candidato</span>
                      </button>

                      <button
                        type="button"
                        onClick={openCompanyRegister}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white hover:text-white bg-[#4C6FFF] hover:bg-[#6180FF] border border-[#2563eb] shadow-[0_3px_0_#1e40af] hover:shadow-[0_4px_0_#1e40af] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none transition-all duration-150 cursor-pointer"
                      >
                        <Building2 className="w-3.5 h-3.5 text-white shrink-0" />
                        <span>Afiliar Empresa</span>
                      </button>
                    </div>
                  </div>

                  {/* Security Footer Badge */}
                  <div className="pt-0.5 flex items-center justify-center gap-2 text-[11px] text-[#777873]">
                    <Lock className="w-3.5 h-3.5 text-[#4C6FFF]/80 dark:text-[#C8FF45]/80 shrink-0" />
                    <span>Sesión cifrada con JWT y aislamiento Multi-Tenant</span>
                  </div>
                </>
              ) : (
                /* Inline Password Recovery View (No Modal) */
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setIsRecoverMode(false)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4C6FFF] dark:text-[#C8FF45] hover:underline cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Volver a Iniciar sesión</span>
                  </button>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#4C6FFF]/15 text-[#4C6FFF] dark:bg-[#C8FF45]/15 dark:text-[#C8FF45] border border-[#4C6FFF]/30 dark:border-[#C8FF45]/30 flex items-center justify-center shrink-0">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="font-heading text-xl font-bold text-[#090A0C] dark:text-[#F1F2EC] tracking-tight">
                          Recuperar acceso
                        </h2>
                        <p className="text-[11px] text-[#777873]">
                          Código de seguridad válido por 15 minutos
                        </p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleRecover} className="space-y-3.5">
                    <Input
                      label="Correo electrónico registrado *"
                      type="email"
                      value={recoverEmail}
                      onChange={(e) => setRecoverEmail(e.target.value)}
                      placeholder="ejemplo@correo.com"
                      leftIcon={<Mail className="w-4 h-4" />}
                      className="bg-white/75! dark:bg-black/35! backdrop-blur-md!"
                      required
                    />

                    <div className="flex items-center gap-2.5 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsRecoverMode(false)}
                        className="cursor-pointer"
                      >
                        Cancelar
                      </Button>
                      <button
                        type="submit"
                        disabled={isRecovering}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-[#C8FF45] hover:bg-[#D5FF6B] text-[#090A0C] font-heading font-bold text-xs tracking-tight border border-[#84cc16] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_3px_0_#3f6212] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isRecovering ? 'Enviando enlace...' : 'Enviar enlace de recuperación'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </section>

          {/* RIGHT HALF: INLINE REGISTRATION PANEL (Candidate or Company, replaces Modals) */}
          <section
            className={`login-form-pane--register relative z-10 flex flex-col justify-center px-5 sm:px-10 lg:pl-14 lg:pr-12 xl:pl-16 xl:pr-14 py-5 sm:py-6 overflow-y-auto ${
              !isRegisterMode ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <div className="w-full max-w-lg mx-auto space-y-3.5">
              {/* Top Mode Switcher Bar (for < lg mobile back button & quick toggle) */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#090A0C]/10 dark:border-[#F1F2EC]/10">
                <button
                  type="button"
                  onClick={backToLogin}
                  className="lg:hidden inline-flex items-center gap-1.5 text-xs font-semibold text-[#4C6FFF] dark:text-[#C8FF45] cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver al login</span>
                </button>

                <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-[#090A0C]/6 dark:bg-[#F1F2EC]/8 border border-[#090A0C]/12 dark:border-[#F1F2EC]/12">
                  <button
                    type="button"
                    onClick={() => setAuthMode('register-candidate')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      authMode === 'register-candidate'
                        ? 'bg-[#C8FF45] text-[#090A0C] shadow-xs'
                        : 'text-[#777873] hover:text-[#090A0C] dark:hover:text-[#F1F2EC]'
                    }`}
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>Soy Candidato</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('register-company')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      authMode === 'register-company'
                        ? 'bg-[#4C6FFF] text-white shadow-xs'
                        : 'text-[#777873] hover:text-[#090A0C] dark:hover:text-[#F1F2EC]'
                    }`}
                  >
                    <Building2 className="w-3 h-3" />
                    <span>Afiliar Empresa</span>
                  </button>
                </div>
              </div>

              {authMode === 'register-company' ? (
                /* INLINE COMPANY REGISTRATION */
                <form onSubmit={handleRegisterCompany} className="space-y-3">
                  <div>
                    <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#090A0C] dark:text-[#F1F2EC] tracking-tight leading-tight">
                      Afiliar Nueva Organización
                    </h2>
                    <p className="text-[11px] text-[#777873] mt-0.5">
                      Habilita reclutamiento inteligente y gestión de plantilla multi-tenant.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#090A0C]/[0.04] dark:bg-[#F1F2EC]/[0.04] border border-[#090A0C]/10 dark:border-[#F1F2EC]/10 space-y-2.5">
                    <h4 className="font-heading text-[11px] font-bold text-[#090A0C] dark:text-[#F1F2EC] uppercase tracking-wider flex items-center gap-2">
                      <span className="w-4 h-4 rounded bg-[#C8FF45] text-[#090A0C] font-mono-tabular font-bold flex items-center justify-center text-[10px]">
                        1
                      </span>
                      <span>Entidad Corporativa</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <Input
                        label="Nombre Empresa *"
                        value={compName}
                        onChange={(e) => setCompName(e.target.value)}
                        placeholder="Corporación Caribe"
                        className="py-1.5 text-xs bg-white/75! dark:bg-black/35!"
                        required
                      />
                      <Input
                        label="RIF / ID Fiscal"
                        value={compRif}
                        onChange={(e) => setCompRif(e.target.value)}
                        placeholder="J-40192837-1"
                        className="py-1.5 text-xs bg-white/75! dark:bg-black/35!"
                      />
                      <Input
                        label="Dominio Web"
                        value={compDomain}
                        onChange={(e) => setCompDomain(e.target.value)}
                        placeholder="empresa.com"
                        className="py-1.5 text-xs bg-white/75! dark:bg-black/35!"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#090A0C]/[0.04] dark:bg-[#F1F2EC]/[0.04] border border-[#090A0C]/10 dark:border-[#F1F2EC]/10 space-y-2.5">
                    <h4 className="font-heading text-[11px] font-bold text-[#090A0C] dark:text-[#F1F2EC] uppercase tracking-wider flex items-center gap-2">
                      <span className="w-4 h-4 rounded bg-[#4C6FFF] text-white font-mono-tabular font-bold flex items-center justify-center text-[10px]">
                        2
                      </span>
                      <span>Administrador Principal</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <Input
                        label="Nombre Administrador *"
                        value={compAdminName}
                        onChange={(e) => setCompAdminName(e.target.value)}
                        placeholder="Ing. Sofía Velásquez"
                        className="py-1.5 text-xs bg-white/75! dark:bg-black/35!"
                        required
                      />
                      <Input
                        label="Correo Corporativo *"
                        type="email"
                        value={compAdminEmail}
                        onChange={(e) => setCompAdminEmail(e.target.value)}
                        placeholder="sofia@empresa.com"
                        className="py-1.5 text-xs bg-white/75! dark:bg-black/35!"
                        required
                      />
                      <Input
                        label="Teléfono Corporativo"
                        value={compAdminPhone}
                        onChange={(e) => setCompAdminPhone(e.target.value)}
                        placeholder="+1 (809) 555-0371"
                        className="py-1.5 text-xs bg-white/75! dark:bg-black/35!"
                      />
                      <Input
                        label="Contraseña de Acceso *"
                        type="password"
                        isPassword
                        value={compPassword}
                        onChange={(e) => setCompPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        className="py-1.5 text-xs bg-white/75! dark:bg-black/35!"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={backToLogin}
                      className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#090A0C] hover:text-[#090A0C] dark:text-[#F1F2EC] dark:hover:text-white !bg-white/85 hover:!bg-white dark:!bg-[#12151C]/85 dark:hover:!bg-[#1B202B] border border-[#090A0C]/18 dark:border-white/15 shadow-[0_3px_0_#64748b] dark:shadow-[0_3px_0_#020617] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isRegisteringCompany}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-[#4C6FFF] hover:bg-[#6180FF] text-white font-heading font-bold text-xs sm:text-sm tracking-tight border border-[#2563eb] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_4px_0_#1e40af] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_5px_0_#1e40af] hover:-translate-y-[1px] active:translate-y-[3px] active:shadow-none transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Building2 className="w-4 h-4" />
                      <span>{isRegisteringCompany ? 'Enviando solicitud...' : 'Solicitar Alta de Empresa'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* INLINE CANDIDATE REGISTRATION */
                <form onSubmit={handleRegisterCandidate} className="space-y-3.5">
                  <div>
                    <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#090A0C] dark:text-[#F1F2EC] tracking-tight leading-tight">
                      Apertura de Expediente de Candidato
                    </h2>
                    <p className="text-xs text-[#777873] mt-0.5">
                      Crea tu cuenta oficial en PlataformaML para postularte y gestionar tu currículum.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Nombres y Apellidos *"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Valeria Mendoza"
                      className="bg-white/75! dark:bg-black/35! backdrop-blur-md!"
                      required
                    />
                    <Input
                      label="Correo Electrónico *"
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="valeria@correo.com"
                      className="bg-white/75! dark:bg-black/35! backdrop-blur-md!"
                      required
                    />
                    <Input
                      label="Teléfono / WhatsApp"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+1 (809) 000-0000"
                      className="bg-white/75! dark:bg-black/35! backdrop-blur-md!"
                    />
                    <Input
                      label="Contraseña segura *"
                      type="password"
                      isPassword
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="bg-white/75! dark:bg-black/35! backdrop-blur-md!"
                      required
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-[#090A0C]/[0.04] dark:bg-[#F1F2EC]/[0.05] border border-[#777873]/25 flex flex-wrap gap-2.5 text-[11px] font-semibold">
                    <span className="flex items-center gap-1.5 text-[#090A0C] dark:text-[#C8FF45]">
                      <Check className="w-3.5 h-3.5 text-[#4C6FFF] dark:text-[#C8FF45]" /> Expediente digital limpio
                    </span>
                    <span className="text-[#777873]">·</span>
                    <span className="flex items-center gap-1.5 text-[#090A0C] dark:text-[#C8FF45]">
                      <Check className="w-3.5 h-3.5 text-[#4C6FFF] dark:text-[#C8FF45]" /> Afinidad calculada por IA
                    </span>
                    <span className="text-[#777873]">·</span>
                    <span className="flex items-center gap-1.5 text-[#090A0C] dark:text-[#C8FF45]">
                      <Check className="w-3.5 h-3.5 text-[#4C6FFF] dark:text-[#C8FF45]" /> Evaluación sin sesgos
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={backToLogin}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#090A0C] hover:text-[#090A0C] dark:text-[#F1F2EC] dark:hover:text-white !bg-white/85 hover:!bg-white dark:!bg-[#12151C]/85 dark:hover:!bg-[#1B202B] border border-[#090A0C]/18 dark:border-white/15 shadow-[0_3px_0_#64748b] dark:shadow-[0_3px_0_#020617] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isRegistering}
                      className="flex-1 py-2.5 sm:py-3 px-5 rounded-xl bg-[#C8FF45] hover:bg-[#D5FF6B] text-[#090A0C] font-heading font-bold text-xs sm:text-sm tracking-tight border border-[#84cc16] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_0_#3f6212] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_5px_0_#3f6212] hover:-translate-y-[1px] active:translate-y-[3px] active:shadow-none transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <span>{isRegistering ? 'Creando cuenta...' : 'Crear Cuenta y Continuar'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>

          {/* DESKTOP SLIDING INCLINED DIAGONAL OVERLAY PANEL WITH ANIMATED BORDER */}
          <div className="hidden lg:block absolute inset-y-0 left-1/2 w-1/2 z-20 login-overlay-shell">
            <div className="absolute inset-[2px] login-overlay-inner bg-[#F1F2EC]/68 dark:bg-[#090A0C]/62 backdrop-blur-sm flex flex-col justify-center overflow-hidden">
              {!isRegisterMode ? (
                /* OVERLAY STATE A (RIGHT): Editorial Hero Showcase + Telemetry Card */
                <div className="pl-[18%] pr-8 xl:pr-12 py-8 space-y-5 animate-in fade-in duration-300">
                  <div className="space-y-3 max-w-xl">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#090A0C]/85 dark:bg-[#090A0C]/65 backdrop-blur-md text-[#C8FF45] text-[11px] xl:text-xs font-medium shadow-[0_4px_20px_rgba(0,0,0,0.18)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                      <span>Evaluación Curricular Auditable sin Sesgos</span>
                    </div>

                    <h2 className="font-heading text-2xl xl:text-[34px] font-bold text-[#090A0C] dark:text-[#F1F2EC] tracking-tight leading-[1.08]">
                      Talento evaluado por evidencia, no por suposiciones.
                    </h2>

                    <p className="text-xs xl:text-sm text-[#090A0C]/80 dark:text-[#F1F2EC]/80 font-normal leading-relaxed">
                      Cada expediente se procesa con modelos explicables que desglosan competencias técnicas, trayectoria y formación académica con trazabilidad transparente.
                    </p>
                  </div>

                  {/* Telemetry Card: Two Diagonal Corners Unrounded + Minimal 3D Tilt */}
                  <TiltGlassCard
                    maxTiltDeg={2.4}
                    className="rounded-tl-none rounded-br-none rounded-tr-2xl rounded-bl-2xl p-4 xl:p-5 space-y-3 !bg-[#F1F2EC]/78 dark:!bg-[#090A0C]/68"
                  >
                    <div className="flex items-center justify-between border-b border-[#090A0C]/10 dark:border-[#F1F2EC]/10 pb-2.5 relative z-10">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#C8FF45] border border-[#C8FF45] flex items-center justify-center text-[#090A0C]">
                          <Cpu className="w-3.5 h-3.5 text-[#090A0C]" />
                        </div>
                        <div>
                          <span className="text-xs font-heading font-semibold text-[#090A0C] dark:text-[#F1F2EC] block leading-none">
                            Motor de Inferencia XAI v4.2
                          </span>
                          <span className="text-[10px] text-[#777873] font-mono-tabular">
                            AUDITORÍA ALGORÍTMICA EN TIEMPO REAL
                          </span>
                        </div>
                      </div>
                      <span className="font-mono-tabular text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-[#090A0C] dark:bg-[#C8FF45]/15 text-[#C8FF45] border border-[#C8FF45]/35">
                        94.8% PRECISIÓN
                      </span>
                    </div>

                    <div className="space-y-1.5 relative z-10">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#090A0C]/85 dark:text-[#F1F2EC]/90 font-medium">
                          Concordancia de Competencias Verificada
                        </span>
                        <span className="font-mono-tabular text-[#4C6FFF] dark:text-[#C8FF45] font-semibold">94%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#090A0C]/12 dark:bg-[#F1F2EC]/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#4C6FFF] to-[#C8FF45] w-[94%] rounded-full" />
                      </div>
                    </div>

                    <div className="pt-0.5 flex items-center gap-5 text-xs text-[#777873] relative z-10">
                      <div className="flex items-center gap-1.5 text-[#090A0C]/80 dark:text-[#F1F2EC]/85">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#4C6FFF] dark:text-[#C8FF45]" />
                        <span>Cero atributos demográficos</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#090A0C]/80 dark:text-[#F1F2EC]/85">
                        <Building2 className="w-3.5 h-3.5 text-[#4C6FFF]" />
                        <span>Aislamiento Multi-Tenant</span>
                      </div>
                    </div>
                  </TiltGlassCard>
                </div>
              ) : (
                /* OVERLAY STATE B (LEFT AFTER SLIDE): Return to Sign-In CTA */
                <div className="pl-8 xl:pl-12 pr-[18%] py-8 space-y-5 animate-in fade-in duration-300">
                  <div className="space-y-3 max-w-md">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#090A0C]/85 dark:bg-[#090A0C]/65 backdrop-blur-md text-[#C8FF45] text-[11px] xl:text-xs font-medium shadow-[0_4px_20px_rgba(0,0,0,0.18)]">
                      <span>
                        {authMode === 'register-company' ? 'Alta Corporativa Multi-Tenant' : 'Registro de Expediente Digital'}
                      </span>
                    </div>

                    <h2 className="font-heading text-3xl xl:text-[38px] font-bold text-[#090A0C] dark:text-[#F1F2EC] tracking-tight leading-[1.08]">
                      ¿Ya tienes una cuenta activa?
                    </h2>

                    <p className="text-xs xl:text-sm text-[#090A0C]/80 dark:text-[#F1F2EC]/80 font-normal leading-relaxed">
                      {authMode === 'register-company'
                        ? 'Regresa al portal de ingreso para administrar vacantes, evaluadores de RRHH y ranking explicable con IA.'
                        : 'Inicia sesión para consultar tus postulaciones activas, afinidad vectorial y seguimiento en tiempo real.'}
                    </p>
                  </div>

                  <div className="space-y-2 text-xs text-[#090A0C]/80 dark:text-[#F1F2EC]/85">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#4C6FFF] dark:text-[#C8FF45]" />
                      <span>Trazabilidad transparente sin sesgos demográficos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#4C6FFF] dark:text-[#C8FF45]" />
                      <span>Sesión cifrada JWT con aislamiento corporativo</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={backToLogin}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#C8FF45] hover:bg-[#D5FF6B] text-[#090A0C] font-heading font-bold text-sm tracking-tight border border-[#84cc16] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_0_#3f6212] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_5px_0_#3f6212] hover:-translate-y-[1px] active:translate-y-[3px] active:shadow-none transition-all duration-150 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Iniciar sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* BOTTOM MINIMALIST ATTRIBUTION (Shares Bottom/Left/Right Borders, No PALETA text) */}
        <footer className="w-full px-5 sm:px-8 lg:px-12 py-2.5 sm:py-3 border-t border-[#090A0C]/16 dark:border-[#F1F2EC]/14 bg-[#F1F2EC]/45 dark:bg-[#090A0C]/45 backdrop-blur-xl flex items-center justify-between gap-2 text-[11px] text-[#777873] shrink-0">
          <span>© 2026 PlataformaML · Sistema Inteligente de Evaluación Curricular</span>
          <span className="hidden sm:inline font-mono-tabular text-[10px]">JWT · XAI · MULTI-TENANT</span>
        </footer>
      </div>
    </div>
  );
};
