// src/routes/company.routes.ts
import { Router } from 'express';
import { Rol } from '@prisma/client';
import { companyController } from '../controllers/company.controller';
import { autenticar, exigirRol } from '../middlewares/auth.middleware';

export const companyRouter = Router();

companyRouter.use(autenticar);

const personal = exigirRol(Rol.ADMIN, Rol.RRHH);
const soloAdmin = exigirRol(Rol.ADMIN);

companyRouter.get('/me', personal, companyController.me);
companyRouter.put('/me', soloAdmin, companyController.update);
companyRouter.get('/members', soloAdmin, companyController.members);
companyRouter.post('/members/invite', soloAdmin, companyController.invite);
companyRouter.patch('/members/:id/status', soloAdmin, companyController.setMemberStatus);

// Plantillas de notificación y auditoría de la empresa
companyRouter.get('/notification-templates', personal, companyController.listTemplates);
companyRouter.put('/notification-templates', personal, companyController.updateTemplate);
companyRouter.delete('/notification-templates/:evento/:canal', personal, companyController.restoreTemplate);
companyRouter.get('/audit', personal, companyController.audit);
