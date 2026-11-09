// src/services/email.service.ts
import nodemailer, { type Transporter } from 'nodemailer';
import { prisma } from '../config/database';
import { CanalNotificacion, EstadoNotificacion } from '@prisma/client';

let transporter: Transporter | null = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  usuarioId?: string;
  empresaId?: string;
  postulacionId?: string;
  tipo?: string;
}

export const emailService = {
  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string }> {
    const { to, subject, text, html, usuarioId, empresaId, postulacionId, tipo } = options;

    let notifRecord: { id: string } | null = null;
    if (usuarioId) {
      try {
        notifRecord = await prisma.notificacion.create({
          data: {
            usuarioId,
            empresaId: empresaId ?? null,
            postulacionId: postulacionId ?? null,
            canal: CanalNotificacion.CORREO,
            tipo: tipo || 'NOTIFICACION_SISTEMA',
            destinatario: to,
            asunto: subject,
            mensaje: text,
            estado: EstadoNotificacion.PENDIENTE,
          },
        });
      } catch (err) {
        console.warn('[EMAIL] No se pudo guardar la notificación en BD:', err);
      }
    }

    if (!transporter) {
      console.log(`[EMAIL_DEV] Destinatario: ${to} | Asunto: ${subject}`);
      console.log(`[EMAIL_DEV_CONTENIDO]:\n${text}`);
      if (notifRecord) {
        await prisma.notificacion.update({
          where: { id: notifRecord.id },
          data: { estado: EstadoNotificacion.ENVIADA, enviadaEn: new Date() },
        }).catch(() => {});
      }
      return { success: true, id: notifRecord?.id };
    }

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Plataforma Reclutamiento" <no-reply@plataforma.test>',
        to,
        subject,
        text,
        html: html || `<p>${text.replace(/\n/g, '<br/>')}</p>`,
      });

      if (notifRecord) {
        await prisma.notificacion.update({
          where: { id: notifRecord.id },
          data: { estado: EstadoNotificacion.ENVIADA, enviadaEn: new Date() },
        });
      }

      return { success: true, id: notifRecord?.id };
    } catch (error: any) {
      console.error('[EMAIL_ERROR] Falló el envío de correo:', error.message);
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
