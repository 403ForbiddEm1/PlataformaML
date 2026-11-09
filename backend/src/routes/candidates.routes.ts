// src/routes/candidates.routes.ts
import { Router } from 'express';
import { Rol } from '@prisma/client';
import { candidatesController } from '../controllers/candidates.controller';
import { autenticar, exigirRol } from '../middlewares/auth.middleware';
import { uploadPhotoFile, uploadSingleFile } from '../middlewares/upload.middleware';

export const candidatesRouter = Router();

const soloCandidato = [autenticar, exigirRol(Rol.CANDIDATO)];

candidatesRouter.get('/me', ...soloCandidato, candidatesController.getProfile);
candidatesRouter.put('/me', ...soloCandidato, candidatesController.updateProfile);
candidatesRouter.post('/me/documents', ...soloCandidato, uploadSingleFile, candidatesController.uploadDocument);
candidatesRouter.put('/me/photo', ...soloCandidato, uploadPhotoFile, candidatesController.uploadPhoto);

// Descarga autenticada: permite al propio candidato o a RRHH/ADMIN de una empresa donde se postuló
candidatesRouter.get('/me/documents/:id', autenticar, candidatesController.downloadDocument);
candidatesRouter.get('/documents/:id', autenticar, candidatesController.downloadDocument);
