// src/routes/vacancies.routes.ts
import { Router } from 'express';
import { vacanciesController } from '../controllers/vacancies.controller';
import { autenticar, autenticarOpcional, exigirCorreoVerificado, exigirRol } from '../middlewares/auth.middleware';
import { Rol } from '@prisma/client';

export const vacanciesRouter = Router();

// Públicas, pero cambian según la sesión (personal ve las de su empresa)
vacanciesRouter.get('/', autenticarOpcional, vacanciesController.getAll);
vacanciesRouter.get('/:id', autenticarOpcional, vacanciesController.getById);

// Gestión: solo ADMIN y RRHH de la empresa (el SUPER_ADMIN no crea ni edita vacantes)
const personal = [autenticar, exigirRol(Rol.ADMIN, Rol.RRHH), exigirCorreoVerificado];
vacanciesRouter.post('/', ...personal, vacanciesController.create);
vacanciesRouter.put('/:id', ...personal, vacanciesController.update);
vacanciesRouter.patch('/:id/status', ...personal, vacanciesController.update);
vacanciesRouter.delete('/:id', ...personal, vacanciesController.delete);
