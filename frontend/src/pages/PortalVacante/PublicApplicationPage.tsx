import React, { useState } from 'react';
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
  Sparkles,
} from 'lucide-react';
import { applicationsService } from '@/services/applications.service';
import { useToast } from '@/context/ToastContext';
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
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('+1 (809) ');
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !firstName || !lastName) {
      showToast('Campos requeridos', 'Por favor completa todos los campos obligatorios (*).', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await applicationsService.submitApplication({
        vacancyId: vacancy.id,
        email,
        firstName,
        lastName,
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
          colors: ['#10b981', '#34d399', '#059669', '#6ee7b7'],
        });
      } catch {}

      showToast(
        '¡Postulación Recibida!',
        'Hemos enviado una confirmación inmediata a tu correo y WhatsApp.',
        'success'
      );

      onPostulationSuccess(email, `${firstName} ${lastName}`, vacancy.title);
    } catch {
      showToast('Error', 'No se pudo enviar la postulación. Intenta nuevamente.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col font-sans">
      <Navbar onNavigate={onNavigate} currentView="apply" />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Breadcrumb (Screenshot 3) */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <button
            onClick={() => onNavigate('vacancies')}
            className="hover:text-emerald-600 transition-colors"
          >
            Nexo Tecnología
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <button
            onClick={() => onNavigate('vacancies')}
            className="hover:text-emerald-600 transition-colors"
          >
            Trabaja con nosotros
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-semibold">{vacancy.title}</span>
        </nav>

        {/* Job Header & Tags (Screenshot 3 & 4) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {vacancy.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 mt-3">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400" /> {vacancy.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-400" /> {vacancy.workMode}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" /> {vacancy.type}
              </span>
            </div>
          </div>

          <div className="shrink-0 flex items-center">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Convocatoria abierta
            </span>
          </div>
        </div>

        {/* Main 2-Column Layout (Screenshot 3 Desktop / Screenshot 4 Mobile) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Postulation Form */}
          <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Da el siguiente paso en tu carrera
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Completa tus datos y adjunta tus documentos para postularte.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Correo Electrónico *"
                type="email"
                placeholder="nombre@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nombres *"
                  placeholder="Tus nombres"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
                <Input
                  label="Apellidos *"
                  placeholder="Tus apellidos"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>

              <Input
                label="Teléfono"
                type="tel"
                placeholder="+1 (809) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              {/* Uploaders Section (Screenshots 3 & 4) */}
              <div className="space-y-2 pt-2">
                <label className="text-sm font-semibold text-slate-700">
                  Documentos de postulación
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FileUploader
                    type="idCard"
                    label="Subir Cédula de Identidad (PDF/JPG)"
                    sublabel="Arrastra tu archivo o selecciónalo · Máx. 5 MB"
                    selectedFile={idCardFile}
                    onFileSelect={setIdCardFile}
                  />

                  <FileUploader
                    type="cv"
                    label="Subir Currículum Vitae (PDF/Word)"
                    sublabel="Arrastra tu archivo o selecciónalo · Máx. 5 MB"
                    selectedFile={cvFile}
                    onFileSelect={setCvFile}
                  />
                </div>
              </div>

              {/* Legal disclaimer */}
              <p className="text-xs text-slate-400 pt-2 leading-relaxed">
                Al enviar tu postulación, aceptas el aviso de privacidad y el tratamiento de tus
                datos para este proceso de selección. * Campo obligatorio.
              </p>

              {/* Primary Submit CTA */}
              <Button
                type="submit"
                size="lg"
                fullWidth
                isLoading={isSubmitting}
                className="bg-emerald-500 hover:bg-emerald-600 font-bold text-base py-3.5 shadow-md shadow-emerald-500/20"
              >
                Enviar Postulación
              </Button>
            </form>
          </div>

          {/* Right Column: Value Proposition & Steps Card (Screenshot 3) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Value quote card */}
            <div className="bg-emerald-50/50 border border-emerald-100 p-6 sm:p-7 rounded-3xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 leading-snug">
                Tu talento convierte datos en decisiones.
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                En Nexo Tecnología buscamos personas curiosas que nos ayuden a encontrar nuevas
                oportunidades en cada dato.
              </p>
              <div className="pt-2">
                <span className="text-xs font-semibold text-emerald-800 bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-200">
                  Equipo de Datos y Analítica
                </span>
              </div>
            </div>

            {/* What happens next? (Screenshot 3) */}
            <div className="bg-white border border-slate-200 p-6 sm:p-7 rounded-3xl space-y-5">
              <h4 className="text-sm font-bold text-slate-900">¿Qué sucede después?</h4>

              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Confirmamos tu postulación</p>
                    <p className="text-slate-500 mt-0.5">Recibirás un mensaje en tu correo.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Te mantenemos al tanto</p>
                    <p className="text-slate-500 mt-0.5">
                      Te contactaremos por correo o WhatsApp.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Tu información es confidencial</p>
                    <p className="text-slate-500 mt-0.5">Solo se usa para este proceso de selección.</p>
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
