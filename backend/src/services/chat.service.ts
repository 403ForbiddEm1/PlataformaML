// src/services/chat.service.ts
// Chat interno por postulación (Sección 5.15 y 6.10).
// Regla de privacidad: solo existe conversación cuando hay una Postulacion real.
// El backend nunca interpreta HTML; todo mensaje es texto plano.
import { EventoNotificacion, Rol } from '@prisma/client';
import { prisma } from '../config/database';
import { HttpError } from '../utils/http-error';
import { notificationService } from './notification.service';
import type { Actor } from './company.service';

async function verificarAccesoConversacion(actor: Actor, conversacionId: string) {
  const conv = await prisma.conversacion.findUnique({
    where: { id: conversacionId },
    include: {
      empresa: { select: { id: true, nombre: true } },
      candidato: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          correo: true,
          telefono: true,
          consentimientoWhatsappEn: true,
        },
      },
      postulacion: {
        include: { vacante: { select: { id: true, titulo: true } } },
      },
    },
  });

  if (!conv) throw new HttpError(404, 'Conversación no encontrada');

  const esCandidatoDueno = actor.rol === Rol.CANDIDATO && conv.candidatoId === actor.id;
  const esPersonalEmpresa =
    (actor.rol === Rol.ADMIN || actor.rol === Rol.RRHH) &&
    actor.empresaId !== null &&
    conv.empresaId === actor.empresaId;

  // 404 para no revelar que existe una conversación de otra persona/empresa
  if (!esCandidatoDueno && !esPersonalEmpresa) {
    throw new HttpError(404, 'Conversación no encontrada');
  }

  return conv;
}

export const chatService = {
  async listarConversaciones(actor: Actor) {
    const where =
      actor.rol === Rol.CANDIDATO
        ? { candidatoId: actor.id }
        : actor.empresaId
        ? { empresaId: actor.empresaId }
        : { id: '__none__' };

    const conversaciones = await prisma.conversacion.findMany({
      where,
      include: {
        empresa: { select: { id: true, nombre: true } },
        candidato: { select: { id: true, nombre: true, apellido: true } },
        postulacion: {
          select: {
            id: true,
            estado: true,
            vacante: { select: { id: true, titulo: true } },
          },
        },
        mensajes: {
          orderBy: { creadoEn: 'desc' },
          take: 1,
          select: {
            id: true,
            autorId: true,
            contenido: true,
            leidoEn: true,
            creadoEn: true,
          },
        },
      },
      orderBy: { ultimoMensajeEn: 'desc' },
    });

    // Contar no leídos del otro participante
    const resultado = await Promise.all(
      conversaciones.map(async (c) => {
        const noLeidos = await prisma.mensaje.count({
          where: {
            conversacionId: c.id,
            autorId: { not: actor.id },
            leidoEn: null,
          },
        });

        return {
          id: c.id,
          empresaId: c.empresaId,
          empresaNombre: c.empresa.nombre,
          candidatoId: c.candidatoId,
          candidatoNombre: `${c.candidato.nombre} ${c.candidato.apellido}`.trim(),
          postulacionId: c.postulacionId,
          vacanteTitulo: c.postulacion?.vacante.titulo ?? 'Vacante',
          ultimoMensaje: c.mensajes[0] ?? null,
          ultimoMensajeEn: c.ultimoMensajeEn,
          cerradaEn: c.cerradaEn,
          noLeidos,
        };
      }),
    );

    return resultado;
  },

  async listarMensajes(actor: Actor, conversacionId: string, despues?: Date) {
    await verificarAccesoConversacion(actor, conversacionId);

    return prisma.mensaje.findMany({
      where: {
        conversacionId,
        ...(despues ? { creadoEn: { gt: despues } } : {}),
      },
      include: {
        autor: { select: { id: true, nombre: true, apellido: true, rol: true } },
      },
      orderBy: { creadoEn: 'asc' },
      take: 200,
    });
  },

  async enviarMensaje(actor: Actor, conversacionId: string, contenido: string) {
    const conv = await verificarAccesoConversacion(actor, conversacionId);
    if (conv.cerradaEn) {
      throw new HttpError(403, 'Esta conversación está cerrada y no admite nuevos mensajes');
    }

    const textoLimpio = contenido.trim();
    if (!textoLimpio) throw new HttpError(400, 'El mensaje no puede estar vacío');

    const ahora = new Date();
    const mensaje = await prisma.$transaction(async (tx) => {
      const m = await tx.mensaje.create({
        data: {
          conversacionId: conv.id,
          autorId: actor.id,
          contenido: textoLimpio,
        },
        include: {
          autor: { select: { id: true, nombre: true, apellido: true, rol: true } },
        },
      });

      await tx.conversacion.update({
        where: { id: conv.id },
        data: { ultimoMensajeEn: ahora },
      });

      // Si escribe la empresa, notificar al candidato
      if (actor.rol !== Rol.CANDIDATO) {
        await notificationService.encolar(
          {
            evento: EventoNotificacion.MENSAJE_NUEVO,
            usuarioId: conv.candidato.id,
            empresaId: conv.empresaId,
            postulacionId: conv.postulacionId,
            destinatarioCorreo: conv.candidato.correo,
            destinatarioTelefono: conv.candidato.telefono,
            consentimientoWhatsapp: !!conv.candidato.consentimientoWhatsappEn,
            variables: {
              nombre: conv.candidato.nombre,
              empresa: conv.empresa.nombre,
              vacante: conv.postulacion?.vacante.titulo ?? 'Vacante',
            },
          },
          tx,
        );
      }

      return m;
    });

    // Disparar worker sin bloquear la respuesta
    notificationService.procesarCola().catch(() => {});

    return mensaje;
  },

  async marcarLeidos(actor: Actor, conversacionId: string) {
    await verificarAccesoConversacion(actor, conversacionId);

    const res = await prisma.mensaje.updateMany({
      where: {
        conversacionId,
        autorId: { not: actor.id },
        leidoEn: null,
      },
      data: { leidoEn: new Date() },
    });

    return { marcados: res.count };
  },
};

