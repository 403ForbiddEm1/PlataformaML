// src/middlewares/error-handler.ts
import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { HttpError } from '../utils/http-error';
import { env } from '../config/env';

export function noEncontrado(_req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, 'Ruta no encontrada'));
}

// Formato de error que espera el front: { success: false, error }
export function manejarErrores(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ success: false, error: err.message });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: err.issues[0]?.message ?? 'Datos inválidos',
      detalles: err.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'Ya existe un registro con esos datos' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Registro no encontrado' });
    }
  }

  console.error(err);
  return res.status(500).json({
    success: false,
    error: env.NODE_ENV === 'production' ? 'Error interno del servidor' : String((err as Error)?.message ?? err),
  });
}