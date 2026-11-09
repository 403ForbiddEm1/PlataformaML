// src/routes/selection.routes.ts
import { Router } from 'express';
import { selectionController } from '../controllers/selection.controller';
import { autenticar, autenticarOpcional, exigirRol } from '../middlewares/auth.middleware';
import { uploadApplicationFiles } from '../middlewares/upload.middleware';
import { Rol } from '@prisma/client';

export const selectionRouter = Router();

selectionRouter.get('/', autenticar, selectionController.getAll);
selectionRouter.get('/:id', autenticar, selectionController.getById);

// Postulación (soporta multipart con cv y cédula, opcionalmente autenticado)
selectionRouter.post('/', autenticarOpcional, uploadApplicationFiles, selectionController.submitApplication);

// Cambio de estado de postulación (exige ADMIN, RRHH o SUPER_ADMIN)
selectionRouter.patch(
  '/:id/status',
  autenticar,
  exigirRol(Rol.ADMIN, Rol.RRHH, Rol.SUPER_ADMIN),
  selectionController.updateStatus,
);
