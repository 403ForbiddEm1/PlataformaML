// src/services/company.service.ts
// Lógica de negocio de la empresa (ADMIN y RRHH). Nunca recibe req/res.
// empresaId SIEMPRE sale del actor (token + BD), jamás del cuerpo o la URL.
import crypto from 'crypto';
import { Rol } from '@prisma/client';
import { prisma } from '../config/database';
import { HttpError } from '../utils/http-error';
import { auditService } from './audit.service';
import { emailService } from './email.service';

export interface Actor {
  id: string;
  rol: Rol;
  empresaId: string | null;
}

function exigirEmpresa(actor: Actor): string {
  if (!actor.empresaId) throw new HttpError(403, 'Acceso denegado');
  return actor.empresaId;
}

function exigirAdmin(actor: Actor) {
  if (actor.rol !== Rol.ADMIN) throw new HttpError(403, 'Solo un administrador puede hacer esto');
}

export async function obtenerEmpresa(actor: Actor) {
  const empresaId = exigirEmpresa(actor);
  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) throw new HttpError(404, 'Empresa no encontrada');
  return empresa;
}

export async function actualizarEmpresa(
  actor: Actor,
  datos: {
    razonSocial?: string;
    sector?: string;
    correoContacto?: string;
    telefonoContacto?: string;
    sitioWeb?: string;
    direccion?: string;
    latitud?: number;
    longitud?: number;
  },
  ip?: string,
) {
  exigirAdmin(actor);
  const empresaId = exigirEmpresa(actor);

  const actualizada = await prisma.empresa.update({ where: { id: empresaId }, data: datos });

  await auditService.log({
    usuarioId: actor.id,
    empresaId,
    accion: 'EMPRESA_EDITADA',
    entidad: 'Empresa',
    entidadId: empresaId,
    detalle: datos,
    ip,
  });
  return actualizada;
}

export async function listarMiembros(actor: Actor) {
  exigirAdmin(actor);
  const empresaId = exigirEmpresa(actor);
  return prisma.usuario.findMany({
    where: { empresaId },
    select: {
      id: true,
      correo: true,
      nombre: true,
      apellido: true,
      rol: true,
      activo: true,
      ultimoAccesoEn: true,
      creadoEn: true,
    },
    orderBy: { creadoEn: 'asc' },
  });
}

export async function invitarMiembro(
  actor: Actor,
  datos: { correo: string; rol: 'RRHH' | 'ADMIN' },
  ip?: string,
) {
  exigirAdmin(actor);
  const empresaId = exigirEmpresa(actor);
  const correo = datos.correo.toLowerCase().trim();

  const existente = await prisma.usuario.findUnique({ where: { correo } });
  if (existente) throw new HttpError(409, 'Ya existe una cuenta con ese correo');

  const tokenPlano = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(tokenPlano).digest('hex');

  const invitacion = await prisma.invitacion.create({
    data: {
      empresaId,
      correo,
      rol: datos.rol === 'ADMIN' ? Rol.ADMIN : Rol.RRHH,
      tokenHash,
      expiraEn: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 h
      invitadoPorId: actor.id,
    },
  });

  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  const appUrl = process.env.APP_URL ?? 'http://localhost:5173';
  await emailService
    .sendEmail({
      to: correo,
      subject: `Invitación para unirte a ${empresa?.nombre ?? 'una empresa'}`,
      text: `Fuiste invitado a la plataforma de reclutamiento.\n\nCrea tu cuenta aquí (válido 72 horas):\n${appUrl}/accept-invitation?token=${tokenPlano}`,
      empresaId,
      tipo: 'INVITACION_EQUIPO',
    })
    .catch(() => {});

  await auditService.log({
    usuarioId: actor.id,
    empresaId,
    accion: 'MIEMBRO_INVITADO',
    entidad: 'Invitacion',
    entidadId: invitacion.id,
    detalle: { correo, rol: invitacion.rol },
    ip,
  });

  return { id: invitacion.id, correo, rol: invitacion.rol, expiraEn: invitacion.expiraEn };
}

export async function cambiarEstadoMiembro(
  actor: Actor,
  usuarioId: string,
  activo: boolean,
  ip?: string,
) {
  exigirAdmin(actor);
  const empresaId = exigirEmpresa(actor);

  // Se busca con empresaId: un miembro de otra empresa responde 404
  const miembro = await prisma.usuario.findFirst({ where: { id: usuarioId, empresaId } });
  if (!miembro) throw new HttpError(404, 'Miembro no encontrado');

  if (!activo) {
    if (miembro.id === actor.id) throw new HttpError(400, 'No puedes desactivarte a ti mismo');
    if (miembro.rol === Rol.ADMIN) {
      const otrosAdmins = await prisma.usuario.count({
        where: { empresaId, rol: Rol.ADMIN, activo: true, id: { not: miembro.id } },
      });
      if (otrosAdmins === 0) {
        throw new HttpError(400, 'La empresa no puede quedarse sin un administrador activo');
      }
    }
  }

  const actualizado = await prisma.usuario.update({
    where: { id: miembro.id },
    data: { activo },
    select: { id: true, correo: true, rol: true, activo: true },
  });

  await auditService.log({
    usuarioId: actor.id,
    empresaId,
    accion: activo ? 'MIEMBRO_ACTIVADO' : 'MIEMBRO_DESACTIVADO',
    entidad: 'Usuario',
    entidadId: miembro.id,
    ip,
  });
  return actualizado;
}

