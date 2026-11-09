// src/middlewares/auth.middleware.ts
import type { NextFunction, Request, Response } from 'express';
import { EstadoEmpresa, Rol } from '@prisma/client';
import { prisma } from '../config/database';
import { HttpError } from '../utils/http-error';
import { verificarToken, type TokenPayload } from '../utils/jwt';

async function cargarYValidar(req: Request, exigirTerminos: boolean) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'No autenticado');

  let payload: TokenPayload;
  try {
    payload = verificarToken(header.slice(7));
  } catch {
    throw new HttpError(401, 'Sesión inválida o vencida');
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      rol: true,
      activo: true,
      empresaId: true,
      googleId: true,
      claveHash: true,
      claveCambiadaEn: true,
      aceptoTerminosEn: true,
      empresa: { select: { estado: true, activaHasta: true } },
    },
  });

  if (!usuario || !usuario.activo) throw new HttpError(401, 'Sesión inválida');

  // Un token emitido antes del último cambio de clave deja de valer
  if (usuario.claveCambiadaEn && payload.iat !== undefined) {
    const cambioSeg = Math.floor(usuario.claveCambiadaEn.getTime() / 1000);
    if (payload.iat < cambioSeg) throw new HttpError(401, 'Sesión inválida o vencida');
  }

  // Candidato creado solo con Google aún sin aceptar términos: solo puede ir a /auth/google/complete
  if (
    exigirTerminos &&
    usuario.rol === Rol.CANDIDATO &&
    usuario.googleId &&
    !usuario.claveHash &&
    !usuario.aceptoTerminosEn
  ) {
    throw new HttpError(403, 'Completa tu perfil antes de continuar');
  }

  if (usuario.empresaId && usuario.empresa) {
    const estado = usuario.empresa.estado;
    if (estado === EstadoEmpresa.PENDIENTE_APROBACION) {
      throw new HttpError(403, 'Tu empresa está pendiente de aprobación.');
    }
    if (estado === EstadoEmpresa.SUSPENDIDA) {
      throw new HttpError(403, 'Tu empresa se encuentra suspendida.');
    }
    if (estado === EstadoEmpresa.RECHAZADA) {
      throw new HttpError(403, 'El registro de tu empresa fue rechazado.');
    }
    if (usuario.empresa.activaHasta && usuario.empresa.activaHasta < new Date()) {
      throw new HttpError(403, 'El período de acceso de tu empresa ha vencido.');
    }
  }

  req.user = { id: usuario.id, rol: usuario.rol, empresaId: usuario.empresaId };
}

export async function autenticar(req: Request, _res: Response, next: NextFunction) {
  await cargarYValidar(req, true);
  next();
}

// Solo para /auth/google/complete: permite la sesión incompleta que acaba de emitir iniciarConGoogle
export async function autenticarParaCompletarPerfil(req: Request, _res: Response, next: NextFunction) {
  await cargarYValidar(req, false);
  next();
}

export async function autenticarOpcional(req: Request, _res: Response, next: NextFunction) {
  if (!req.headers.authorization?.startsWith('Bearer ')) return next();
  try {
    await cargarYValidar(req, true);
  } catch {
    // En rutas opcionales, un token inválido o vencido se trata como visitante
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

// Para acciones sensibles (postular, publicar vacantes): exige correo verificado
export async function exigirCorreoVerificado(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) throw new HttpError(401, 'No autenticado');
  const u = await prisma.usuario.findUnique({
    where: { id: req.user.id },
    select: { correoVerificadoEn: true },
  });
  if (!u?.correoVerificadoEn) {
    throw new HttpError(403, 'Debes verificar tu correo antes de realizar esta acción');
  }
  next();
}
