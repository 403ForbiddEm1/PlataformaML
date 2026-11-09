// src/routes/notifications.routes.ts
import { Router } from 'express';
import { notificationsController } from '../controllers/notifications.controller';
import { autenticar } from '../middlewares/auth.middleware';

export const notificationsRouter = Router();

notificationsRouter.get('/', autenticar, notificationsController.getNotifications);
notificationsRouter.post('/send', autenticar, notificationsController.sendNotification);
