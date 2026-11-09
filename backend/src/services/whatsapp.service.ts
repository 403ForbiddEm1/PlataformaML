// src/services/whatsapp.service.ts
import { prisma } from '../config/database';
import { CanalNotificacion, EstadoNotificacion } from '@prisma/client';

export interface SendWhatsAppOptions {
  to: string; // Número de teléfono en formato internacional (E.164)
  message: string;
  usuarioId?: string;
  empresaId?: string;
  postulacionId?: string;
  tipo?: string;
}

export const whatsappService = {
  async sendWhatsApp(options: SendWhatsAppOptions): Promise<{ success: boolean; id?: string }> {
    const { to, message, usuarioId, empresaId, postulacionId, tipo } = options;

    let notifRecord = null;
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
            mensaje,
            estado: EstadoNotificacion.PENDIENTE,
          },
        });
      } catch (err) {
        console.warn('[WHATSAPP] No se pudo guardar la notificación en BD:', err);
      }
    }

    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;

    // Si no están configuradas las credenciales oficiales de Meta, registramos en log de desarrollo
    if (!token || !phoneId) {
      console.log(`[WHATSAPP_DEV] Destinatario: ${to}`);
      console.log(`[WHATSAPP_DEV_MENSAJE]:\n${message}`);
      if (notifRecord) {
        await prisma.notificacion.update({
          where: { id: notifRecord.id },
          data: { estado: EstadoNotificacion.ENVIADA, enviadaEn: new Date() },
        }).catch(() => {});
      }
      return { success: true, id: notifRecord?.id };
    }

    try {
      const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to.replace(/[^0-9]/g, ''),
          type: 'text',
          text: { preview_url: false, body: message },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WhatsApp API error (${response.status}): ${errorText}`);
      }

      if (notifRecord) {
        await prisma.notificacion.update({
          where: { id: notifRecord.id },
          data: { estado: EstadoNotificacion.ENVIADA, enviadaEn: new Date() },
        });
      }

      return { success: true, id: notifRecord?.id };
    } catch (error: any) {
      console.error('[WHATSAPP_ERROR] Falló el envío de WhatsApp:', error.message);
      if (notifRecord) {
        await prisma.notificacion.update({
          where: { id: notifRecord.id },
          data: {
            estado: EstadoNotificacion.FALLIDA,
            intentos: { increment: 1 },
            registroError: error.message,
          },
        }).catch(() => {});
      }
      return { success: false, id: notifRecord?.id };
    }
  },
};
