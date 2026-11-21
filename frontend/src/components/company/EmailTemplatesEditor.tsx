import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Mail, RotateCcw, Send as TelegramIcon } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import {
  notificationsService,
  type NotificationTemplateDto,
  type TemplateChannel,
  type TemplateEvent,
} from '@/services/notifications.service';

interface EventMeta {
  id: TemplateEvent;
  label: string;
  hint: string;
}

const EVENTS: EventMeta[] = [
  { id: 'POSTULACION_RECIBIDA', label: 'Postulación recibida', hint: 'Al enviar la postulación' },
  { id: 'EN_REVISION', label: 'En revisión', hint: 'Cuando entra a lista de espera' },
  { id: 'PRESELECCIONADA', label: 'Preseleccionada', hint: 'Pasa el primer filtro' },
  { id: 'ENTREVISTA_1', label: 'Entrevista 1', hint: 'Primera convocatoria' },
  { id: 'ENTREVISTA_2', label: 'Entrevista 2', hint: 'Segunda convocatoria' },
  { id: 'CONTRATADA', label: 'Contratación', hint: 'Candidato seleccionado' },
  { id: 'RECHAZADA', label: 'Descartada', hint: 'Cierre del proceso' },
  { id: 'MENSAJE_NUEVO', label: 'Mensaje nuevo', hint: 'Aviso de chat' },
];

const VARIABLES = ['nombre', 'vacante', 'empresa', 'estado'];

const SAMPLE: Record<string, string> = {
  nombre: 'María',
  vacante: 'Desarrollador Backend',
  empresa: 'Tu empresa',
  estado: 'Preseleccionado',
};

// Mismos textos base que usa el servidor cuando no existe una plantilla guardada
const DEFAULTS: Record<TemplateEvent, { asunto: string; cuerpo: string }> = {
  POSTULACION_RECIBIDA: {
    asunto: 'Postulación recibida - {{vacante}}',
    cuerpo: 'Hola {{nombre}}, hemos recibido tu postulación para la vacante "{{vacante}}" en {{empresa}}. Te notificaremos sobre cualquier avance.',
  },
  EN_REVISION: {
    asunto: 'Tu postulación está en revisión - {{vacante}}',
    cuerpo: 'Hola {{nombre}}, el equipo de {{empresa}} está revisando tu perfil para la vacante "{{vacante}}".',
  },
  PRESELECCIONADA: {
    asunto: '¡Fuiste preseleccionado(a)! - {{vacante}}',
    cuerpo: '¡Felicidades {{nombre}}! Tu perfil ha sido preseleccionado para "{{vacante}}" en {{empresa}}. Pronto te contactaremos.',
  },
  ENTREVISTA_1: {
    asunto: 'Invitación a entrevista - {{vacante}}',
    cuerpo: 'Hola {{nombre}}, has sido convocado(a) a una entrevista para la vacante "{{vacante}}" en {{empresa}}. Revisa los detalles en la plataforma.',
  },
  ENTREVISTA_2: {
    asunto: 'Segunda entrevista - {{vacante}}',
    cuerpo: 'Hola {{nombre}}, avanzaste a la siguiente entrevista para "{{vacante}}" en {{empresa}}.',
  },
  CONTRATADA: {
    asunto: '¡Bienvenido(a) al equipo! - {{vacante}}',
    cuerpo: '¡Enhorabuena {{nombre}}! Has sido seleccionado(a) para el puesto "{{vacante}}" en {{empresa}}.',
  },
  RECHAZADA: {
    asunto: 'Actualización de tu proceso - {{vacante}}',
    cuerpo: 'Hola {{nombre}}, agradecemos tu interés en "{{vacante}}" en {{empresa}}. En esta ocasión hemos decidido avanzar con otros perfiles.',
  },
  MENSAJE_NUEVO: {
    asunto: 'Nuevo mensaje de {{empresa}}',
    cuerpo: 'Hola {{nombre}}, tienes un nuevo mensaje sobre tu postulación a "{{vacante}}" en {{empresa}}.',
  },
};

const render = (text: string, companyName: string) =>
  text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) =>
    key === 'empresa' ? companyName : SAMPLE[key] ?? `{{${key}}}`
  );

