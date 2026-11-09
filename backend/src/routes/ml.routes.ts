// src/routes/ml.routes.ts
import { Router } from 'express';
import { Rol } from '@prisma/client';
import { mlController } from '../controllers/ml.controller';
import { autenticar, exigirRol } from '../middlewares/auth.middleware';
import { uploadDatasetFile, uploadSingleFile } from '../middlewares/upload.middleware';

export const mlRouter = Router();

const soloAdmin = [autenticar, exigirRol(Rol.SUPER_ADMIN, Rol.ADMIN)];
const reclutadoresYAdmin = [autenticar, exigirRol(Rol.SUPER_ADMIN, Rol.ADMIN, Rol.RRHH)];

// Endpoints conectados directamente con ml-service/app/api/routes.py
mlRouter.get('/health', autenticar, mlController.checkHealth);
mlRouter.post('/predict', ...reclutadoresYAdmin, mlController.predict);
mlRouter.post('/rank', ...reclutadoresYAdmin, mlController.rank);
mlRouter.post('/extract', autenticar, uploadSingleFile, mlController.extract);
mlRouter.get('/metrics', ...soloAdmin, mlController.getMetrics);
mlRouter.post('/train', ...soloAdmin, mlController.retrainModel);
mlRouter.post('/upload-dataset', ...soloAdmin, uploadDatasetFile, mlController.uploadDataset);
