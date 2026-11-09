// src/middlewares/auth.middleware.ts
import type { NextFunction, Request, Response } from 'express';
import { EstadoEmpresa, type Rol } from '@prisma/client';
import { prisma } from '../config/database';
import { HttpError } from '../utils/http-error';
import { verificarToken } from '../utils/jwt';

// Valida el token y vuelve a leer al usuario en cada petición: así el rol,
// la desactivación de la cuenta y la suspensión de la empresa se aplican
// de inmediato, aunque el token siga vigente.
export async function autenticar(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'No autenticado');

  let usuarioId: string;
  try {
    usuarioId = verificarToken(header.slice(7)).sub;
  } catch {
    throw new HttpError(401, 'Sesión inválida o vencida');
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { id: true, rol: true, activo: true, empresaId: true, empresa: { select: { estado: true } } },
  });

  if (!usuario || !usuario.activo) throw new HttpError(401, 'Sesión inválida');
  if (usuario.empresaId && usuario.empresa?.estado !== EstadoEmpresa.ACTIVA) {
    throw new HttpError(403, 'La empresa no está activa');
  }

  req.user = { id: usuario.id, rol: usuario.rol, empresaId: usuario.empresaId };
  next();
}

/**
 * Middleware opcional: si viene un token válido, adjunta req.user; si no viene, continúa sin error
 */
export async function autenticarOpcional(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next();
  }

  try {
    const usuarioId = verificarToken(header.slice(7)).sub;
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true, rol: true, activo: true, empresaId: true, empresa: { select: { estado: true } } },
    });

    if (usuario && usuario.activo) {
      if (!usuario.empresaId || usuario.empresa?.estado === EstadoEmpresa.ACTIVA) {
        req.user = { id: usuario.id, rol: usuario.rol, empresaId: usuario.empresaId };
      }
    }
  } catch {
    // Si el token es inválido o expiró, simplemente se ignora para rutas opcionales
  }

  next();
}

export function exigirRol(...roles: Rol[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new HttpError(401, 'No autenticado');
    if (!roles.includes(req.user.rol)) throw new HttpError(403, 'Acceso denegado');
    next();
  };
}