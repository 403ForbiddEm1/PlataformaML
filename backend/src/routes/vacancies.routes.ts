// src/routes/vacancies.routes.ts
import { Router } from 'express';
import { vacanciesController } from '../controllers/vacancies.controller';
import { autenticar, autenticarOpcional, exigirRol } from '../middlewares/auth.middleware';
import { Rol } from '@prisma/client';

export const vacanciesRouter = Router();

vacanciesRouter.get('/', autenticarOpcional, vacanciesController.getAll);
vacanciesRouter.get('/:id', vacanciesController.getById);

// Rutas protegidas para creación y gestión de vacantes
vacanciesRouter.post(
  '/',
  autenticar,
  exigirRol(Rol.ADMIN, Rol.RRHH, Rol.SUPER_ADMIN),
  vacanciesController.create,
);

vacanciesRouter.put(
  '/:id',
  autenticar,
  exigirRol(Rol.ADMIN, Rol.RRHH, Rol.SUPER_ADMIN),
  vacanciesController.update,
);

vacanciesRouter.delete(
  '/:id',
  autenticar,
  exigirRol(Rol.ADMIN, Rol.RRHH, Rol.SUPER_ADMIN),
  vacanciesController.delete,
);
