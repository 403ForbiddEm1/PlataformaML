// src/controllers/notifications.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { HttpError } from '../utils/http-error';
import { sendNotificationSchema } from '../validators/notification.validator';
import { NotificationItemResponse } from '../types';
import { CanalNotificacion, EstadoNotificacion, Rol } from '@prisma/client';
import { emailService } from '../services/email.service';
import { whatsappService } from '../services/whatsapp.service';

export const notificationsController = {
  async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) throw new HttpError(401, 'No autenticado');
      let whereClause: any = {};

      if (user.rol === Rol.SUPER_ADMIN) {
        whereClause = {};
      } else if (user.rol === Rol.ADMIN || user.rol === Rol.RRHH) {
        whereClause = {
          OR: [{ empresaId: user.empresaId }, { usuarioId: user.id }],
        };
      } else {
        whereClause = { usuarioId: user.id };
      }

      const notificaciones = await prisma.notificacion.findMany({
        where: whereClause,
        orderBy: { creadoEn: 'desc' },
        take: 50,
      });

      const items: NotificationItemResponse[] = notificaciones.map((n) => ({
        id: n.id,
        recipient: n.destinatario,
        channel: n.canal === CanalNotificacion.WHATSAPP ? 'WhatsApp' : 'Email',
        title: n.asunto || (n.canal === CanalNotificacion.WHATSAPP ? 'Mensaje WhatsApp' : 'Notificación'),
        message: n.mensaje,
        timestamp: n.creadoEn.toLocaleString('es-DO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        status:
          n.estado === EstadoNotificacion.LEIDA
            ? 'Leído'
            : n.estado === EstadoNotificacion.ENTREGADA || n.estado === EstadoNotificacion.ENVIADA
            ? 'Entregado'
            : n.estado === EstadoNotificacion.FALLIDA
            ? 'Fallido'
            : 'Pendiente',
        relatedApplicationId: n.postulacionId || undefined,
      }));

      res.json({
        success: true,
        data: items,
      });
    } catch (err) {
      next(err);
    }
  },

  async sendNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || !user.empresaId) throw new HttpError(403, 'Acceso denegado');

      const body = sendNotificationSchema.parse(req.body);

      // Si se asocia a una postulación, validar que pertenezca a la empresa del usuario
      let targetUserId = user.id;
      if (body.relatedApplicationId) {
        const post = await prisma.postulacion.findFirst({
          where: { id: body.relatedApplicationId, empresaId: user.empresaId },
          select: { id: true, candidatoId: true },
        });
        if (!post) throw new HttpError(404, 'Postulación no encontrada');
        targetUserId = post.candidatoId;
      }

      let recordId: string | undefined;

      if (body.channel === 'WhatsApp') {
        const result = await whatsappService.sendWhatsApp({
          to: body.recipient,
          message: body.message,
          usuarioId: targetUserId,
          empresaId: user.empresaId,
          postulacionId: body.relatedApplicationId,
          tipo: 'MENSAJE_MANUAL',
        });
        recordId = result.id;
      } else {
        const result = await emailService.sendEmail({
          to: body.recipient,
          subject: body.title,
          text: body.message,
          usuarioId: targetUserId,
          empresaId: user.empresaId,
          postulacionId: body.relatedApplicationId,
          tipo: 'MENSAJE_MANUAL',
        });
        recordId = result.id;
      }

      const responseItem: NotificationItemResponse = {
        id: recordId || `notif-${Date.now()}`,
        recipient: body.recipient,
        channel: body.channel,
        title: body.title,
        message: body.message,
        timestamp: new Date().toLocaleString('es-DO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        status: 'Entregado',
        relatedApplicationId: body.relatedApplicationId,
      };

      res.status(201).json({
        success: true,
        data: responseItem,
      });
    } catch (err) {
      next(err);
    }
  },

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) throw new HttpError(401, 'No autenticado');
      const id = z.string().uuid('Identificador inválido').parse(req.params.id);

      const notif = await prisma.notificacion.findFirst({
        where: { id, usuarioId: user.id },
      });
      if (!notif) throw new HttpError(404, 'Notificación no encontrada');

      const actualizada = await prisma.notificacion.update({
        where: { id: notif.id },
        data: { estado: EstadoNotificacion.LEIDA },
      });

      res.json({ success: true, data: actualizada });
    } catch (err) {
      next(err);
    }
  },
};
