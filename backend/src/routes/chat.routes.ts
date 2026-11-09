// src/routes/chat.routes.ts
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { chatController } from '../controllers/chat.controller';
import { autenticar } from '../middlewares/auth.middleware';

export const chatRouter = Router();

const limiteMensajes = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiados mensajes enviados. Espera un momento.' },
});

chatRouter.use(autenticar);

chatRouter.get('/', chatController.listConversations);
chatRouter.get('/:id/messages', chatController.listMessages);
chatRouter.post('/:id/messages', limiteMensajes, chatController.sendMessage);
chatRouter.patch('/:id/read', chatController.markRead);

