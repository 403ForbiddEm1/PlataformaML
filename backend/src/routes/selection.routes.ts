// src/routes/selection.routes.ts
import { Router } from 'express';
import { selectionController } from '../controllers/selection.controller';
import { autenticar, exigirCorreoVerificado, exigirRol } from '../middlewares/auth.middleware';
import { uploadApplicationFiles } from '../middlewares/upload.middleware';
import { Rol } from '@prisma/client';

export const selectionRouter = Router();

selectionRouter.get('/', autenticar, selectionController.getAll);
selectionRouter.get('/:id', autenticar, selectionController.getById);

// Postularse exige sesión de CANDIDATO y correo verificado (el chequeo va ANTES de escribir archivos a disco)
selectionRouter.post(
  '/',
  autenticar,
  exigirRol(Rol.CANDIDATO),
  exigirCorreoVerificado,
  uploadApplicationFiles,
  selectionController.submitApplication,
);

// Cambio de estado: solo personal de la empresa (ADMIN y RRHH)
selectionRouter.patch(
  '/:id/status',
  autenticar,
  exigirRol(Rol.ADMIN, Rol.RRHH),
  selectionController.updateStatus,
);
