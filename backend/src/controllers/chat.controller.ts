// src/controllers/chat.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { HttpError } from '../utils/http-error';
import { chatService } from '../services/chat.service';
import type { Actor } from '../services/company.service';

const idSchema = z.string().uuid('Identificador de conversación inválido');
const enviarMensajeSchema = z
  .object({
    contenido: z.string().min(1, 'El mensaje no puede estar vacío').max(2000, 'Máximo 2000 caracteres'),
  })
  .strict();

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
      const { contenido } = enviarMensajeSchema.parse(req.body);
      const data = await chatService.enviarMensaje(actorDe(req), id, contenido);
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
};

