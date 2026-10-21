import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Check, Briefcase, Shield, ArrowRight } from 'lucide-react';
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
  const { register } = useAuth();
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
        role: 'candidato',
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar onNavigate={onNavigate} currentView="apply-success" />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-xl text-center space-y-6">
          {/* Green Checkmark Circle (Screenshot 5) */}
          <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto shadow-lg shadow-emerald-500/30 animate-in zoom-in-50 duration-300">
            <Check className="w-9 h-9 stroke-[3]" />
          </div>

          {/* Titles & Badge (Screenshot 5) */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              ¡Postulación enviada con éxito!
            </h1>
            <p className="text-sm text-slate-500">
              Revisa tu correo o WhatsApp para novedades
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                {vacancyTitle || 'Analista de Datos'} · Nexo Tecnología
              </span>
            </div>
          </div>

          {/* Quick Account Creation Card (Screenshot 5) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs text-left space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Tu próxima oportunidad, en un solo lugar
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Crea una contraseña para consultar el estado de tu solicitud y aplicar a otras
                vacantes de la empresa
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
                  className="bg-emerald-500 hover:bg-emerald-600 font-bold"
                >
                  Completar Registro
                </Button>
              </div>
            </form>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="text-xs font-semibold text-slate-500 hover:text-emerald-600 transition-colors"
              >
                Ir al Inicio
              </button>
            </div>
          </div>

          {/* Subtext reassurance */}
          <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>Tu postulación ya fue recibida, aunque decidas registrarte después.</span>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};
