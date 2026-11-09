// src/routes/ml.routes.ts
import { Router } from 'express';
import { mlController } from '../controllers/ml.controller';
import { autenticar, exigirRol } from '../middlewares/auth.middleware';
import { uploadDatasetFile } from '../middlewares/upload.middleware';
import { Rol } from '@prisma/client';

export const mlRouter = Router();

mlRouter.get('/metrics', mlController.getMetrics);

// Rutas de administración de ML
mlRouter.post('/train', autenticar, exigirRol(Rol.SUPER_ADMIN, Rol.ADMIN), mlController.retrainModel);
mlRouter.post(
  '/upload-dataset',
  autenticar,
  exigirRol(Rol.SUPER_ADMIN, Rol.ADMIN),
  uploadDatasetFile,
  mlController.uploadDataset,
);
