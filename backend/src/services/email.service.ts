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
  replyTo?: string;
  senderName?: string;
  usuarioId?: string;
  empresaId?: string;
  postulacionId?: string;
  tipo?: string;
}

function buildFromHeader(senderName?: string): string {
  const baseFrom = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@plataforma.test';
  const match = baseFrom.match(/<([^>]+)>/);
  const emailAddr = match ? match[1] : baseFrom.trim();
  const displayName = (senderName || process.env.APP_NAME || 'Plataforma de Reclutamiento').replace(/"/g, '');
  return `"${displayName}" <${emailAddr}>`;
}

export const emailService = {
  /**
   * Envío directo sin crear fila duplicada (usado por el worker de notification.service).
   * Soporta:
   * 1) API HTTP de Brevo (BREVO_API_KEY) -> funciona en Render gratuito donde el puerto SMTP está bloqueado
   * 2) SMTP clásico con Nodemailer (SMTP_HOST + SMTP_USER + SMTP_PASS) -> ej. Gmail con Contraseña de Aplicación
   * 3) Modo desarrollo en consola si ninguno está configurado
   */
  async sendDirect(options: {
    to: string;
    subject: string;
    text: string;
    html?: string;
    replyTo?: string;
    senderName?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const { to, subject, text, html, replyTo, senderName } = options;
    const htmlContent = html || `<p>${text.replace(/\n/g, '<br/>')}</p>`;
    const fromHeader = buildFromHeader(senderName);

    // 1. Si hay GMAIL_SCRIPT_URL (Google Apps Script Web App HTTPS) -> 100% gratis con tu Gmail, sin bloqueo en Venezuela y funciona en Render (puerto 443)
    if (process.env.GMAIL_SCRIPT_URL) {
      const senderDisplay = (senderName || process.env.APP_NAME || 'Plataforma de Reclutamiento').replace(/"/g, '');
      try {
        const res = await fetch(process.env.GMAIL_SCRIPT_URL.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to,
            subject,
            text,
            html: htmlContent,
            senderName: senderDisplay,
            replyTo: replyTo || undefined,
          }),
        });
        if (!res.ok) {
          const errText = await res.text();
          return { success: false, error: `Gmail Script HTTPS (${res.status}): ${errText}` };
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Error Gmail Script HTTPS' };
      }
    }

    // 2. Si hay BREVO_API_KEY configurada, enviar por HTTPS (puerto 443, nunca bloqueado por Render)
    if (process.env.BREVO_API_KEY) {
      const baseFrom = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@plataforma.test';
      const match = baseFrom.match(/<([^>]+)>/);
      const senderEmail = match ? match[1] : baseFrom.trim();
      const senderDisplay = (senderName || process.env.APP_NAME || 'Plataforma de Reclutamiento').replace(/"/g, '');

      try {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': process.env.BREVO_API_KEY,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            sender: { name: senderDisplay, email: senderEmail },
            to: [{ email: to }],
            ...(replyTo ? { replyTo: { email: replyTo, name: senderDisplay } } : {}),
            subject,
            textContent: text,
            htmlContent,
          }),
        });
        if (!res.ok) {
          const errText = await res.text();
          return { success: false, error: `Brevo API (${res.status}): ${errText}` };
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Error Brevo HTTPS' };
      }
    }

    // 2. Si no hay SMTP ni Brevo, modo consola de desarrollo
    if (!transporter) {
      console.log(
        `[EMAIL_DEV] De: ${fromHeader}${replyTo ? ` (Responder a: ${replyTo})` : ''} -> Para: ${to} | Asunto: ${subject}`,
      );
      return { success: true };
    }

    // 3. Envío por SMTP (Nodemailer)
    try {
      await transporter.sendMail({
        from: fromHeader,
        ...(replyTo ? { replyTo } : {}),
        to,
        subject,
        text,
        html: htmlContent,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error SMTP' };
    }
  },

  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string }> {
    const { to, subject, text, html, replyTo, senderName, usuarioId, empresaId, postulacionId, tipo } = options;

    let resolvedSenderName = senderName;
    let resolvedReplyTo = replyTo;

    if (empresaId && (!resolvedSenderName || !resolvedReplyTo)) {
      const emp = await prisma.empresa
        .findUnique({
          where: { id: empresaId },
          select: { nombre: true, correoContacto: true },
        })
        .catch(() => null);
      if (emp) {
        resolvedSenderName = resolvedSenderName || emp.nombre;
        resolvedReplyTo = resolvedReplyTo || emp.correoContacto || undefined;
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

    const res = await this.sendDirect({
      to,
      subject,
      text,
      html,
      replyTo: resolvedReplyTo,
      senderName: resolvedSenderName,
    });

    if (notifRecord) {
      await prisma.notificacion
        .update({
          where: { id: notifRecord.id },
          data: res.success
            ? { estado: EstadoNotificacion.ENVIADA, enviadaEn: new Date() }
            : {
                estado: EstadoNotificacion.FALLIDA,
                intentos: { increment: 1 },
                registroError: res.error || 'Error al enviar correo',
              },
        })
        .catch(() => {});
    }

    return { success: res.success, id: notifRecord?.id };
  },
};
