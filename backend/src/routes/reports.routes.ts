// src/routes/reports.routes.ts
import { Router } from 'express';
import { Rol } from '@prisma/client';
import { reportsController } from '../controllers/reports.controller';
import { autenticar, exigirRol } from '../middlewares/auth.middleware';

export const reportsRouter = Router();

// Sección 6.11: ADMIN y RRHH ven su empresa; SUPER_ADMIN ve el comparativo general
reportsRouter.get(
  '/comparison',
  autenticar,
  exigirRol(Rol.ADMIN, Rol.RRHH, Rol.SUPER_ADMIN),
  reportsController.getComparisonMetrics,
);
