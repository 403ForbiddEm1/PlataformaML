import React, { useState } from 'react';
import { CheckCircle2, Mail, MessageSquare, Send, XCircle, Calendar } from 'lucide-react';
import { Application } from '@/types';
import { applicationsService, type NotifyChannel } from '@/services/applications.service';
import { useToast } from '@/context/ToastContext';

interface QuickNotifyRowBarProps {
  application: Application;
  defaultChannel: NotifyChannel;
  companyLogoUrl?: string | null;
  onSuccess: () => void;
  onClose: () => void;
}

export const QuickNotifyRowBar: React.FC<QuickNotifyRowBarProps> = ({
  application,
  defaultChannel,
  companyLogoUrl,
  onSuccess,
  onClose,
}) => {
  const { showToast } = useToast();
  const [channel, setChannel] = useState<NotifyChannel>(defaultChannel);
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);

  const sendAction = async (status?: string) => {
    setSending(true);
    try {
      const res = await applicationsService.quickNotify(application.id, {
        channel,
        status,
        message: customMessage.trim() || undefined,
        companyLogoUrl: companyLogoUrl || undefined,
      });
      const channelsLabel =
        res.sentChannels.length > 0
          ? res.sentChannels.join(' y ')
          : channel === 'AMBOS'
          ? 'Telegram y Correo'
          : channel === 'TELEGRAM'
          ? 'Telegram / Chat'
          : 'Correo';
      showToast(
        status ? `${status} · Notificación enviada` : 'Notificación enviada',
        `Se notificó automáticamente a ${application.candidateName} vía ${channelsLabel}.`,
        'success'
      );
      setCustomMessage('');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast('Error al notificar', err?.message || 'No se pudo enviar la notificación.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="p-3.5 sm:p-4 rounded-xl bg-[#FAF7F2] dark:bg-[#0D1320] border border-[#0B5D46]/35 dark:border-[#C8FF45]/30 space-y-3 animate-in fade-in duration-150"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-black uppercase tracking-wider text-[#0B5D46] dark:text-[#C8FF45]">
          Envío rápido de notificación automática — {application.candidateName}
        </span>

        {/* Selector de canal */}
        <div className="inline-flex items-center rounded-lg border border-[#DED7C8] dark:border-white/15 bg-white dark:bg-slate-900 p-0.5 text-[11px] font-bold">
          {(
            [
              { id: 'AMBOS', label: 'Telegram + Correo' },
              { id: 'TELEGRAM', label: 'Solo Telegram / Chat' },
              { id: 'CORREO', label: 'Solo Correo' },
            ] as Array<{ id: NotifyChannel; label: string }>
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setChannel(opt.id)}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                channel === opt.id
                  ? 'bg-[#0B5D46] text-white dark:bg-[#C8FF45] dark:text-[#090A0C]'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Botones rápidos de estado + notificación */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={sending}
          onClick={() => sendAction('Preseleccionado')}
          className="press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 cursor-pointer"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Preseleccionar y Notificar
        </button>

        <button
          type="button"
          disabled={sending}
          onClick={() => sendAction('Entrevista')}
          className="press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-50 cursor-pointer"
        >
          <Calendar className="w-3.5 h-3.5" />
          Citar a Entrevista y Notificar
        </button>

        <button
          type="button"
          disabled={sending}
          onClick={() => sendAction('Descartado')}
          className="press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 cursor-pointer"
        >
          <XCircle className="w-3.5 h-3.5" />
          Descartar y Notificar
        </button>
      </div>

      {/* Mensaje personalizado opcional */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <input
          type="text"
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          placeholder="Mensaje personalizado opcional (si lo dejas vacío se envía la plantilla automática con logo y nombre de empresa)..."
          className="flex-1 px-3 py-2 rounded-lg text-xs bg-white dark:bg-slate-900 border border-[#DED7C8] dark:border-white/15 text-slate-900 dark:text-slate-100 outline-none focus:border-[#0B5D46] dark:focus:border-[#C8FF45]"
        />
        <button
          type="button"
          disabled={sending || !customMessage.trim()}
          onClick={() => sendAction(undefined)}
          className="press inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#0B5D46] hover:bg-[#094B38] dark:bg-[#C8FF45] dark:hover:bg-[#d5ff6b] text-white dark:text-[#090A0C] disabled:opacity-40 cursor-pointer shrink-0"
        >
          {channel === 'CORREO' ? <Mail className="w-3.5 h-3.5" /> : channel === 'TELEGRAM' ? <MessageSquare className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
          <span>Enviar Aviso</span>
        </button>
      </div>
    </div>
  );
};
