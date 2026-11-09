// src/services/vacancy.service.ts — reglas de negocio de vacantes (sin req/res)
import { EstadoEmpresa, EstadoVacante, Prisma, Rol } from '@prisma/client';
import { prisma } from '../config/database';
import { HttpError } from '../utils/http-error';
import { auditService } from './audit.service';
import type { Actor } from './company.service';

const include = {
  empresa: { select: { nombre: true, estado: true } },
  _count: { select: { postulaciones: true } },
} satisfies Prisma.VacanteInclude;

const esPersonalEmpresa = (a?: Actor) => !!a && !!a.empresaId && (a.rol === Rol.ADMIN || a.rol === Rol.RRHH);

// Visibilidad pública: abierta + empresa activa + no vencida
function filtroPublico(): Prisma.VacanteWhereInput {
  return {
    estado: EstadoVacante.ABIERTA,
    empresa: { estado: EstadoEmpresa.ACTIVA },
    OR: [{ cierraEn: null }, { cierraEn: { gt: new Date() } }],
  };
}

export async function listar(actor?: Actor) {
  const where = esPersonalEmpresa(actor) ? { empresaId: actor!.empresaId! } : filtroPublico();
  return prisma.vacante.findMany({ where, include, orderBy: { creadoEn: 'desc' } });
}

export async function obtener(id: string, actor?: Actor) {
  const where: Prisma.VacanteWhereInput = esPersonalEmpresa(actor)
    ? { id, empresaId: actor!.empresaId! }
    : { id, ...filtroPublico() };
  const vacante = await prisma.vacante.findFirst({ where, include });
  // 404 tanto si no existe como si no es visible o es de otra empresa
  if (!vacante) throw new HttpError(404, 'Vacante no encontrada');
  return vacante;
}

function exigirPersonal(actor: Actor): string {
  if (!esPersonalEmpresa(actor)) throw new HttpError(403, 'Acceso denegado');
  return actor.empresaId!;
}

export async function crear(
  actor: Actor,
  datos: Omit<Prisma.VacanteUncheckedCreateInput, 'empresaId' | 'creadaPorId' | 'publicadaEn'>,
  ip?: string,
) {
  const empresaId = exigirPersonal(actor); // empresaId y creador salen del actor, no del cuerpo
  const ahora = new Date();
  const abierta = datos.estado === EstadoVacante.ABIERTA;

  const vacante = await prisma.$transaction(async (tx) => {
    const v = await tx.vacante.create({
      data: { ...datos, empresaId, creadaPorId: actor.id, publicadaEn: abierta ? ahora : null },
      include,
    });
    // Reinicia el reloj de los 3 meses de inactividad
    await tx.empresa.update({ where: { id: empresaId }, data: { ultimaVacanteEn: ahora } });
    return v;
  });

  await auditService.log({
    usuarioId: actor.id, empresaId, accion: 'VACANTE_CREADA', entidad: 'Vacante',
    entidadId: vacante.id, detalle: { titulo: vacante.titulo, estado: vacante.estado }, ip,
  });
  return vacante;
}

export async function actualizar(
  actor: Actor,
  id: string,
  datos: Prisma.VacanteUncheckedUpdateInput,
  ip?: string,
) {
  const empresaId = exigirPersonal(actor);
  const actual = await prisma.vacante.findFirst({ where: { id, empresaId } });
  if (!actual) throw new HttpError(404, 'Vacante no encontrada');

  const ahora = new Date();
  const abriendo = datos.estado === EstadoVacante.ABIERTA && actual.estado !== EstadoVacante.ABIERTA;
  const data: Prisma.VacanteUncheckedUpdateInput = { ...datos };
  if (abriendo && !actual.publicadaEn) data.publicadaEn = ahora;

  const vacante = await prisma.$transaction(async (tx) => {
    const v = await tx.vacante.update({ where: { id }, data, include });
    if (abriendo) await tx.empresa.update({ where: { id: empresaId }, data: { ultimaVacanteEn: ahora } });
    return v;
  });

  const cambioEstado = datos.estado !== undefined && datos.estado !== actual.estado;
  await auditService.log({
    usuarioId: actor.id, empresaId,
    accion: cambioEstado ? 'VACANTE_ESTADO_CAMBIADO' : 'VACANTE_EDITADA',
    entidad: 'Vacante', entidadId: id,
    detalle: { anterior: { titulo: actual.titulo, estado: actual.estado }, nuevo: datos },
    ip,
  });
  return vacante;
}

// No hay borrado físico: se cierra
export async function cerrar(actor: Actor, id: string, ip?: string) {
  await actualizar(actor, id, { estado: EstadoVacante.CERRADA }, ip);
}

