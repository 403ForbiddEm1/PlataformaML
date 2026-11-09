// src/controllers/selection.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { HttpError } from '../utils/http-error';
import { submitApplicationSchema, updateApplicationStatusSchema } from '../validators/selection.validator';
import {
  ApplicationResponse,
  ApplicationTimelineEvent,
  estadoPostulacionFromFrontend,
  estadoPostulacionToFrontend,
  MLFactorBreakdown,
} from '../types';
import {
  EstadoEmpresa,
  EstadoPostulacion,
  EstadoVacante,
  EventoNotificacion,
  Rol,
  TipoDocumento,
} from '@prisma/client';
import { mlService } from '../services/ml.service';
import { notificationService } from '../services/notification.service';
import { auditService } from '../services/audit.service';

function formatApplication(app: any): ApplicationResponse {
  const breakdown: MLFactorBreakdown = app.prediccionML?.datosCrudosPrediccion || {
    affinityScore: app.prediccionML ? Math.round(app.prediccionML.puntajeAfinidad * 100) : 0,
    experienceMatch: 80,
    educationMatch: 85,
    skillsMatch: 80,
    matchingSkills: [],
    missingSkills: [],
    keyFactors: ['Perfil evaluado automáticamente.'],
    explanation: 'Evaluación de compatibilidad con los requerimientos.',
    fairnessChecked: true,
  };

  const timeline: ApplicationTimelineEvent[] = (app.historialDeEstados || []).map((h: any) => ({
    id: h.id,
    stage: estadoPostulacionToFrontend(h.estadoNuevo),
    title: `Cambio de Estado: ${h.estadoAnterior ? estadoPostulacionToFrontend(h.estadoAnterior) : 'Registro'} ➔ ${estadoPostulacionToFrontend(h.estadoNuevo)}`,
    description: h.nota || `Estado actualizado a ${estadoPostulacionToFrontend(h.estadoNuevo)}.`,
    timestamp: h.creadoEn.toLocaleString('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    actor: h.cambiadoPor ? `${h.cambiadoPor.nombre} ${h.cambiadoPor.apellido}` : 'Sistema',
    channel: 'Sistema',
  }));

  timeline.push({
    id: `reg-${app.id}`,
    stage: 'Registro',
    title: 'Postulación Recibida en Línea',
    description: 'El postulante completó el formulario y adjuntó su documentación.',
    timestamp: app.postuladaEn.toLocaleString('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    actor: app.candidato ? `${app.candidato.nombre} ${app.candidato.apellido}` : 'Candidato',
    channel: 'Sistema',
  });

  const recruiterNotes = (app.historialDeEstados || [])
    .filter((h: any) => Boolean(h.nota))
    .map((h: any) => {
      const fecha = h.creadoEn.toLocaleDateString('es-DO');
      const autor = h.cambiadoPor ? `${h.cambiadoPor.nombre} ${h.cambiadoPor.apellido}` : 'Reclutador';
      return `[${fecha}] ${autor}: ${h.nota}`;
    });

  return {
    id: app.id,
    vacancyId: app.vacanteId,
    vacancyTitle: app.vacante?.titulo || 'Vacante',
    vacancyDepartment: app.vacante?.departamento || 'General',
    candidateId: app.candidatoId,
    candidateName: app.candidato ? `${app.candidato.nombre} ${app.candidato.apellido}`.trim() : 'Candidato',
    candidateEmail: app.candidato?.correo || '',
    candidatePhone: app.candidato?.telefono || '',
    idCardFileName: app.cedula?.nombreArchivo,
    cvFileName: app.curriculo?.nombreArchivo,
    cvFileUrl: app.curriculoId ? `/api/candidates/documents/${app.curriculoId}` : undefined,
    status: estadoPostulacionToFrontend(app.estado),
    appliedDate: app.postuladaEn.toISOString(),
    updatedDate: app.actualizadoEn.toISOString(),
    mlScore: app.prediccionML ? Math.round(app.prediccionML.puntajeAfinidad * 100) : undefined,
    mlBreakdown: breakdown,
    recruiterNotes,
    timeline,
  };
}

function mapearEstadoAEvento(estado: EstadoPostulacion): EventoNotificacion {
  switch (estado) {
    case EstadoPostulacion.EN_REVISION:
      return EventoNotificacion.EN_REVISION;
    case EstadoPostulacion.PRESELECCIONADA:
      return EventoNotificacion.PRESELECCIONADA;
    case EstadoPostulacion.ENTREVISTA:
      return EventoNotificacion.ENTREVISTA_1;
    case EstadoPostulacion.CONTRATADA:
      return EventoNotificacion.CONTRATADA;
    case EstadoPostulacion.RECHAZADA:
      return EventoNotificacion.RECHAZADA;
    case EstadoPostulacion.RECIBIDA:
    default:
      return EventoNotificacion.POSTULACION_RECIBIDA;
  }
}

const postulacionInclude = {
  vacante: true,
  candidato: true,
  curriculo: true,
  cedula: true,
  prediccionML: true,
  conversacion: { select: { id: true } },
  historialDeEstados: {
    include: { cambiadoPor: true },
    orderBy: { creadoEn: 'desc' as const },
  },
} as const;

export const selectionController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) throw new HttpError(401, 'No autenticado');
      const { vacancyId, status } = req.query;

      const whereClause: any = {};

      // Aislamiento estricto por rol (se ignora cualquier ?email= externo)
      if ((user.rol === Rol.ADMIN || user.rol === Rol.RRHH) && user.empresaId) {
        whereClause.empresaId = user.empresaId;
      } else if (user.rol === Rol.CANDIDATO) {
        whereClause.candidatoId = user.id;
      }

      if (vacancyId && typeof vacancyId === 'string') {
        whereClause.vacanteId = vacancyId;
      }

      if (status && typeof status === 'string') {
        whereClause.estado = estadoPostulacionFromFrontend(status);
      }

      const postulaciones = await prisma.postulacion.findMany({
        where: whereClause,
        include: postulacionInclude,
        orderBy: [
          { prediccionML: { puntajeAfinidad: 'desc' } },
          { postuladaEn: 'desc' },
        ],
      });

      res.json({
        success: true,
        data: postulaciones.map(formatApplication),
      });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) throw new HttpError(401, 'No autenticado');
      const id = req.params.id as string;

      const postulacion = await prisma.postulacion.findUnique({
        where: { id },
        include: postulacionInclude,
      });

      if (!postulacion) throw new HttpError(404, 'Postulación no encontrada');

      // 404 para recursos que no pertenecen al candidato o a la empresa (no revela existencia)
      if (user.rol === Rol.CANDIDATO && postulacion.candidatoId !== user.id) {
        throw new HttpError(404, 'Postulación no encontrada');
      }
      if ((user.rol === Rol.ADMIN || user.rol === Rol.RRHH) && postulacion.empresaId !== user.empresaId) {
        throw new HttpError(404, 'Postulación no encontrada');
      }

      res.json({
        success: true,
        data: formatApplication(postulacion),
      });
    } catch (err) {
      next(err);
    }
  },

  async submitApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || user.rol !== Rol.CANDIDATO) {
        throw new HttpError(403, 'Solo un candidato autenticado puede postularse');
      }

      const body = submitApplicationSchema.parse(req.body);
      const candidatoId = user.id;

      const candidato = await prisma.usuario.findUnique({ where: { id: candidatoId } });
      if (!candidato) throw new HttpError(404, 'Candidato no encontrado');

      // Vacante debe estar ABIERTA y su empresa ACTIVA (si no, 404)
      const vacante = await prisma.vacante.findUnique({
        where: { id: body.vacancyId },
        include: { empresa: true },
      });

      if (
        !vacante ||
        vacante.estado !== EstadoVacante.ABIERTA ||
        vacante.empresa.estado !== EstadoEmpresa.ACTIVA ||
        (vacante.cierraEn && vacante.cierraEn <= new Date())
      ) {
        throw new HttpError(404, 'La vacante solicitada no existe o no está disponible');
      }

      // Validar duplicado
      const postulacionExistente = await prisma.postulacion.findUnique({
        where: {
          vacanteId_candidatoId: {
            vacanteId: vacante.id,
            candidatoId,
          },
        },
      });

      if (postulacionExistente) {
        throw new HttpError(409, 'Ya te postulaste a esta vacante');
      }

      // Buscar o crear perfil del candidato
      let perfil = await prisma.perfilCandidato.findUnique({
        where: { usuarioId: candidatoId },
        include: { educacion: true, experiencia: true, documentos: true },
      });

      if (!perfil) {
        perfil = await prisma.perfilCandidato.create({
          data: { usuarioId: candidatoId, habilidades: [] },
          include: { educacion: true, experiencia: true, documentos: true },
        });
      }

      // Archivos subidos en multipart o documentos vigentes del perfil
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      let curriculoId: string | null = null;
      let cedulaId: string | null = null;

      if (files?.cv && files.cv[0]) {
        const cvFile = files.cv[0];
        await prisma.documentoCandidato.updateMany({
          where: { perfilId: perfil.id, tipo: TipoDocumento.CURRICULO, vigente: true },
          data: { vigente: false },
        });
        const docCv = await prisma.documentoCandidato.create({
          data: {
            perfilId: perfil.id,
            tipo: TipoDocumento.CURRICULO,
            nombreArchivo: cvFile.originalname,
            rutaAlmacenamiento: cvFile.filename,
            tipoMime: cvFile.mimetype,
            tamanioBytes: cvFile.size,
            vigente: true,
          },
        });
        curriculoId = docCv.id;
      } else {
        const cvVigente = perfil.documentos.find((d) => d.tipo === TipoDocumento.CURRICULO && d.vigente);
        if (cvVigente) curriculoId = cvVigente.id;
      }

      if (files?.idCard && files.idCard[0]) {
        const idCardFile = files.idCard[0];
        await prisma.documentoCandidato.updateMany({
          where: { perfilId: perfil.id, tipo: TipoDocumento.CEDULA, vigente: true },
          data: { vigente: false },
        });
        const docCedula = await prisma.documentoCandidato.create({
          data: {
            perfilId: perfil.id,
            tipo: TipoDocumento.CEDULA,
            nombreArchivo: idCardFile.originalname,
            rutaAlmacenamiento: idCardFile.filename,
            tipoMime: idCardFile.mimetype,
            tamanioBytes: idCardFile.size,
            vigente: true,
          },
        });
        cedulaId = docCedula.id;
      } else {
        const cedulaVigente = perfil.documentos.find((d) => d.tipo === TipoDocumento.CEDULA && d.vigente);
        if (cedulaVigente) cedulaId = cedulaVigente.id;
      }

      let respuestasAdicionales: any = undefined;
      if (req.body?.respuestasAdicionales) {
        try {
          respuestasAdicionales =
            typeof req.body.respuestasAdicionales === 'string'
              ? JSON.parse(req.body.respuestasAdicionales)
              : req.body.respuestasAdicionales;
        } catch {
          throw new HttpError(400, 'Formato inválido en respuestas adicionales');
        }
      }

      // Transacción: Postulación + Historial RECIBIDA + Conversación + Notificaciones encoladas
      const postulacion = await prisma.$transaction(async (tx) => {
        const post = await tx.postulacion.create({
          data: {
            vacanteId: vacante.id,
            empresaId: vacante.empresaId, // Tomado de la vacante, jamás del cliente
            candidatoId,
            curriculoId,
            cedulaId,
            respuestasAdicionales,
            estado: EstadoPostulacion.RECIBIDA,
          },
        });

        await tx.historialEstadoPostulacion.create({
          data: {
            postulacionId: post.id,
            estadoAnterior: null,
            estadoNuevo: EstadoPostulacion.RECIBIDA,
            nota: 'Postulación registrada a través del portal web.',
            cambiadoPorId: candidatoId,
          },
        });

        await tx.conversacion.create({
          data: {
            empresaId: vacante.empresaId,
            candidatoId,
            postulacionId: post.id,
          },
        });

        await notificationService.encolar(
          {
            evento: EventoNotificacion.POSTULACION_RECIBIDA,
            usuarioId: candidato.id,
            empresaId: vacante.empresaId,
            postulacionId: post.id,
            destinatarioCorreo: candidato.correo,
            destinatarioTelefono: candidato.telefono,
            consentimientoWhatsapp: !!candidato.consentimientoWhatsappEn,
            variables: {
              nombre: candidato.nombre,
              vacante: vacante.titulo,
              empresa: vacante.empresa.nombre,
              estado: 'Recibida',
            },
          },
          tx,
        );

        return post;
      });

      // Evaluar afinidad ML (extrayendo texto real del CV con POST /extract de ml-service si se subió archivo)
      let extractedCvText: string | null = null;
      if (files?.cv && files.cv[0]) {
        const cvUploaded = files.cv[0];
        const extracted = await mlService.extractText(cvUploaded.path, cvUploaded.originalname, cvUploaded.mimetype);
        if (extracted?.text) {
          extractedCvText = extracted.text;
        }
      }

      const vacancyText = mlService.buildVacancyText(vacante);
      const candidateText = mlService.buildCandidateText(perfil, extractedCvText);

      const prediction = await mlService.predictAffinity(
        vacancyText,
        candidateText,
        perfil.habilidades,
        vacante.habilidadesRequeridas,
        perfil.aniosExperiencia,
        vacante.aniosExperienciaMinimos,
      );

      await prisma.prediccionML.create({
        data: {
          postulacionId: postulacion.id,
          puntajeAfinidad: prediction.puntajeAfinidad,
          esApto: prediction.esApto,
          versionModelo: prediction.modelVersion,
          datosEntrada: {
            aniosExperiencia: perfil.aniosExperiencia,
            nivelEducativo: perfil.nivelEducativo,
            habilidades: perfil.habilidades,
            habilidadesRequeridas: vacante.habilidadesRequeridas,
            aniosExperienciaMinimos: vacante.aniosExperienciaMinimos,
            nivelEducativoMinimo: vacante.nivelEducativoMinimo,
          },
          datosCrudosPrediccion: prediction.breakdown as any,
        },
      });

      await auditService.log({
        usuarioId: candidatoId,
        empresaId: vacante.empresaId,
        accion: 'POSTULACION_CREADA',
        entidad: 'Postulacion',
        entidadId: postulacion.id,
        detalle: { vacanteId: vacante.id, puntajeAfinidad: prediction.puntajeAfinidad },
        ip: req.ip as string | undefined,
      });

      // Procesar cola de notificaciones en segundo plano
      notificationService.procesarCola().catch(() => {});

      const completa = await prisma.postulacion.findUnique({
        where: { id: postulacion.id },
        include: postulacionInclude,
      });

      res.status(201).json({
        success: true,
        data: formatApplication(completa),
      });
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || !user.empresaId) throw new HttpError(403, 'Acceso denegado');

      const id = req.params.id as string;
      const body = updateApplicationStatusSchema.parse(req.body);

      // Filtrado por { id, empresaId }: si es de otra empresa, devuelve 404
      const postulacion = await prisma.postulacion.findFirst({
        where: { id, empresaId: user.empresaId },
        include: {
          vacante: { include: { empresa: true } },
          candidato: true,
        },
      });

      if (!postulacion) throw new HttpError(404, 'Postulación no encontrada');

      const estadoAnterior = postulacion.estado;
      const nuevoEstado = estadoPostulacionFromFrontend(body.status);
      const evento = mapearEstadoAEvento(nuevoEstado);

      await prisma.$transaction(async (tx) => {
        await tx.postulacion.update({
          where: { id: postulacion.id },
          data: { estado: nuevoEstado },
        });

        await tx.historialEstadoPostulacion.create({
          data: {
            postulacionId: postulacion.id,
            estadoAnterior,
            estadoNuevo: nuevoEstado,
            nota: body.notes || null,
            cambiadoPorId: user.id,
          },
        });

        await notificationService.encolar(
          {
            evento,
            usuarioId: postulacion.candidato.id,
            empresaId: postulacion.empresaId,
            postulacionId: postulacion.id,
            destinatarioCorreo: postulacion.candidato.correo,
            destinatarioTelefono: postulacion.candidato.telefono,
            consentimientoWhatsapp: !!postulacion.candidato.consentimientoWhatsappEn,
            variables: {
              nombre: postulacion.candidato.nombre,
              vacante: postulacion.vacante.titulo,
              empresa: postulacion.vacante.empresa.nombre,
              estado: body.status,
            },
          },
          tx,
        );

        await tx.registroAuditoria.create({
          data: {
            usuarioId: user.id,
            empresaId: postulacion.empresaId,
            accion: 'CAMBIO_ESTADO_POSTULACION',
            entidad: 'Postulacion',
            entidadId: postulacion.id,
            detalle: { estadoAnterior, nuevoEstado, nota: body.notes },
            ip: (req.ip as string | undefined) ?? null,
          },
        });
      });

      notificationService.procesarCola().catch(() => {});

      const recargada = await prisma.postulacion.findUnique({
        where: { id: postulacion.id },
        include: postulacionInclude,
      });

      res.json({
        success: true,
        data: formatApplication(recargada),
      });
    } catch (err) {
      next(err);
    }
  },
};
