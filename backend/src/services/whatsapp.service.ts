// src/services/whatsapp.service.ts
import crypto from 'crypto';
import { prisma } from '../config/database';
import {
  CanalNotificacion,
  EstadoAprobacionPlantilla,
  EstadoNotificacion,
} from '@prisma/client';

export interface SendWhatsAppOptions {
  to: string; // Número en formato E.164
  message: string;
  usuarioId?: string;
  empresaId?: string;
  postulacionId?: string;
  tipo?: string;
}

export interface EnviarPlantillaOptions {
  para: string;
  nombrePlantilla: string;
  idioma?: string;
  variables?: string[];
}

function apiUrl(): { token?: string; url?: string } {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID;
  const version = process.env.WHATSAPP_API_VERSION || 'v19.0';
  if (!token || !phoneId) return {};
  return { token, url: `https://graph.facebook.com/${version}/${phoneId}/messages` };
}

export const whatsappService = {
  /**
   * Envío directo para el worker. Si se pasa `nombrePlantilla`, usa el tipo
   * `template` (el único que Meta permite fuera de la ventana de 24 h); si no,
   * envía texto (útil en desarrollo o dentro de ventana abierta).
   */
  async sendDirect(options: {
    to: string;
    message: string;
    templateName?: string | null;
    variables?: string[];
  }): Promise<{ success: boolean; externalId?: string; error?: string }> {
    const { to, message, templateName, variables = [] } = options;
    const { token, url } = apiUrl();

    if (!token || !url) {
      console.log(`[WHATSAPP_DEV] Para: ${to} | Plantilla: ${templateName ?? 'texto'} | ${message}`);
      return { success: true };
    }

    const numero = to.replace(/[^0-9]/g, '');
    const payload = templateName
      ? {
          messaging_product: 'whatsapp',
          to: numero,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'es' },
            ...(variables.length
              ? {
                  components: [
                    {
                      type: 'body',
                      parameters: variables.map((v) => ({ type: 'text', text: v })),
                    },
                  ],
                }
              : {}),
          },
        }
      : {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: numero,
          type: 'text',
          text: { preview_url: false, body: message },
        };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `WhatsApp API (${response.status}): ${errorText}` };
      }
      const data: any = await response.json().catch(() => ({}));
      const externalId = data?.messages?.[0]?.id as string | undefined;
      return { success: true, externalId };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error WhatsApp' };
    }
  },

  async enviarPlantilla(opts: EnviarPlantillaOptions) {
    return this.sendDirect({
      to: opts.para,
      message: `[plantilla:${opts.nombrePlantilla}]`,
      templateName: opts.nombrePlantilla,
      variables: opts.variables,
    });
  },

  async sendWhatsApp(options: SendWhatsAppOptions): Promise<{ success: boolean; id?: string }> {
    const { to, message, usuarioId, empresaId, postulacionId, tipo } = options;

    // Sin consentimiento registrado no se envía WhatsApp (Sección 5.5)
    if (usuarioId) {
      const u = await prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: { consentimientoWhatsappEn: true },
      });
      if (!u?.consentimientoWhatsappEn) {
        return { success: false };
      }
    }

    let notifRecord: { id: string } | null = null;
    if (usuarioId) {
      try {
        notifRecord = await prisma.notificacion.create({
          data: {
            usuarioId,
            empresaId: empresaId ?? null,
            postulacionId: postulacionId ?? null,
            canal: CanalNotificacion.WHATSAPP,
            tipo: tipo || 'NOTIFICACION_WHATSAPP',
            destinatario: to,
            mensaje: message,
            estado: EstadoNotificacion.PENDIENTE,
          },
        });
      } catch (err) {
        console.warn('[WHATSAPP] No se pudo guardar la notificación en BD:', err);
      }
    }

    const res = await this.sendDirect({ to, message });

    if (notifRecord) {
      await prisma.notificacion
        .update({
          where: { id: notifRecord.id },
          data: res.success
            ? {
                estado: EstadoNotificacion.ENVIADA,
                enviadaEn: new Date(),
                idExterno: res.externalId ?? null,
              }
            : {
                estado: EstadoNotificacion.FALLIDA,
                intentos: { increment: 1 },
                registroError: res.error ?? 'Error desconocido',
              },
        })
        .catch(() => {});
    }

    return { success: res.success, id: notifRecord?.id };
  },

  /**
   * Verifica la firma X-Hub-Signature-256 sobre el cuerpo crudo con comparación
   * de tiempo constante (Sección 7.3).
   */
  verificarFirmaWebhook(rawBody: Buffer | undefined, firmaHeader: string | undefined): boolean {
    const secret = process.env.WHATSAPP_APP_SECRET;
    if (!secret || !rawBody || !firmaHeader?.startsWith('sha256=')) return false;

    const esperada = Buffer.from(
      'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex'),
      'utf8',
    );
    const recibida = Buffer.from(firmaHeader, 'utf8');
    if (esperada.length !== recibida.length) return false;
    return crypto.timingSafeEqual(esperada, recibida);
  },

  /**
   * Procesa los eventos del webhook de Meta:
   * - statuses[]: actualiza Notificacion por idExterno (sent -> ENVIADA, delivered -> ENTREGADA, read -> LEIDA, failed -> FALLIDA)
   * - message_template_status_update: actualiza PlantillaNotificacion.estadoAprobacion por nombreExterno
   */
  async procesarWebhook(payload: any): Promise<void> {
    const entries: any[] = Array.isArray(payload?.entry) ? payload.entry : [];

    for (const entry of entries) {
      const changes: any[] = Array.isArray(entry?.changes) ? entry.changes : [];

      for (const change of changes) {
        const value = change?.value;

        // 1. Estados de entrega/lectura de mensajes
        const statuses: any[] = Array.isArray(value?.statuses) ? value.statuses : [];
        for (const st of statuses) {
          const idExterno = st?.id as string | undefined;
          const status = st?.status as string | undefined;
          if (!idExterno || !status) continue;

          let nuevoEstado: EstadoNotificacion | null = null;
          if (status === 'sent') nuevoEstado = EstadoNotificacion.ENVIADA;
          else if (status === 'delivered') nuevoEstado = EstadoNotificacion.ENTREGADA;
          else if (status === 'read') nuevoEstado = EstadoNotificacion.LEIDA;
          else if (status === 'failed') nuevoEstado = EstadoNotificacion.FALLIDA;
          if (!nuevoEstado) continue;

          const errorMsg = st?.errors?.[0]?.title as string | undefined;
          await prisma.notificacion.updateMany({
            where: { idExterno },
            data: {
              estado: nuevoEstado,
              ...(errorMsg ? { registroError: errorMsg } : {}),
            },
          });
        }

        // 2. Revisión de plantillas en Meta
        if (change?.field === 'message_template_status_update' && value?.message_template_name) {
          const ev = String(value.event || '').toUpperCase();
          let aprobacion: EstadoAprobacionPlantilla | null = null;
          if (ev === 'APPROVED') aprobacion = EstadoAprobacionPlantilla.APROBADA;
          else if (ev === 'REJECTED' || ev === 'DISABLED') aprobacion = EstadoAprobacionPlantilla.RECHAZADA;
          else if (ev === 'PENDING') aprobacion = EstadoAprobacionPlantilla.PENDIENTE;

          if (aprobacion) {
            await prisma.plantillaNotificacion.updateMany({
              where: { nombreExterno: String(value.message_template_name) },
              data: { estadoAprobacion: aprobacion },
            });
          }
        }
      }
    }
  },
};
