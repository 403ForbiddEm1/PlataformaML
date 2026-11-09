// src/services/admin.service.ts — acciones del SUPER_ADMIN sobre empresas
import { EstadoEmpresa, MotivoDesactivacion, Rol } from '@prisma/client';
import { prisma } from '../config/database';
import { HttpError } from '../utils/http-error';
import { auditService } from './audit.service';
import { emailService } from './email.service';
import type { Actor } from './company.service';

function exigirSuperAdmin(actor: Actor) {
  if (actor.rol !== Rol.SUPER_ADMIN) throw new HttpError(403, 'Acceso denegado');
}

async function cargarEmpresa(id: string) {
  const empresa = await prisma.empresa.findUnique({ where: { id } });
  if (!empresa) throw new HttpError(404, 'Empresa no encontrada');
  return empresa;
}

async function avisarAdmins(empresaId: string, asunto: string, texto: string) {
  const admins = await prisma.usuario.findMany({
    where: { empresaId, rol: Rol.ADMIN, activo: true },
    select: { id: true, correo: true },
  });
  for (const a of admins) {
    await emailService
      .sendEmail({ to: a.correo, subject: asunto, text: texto, usuarioId: a.id, empresaId, tipo: 'ESTADO_EMPRESA' })
      .catch(() => {});
  }
}

export async function listarEmpresas(actor: Actor, estado?: EstadoEmpresa) {
  exigirSuperAdmin(actor);
  const empresas = await prisma.empresa.findMany({
    where: estado ? { estado } : undefined,
    include: { _count: { select: { vacantes: true, usuarios: true } } },
    orderBy: { creadoEn: 'desc' },
  });

  const roles = await prisma.usuario.groupBy({
    by: ['empresaId', 'rol'],
    where: { empresaId: { not: null } },
    _count: true,
  });

  return empresas.map((e) => ({
    ...e,
    admins: roles.find((r) => r.empresaId === e.id && r.rol === Rol.ADMIN)?._count ?? 0,
    rrhh: roles.find((r) => r.empresaId === e.id && r.rol === Rol.RRHH)?._count ?? 0,
  }));
}

export async function aprobar(actor: Actor, id: string, ip?: string) {
  exigirSuperAdmin(actor);
  const empresa = await cargarEmpresa(id);
  if (empresa.estado !== EstadoEmpresa.PENDIENTE_APROBACION) {
    throw new HttpError(409, 'Solo se pueden aprobar empresas pendientes');
  }
  const ahora = new Date();
  const actualizada = await prisma.$transaction(async (tx) => {
    const emp = await tx.empresa.update({
      where: { id },
      data: {
        estado: EstadoEmpresa.ACTIVA,
        aprobadaEn: ahora,
        aprobadaPorId: actor.id,
        ultimaVacanteEn: ahora,
        motivoRechazo: null,
      },
    });
    await tx.registroAuditoria.create({
      data: { usuarioId: actor.id, empresaId: id, accion: 'EMPRESA_APROBADA', entidad: 'Empresa', entidadId: id, ip: ip ?? null },
    });
    return emp;
  });
  await avisarAdmins(id, 'Tu empresa fue aprobada', `Tu empresa "${empresa.nombre}" ya está activa. Ya puedes iniciar sesión y publicar vacantes.`);
  return actualizada;
}

export async function rechazar(actor: Actor, id: string, motivo: string, ip?: string) {
  exigirSuperAdmin(actor);
  const empresa = await cargarEmpresa(id);
  if (empresa.estado !== EstadoEmpresa.PENDIENTE_APROBACION) {
    throw new HttpError(409, 'Solo se pueden rechazar empresas pendientes');
  }
  const actualizada = await prisma.$transaction(async (tx) => {
    const emp = await tx.empresa.update({
      where: { id },
      data: { estado: EstadoEmpresa.RECHAZADA, motivoRechazo: motivo },
    });
    await tx.registroAuditoria.create({
      data: { usuarioId: actor.id, empresaId: id, accion: 'EMPRESA_RECHAZADA', entidad: 'Empresa', entidadId: id, detalle: { motivo }, ip: ip ?? null },
    });
    return emp;
  });
  await avisarAdmins(id, 'Registro de empresa rechazado', `El registro de "${empresa.nombre}" fue rechazado.\nMotivo: ${motivo}`);
  return actualizada;
}

export async function desactivar(actor: Actor, id: string, motivo?: string, ip?: string) {
  exigirSuperAdmin(actor);
  const empresa = await cargarEmpresa(id);
  if (empresa.estado !== EstadoEmpresa.ACTIVA) {
    throw new HttpError(409, 'Solo se pueden suspender empresas activas');
  }
  const actualizada = await prisma.$transaction(async (tx) => {
    const emp = await tx.empresa.update({
      where: { id },
      data: {
        estado: EstadoEmpresa.SUSPENDIDA,
        desactivadaEn: new Date(),
        motivoDesactivacion: MotivoDesactivacion.MANUAL,
      },
    });
    await tx.registroAuditoria.create({
      data: { usuarioId: actor.id, empresaId: id, accion: 'EMPRESA_SUSPENDIDA', entidad: 'Empresa', entidadId: id, detalle: { motivo }, ip: ip ?? null },
    });
    return emp;
  });
  await avisarAdmins(id, 'Tu empresa fue suspendida', `Tu empresa "${empresa.nombre}" fue suspendida.${motivo ? `\nMotivo: ${motivo}` : ''}`);
  return actualizada;
}

export async function activar(actor: Actor, id: string, activaHasta?: Date, ip?: string) {
  exigirSuperAdmin(actor);
  const empresa = await cargarEmpresa(id);
  if (empresa.estado !== EstadoEmpresa.SUSPENDIDA) {
    throw new HttpError(409, 'Solo se pueden reactivar empresas suspendidas');
  }
  if (activaHasta && activaHasta <= new Date()) {
    throw new HttpError(400, 'La fecha de vigencia debe ser futura');
  }
  const actualizada = await prisma.$transaction(async (tx) => {
    const emp = await tx.empresa.update({
      where: { id },
      data: {
        estado: EstadoEmpresa.ACTIVA,
        desactivadaEn: null,
        motivoDesactivacion: null,
        activaHasta: activaHasta ?? null,
        ultimaVacanteEn: new Date(),
      },
    });
    await tx.registroAuditoria.create({
      data: { usuarioId: actor.id, empresaId: id, accion: 'EMPRESA_ACTIVADA', entidad: 'Empresa', entidadId: id, detalle: { activaHasta }, ip: ip ?? null },
    });
    return emp;
  });
  await avisarAdmins(id, 'Tu empresa fue reactivada', `Tu empresa "${empresa.nombre}" vuelve a estar activa.`);
  return actualizada;
}

export async function listarUsuarios(actor: Actor) {
  exigirSuperAdmin(actor);
  return prisma.usuario.findMany({
    select: { id: true, correo: true, nombre: true, apellido: true, rol: true, activo: true, empresaId: true, ultimoAccesoEn: true, creadoEn: true },
    orderBy: { creadoEn: 'desc' },
    take: 200,
  });
}

