// src/routes/admin.routes.ts
import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { autenticar, exigirRol } from '../middlewares/auth.middleware';
import { Rol } from '@prisma/client';

export const adminRouter = Router();

// Gestión de empresas y auditoría (Super Admin)
adminRouter.get('/companies', autenticar, exigirRol(Rol.SUPER_ADMIN), adminController.getCompanies);
adminRouter.patch('/companies/:id/status', autenticar, exigirRol(Rol.SUPER_ADMIN), adminController.updateCompanyStatus);
adminRouter.get('/audit', autenticar, exigirRol(Rol.SUPER_ADMIN), adminController.getAuditLogs);

// Invitación de personal a la empresa (Admin de empresa)
adminRouter.post('/invitations', autenticar, exigirRol(Rol.ADMIN, Rol.SUPER_ADMIN), adminController.inviteUser);
