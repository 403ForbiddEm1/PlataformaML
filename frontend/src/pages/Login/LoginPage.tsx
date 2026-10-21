import React, { useState } from 'react';
import { UserRole } from '@/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, ArrowRight, Lock, Check, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { authService } from '@/services/auth.service';

interface LoginPageProps {
  onLoginSuccess: (role: UserRole) => void;
  onNavigateRegister?: () => void;
  onGoToVacancies?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onGoToVacancies,
}) => {
  const { login, register, switchRoleDemo } = useAuth();
  const { showToast } = useToast();

  const [selectedRole, setSelectedRole] = useState<UserRole>('candidato');
  const [email, setEmail] = useState('valeria.mendoza@correo.com');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);

  // Password recovery modal state
  const [isRecoverOpen, setIsRecoverOpen] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);

  // Register modal state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    if (role === 'candidato') {
      setEmail('valeria.mendoza@correo.com');
    } else if (role === 'rrhh') {
      setEmail('carlos.rrhh@nexo.com');
    } else {
      setEmail('sofia.admin@nexo.com');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast('Error', 'Por favor ingresa tu correo electrónico.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      await login({ email, password, role: selectedRole });
      showToast(
        '¡Bienvenido!',
        `Has iniciado sesión como ${
          selectedRole === 'candidato'
            ? 'Candidata'
            : selectedRole === 'rrhh'
            ? 'Analista de Talento Humano'
            : 'Administrador del Sistema'
        }`,
        'success'
      );
      onLoginSuccess(selectedRole);
    } catch {
      showToast('Error al ingresar', 'Verifica tus credenciales.', 'error');
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
      setIsRecoverOpen(false);
      setRecoverEmail('');
    } finally {
      setIsRecovering(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail) return;
    setIsRegistering(true);
    try {
      await register({
        name: regName,
        email: regEmail,
        password: regPassword,
        phone: regPhone,
        role: 'candidato',
      });
      showToast('Registro exitoso', 'Tu cuenta de postulante ha sido creada.', 'success');
      setIsRegisterOpen(false);
      onLoginSuccess('candidato');
    } catch {
      showToast('Error', 'No se pudo completar el registro.', 'error');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center">
      <div className="w-full flex-1 flex flex-col lg:flex-row">
        {/* Left Section - Login Form (Identical to Screenshots 1 & 2) */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16">
          <div className="w-full max-w-md space-y-8">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/30">
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
                <span className="font-bold text-slate-800 text-lg">Nexo Tecnología</span>
              </div>

              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Iniciar Sesión
              </h1>
              <p className="text-sm text-slate-500 mt-2">
                Selecciona tu rol y completa tus datos para continuar.
              </p>
            </div>

            {/* Role Selector Tabs (Screenshot 1 & 2) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Seleccione su rol
              </label>
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => handleRoleChange('candidato')}
                  className={`py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                    selectedRole === 'candidato'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Aspirante
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('rrhh')}
                  className={`py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                    selectedRole === 'rrhh'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Recursos Humanos
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('administrador')}
                  className={`py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                    selectedRole === 'administrador'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Administración
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Correo electrónico"
                type="email"
                placeholder="nombre@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="Clave"
                type="password"
                placeholder="••••••••"
                isPassword
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              {/* Submit CTA (Screenshot 1 & 2) */}
              <div className="pt-2">
                <Button
                  type="submit"
                  size="lg"
                  fullWidth
                  isLoading={isLoading}
                  className="bg-emerald-500 hover:bg-emerald-600 font-bold"
                >
                  Acceder al sistema
                </Button>
              </div>
            </form>

            {/* Links & Register Prompt */}
            <div className="text-center space-y-3 pt-2">
              <button
                type="button"
                onClick={() => setIsRecoverOpen(true)}
                className="text-xs sm:text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors"
              >
                ¿Olvidó su clave? <span className="font-semibold text-slate-800 hover:text-emerald-600">Recuperar acceso</span>
              </button>

              <div className="text-xs text-slate-500">
                ¿Aún no tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(true)}
                  className="text-emerald-600 font-bold hover:underline"
                >
                  Crear cuenta de postulante
                </button>
              </div>

              {onGoToVacancies && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onGoToVacancies}
                    className="text-xs text-slate-500 hover:text-emerald-600 underline"
                  >
                    ← Volver a ver vacantes disponibles
                  </button>
                </div>
              )}
            </div>

            {/* Security Badge (Screenshot 2) */}
            <div className="pt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Lock className="w-3.5 h-3.5" />
              <span>Acceso seguro a tu portal de talento</span>
            </div>
          </div>
        </div>

        {/* Right Section - Visual Hero (Desktop) */}
        <div className="hidden lg:relative lg:flex lg:w-1/2 bg-slate-900 items-center justify-center p-12 overflow-hidden">
          {/* Background Image */}
          <img
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80"
            alt="Reclutamiento y Selección Nexo"
            className="absolute inset-0 w-full h-full object-cover opacity-85 scale-105 filter brightness-95"
          />

          {/* Frosted Glass Overlay Card (Screenshot 1) */}
          <div className="relative z-10 glass-panel-dark text-white p-8 sm:p-10 rounded-3xl max-w-lg shadow-2xl space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-400/30">
              <Sparkles className="w-3.5 h-3.5" /> Algoritmos de Aprendizaje Automático
            </div>
            <h2 className="text-3xl font-black tracking-tight text-white">
              Bienvenido al sistema
            </h2>
            <p className="text-sm text-slate-200 font-normal leading-relaxed">
              De Reclutamiento y Selección Inteligente. Conectando el mejor talento con las
              oportunidades indicadas a través de modelos predictivos y decisiones humanas éticas.
            </p>
          </div>
        </div>
      </div>

      {/* Recover Password Modal */}
      <Modal
        isOpen={isRecoverOpen}
        onClose={() => setIsRecoverOpen(false)}
        title="Recuperar Acceso"
        subtitle="Ingresa tu correo para recibir un enlace de restablecimiento seguro"
      >
        <form onSubmit={handleRecover} className="space-y-4">
          <Input
            label="Correo electrónico"
            type="email"
            value={recoverEmail}
            onChange={(e) => setRecoverEmail(e.target.value)}
            placeholder="ejemplo@correo.com"
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRecoverOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" isLoading={isRecovering}>
              Enviar enlace
            </Button>
          </div>
        </form>
      </Modal>

      {/* Register Candidate Modal */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Crear Cuenta de Postulante"
        subtitle="Regístrate para dar seguimiento a tus postulaciones en Nexo Tecnología"
      >
        <form onSubmit={handleRegister} className="space-y-3">
          <Input
            label="Nombres y Apellidos"
            value={regName}
            onChange={(e) => setRegName(e.target.value)}
            placeholder="Valeria Mendoza"
            required
          />
          <Input
            label="Correo Electrónico"
            type="email"
            value={regEmail}
            onChange={(e) => setRegEmail(e.target.value)}
            placeholder="valeria@correo.com"
            required
          />
          <Input
            label="Teléfono / WhatsApp"
            value={regPhone}
            onChange={(e) => setRegPhone(e.target.value)}
            placeholder="+1 (809) 000-0000"
          />
          <Input
            label="Contraseña"
            type="password"
            isPassword
            value={regPassword}
            onChange={(e) => setRegPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            required
          />

          <div className="pt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRegisterOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" isLoading={isRegistering}>
              Completar Registro
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
