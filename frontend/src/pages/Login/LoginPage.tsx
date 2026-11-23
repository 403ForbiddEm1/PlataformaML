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
  const { login, setSessionUser } = useAuth();
  const { isDark } = useTheme();
  const { showToast } = useToast();

  // Animated split-diagonal mode: triggers diagonal slide ONLY when opening Candidato or Empresa signup
  const [authMode, setAuthMode] = useState<AuthPanelMode>('login');
  const [isRecoverMode, setIsRecoverMode] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Inline password recovery state (Correo o Código de Telegram)
  const [recoverMethod, setRecoverMethod] = useState<'CORREO' | 'TELEGRAM'>('CORREO');
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverPhone, setRecoverPhone] = useState('');
  const [recoverCodeSent, setRecoverCodeSent] = useState(false);
  const [recoverCode, setRecoverCode] = useState('');
  const [recoverNewPassword, setRecoverNewPassword] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);

  // Google Auth + Email 6-digit OTP Verification state (Candidato Login & Registro)
  const [isGoogleFlowOpen, setIsGoogleFlowOpen] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [googlePhone, setGooglePhone] = useState('');
  const [googlePassword, setGooglePassword] = useState('');
  const [googleCodeSent, setGoogleCodeSent] = useState(false);
  const [googleCode, setGoogleCode] = useState('');
  const [isGoogleSending, setIsGoogleSending] = useState(false);
  const [isGoogleVerifying, setIsGoogleVerifying] = useState(false);
  const [googleFlowOrigin, setGoogleFlowOrigin] = useState<'login' | 'register'>('login');
  const [googleAccounts, setGoogleAccounts] = useState<
    Array<{ id: string; email: string; name: string; avatar: string }>
  >([]);
  const [isAddingOtherGoogle, setIsAddingOtherGoogle] = useState(false);
  const [isLoadingGoogleAccounts, setIsLoadingGoogleAccounts] = useState(false);

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
    if (!recoverCodeSent) {
      if (recoverMethod === 'CORREO' && !recoverEmail.trim()) {
        showToast('Correo requerido', 'Ingresa tu correo registrado para recibir el código.', 'error');
        return;
      }
      if (recoverMethod === 'TELEGRAM' && !recoverPhone.trim()) {
        showToast('Número requerido', 'Ingresa tu número de Telegram registrado para recibir el código.', 'error');
        return;
      }
      setIsRecovering(true);
      try {
        const res = await authService.sendPasswordSecurityCode({
          canal: recoverMethod,
          email: recoverMethod === 'CORREO' ? recoverEmail : undefined,
          phone: recoverMethod === 'TELEGRAM' ? recoverPhone : undefined,
        });
        setRecoverCodeSent(true);
        showToast('Código enviado', res.mensaje, 'success');
      } catch (err: any) {
        showToast('No se pudo enviar', err?.message || 'Verifica los datos ingresados.', 'error');
      } finally {
        setIsRecovering(false);
      }
      return;
    }

    if (recoverCode.trim().length < 5) {
      showToast('Código incompleto', 'Ingresa el código de 5 o 6 dígitos que recibiste.', 'error');
      return;
    }
    if (recoverNewPassword.length < 6) {
      showToast('Contraseña muy corta', 'La nueva contraseña debe tener al menos 6 caracteres.', 'error');
      return;
    }
    setIsRecovering(true);
    try {
      await authService.verifyPasswordSecurityCode({
        code: recoverCode,
        newPassword: recoverNewPassword,
        email: recoverMethod === 'CORREO' ? recoverEmail : undefined,
        phone: recoverMethod === 'TELEGRAM' ? recoverPhone : undefined,
      });
      showToast('¡Contraseña restablecida!', 'Ya puedes iniciar sesión con tu nueva contraseña.', 'success');
      setIsRecoverMode(false);
      setRecoverCodeSent(false);
      setRecoverCode('');
      setRecoverNewPassword('');
    } catch (err: any) {
      showToast('Código inválido', err?.message || 'El código es incorrecto o expiró.', 'error');
    } finally {
      setIsRecovering(false);
    }
  };

  const handleRegisterCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) return;
    // Enviar código de confirmación de 6 dígitos al correo del candidato antes de crear/activar la sesión
    setIsRegistering(true);
    try {
      await authService.sendGoogleCode({
        email: regEmail,
        name: regName,
        phone: regPhone,
        password: regPassword,
        modo: 'register',
      });
      setGoogleEmail(regEmail.trim().toLowerCase());
      setGoogleName(regName.trim());
      setGooglePhone(regPhone.trim());
      setGooglePassword(regPassword);
      setGoogleCode('');
      setGoogleCodeSent(true);
      setGoogleFlowOrigin('register');
      setIsGoogleFlowOpen(true);
      showToast(
        'Código enviado a tu correo',
        `Enviamos un código de confirmación de 6 dígitos a ${regEmail}. Ingrésalo para activar tu cuenta.`,
        'success'
      );
    } catch (err: any) {
      showToast('Error', err?.message || 'No se pudo enviar el código de confirmación.', 'error');
    } finally {
      setIsRegistering(false);
    }
  };

  const openGoogleAuthFlow = async (origin: 'login' | 'register') => {
    setGoogleFlowOrigin(origin);
    setGoogleEmail(origin === 'register' ? regEmail : email);
    setGoogleName(origin === 'register' ? regName : '');
    setGooglePhone(origin === 'register' ? regPhone : '');
    setGooglePassword(origin === 'register' ? regPassword : '');
    setGoogleCode('');
    setGoogleCodeSent(false);
    setIsAddingOtherGoogle(false);
    setIsGoogleFlowOpen(true);

    if (origin === 'login') {
      setIsLoadingGoogleAccounts(true);
      try {
        // Por privacidad: NUNCA mostrar correos de otras personas de la base de datos.
        // Solo mostrar las cuentas que el propio usuario haya verificado y guardado en SU dispositivo.
        localStorage.removeItem('nexo_saved_google_accounts');
        const savedRaw = localStorage.getItem('nexo_my_verified_google_accounts');
        const savedAccs: Array<{ id: string; email: string; name: string; avatar: string; verified?: boolean }> =
          savedRaw ? JSON.parse(savedRaw) : [];
        const byEmail = new Map<string, { id: string; email: string; name: string; avatar: string }>();

        for (const s of savedAccs) {
          const em = (s.email || '').toLowerCase().trim();
          if (em && !byEmail.has(em)) {
            byEmail.set(em, {
              id: s.id || em,
              email: em,
              name: s.name || em.split('@')[0],
              avatar: (s.avatar || s.name?.[0] || em[0] || 'G').toUpperCase().slice(0, 2),
            });
          }
        }
        const list = Array.from(byEmail.values());
        setGoogleAccounts(list);
        if (list.length === 0) {
          setIsAddingOtherGoogle(true);
        }
      } finally {
        setIsLoadingGoogleAccounts(false);
      }
    }
  };

  const handleRemoveSavedGoogleAccount = (emailToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const savedRaw = localStorage.getItem('nexo_my_verified_google_accounts');
      const savedAccs: any[] = savedRaw ? JSON.parse(savedRaw) : [];
      const filtered = savedAccs.filter(
        (a) => (a.email || '').toLowerCase().trim() !== emailToRemove.toLowerCase().trim(),
      );
      localStorage.setItem('nexo_my_verified_google_accounts', JSON.stringify(filtered));
      setGoogleAccounts(filtered);
      if (filtered.length === 0) {
        setIsAddingOtherGoogle(true);
      }
    } catch {}
  };

  const handleSelectGoogleAccount = async (acc: { email: string; name?: string }) => {
    // Si la cuenta ya fue verificada previamente por el propio usuario en este dispositivo, ingresa directo.
    // Si es un correo nuevo o de otra persona no verificada en este navegador, exige código de 6 dígitos al correo.
    const cleanEm = acc.email.trim().toLowerCase();
    let isVerifiedOnThisDevice = false;
    try {
      const savedRaw = localStorage.getItem('nexo_my_verified_google_accounts');
      const savedAccs: any[] = savedRaw ? JSON.parse(savedRaw) : [];
      isVerifiedOnThisDevice = savedAccs.some(
        (a) => (a.email || '').toLowerCase().trim() === cleanEm && a.verified === true,
      );
    } catch {}

    if (!isVerifiedOnThisDevice) {
      setGoogleEmail(cleanEm);
      setGoogleName(acc.name || '');
      setIsGoogleSending(true);
      try {
        const res = await authService.sendGoogleCode({
          email: cleanEm,
          name: acc.name || undefined,
          modo: 'login',
        });
        setGoogleCodeSent(true);
        setGoogleFlowOrigin('register'); // Muestra el paso de código de 6 dígitos
        showToast(
          'Verificación de seguridad requerida',
          res.mensaje || `Enviamos un código de 6 dígitos a ${cleanEm} para confirmar que es tu cuenta.`,
          'info',
        );
      } catch (err: any) {
        showToast('Error al enviar código', err?.message || 'Verifica el correo ingresado.', 'error');
      } finally {
        setIsGoogleSending(false);
      }
      return;
    }

    setIsGoogleVerifying(true);
    try {
      const { user: loggedUser } = await authService.quickGoogleLogin({
        email: acc.email,
        name: acc.name,
      });

      setSessionUser(loggedUser);
      showToast('¡Bienvenido(a)!', `Sesión iniciada con Google como ${loggedUser.name}.`, 'success');
      setIsGoogleFlowOpen(false);
      onLoginSuccess(loggedUser.role);
    } catch (err: any) {
      showToast('Error al iniciar con Google', err?.message || 'No se pudo iniciar sesión.', 'error');
    } finally {
      setIsGoogleVerifying(false);
    }
  };

  const handleSendGoogleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail || !googleEmail.includes('@')) {
      showToast('Correo requerido', 'Ingresa tu correo de Google (@gmail.com) para recibir el código.', 'error');
      return;
    }
    setIsGoogleSending(true);
    try {
      const res = await authService.sendGoogleCode({
        email: googleEmail,
        name: googleName || undefined,
        phone: googlePhone || undefined,
        password: googlePassword || undefined,
        modo: googleFlowOrigin,
      });
      setGoogleCodeSent(true);
      showToast('Código enviado', res.mensaje, 'success');
    } catch (err: any) {
      showToast('Error al enviar código', err?.message || 'Verifica el correo ingresado.', 'error');
    } finally {
      setIsGoogleSending(false);
    }
  };

  const handleVerifyGoogleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleCode || googleCode.trim().length < 6) {
      showToast('Código incompleto', 'Ingresa el código de 6 dígitos que llegó a tu correo.', 'error');
      return;
    }
    setIsGoogleVerifying(true);
    try {
      const { user: verifiedUser } = await authService.verifyGoogleCode({
        email: googleEmail,
        code: googleCode,
        name: googleName || undefined,
        phone: googlePhone || undefined,
        password: googlePassword || undefined,
      });
      setSessionUser(verifiedUser);
      // Guardar cuenta verificada por código únicamente en el navegador de este usuario
      try {
        const savedRaw = localStorage.getItem('nexo_my_verified_google_accounts');
        const savedAccs: any[] = savedRaw ? JSON.parse(savedRaw) : [];
        const filtered = savedAccs.filter(
          (a) => (a.email || '').toLowerCase() !== verifiedUser.email.toLowerCase(),
        );
        filtered.unshift({
          id: verifiedUser.id,
          email: verifiedUser.email,
          name: verifiedUser.name,
          avatar: verifiedUser.avatar || verifiedUser.name.slice(0, 2).toUpperCase(),
          verified: true,
        });
        localStorage.setItem('nexo_my_verified_google_accounts', JSON.stringify(filtered.slice(0, 6)));
      } catch {}
      showToast(
        '¡Correo confirmado con éxito!',
        `Bienvenido(a), ${verifiedUser.name}. Tu cuenta ha sido verificada.`,
        'success'
      );
      setIsGoogleFlowOpen(false);
      onLoginSuccess(verifiedUser.role);
    } catch (err: any) {
      showToast('Código inválido', err?.message || 'El código ingresado es incorrecto o expiró.', 'error');
    } finally {
      setIsGoogleVerifying(false);
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

                    <div className="pt-1 space-y-2.5">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-2.5 sm:py-3 px-5 rounded-xl bg-[#C8FF45] hover:bg-[#D5FF6B] text-[#090A0C] font-heading font-bold text-sm tracking-tight border border-[#84cc16] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_0_#3f6212] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_5px_0_#3f6212] hover:-translate-y-[1px] active:translate-y-[3px] active:shadow-none transition-all duration-150 inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <span>{isLoading ? 'Verificando credenciales...' : 'Ingresar a PlataformaML'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => openGoogleAuthFlow('login')}
                        className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 dark:bg-[#141821] dark:hover:bg-[#1C2230] text-[#090A0C] dark:text-[#F1F2EC] font-heading font-semibold text-xs sm:text-sm border border-[#090A0C]/20 dark:border-white/18 shadow-[0_3px_0_#64748b] dark:shadow-[0_3px_0_#020617] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none transition-all duration-150 inline-flex items-center justify-center gap-2.5 cursor-pointer"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span>Continuar con Google</span>
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
                /* Inline Password Recovery View (Por Correo o Código de Telegram) */
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRecoverMode(false);
                      setRecoverCodeSent(false);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4C6FFF] dark:text-[#C8FF45] hover:underline cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Volver a Iniciar sesión</span>
                  </button>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#4C6FFF]/15 text-[#4C6FFF] dark:bg-[#C8FF45]/15 dark:text-[#C8FF45] border border-[#4C6FFF]/30 dark:border-[#C8FF45]/30 flex items-center justify-center shrink-0">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="font-heading text-xl font-bold text-[#090A0C] dark:text-[#F1F2EC] tracking-tight">
                          Recuperar contraseña
                        </h2>
                        <p className="text-[11px] text-[#777873]">
                          Elige recibir tu código de 6 dígitos por Correo o por Telegram
                        </p>
                      </div>
                    </div>

                    {/* Selector de método: Correo vs Código de Telegram */}
                    <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#090A0C]/6 dark:bg-[#F1F2EC]/8 border border-[#090A0C]/12 dark:border-[#F1F2EC]/12">
                      <button
                        type="button"
                        onClick={() => {
                          setRecoverMethod('CORREO');
                          setRecoverCodeSent(false);
                        }}
                        className={`press py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                          recoverMethod === 'CORREO'
                            ? 'bg-[#0B5D46] text-white dark:bg-[#C8FF45] dark:text-[#090A0C]'
                            : 'text-[#777873] hover:text-[#090A0C] dark:hover:text-[#F1F2EC]'
                        }`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Por Correo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRecoverMethod('TELEGRAM');
                          setRecoverCodeSent(false);
                        }}
                        className={`press py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                          recoverMethod === 'TELEGRAM'
                            ? 'bg-[#229ED9] text-white'
                            : 'text-[#777873] hover:text-[#090A0C] dark:hover:text-[#F1F2EC]'
                        }`}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                        </svg>
                        <span>Código de Telegram</span>
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleRecover} className="space-y-3.5">
                    {recoverMethod === 'CORREO' ? (
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
                    ) : (
                      <Input
                        label="Número de Telegram registrado *"
                        type="tel"
                        value={recoverPhone}
                        onChange={(e) => setRecoverPhone(e.target.value)}
                        placeholder="+58 412 0000000"
                        className="bg-white/75! dark:bg-black/35! backdrop-blur-md!"
                        required
                      />
                    )}

                    {recoverCodeSent && (
                      <div className="space-y-3 pt-1 animate-pop-in">
                        <Input
                          label="Código de verificación (6 dígitos) *"
                          value={recoverCode}
                          onChange={(e) => setRecoverCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="123456"
                          required
                        />
                        <Input
                          label="Nueva contraseña *"
                          type="password"
                          isPassword
                          value={recoverNewPassword}
                          onChange={(e) => setRecoverNewPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          required
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2.5 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsRecoverMode(false);
                          setRecoverCodeSent(false);
                        }}
                        className="cursor-pointer"
                      >
                        Cancelar
                      </Button>
                      <button
                        type="submit"
                        disabled={isRecovering}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-[#C8FF45] hover:bg-[#D5FF6B] text-[#090A0C] font-heading font-bold text-xs tracking-tight border border-[#84cc16] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_3px_0_#3f6212] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isRecovering
                          ? 'Procesando...'
                          : recoverCodeSent
                          ? 'Confirmar código y cambiar clave'
                          : recoverMethod === 'TELEGRAM'
                          ? 'Enviar código por Telegram'
                          : 'Enviar código al correo'}
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#090A0C] dark:text-[#F1F2EC] tracking-tight leading-tight">
                        Apertura de Expediente de Candidato
                      </h2>
                      <p className="text-xs text-[#777873] mt-0.5">
                        Crea tu cuenta oficial en PlataformaML y confírmala con el código enviado a tu correo.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openGoogleAuthFlow('register')}
                      className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 dark:bg-[#141821] dark:hover:bg-[#1C2230] text-[#090A0C] dark:text-[#F1F2EC] font-heading font-semibold text-xs border border-[#090A0C]/20 dark:border-white/18 shadow-[0_3px_0_#64748b] dark:shadow-[0_3px_0_#020617] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer shrink-0"
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      <span>Registrarse con Google</span>
                    </button>
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
                      label="Teléfono / Telegram"
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

        {/* =====================================================================
            4. GOOGLE / CORREO 6-DIGIT VERIFICATION CODE MODAL
           ===================================================================== */}
        {isGoogleFlowOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-2xl bg-[#F1F2EC] dark:bg-[#12151C] border border-[#090A0C]/20 dark:border-[#C8FF45]/35 shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-[#090A0C]/12 dark:border-white/12 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#1A1F2B] border border-[#090A0C]/15 dark:border-white/15 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-heading text-base font-bold text-[#090A0C] dark:text-[#F1F2EC]">
                      {googleFlowOrigin === 'register'
                        ? 'Confirmar Registro con Código'
                        : 'Elige una cuenta'}
                    </h3>
                    <p className="text-[11px] text-[#777873]">
                      {googleFlowOrigin === 'register'
                        ? 'Verificación de seguridad por código de 6 dígitos al correo'
                        : 'para ir a PlataformaML'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGoogleFlowOpen(false)}
                  className="text-xs font-semibold text-[#777873] hover:text-[#090A0C] dark:hover:text-white px-2 py-1 rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {googleFlowOrigin === 'login' ? (
                /* SELECTOR RÁPIDO DE CUENTAS DE GOOGLE (1 CLIC, SIN CÓDIGO) */
                <div className="space-y-3">
                  {!isAddingOtherGoogle ? (
                    <>
                      <div className="max-h-64 overflow-y-auto divide-y divide-[#090A0C]/10 dark:divide-white/10 rounded-xl border border-[#090A0C]/12 dark:border-white/12 bg-white/75 dark:bg-[#171B24]">
                        {isLoadingGoogleAccounts ? (
                          <div className="p-5 text-center text-xs text-[#777873]">
                            Cargando cuentas de Google...
                          </div>
                        ) : googleAccounts.length > 0 ? (
                          googleAccounts.map((acc) => (
                            <div
                              key={acc.email}
                              onClick={() => !isGoogleVerifying && handleSelectGoogleAccount(acc)}
                              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#4C6FFF]/8 dark:hover:bg-[#C8FF45]/10 transition-colors text-left cursor-pointer"
                            >
                              <div className="w-9 h-9 rounded-full bg-[#4C6FFF] dark:bg-[#C8FF45] text-white dark:text-[#090A0C] font-heading font-bold text-xs flex items-center justify-center shrink-0">
                                {acc.avatar}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs sm:text-sm font-bold text-[#090A0C] dark:text-[#F1F2EC] truncate">
                                  {acc.name}
                                </div>
                                <div className="text-[11px] text-[#777873] truncate">
                                  {acc.email}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handleRemoveSavedGoogleAccount(acc.email, e)}
                                title="Quitar cuenta guardada de este dispositivo"
                                className="px-2 py-1 rounded-md text-[11px] text-[#777873] hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer shrink-0"
                              >
                                ✕
                              </button>
                              <ArrowRight className="w-4 h-4 text-[#777873] shrink-0" />
                            </div>
                          ))
                        ) : null}

                        <button
                          type="button"
                          onClick={() => {
                            setGoogleEmail('');
                            setGoogleName('');
                            setIsAddingOtherGoogle(true);
                          }}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#4C6FFF]/8 dark:hover:bg-[#C8FF45]/10 transition-colors text-left cursor-pointer"
                        >
                          <div className="w-9 h-9 rounded-full bg-[#090A0C]/10 dark:bg-white/10 text-[#090A0C] dark:text-[#F1F2EC] flex items-center justify-center shrink-0">
                            <UserPlus className="w-4 h-4" />
                          </div>
                          <div className="text-xs sm:text-sm font-semibold text-[#090A0C] dark:text-[#F1F2EC]">
                            Usar otra cuenta de Google
                          </div>
                        </button>
                      </div>

                      <p className="text-[10px] text-[#777873] leading-relaxed">
                        Al continuar, Google compartirá tu nombre y dirección de correo electrónico con PlataformaML para iniciar sesión de inmediato.
                      </p>
                    </>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!googleEmail || !googleEmail.includes('@')) return;
                        handleSelectGoogleAccount({ email: googleEmail, name: googleName || undefined });
                      }}
                      className="space-y-3"
                    >
                      <Input
                        label="Correo de Google *"
                        type="email"
                        placeholder="tucorreo@gmail.com"
                        leftIcon={<Mail className="w-4 h-4" />}
                        value={googleEmail}
                        onChange={(e) => setGoogleEmail(e.target.value)}
                        required
                      />
                      <Input
                        label="Tu nombre (opcional)"
                        placeholder="María Pérez"
                        value={googleName}
                        onChange={(e) => setGoogleName(e.target.value)}
                      />
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsAddingOtherGoogle(false)}
                          className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#090A0C] dark:text-[#F1F2EC] bg-white/80 dark:bg-[#1A1F2B] border border-[#090A0C]/20 dark:border-white/15 cursor-pointer"
                        >
                          ← Volver a la lista
                        </button>
                        <button
                          type="submit"
                          disabled={isGoogleVerifying}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-[#C8FF45] hover:bg-[#D5FF6B] text-[#090A0C] font-heading font-bold text-xs sm:text-sm border border-[#84cc16] shadow-[0_3px_0_#3f6212] cursor-pointer disabled:opacity-50"
                        >
                          {isGoogleVerifying ? 'Iniciando sesión...' : 'Continuar'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : !googleCodeSent ? (
                <form onSubmit={handleSendGoogleOtp} className="space-y-3.5">
                  <Input
                    label="Correo electrónico de Google *"
                    type="email"
                    placeholder="tucorreo@gmail.com"
                    leftIcon={<Mail className="w-4 h-4" />}
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    required
                  />
                  {googleFlowOrigin === 'register' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <Input
                        label="Nombres y Apellidos"
                        placeholder="María Pérez"
                        value={googleName}
                        onChange={(e) => setGoogleName(e.target.value)}
                      />
                      <Input
                        label="Teléfono / Telegram"
                        placeholder="+58 412 0000000"
                        value={googlePhone}
                        onChange={(e) => setGooglePhone(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsGoogleFlowOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#090A0C] dark:text-[#F1F2EC] bg-white/80 dark:bg-[#1A1F2B] border border-[#090A0C]/20 dark:border-white/15 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isGoogleSending}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-[#C8FF45] hover:bg-[#D5FF6B] text-[#090A0C] font-heading font-bold text-xs sm:text-sm border border-[#84cc16] shadow-[0_3px_0_#3f6212] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isGoogleSending ? 'Enviando código...' : 'Enviar código a mi correo'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyGoogleOtp} className="space-y-4">
                  <div className="p-3 rounded-xl bg-[#4C6FFF]/10 dark:bg-[#C8FF45]/10 border border-[#4C6FFF]/25 dark:border-[#C8FF45]/30 text-xs text-[#090A0C] dark:text-[#F1F2EC]">
                    Enviamos un código de 6 dígitos a <strong className="font-bold">{googleEmail}</strong>. Revisa tu bandeja de entrada e ingrésalo abajo:
                  </div>

                  <Input
                    label="Código de verificación (6 dígitos) *"
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    value={googleCode}
                    onChange={(e) => setGoogleCode(e.target.value.replace(/[^0-9]/g, ''))}
                    className="text-center font-mono-tabular text-xl tracking-[0.4em] font-bold"
                    required
                  />

                  <div className="flex items-center justify-between text-[11px] text-[#777873]">
                    <button
                      type="button"
                      onClick={() => setGoogleCodeSent(false)}
                      className="hover:underline text-[#4C6FFF] dark:text-[#C8FF45] font-semibold cursor-pointer"
                    >
                      ← Cambiar correo
                    </button>
                    <button
                      type="button"
                      onClick={handleSendGoogleOtp}
                      disabled={isGoogleSending}
                      className="hover:underline text-[#4C6FFF] dark:text-[#C8FF45] font-semibold cursor-pointer"
                    >
                      {isGoogleSending ? 'Reenviando...' : 'Reenviar código'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsGoogleFlowOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#090A0C] dark:text-[#F1F2EC] bg-white/80 dark:bg-[#1A1F2B] border border-[#090A0C]/20 dark:border-white/15 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isGoogleVerifying}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-[#C8FF45] hover:bg-[#D5FF6B] text-[#090A0C] font-heading font-bold text-xs sm:text-sm border border-[#84cc16] shadow-[0_3px_0_#3f6212] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isGoogleVerifying ? 'Verificando código...' : 'Confirmar código e Ingresar'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
