import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Clock,
  LifeBuoy,
  Mail,
  MessageSquareWarning,
  Send,
  User as UserIcon,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  supportService,
  type SupportCategory,
  type SupportPriority,
} from '@/services/support.service';

interface SupportTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultModule?: string;
}

const CATEGORIES: SupportCategory[] = [
  'Queja o Reclamo',
  'Problema Técnico',
  'Evaluación IA / CV',
  'Postulación o Vacante',
  'Cuenta y Acceso',
  'Sugerencia / Otro',
];

const PRIORITIES: { id: SupportPriority; label: string; tone: string }[] = [
  { id: 'Baja', label: 'Baja', tone: 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300' },
  { id: 'Media', label: 'Media', tone: 'border-sky-400/60 text-sky-700 dark:text-sky-300 bg-sky-500/10' },
  { id: 'Alta', label: 'Alta', tone: 'border-amber-500/60 text-amber-800 dark:text-amber-300 bg-amber-500/15' },
  { id: 'Crítica', label: 'Crítica', tone: 'border-rose-500/70 text-rose-700 dark:text-rose-300 bg-rose-500/15' },
];

export const SupportTicketModal: React.FC<SupportTicketModalProps> = ({
  isOpen,
  onClose,
  defaultModule = 'Panel Principal',
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [categoria, setCategoria] = useState<string>('Queja o Reclamo');
  const [prioridad, setPrioridad] = useState<SupportPriority>('Media');
  const [moduloAfectado, setModuloAfectado] = useState<string>(defaultModule);
  const [asunto, setAsunto] = useState<string>('');
  const [queja, setQueja] = useState<string>('');
  const [guestName, setGuestName] = useState<string>('');
  const [guestEmail, setGuestEmail] = useState<string>('');
  const [guestPhone, setGuestPhone] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [nowLabel, setNowLabel] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setModuloAfectado(defaultModule || 'Panel Principal');
      if (user?.name) setGuestName(user.name);
      if (user?.email) setGuestEmail(user.email);
      if (user?.phone) setGuestPhone(user.phone);
      setNowLabel(
        new Date().toLocaleString('es-DO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
      );
    }
  }, [isOpen, defaultModule, user]);

  const roleBadge = !user
    ? 'Visitante / Postulante'
    : user.role === 'candidato'
    ? 'Candidato'
    : user.role === 'rrhh'
    ? 'RRHH'
    : user.role === 'admin' || user.role === 'administrador'
    ? 'Admin de Empresa'
    : 'Superadmin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = (user?.name || guestName).trim();
    const finalEmail = (user?.email || guestEmail).trim();
    if (!finalName || !finalEmail) {
      showToast('Datos de contacto requeridos', 'Ingresa tu nombre y correo electrónico para enviar el ticket.', 'error');
      return;
    }
    if (!asunto.trim() || !queja.trim()) {
      showToast('Campos incompletos', 'Completa el asunto y el detalle de tu solicitud o queja.', 'error');
      return;
    }

    setIsSending(true);
    try {
      const created = await supportService.createTicket({
        senderId: user?.id || 'usr-guest',
        senderName: finalName,
        senderEmail: finalEmail,
        senderRole: user?.role || 'candidato',
        senderPhone: user?.phone || guestPhone.trim() || undefined,
        empresaNombre:
          user?.empresaNombre ||
          user?.companyName ||
          (user ? 'Candidato Independiente' : 'Convocatorias Abiertas (Público)'),
        categoria,
        prioridad,
        moduloAfectado: moduloAfectado.trim() || defaultModule,
        asunto: asunto.trim(),
        queja: queja.trim(),
      });

      showToast(
        `Ticket ${created.folio} enviado`,
        'Tu formulario y queja fueron remitidos directamente a la bandeja del Superadmin Global.',
        'success',
      );
      setAsunto('');
      setQueja('');
      setCategoria('Queja o Reclamo');
      setPrioridad('Media');
      onClose();
    } catch {
      showToast('Error', 'No se pudo registrar el ticket de soporte.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSending) onClose();
      }}
      title="Contactar con Soporte · Ticket al Superadmin"
      subtitle="Completa el formulario y redacta tu reporte o queja. El Superadmin recibirá tu identidad, hora exacta y expediente."
      maxWidth="lg"
      variant="manila"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Ficha automática de quien envía y hora */}
        <div className="p-3.5 rounded-2xl bg-[#EFE5D4]/75 dark:bg-[#141923] border border-[#C8B193] dark:border-[#F1F2EC]/12 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#0B5D46] dark:bg-[#C8FF45] text-white dark:text-[#090A0C] font-bold flex items-center justify-center shrink-0">
              <LifeBuoy className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-[#3A2818] dark:text-[#F1F2EC] flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5 text-[#0B5D46] dark:text-[#C8FF45]" />
                  {user?.name || guestName || 'Remitente del Ticket'}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono-tabular font-bold uppercase bg-[#3A2818] text-[#EFE5D4] dark:bg-[#C8FF45]/15 dark:text-[#C8FF45]">
                  {roleBadge}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#70553B] dark:text-[#9A9B94] mt-0.5">
                <span className="inline-flex items-center gap-1 truncate">
                  <Mail className="w-3 h-3" /> {user?.email || guestEmail || 'Completa tu correo abajo'}
                </span>
                {(user?.empresaNombre || user?.companyName) && (
                  <span className="inline-flex items-center gap-1 truncate">
                    <Building2 className="w-3 h-3" /> {user?.empresaNombre || user?.companyName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/75 dark:bg-[#090A0C]/80 border border-[#C8B193]/70 dark:border-[#F1F2EC]/12 text-[11px] font-mono-tabular text-[#3A2818] dark:text-[#C8FF45] shrink-0">
            <Clock className="w-3.5 h-3.5 text-[#0B5D46] dark:text-[#C8FF45]" />
            <span>{nowLabel}</span>
          </div>
        </div>

        {/* Si el usuario abre Soporte desde Convocatorias Abiertas sin sesión iniciada */}
        {!user && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Tu Nombre *"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Ej. Emma Carvajal"
              required
            />
            <Input
              label="Tu Correo Electrónico *"
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
            />
            <Input
              label="Teléfono / Telegram"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              placeholder="+58 412 0000000"
            />
          </div>
        )}

        {/* Categoría y Prioridad */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#3A2818] dark:text-[#F1F2EC]">
              Tipo de Solicitud / Categoría *
            </label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/85 dark:bg-[#0B0F17] border border-[#C8B193] dark:border-[#232D42] text-[#3A2818] dark:text-[#F1F2EC] focus:outline-none focus:border-[#0B5D46] dark:focus:border-[#C8FF45]"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#3A2818] dark:text-[#F1F2EC]">
              Nivel de Prioridad *
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {PRIORITIES.map((p) => {
                const active = prioridad === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPrioridad(p.id)}
                    className={`press py-2 px-2 rounded-xl text-[11px] font-bold border text-center cursor-pointer ${
                      active
                        ? 'bg-[#0B5D46] text-white border-[#0B5D46] dark:bg-[#C8FF45] dark:text-[#090A0C] dark:border-[#C8FF45]'
                        : `${p.tone} opacity-80 hover:opacity-100`
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Módulo y Asunto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Módulo o Sección Afectada"
            value={moduloAfectado}
            onChange={(e) => setModuloAfectado(e.target.value)}
            placeholder="Ej. Mis Postulaciones, Ranking IA..."
          />
          <Input
            label="Asunto del Ticket *"
            value={asunto}
            onChange={(e) => setAsunto(e.target.value)}
            placeholder="Resumen breve de tu solicitud o queja"
            required
          />
        </div>

        {/* Queja / Descripción detallada */}
        <div className="space-y-1.5">
          <label className="flex items-center justify-between text-xs font-bold text-[#3A2818] dark:text-[#F1F2EC]">
            <span className="inline-flex items-center gap-1.5">
              <MessageSquareWarning className="w-3.5 h-3.5 text-[#0B5D46] dark:text-[#C8FF45]" />
              <span>Formulario de Queja / Descripción Detallada *</span>
            </span>
            <span className="text-[10px] font-mono-tabular text-[#70553B] dark:text-[#777873]">
              Destinatario: Superadmin Global
            </span>
          </label>
          <textarea
            rows={4}
            value={queja}
            onChange={(e) => setQueja(e.target.value)}
            placeholder="Explica con detalle tu queja, inconveniente técnico o solicitud para que el Superadmin pueda auditarlo y darte respuesta..."
            required
            className="w-full px-3.5 py-2.5 rounded-xl text-xs leading-relaxed bg-white/85 dark:bg-[#0B0F17] border border-[#C8B193] dark:border-[#232D42] text-[#3A2818] dark:text-[#F1F2EC] placeholder:text-[#777873] focus:outline-none focus:border-[#0B5D46] dark:focus:border-[#C8FF45]"
          />
        </div>

        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-[11px] text-[#5C4025] dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <span>
            Este ticket quedará archivado con sello de fecha, hora, tu usuario ({user?.email || 'activo'}) y el formulario adjunto en el panel del <strong>Superadmin Global</strong>.
          </span>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#C8B193]/40 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSending}
            leftIcon={<Send className="w-3.5 h-3.5" />}
          >
            Enviar Ticket a Superadmin
          </Button>
        </div>
      </form>
    </Modal>
  );
};
