// src/services/notification.service.ts
// Patrón Queue/Worker ("bandeja de salida"): encolar la notificación y enviarla son pasos
// separados, para que un fallo externo nunca rompa la transacción principal.
import {
  CanalNotificacion,
  EstadoNotificacion,
  EventoNotificacion,
  Prisma,
} from '@prisma/client';
import { prisma } from '../config/database';
import { renderizar } from '../utils/plantilla';
import { templateService } from './template.service';
import { emailService } from './email.service';
import { whatsappService } from './whatsapp.service';

export interface EncolarNotificacionParams {
  evento: EventoNotificacion;
  usuarioId: string;
  empresaId?: string | null;
  postulacionId?: string | null;
  destinatarioCorreo?: string | null;
  destinatarioTelefono?: string | null;
  consentimientoWhatsapp?: boolean;
  variables: Record<string, string | number | undefined | null>;
  canales?: CanalNotificacion[];
}

export const notificationService = {
  /**
   * Encola notificaciones para los canales solicitados (siempre incluye APP).
   * Puede recibir un cliente transaccional `tx` o usar `prisma` global.
   */
  async encolar(
    params: EncolarNotificacionParams,
    tx: Prisma.TransactionClient = prisma,
  ): Promise<void> {
    const canalesSet = new Set<CanalNotificacion>(
      params.canales ?? [CanalNotificacion.APP, CanalNotificacion.CORREO, CanalNotificacion.WHATSAPP],
    );
    canalesSet.add(CanalNotificacion.APP); // Siempre crear aviso en campana interna

    for (const canal of canalesSet) {
      if (canal === CanalNotificacion.CORREO && !params.destinatarioCorreo) continue;
      if (canal === CanalNotificacion.WHATSAPP) {
        if (!params.destinatarioTelefono || !params.consentimientoWhatsapp) continue;
      }

      const plantilla = await templateService.obtenerParaEnvio({
        empresaId: params.empresaId,
        evento: params.evento,
        canal,
      });

      if (!plantilla) continue;

      const asunto = plantilla.asunto ? renderizar(plantilla.asunto, params.variables) : null;
      const mensaje = renderizar(plantilla.cuerpo, params.variables);

      const destinatario =
        canal === CanalNotificacion.WHATSAPP
          ? params.destinatarioTelefono!
          : params.destinatarioCorreo || 'app-in-platform';

      await tx.notificacion.create({
        data: {
          usuarioId: params.usuarioId,
          empresaId: params.empresaId ?? null,
          postulacionId: params.postulacionId ?? null,
          canal,
          tipo: params.evento,
          destinatario,
          asunto,
          mensaje,
          // Las de canal APP quedan listas de inmediato para lectura en la campana
          estado: canal === CanalNotificacion.APP ? EstadoNotificacion.ENVIADA : EstadoNotificacion.PENDIENTE,
          enviadaEn: canal === CanalNotificacion.APP ? new Date() : null,
        },
      });
    }
  },

  /**
   * Worker: procesa notificaciones PENDIENTE cuyo proximoIntentoEn <= ahora.
   * Reintenta con backoff exponencial (1 min, 5 min, 15 min) hasta maxIntentos.
   */
  async procesarCola(limite = 25): Promise<{ procesadas: number; enviadas: number; fallidas: number }> {
    const ahora = new Date();

    // Liberar notificaciones que quedaron colgadas en PROCESANDO hace más de 5 minutos
    const haceCincoMin = new Date(Date.now() - 5 * 60 * 1000);
    await prisma.notificacion.updateMany({
      where: {
        estado: EstadoNotificacion.PROCESANDO,
        bloqueadaEn: { lt: haceCincoMin },
      },
      data: {
        estado: EstadoNotificacion.PENDIENTE,
        bloqueadaEn: null,
      },
    });

    const pendientes = await prisma.notificacion.findMany({
      where: {
        estado: EstadoNotificacion.PENDIENTE,
        canal: { in: [CanalNotificacion.CORREO, CanalNotificacion.WHATSAPP] },
        proximoIntentoEn: { lte: ahora },
      },
      orderBy: { proximoIntentoEn: 'asc' },
      take: limite,
    });

    let enviadas = 0;
    let fallidas = 0;

    for (const notif of pendientes) {
      // Bloquear atómicamente para que otro worker no la tome
      const lock = await prisma.notificacion.updateMany({
        where: { id: notif.id, estado: EstadoNotificacion.PENDIENTE },
        data: { estado: EstadoNotificacion.PROCESANDO, bloqueadaEn: new Date() },
      });
      if (lock.count === 0) continue;

      let exito = false;
      let errorMsg = '';
      let idExterno: string | undefined;

      try {
        if (notif.canal === CanalNotificacion.CORREO) {
          const res = await emailService.sendDirect({
            to: notif.destinatario,
            subject: notif.asunto || 'Notificación de la Plataforma',
            text: notif.mensaje,
          });
          exito = res.success;
          if (!exito) errorMsg = res.error || 'Error SMTP';
        } else if (notif.canal === CanalNotificacion.WHATSAPP) {
          const res = await whatsappService.sendDirect({
            to: notif.destinatario,
            message: notif.mensaje,
          });
          exito = res.success;
          idExterno = res.externalId;
          if (!exito) errorMsg = res.error || 'Error WhatsApp API';
        }
      } catch (err: any) {
        exito = false;
        errorMsg = err?.message || 'Excepción al enviar';
      }

      if (exito) {
        enviadas++;
        await prisma.notificacion.update({
          where: { id: notif.id },
          data: {
            estado: EstadoNotificacion.ENVIADA,
            enviadaEn: new Date(),
            bloqueadaEn: null,
            registroError: null,
            ...(idExterno ? { idExterno } : {}),
          },
        });
      } else {
        fallidas++;
        const nuevosIntentos = notif.intentos + 1;
        const agotoIntentos = nuevosIntentos >= notif.maxIntentos;
        // Backoff: 1m, 5m, 15m
        const minutosEspera = nuevosIntentos === 1 ? 1 : nuevosIntentos === 2 ? 5 : 15;
        const proximoIntentoEn = new Date(Date.now() + minutosEspera * 60 * 1000);

        await prisma.notificacion.update({
          where: { id: notif.id },
          data: {
            intentos: nuevosIntentos,
            estado: agotoIntentos ? EstadoNotificacion.FALLIDA : EstadoNotificacion.PENDIENTE,
            proximoIntentoEn,
            bloqueadaEn: null,
            registroError: errorMsg,
          },
        });
      }
    }

    return { procesadas: pendientes.length, enviadas, fallidas };
  },
};

