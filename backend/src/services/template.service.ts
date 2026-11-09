// src/services/template.service.ts
// Gestión de plantillas de notificación por empresa, evento y canal.
import {
  CanalNotificacion,
  EstadoAprobacionPlantilla,
  EventoNotificacion,
  Rol,
} from '@prisma/client';
import { prisma } from '../config/database';
import { HttpError } from '../utils/http-error';
import { auditService } from './audit.service';
import type { Actor } from './company.service';

export interface PlantillaBase {
  asunto: string | null;
  cuerpo: string;
}

const PLANTILLAS_POR_DEFECTO: Record<EventoNotificacion, PlantillaBase> = {
  POSTULACION_RECIBIDA: {
    asunto: 'Postulación recibida - {{vacante}}',
    cuerpo:
      'Hola {{nombre}}, hemos recibido tu postulación para la vacante "{{vacante}}" en {{empresa}}. Te notificaremos sobre cualquier avance.',
  },
  EN_REVISION: {
    asunto: 'Tu postulación está en revisión - {{vacante}}',
    cuerpo:
      'Hola {{nombre}}, el equipo de {{empresa}} está revisando tu perfil para la vacante "{{vacante}}".',
  },
  PRESELECCIONADA: {
    asunto: '¡Fuiste preseleccionado(a)! - {{vacante}}',
    cuerpo:
      '¡Felicidades {{nombre}}! Tu perfil ha sido preseleccionado para "{{vacante}}" en {{empresa}}. Pronto te contactaremos.',
  },
  ENTREVISTA_1: {
    asunto: 'Invitación a entrevista - {{vacante}}',
    cuerpo:
      'Hola {{nombre}}, has sido convocado(a) a una entrevista para la vacante "{{vacante}}" en {{empresa}}. Revisa los detalles en la plataforma.',
  },
  ENTREVISTA_2: {
    asunto: 'Segunda entrevista - {{vacante}}',
    cuerpo:
      'Hola {{nombre}}, avanzaste a la siguiente entrevista para "{{vacante}}" en {{empresa}}.',
  },
  CONTRATADA: {
    asunto: '¡Bienvenido(a) al equipo! - {{vacante}}',
    cuerpo:
      '¡Enhorabuena {{nombre}}! Has sido seleccionado(a) para el puesto "{{vacante}}" en {{empresa}}.',
  },
  RECHAZADA: {
    asunto: 'Actualización de tu proceso - {{vacante}}',
    cuerpo:
      'Hola {{nombre}}, agradecemos tu interés en "{{vacante}}" en {{empresa}}. En esta ocasión hemos decidido avanzar con otros perfiles.',
  },
  MENSAJE_NUEVO: {
    asunto: 'Nuevo mensaje de {{empresa}}',
    cuerpo:
      'Hola {{nombre}}, tienes un nuevo mensaje sobre tu postulación a "{{vacante}}" en {{empresa}}.',
  },
};

