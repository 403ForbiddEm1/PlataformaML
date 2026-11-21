// src/controllers/chat.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { HttpError } from '../utils/http-error';
import { chatService } from '../services/chat.service';
import { telegramService } from '../services/telegram.service';
import type { Actor } from '../services/company.service';

const idSchema = z.string().uuid('Identificador de conversación inválido');
const enviarMensajeSchema = z
  .object({
    contenido: z.string().min(1, 'El mensaje no puede estar vacío').max(2000, 'Máximo 2000 caracteres').optional(),
    cuerpo: z.string().min(1, 'El mensaje no puede estar vacío').max(2000, 'Máximo 2000 caracteres').optional(),
  })
  .refine((d) => Boolean(d.contenido || d.cuerpo), {
    message: 'El mensaje no puede estar vacío',
  });

function actorDe(req: Request): Actor {
  if (!req.user) throw new HttpError(401, 'No autenticado');
  return req.user;
}

export const chatController = {
  async listConversations(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await chatService.listarConversaciones(actorDe(req));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async listMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const id = idSchema.parse(req.params.id);
      const afterRaw = req.query.after as string | undefined;
      const despues = afterRaw ? z.coerce.date().parse(afterRaw) : undefined;
      const data = await chatService.listarMensajes(actorDe(req), id, despues);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const id = idSchema.parse(req.params.id);
      const parsed = enviarMensajeSchema.parse(req.body);
      const texto = (parsed.contenido || parsed.cuerpo || '').trim();
      const data = await chatService.enviarMensaje(actorDe(req), id, texto);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const id = idSchema.parse(req.params.id);
      const data = await chatService.marcarLeidos(actorDe(req), id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getTelegramLink(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = actorDe(req);
      const info = await telegramService.obtenerInfoBot();
      const chatIdVinculado = await telegramService.obtenerChatIdUsuario(actor.id);
      res.json({
        success: true,
        data: {
          botOnline: info.online,
          botUsername: info.username,
          vinculado: Boolean(chatIdVinculado),
          chatId: chatIdVinculado,
          deepLink: info.linkBase ? `${info.linkBase}?start=${actor.id}` : null,
          comandoManual: `/start ${actor.id}`,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};

