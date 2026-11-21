// src/routes/company.routes.ts
import { Router } from 'express';
import { Rol } from '@prisma/client';
import { companyController } from '../controllers/company.controller';
import { autenticar, exigirRol } from '../middlewares/auth.middleware';

export const companyRouter = Router();

companyRouter.use(autenticar);

const personal = exigirRol(Rol.ADMIN, Rol.RRHH);
const soloAdmin = exigirRol(Rol.ADMIN);

companyRouter.get('/', personal, companyController.me);
companyRouter.get('/me', personal, companyController.me);
companyRouter.put('/', soloAdmin, companyController.update);
companyRouter.put('/me', soloAdmin, companyController.update);
companyRouter.get('/members', soloAdmin, companyController.members);
companyRouter.post('/invitations', soloAdmin, companyController.invite);
companyRouter.post('/members/invite', soloAdmin, companyController.invite);
companyRouter.patch('/members/:id', soloAdmin, companyController.setMemberStatus);
companyRouter.patch('/members/:id/status', soloAdmin, companyController.setMemberStatus);

// Vinculación de la cuenta de Telegram propia de la empresa
companyRouter.get('/telegram/status', personal, companyController.telegramStatus);
companyRouter.post('/telegram/send-code', soloAdmin, companyController.telegramSendCode);
companyRouter.post('/telegram/verify-code', soloAdmin, companyController.telegramVerifyCode);

// Plantillas de notificación y auditoría de la empresa
companyRouter.get('/notification-templates', personal, companyController.listTemplates);
companyRouter.put('/notification-templates', personal, companyController.updateTemplate);
companyRouter.delete('/notification-templates/:evento/:canal', personal, companyController.restoreTemplate);
companyRouter.get('/audit', personal, companyController.audit);
