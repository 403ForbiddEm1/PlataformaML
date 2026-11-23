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
  companyLogoUrl?: string;
  usuarioId?: string;
  empresaId?: string;
  postulacionId?: string;
  tipo?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildBrandedEmailHtml(params: {
  companyName: string;
  companyLogoUrl?: string;
  subject: string;
  text: string;
}): string {
  const { companyName, companyLogoUrl, subject, text } = params;
  const initials = companyName.trim().slice(0, 2).toUpperCase() || 'ML';
  const safeName = escapeHtml(companyName);
  const safeSubject = escapeHtml(subject);
  const safeBody = escapeHtml(text).replace(/\n/g, '<br/>');
  const logoHtml =
    companyLogoUrl && /^(https?:\/\/|data:image\/)/i.test(companyLogoUrl)
      ? `<img src="${companyLogoUrl}" alt="${safeName}" style="width:48px;height:48px;border-radius:12px;object-fit:cover;border:2px solid rgba(255,255,255,0.25);display:block;" />`
      : `<div style="width:48px;height:48px;border-radius:12px;background:#C8FF45;color:#090A0C;font-weight:900;font-size:18px;line-height:48px;text-align:center;font-family:Arial,sans-serif;">${escapeHtml(initials)}</div>`;

  return `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:24px;background:#F4F1EA;font-family:Arial,Helvetica,sans-serif;color:#1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;margin:0 auto;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #DED7C8;">
    <tr>
      <td style="background:#0B5D46;padding:20px 24px;">
        <table role="presentation" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding-right:14px;vertical-align:middle;">${logoHtml}</td>
            <td style="vertical-align:middle;">
              <div style="font-size:18px;font-weight:800;color:#FFFFFF;letter-spacing:-0.2px;">${safeName}</div>
              <div style="font-size:11px;color:#C8FF45;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;">Notificación de Selección · PlataformaML</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <h2 style="margin:0 0 14px 0;font-size:16px;color:#0F172A;">${safeSubject}</h2>
        <div style="font-size:14px;line-height:1.65;color:#334155;">${safeBody}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:14px 24px;background:#FAF7F2;border-top:1px solid #EFE5D4;font-size:11px;color:#64748B;">
        Enviado automáticamente por <strong>${safeName}</strong> a través de PlataformaML.
      </td>
    </tr>
  </table>
</body>
</html>`;
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
      const validReplyTo =
        replyTo && replyTo.includes('@') && !replyTo.endsWith('.test')
          ? replyTo.trim()
          : to && to.includes('@') && !to.endsWith('.test')
          ? to.trim()
          : '403forbiddem1@gmail.com';
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
            replyTo: validReplyTo,
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
    const { to, subject, text, html, replyTo, senderName, companyLogoUrl, usuarioId, empresaId, postulacionId, tipo } = options;

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

    const brandedHtml =
      html ||
      buildBrandedEmailHtml({
        companyName: resolvedSenderName || process.env.APP_NAME || 'PlataformaML',
        companyLogoUrl,
        subject,
        text,
      });

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
      html: brandedHtml,
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
