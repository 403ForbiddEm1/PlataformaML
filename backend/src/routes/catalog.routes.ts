// src/routes/catalog.routes.ts
import { Router } from 'express';
import { catalogController } from '../controllers/catalog.controller';
import { autenticar, exigirRol } from '../middlewares/auth.middleware';
import { Rol } from '@prisma/client';

export const catalogRouter = Router();

// Público: cualquier empresa, candidato o visitante puede leer las opciones
catalogRouter.get('/', catalogController.list);

// Autenticado (ADMIN, RRHH o SUPER_ADMIN): agregar nuevos departamentos, especialidades o carreras
catalogRouter.post('/', autenticar, exigirRol(Rol.ADMIN, Rol.RRHH, Rol.SUPER_ADMIN), catalogController.create);
