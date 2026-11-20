import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Check, Briefcase, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface SuccessRegistrationPageProps {
  email: string;
  candidateName: string;
  vacancyTitle: string;
  onNavigate: (view: string) => void;
}

export const SuccessRegistrationPage: React.FC<SuccessRegistrationPageProps> = ({
  email,
  candidateName,
  vacancyTitle,
  onNavigate,
}) => {
  const { register, isAuthenticated, user } = useAuth();
  const { showToast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      showToast('Contraseña débil', 'La contraseña debe tener al menos 6 caracteres.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Error', 'Las contraseñas no coinciden.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        name: candidateName || 'Candidato',
        email: email || 'candidato@correo.com',
        password,
      });
      showToast('¡Cuenta creada con éxito!', 'Ahora puedes dar seguimiento a tu postulación.', 'success');
      onNavigate('candidate-dashboard');
    } catch {
      showToast('Error', 'No se pudo completar el registro.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-transparent flex flex-col font-sans transition-colors">
      <Navbar onNavigate={onNavigate} currentView="apply-success" />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-xl text-center space-y-4">
          {/* Official Stamp Checkmark */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#C8FF45] rounded-2xl flex items-center justify-center text-[#090A0C] mx-auto border border-[#C8FF45]/60 shadow-[0_10px_28px_-6px_rgba(200,255,69,0.45)]">
            <Check className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.8]" />
          </div>

          {/* Titles & Badge */}
          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-3xl font-bold text-[#090A0C] dark:text-[#F1F2EC] tracking-tight font-['Instrument_Sans',sans-serif]">
              ¡Expediente de postulación registrado!
            </h1>
            <p className="text-xs sm:text-sm text-[#777873]">
              Tu solicitud ha ingresado al sistema y cuenta con trazabilidad activa.
            </p>
            <div className="pt-0.5">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl glass-panel text-xs font-semibold text-[#090A0C] dark:text-[#F1F2EC]">
                <Briefcase className="w-3.5 h-3.5 text-[#4C6FFF] dark:text-[#C8FF45]" />
                {vacancyTitle || 'Convocatoria Abierta'} · PlataformaML
              </span>
            </div>
          </div>

          {isAuthenticated ? (
            <div className="glass-panel rounded-2xl p-5 sm:p-6 text-left space-y-4">
              <div>
                <h2 className="text-lg font-bold text-[#090A0C] dark:text-[#F1F2EC] font-['Instrument_Sans',sans-serif]">
                  Postulación vinculada a tu expediente oficial
                </h2>
                <p className="text-xs text-[#777873] mt-1 leading-relaxed">
                  Tu postulación ha quedado asociada al expediente de{' '}
                  <span className="font-semibold text-[#090A0C] dark:text-[#F1F2EC]">
                    {user?.name || candidateName}
                  </span>{' '}
                  ({user?.email || email}). Puedes consultar tu estado en tiempo real desde tu archivero de postulaciones.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <Button
                  type="button"
                  size="lg"
                  fullWidth
                  onClick={() => onNavigate('candidate-dashboard')}
                  leftIcon={<Briefcase className="w-4 h-4" />}
                >
                  Ir a Mis Postulaciones
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={() => onNavigate('vacancies')}
                >
                  Explorar más convocatorias
                </Button>
              </div>
            </div>
          ) : (
            <div className="neu-paper-surface rounded-2xl p-6 sm:p-8 text-left space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Activa tu acceso de seguimiento
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Define una contraseña para consultar el estado de tu solicitud y postularte a futuras vacantes en PlataformaML.
                </p>
              </div>

              <form onSubmit={handleCompleteRegistration} className="space-y-4">
                <Input
                  label="Contraseña"
                  type="password"
                  isPassword
                  placeholder="Crea tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  helperText="Usa al menos 8 caracteres, una letra y un número."
                  required
                />

                <Input
                  label="Confirmar Contraseña"
                  type="password"
                  isPassword
                  placeholder="Repite tu contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />

                <div className="pt-2">
                  <Button
                    type="submit"
                    size="lg"
                    fullWidth
                    isLoading={isLoading}
                  >
                    Completar Registro
                  </Button>
                </div>
              </form>
            </div>
          )}

          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#0B5D46] dark:text-emerald-400" />
            <span>Postulación recibida y auditada bajo estándares de equidad algorítmica.</span>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};
