// src/routes/notifications.routes.ts
import { Router } from 'express';
import { Rol } from '@prisma/client';
import { notificationsController } from '../controllers/notifications.controller';
import { autenticar, exigirRol } from '../middlewares/auth.middleware';

export const notificationsRouter = Router();

notificationsRouter.use(autenticar);

notificationsRouter.get('/', notificationsController.getNotifications);
notificationsRouter.post('/send', exigirRol(Rol.ADMIN, Rol.RRHH), notificationsController.sendNotification);
notificationsRouter.patch('/:id/read', notificationsController.markAsRead);
