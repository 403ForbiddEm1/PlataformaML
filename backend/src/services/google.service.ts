// src/services/google.service.ts
// Valida el idToken con Google y gestiona el flujo de autenticación.
// Regla estricta: NUNCA crea usuarios con rol ADMIN ni RRHH por Google.
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/database';
import { HttpError } from '../utils/http-error';
import { firmarToken } from '../utils/jwt';
import { auditService } from './audit.service';
import { Rol } from '@prisma/client';
import { rolToFrontend, type UserResponse } from '../types';
import type { CompletarPerfilGoogleInput } from '../validators/auth.validator';

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(googleClientId);

function mapearUsuario(usuario: any): UserResponse {
  return {
    id: usuario.id,
    email: usuario.correo,
    name: `${usuario.nombre} ${usuario.apellido}`.trim(),
    role: rolToFrontend(usuario.rol),
    avatar: `${usuario.nombre?.[0] ?? ''}${usuario.apellido?.[0] ?? ''}`.toUpperCase(),
    phone: usuario.telefono ?? undefined,
    companyId: usuario.empresaId ?? null,
    companyName: usuario.empresa?.nombre ?? null,
    createdAt: usuario.creadoEn.toISOString(),
  };
}

export type GoogleAuthResult =
  | { tipo: 'SESION_INICIADA'; user: UserResponse; token: string }
  | { tipo: 'REQUIERE_COMPLETAR_PERFIL'; tokenTemporal: string; correo: string; nombre: string };

/**
 * Inicia sesión o inicia el registro de un candidato con un token de Google.
 */
export async function iniciarConGoogle(
  idToken: string,
  ip?: string,
): Promise<GoogleAuthResult> {
  let payload: any;

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: googleClientId,
    });
    payload = ticket.getPayload();
  } catch (err: any) {
    throw new HttpError(401, 'Token de Google inválido');
  }

  if (!payload || !payload.email_verified) {
    throw new HttpError(401, 'El correo de Google no está verificado');
  }

  const googleId = payload.sub as string;
  const correo = (payload.email as string).toLowerCase().trim();
  const nombre = (payload.given_name as string) || (payload.name as string) || 'Usuario';
  const apellido = (payload.family_name as string) || '';

  // 1. Buscar por googleId existente
  let usuario = await prisma.usuario.findUnique({
    where: { googleId },
    include: { empresa: true },
  });

  if (usuario) {
    if (!usuario.activo) throw new HttpError(403, 'Esta cuenta ha sido desactivada');

    // Actualizar último acceso
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoAccesoEn: new Date() },
    });

    await auditService.log({
      usuarioId: usuario.id,
      accion: 'LOGIN_GOOGLE',
      entidad: 'Usuario',
      entidadId: usuario.id,
      ip,
    });

    const token = firmarToken(usuario.id);
    return { tipo: 'SESION_INICIADA', user: mapearUsuario(usuario), token };
  }

  // 2. Buscar por correo
  usuario = await prisma.usuario.findUnique({
    where: { correo },
    include: { empresa: true },
  });

  if (usuario) {
    // Si la cuenta existe, vincular googleId
    usuario = await prisma.usuario.update({
      where: { id: usuario.id },
      data: { googleId, ultimoAccesoEn: new Date() },
      include: { empresa: true },
    });

    if (!usuario.activo) throw new HttpError(403, 'Esta cuenta ha sido desactivada');

    await auditService.log({
      usuarioId: usuario.id,
      accion: 'VINCULAR_GOOGLE',
      entidad: 'Usuario',
      entidadId: usuario.id,
      ip,
    });

    const token = firmarToken(usuario.id);
    return { tipo: 'SESION_INICIADA', user: mapearUsuario(usuario), token };
  }

  // 3. Crear cuenta nueva (CANDIDATO incompleto)
  // NUNCA crea ADMIN ni RRHH por Google
  const nuevoUsuario = await prisma.$transaction(async (tx) => {
    const u = await tx.usuario.create({
      data: {
        correo,
        googleId,
        nombre,
        apellido,
        rol: Rol.CANDIDATO,          // estrictamente CANDIDATO
        empresaId: null,
        claveHash: null,              // solo-Google
        correoVerificadoEn: new Date(),
        // aceptoTerminosEn queda null hasta completar el perfil
      },
    });

    await tx.perfilCandidato.create({
      data: {
        usuarioId: u.id,
        habilidades: [],
        idiomas: ['Español'],
      },
    });

    return u;
  });

  await auditService.log({
    usuarioId: nuevoUsuario.id,
    accion: 'REGISTRO_GOOGLE',
    entidad: 'Usuario',
    entidadId: nuevoUsuario.id,
    ip,
  });

  // Token temporal para completar el perfil
  const tokenTemporal = firmarToken(nuevoUsuario.id);

  return {
    tipo: 'REQUIERE_COMPLETAR_PERFIL',
    tokenTemporal,
    correo: nuevoUsuario.correo,
    nombre: nuevoUsuario.nombre,
  };
}

/**
 * Completa el perfil del candidato creado con Google (términos + teléfono).
 */
export async function completarPerfilGoogle(
  usuarioId: string,
  datos: CompletarPerfilGoogleInput,
  ip?: string,
): Promise<{ user: UserResponse; token: string }> {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: { empresa: true },
  });

  if (!usuario) throw new HttpError(404, 'Usuario no encontrado');

  const actualizado = await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      telefono: datos.telefono ?? usuario.telefono,
      aceptoTerminosEn: new Date(),
      consentimientoWhatsappEn: datos.aceptaWhatsapp ? new Date() : null,
      ultimoAccesoEn: new Date(),
    },
    include: { empresa: true },
  });

  await auditService.log({
    usuarioId: usuario.id,
    accion: 'COMPLETO_PERFIL_GOOGLE',
    entidad: 'Usuario',
    entidadId: usuario.id,
    ip,
  });

  const token = firmarToken(actualizado.id);
  return { user: mapearUsuario(actualizado), token };
}