interface EmailTemplatesEditorProps {
  companyName?: string;
  className?: string;
}

/**
 * Editor de plantillas por empresa: cada evento del proceso tiene un texto para correo
 * y otro para Telegram. Lo que se guarda aplica solo a esta empresa.
 */
export const EmailTemplatesEditor: React.FC<EmailTemplatesEditorProps> = ({
  companyName = 'Tu empresa',
  className = '',
}) => {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<NotificationTemplateDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [eventId, setEventId] = useState<TemplateEvent>('POSTULACION_RECIBIDA');
  const [channel, setChannel] = useState<TemplateChannel>('CORREO');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const bodyRef = React.useRef<HTMLTextAreaElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTemplates(await notificationsService.getTemplates());
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'No se pudieron cargar las plantillas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Plantilla vigente: la de la empresa (versión más alta) o la predeterminada
  const current = useMemo(() => {
    const candidates = templates.filter((t) => t.evento === eventId && t.canal === channel && t.activa);
    const own = candidates.filter((t) => t.empresaId).sort((a, b) => b.version - a.version)[0];
    const base = candidates.filter((t) => !t.empresaId).sort((a, b) => b.version - a.version)[0];
    return { own, base };
  }, [templates, eventId, channel]);

  useEffect(() => {
    const source = current.own || current.base;
    setSubject(source?.asunto ?? DEFAULTS[eventId].asunto);
    setBody(source?.cuerpo ?? DEFAULTS[eventId].cuerpo);
  }, [current, eventId]);

  const isCustom = Boolean(current.own);
  const supportsSubject = channel === 'CORREO';

  const insertVariable = (name: string) => {
    const el = bodyRef.current;
    const token = `{{${name}}}`;
    if (!el) {
      setBody((b) => b + token);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const handleSave = async () => {
    if (body.trim().length < 5) {
      showToast('Plantilla muy corta', 'El mensaje necesita al menos 5 caracteres.', 'error');
      return;
    }
    setSaving(true);
    try {
      await notificationsService.saveTemplate({
        evento: eventId,
        canal: channel,
        asunto: supportsSubject ? subject.trim() || null : null,
        cuerpo: body.trim(),
      });
      showToast('Plantilla guardada', 'Los próximos avisos de tu empresa usarán este texto.', 'success');
      await load();
    } catch (err: any) {
      showToast('No se pudo guardar', err?.message || 'Inténtalo de nuevo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async () => {
    setSaving(true);
    try {
      await notificationsService.restoreTemplate(eventId, channel);
      showToast('Plantilla restaurada', 'Se volvió al texto predeterminado de la plataforma.', 'success');
      await load();
    } catch (err: any) {
      showToast('No se pudo restaurar', err?.message || 'Inténtalo de nuevo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const cardClass = 'rounded-2xl border border-[#DED7C8] dark:border-[#232D42] bg-[#FCFBF8] dark:bg-[#111622]';
  const fieldClass =
    'w-full px-3.5 py-2.5 rounded-xl text-sm bg-white dark:bg-[#0B0F17] border border-[#DED7C8] dark:border-[#232D42] text-[#090A0C] dark:text-[#F1F2EC] placeholder:text-[#777873] focus:outline-none focus:border-[#0B5D46] dark:focus:border-[#C8FF45]';

  if (loading) {
    return (
      <div className={`${cardClass} p-5 space-y-3 ${className}`}>
        <div className="skeleton h-10" />
        <div className="skeleton h-40" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${cardClass} p-6 flex items-center justify-between gap-3 text-sm text-rose-600 dark:text-rose-300 ${className}`}>
        <span>{error}</span>
        <button type="button" onClick={load} className="press px-3 py-1.5 rounded-lg border border-[#DED7C8] dark:border-[#232D42] text-xs font-semibold cursor-pointer">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 ${className}`}>
      {/* Eventos */}
      <div className={`${cardClass} overflow-hidden`}>
        {EVENTS.map((ev) => {
          const active = ev.id === eventId;
          const customized = templates.some((t) => t.empresaId && t.evento === ev.id && t.activa);
          return (
            <button
              key={ev.id}
              type="button"
              onClick={() => setEventId(ev.id)}
              className={`press w-full text-left px-4 py-3 border-b last:border-b-0 border-[#DED7C8]/70 dark:border-[#232D42]/70 cursor-pointer flex items-center justify-between gap-2 ${
                active ? 'bg-[#0B5D46]/8 dark:bg-[#C8FF45]/8' : 'hover:bg-[#EFE5D4]/50 dark:hover:bg-[#F1F2EC]/[0.04]'
              }`}
            >
              <span className="min-w-0">
                <span className={`block text-sm font-semibold truncate ${active ? 'text-[#0B5D46] dark:text-[#C8FF45]' : 'text-[#090A0C] dark:text-[#F1F2EC]'}`}>
                  {ev.label}
                </span>
                <span className="block text-[11px] text-[#777873] truncate">{ev.hint}</span>
              </span>
              {customized && (
                <span title="Personalizada por tu empresa" className="shrink-0 w-5 h-5 rounded-full bg-[#0B5D46]/12 dark:bg-[#C8FF45]/15 text-[#0B5D46] dark:text-[#C8FF45] flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Editor */}
      <div className={`${cardClass} p-5 space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex p-1 rounded-xl bg-[#EFE5D4]/60 dark:bg-[#0B0F17] border border-[#DED7C8] dark:border-[#232D42]">
            {([
              { id: 'CORREO', label: 'Correo', icon: Mail },
              { id: 'WHATSAPP', label: 'Telegram', icon: TelegramIcon },
            ] as const).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setChannel(c.id)}
                className={`press inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  channel === c.id
                    ? 'bg-[#0B5D46] text-white dark:bg-[#C8FF45] dark:text-[#090A0C]'
                    : 'text-[#777873] hover:text-[#090A0C] dark:hover:text-[#F1F2EC]'
                }`}
              >
                <c.icon className="w-3.5 h-3.5" /> {c.label}
              </button>
            ))}
          </div>
          <span className="text-[10px] font-mono-tabular uppercase tracking-wider px-2 py-1 rounded-lg border border-[#DED7C8] dark:border-[#232D42] text-[#777873]">
            {isCustom ? 'Personalizada' : 'Predeterminada'}
          </span>
        </div>

        {supportsSubject && (
          <label className="block text-xs font-semibold text-[#090A0C] dark:text-[#F1F2EC]">
            Asunto
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className={`${fieldClass} mt-1.5`} />
          </label>
        )}

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <label htmlFor="tpl-body" className="text-xs font-semibold text-[#090A0C] dark:text-[#F1F2EC]">
              Mensaje
            </label>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVariable(v)}
                  className="press px-2 py-1 rounded-md text-[11px] font-mono-tabular font-semibold bg-[#EFE5D4]/70 dark:bg-[#1B2233] text-[#3A2818] dark:text-[#C8FF45] border border-[#DED7C8] dark:border-[#232D42] cursor-pointer"
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>
          <textarea
            id="tpl-body"
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className={`${fieldClass} resize-y`}
          />
        </div>

        {/* Vista previa */}
        <div className="rounded-xl border border-dashed border-[#C8B496] dark:border-[#46372B] bg-[#F6EEE2]/60 dark:bg-[#1D1612]/60 p-4 space-y-1.5">
          <p className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#777873]">Vista previa</p>
          {supportsSubject && (
            <p className="text-sm font-bold text-[#3A2818] dark:text-[#F1F2EC]">{render(subject, companyName)}</p>
          )}
          <p className="text-sm text-[#3A2818] dark:text-[#E5D6BE] leading-relaxed whitespace-pre-wrap">
            {render(body, companyName)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="press inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#0B5D46] hover:bg-[#0F7358] dark:bg-[#C8FF45] dark:hover:bg-[#D5FF6B] text-white dark:text-[#090A0C] disabled:opacity-50 cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Guardar plantilla
          </button>
          {isCustom && (
            <button
              type="button"
              onClick={handleRestore}
              disabled={saving}
              className="press inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#777873] hover:text-[#090A0C] dark:hover:text-[#F1F2EC] border border-[#DED7C8] dark:border-[#232D42] cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restaurar predeterminada
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