export const templateService = {
  /**
   * Selección de plantilla según reglas de la especificación (Sección 1.2):
   * 1. Buscar plantilla activa de la empresa. Si es WhatsApp, exige APROBADA.
   * 2. Si no existe, buscar plantilla predeterminada (empresaId = null).
   * 3. Si no hay en BD, usar fallback en memoria (para Correo y APP).
   */
  async obtenerParaEnvio(params: {
    empresaId?: string | null;
    evento: EventoNotificacion;
    canal: CanalNotificacion;
  }): Promise<{ asunto: string | null; cuerpo: string; nombreExterno?: string | null } | null> {
    const { empresaId, evento, canal } = params;
    const requiereAprobacion = canal === CanalNotificacion.WHATSAPP;

    if (empresaId) {
      const deEmpresa = await prisma.plantillaNotificacion.findFirst({
        where: {
          empresaId,
          evento,
          canal,
          activa: true,
          ...(requiereAprobacion ? { estadoAprobacion: EstadoAprobacionPlantilla.APROBADA } : {}),
        },
        orderBy: { version: 'desc' },
      });
      if (deEmpresa) return deEmpresa;
    }

    const predeterminada = await prisma.plantillaNotificacion.findFirst({
      where: {
        empresaId: null,
        evento,
        canal,
        activa: true,
        ...(requiereAprobacion ? { estadoAprobacion: EstadoAprobacionPlantilla.APROBADA } : {}),
      },
      orderBy: { version: 'desc' },
    });

    if (predeterminada) return predeterminada;

    // Fallback en memoria para Correo, APP o WhatsApp en entorno de desarrollo
    const fallback = PLANTILLAS_POR_DEFECTO[evento];
    return fallback ? { asunto: fallback.asunto, cuerpo: fallback.cuerpo, nombreExterno: null } : null;
  },

  async listarDeEmpresa(actor: Actor) {
    if (!actor.empresaId) throw new HttpError(403, 'Acceso denegado');

    const plantillas = await prisma.plantillaNotificacion.findMany({
      where: {
        OR: [{ empresaId: actor.empresaId }, { empresaId: null }],
        activa: true,
      },
      orderBy: [{ evento: 'asc' }, { version: 'desc' }],
    });

    return plantillas;
  },

  async editar(
    actor: Actor,
    datos: {
      evento: EventoNotificacion;
      canal: CanalNotificacion;
      asunto?: string | null;
      cuerpo: string;
    },
    ip?: string,
  ) {
    if (!actor.empresaId || (actor.rol !== Rol.ADMIN && actor.rol !== Rol.RRHH)) {
      throw new HttpError(403, 'Acceso denegado');
    }

    const ultima = await prisma.plantillaNotificacion.findFirst({
      where: { empresaId: actor.empresaId, evento: datos.evento, canal: datos.canal },
      orderBy: { version: 'desc' },
    });

    const nuevaVersion = (ultima?.version ?? 0) + 1;
    const esWhatsapp = datos.canal === CanalNotificacion.WHATSAPP;

    // En Correo y APP desactivamos la anterior y la nueva queda activa de inmediato.
    // En WhatsApp queda PENDIENTE hasta que Meta la apruebe.
    const creada = await prisma.$transaction(async (tx) => {
      if (!esWhatsapp) {
        await tx.plantillaNotificacion.updateMany({
          where: { empresaId: actor.empresaId, evento: datos.evento, canal: datos.canal, activa: true },
          data: { activa: false },
        });
      }

      return tx.plantillaNotificacion.create({
        data: {
          empresaId: actor.empresaId,
          evento: datos.evento,
          canal: datos.canal,
          asunto: datos.asunto ?? null,
          cuerpo: datos.cuerpo,
          version: nuevaVersion,
          estadoAprobacion: esWhatsapp
            ? EstadoAprobacionPlantilla.PENDIENTE
            : EstadoAprobacionPlantilla.NO_APLICA,
          nombreExterno: esWhatsapp
            ? `${datos.evento.toLowerCase()}_v${nuevaVersion}`
            : null,
          activa: true,
        },
      });
    });

    await auditService.log({
      usuarioId: actor.id,
      empresaId: actor.empresaId,
      accion: 'PLANTILLA_EDITADA',
      entidad: 'PlantillaNotificacion',
      entidadId: creada.id,
      detalle: { evento: datos.evento, canal: datos.canal, version: nuevaVersion },
      ip,
    });

    return creada;
  },

  async restaurarPredeterminada(
    actor: Actor,
    evento: EventoNotificacion,
    canal: CanalNotificacion,
    ip?: string,
  ) {
    if (!actor.empresaId || (actor.rol !== Rol.ADMIN && actor.rol !== Rol.RRHH)) {
      throw new HttpError(403, 'Acceso denegado');
    }

    await prisma.plantillaNotificacion.updateMany({
      where: { empresaId: actor.empresaId, evento, canal, activa: true },
      data: { activa: false },
    });

    await auditService.log({
      usuarioId: actor.id,
      empresaId: actor.empresaId,
      accion: 'PLANTILLA_RESTAURADA',
      entidad: 'PlantillaNotificacion',
      detalle: { evento, canal },
      ip,
    });

    return { restored: true };
  },
};

