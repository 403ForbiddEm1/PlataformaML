// src/routes/candidates.routes.ts
import { Router } from 'express';
import { candidatesController } from '../controllers/candidates.controller';
import { autenticar } from '../middlewares/auth.middleware';
import { uploadSingleFile } from '../middlewares/upload.middleware';

export const candidatesRouter = Router();

candidatesRouter.get('/me', autenticar, candidatesController.getProfile);
candidatesRouter.put('/me', autenticar, candidatesController.updateProfile);
candidatesRouter.post('/me/documents', autenticar, uploadSingleFile, candidatesController.uploadDocument);
candidatesRouter.get('/documents/:id', autenticar, candidatesController.downloadDocument);
