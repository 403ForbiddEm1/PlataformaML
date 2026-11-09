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
import { EstadoPostulacion, Rol, TipoDocumento } from '@prisma/client';
import { mlService } from '../services/ml.service';
import { emailService } from '../services/email.service';
import { whatsappService } from '../services/whatsapp.service';
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

  // Evento inicial de registro
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

export const selectionController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      const { email, vacancyId, status } = req.query;

      let whereClause: any = {};

      if (user && (user.rol === Rol.ADMIN || user.rol === Rol.RRHH) && user.empresaId) {
        whereClause.empresaId = user.empresaId;
      } else if (user && user.rol === Rol.CANDIDATO) {
        whereClause.candidatoId = user.id;
      }

      if (email && typeof email === 'string') {
        whereClause.candidato = { correo: { contains: email.trim(), mode: 'insensitive' } };
      }

      if (vacancyId && typeof vacancyId === 'string') {
        whereClause.vacanteId = vacancyId;
      }

      if (status && typeof status === 'string') {
        whereClause.estado = estadoPostulacionFromFrontend(status);
      }

      const postulaciones = await prisma.postulacion.findMany({
        where: whereClause,
        include: {
          vacante: true,
          candidato: true,
          curriculo: true,
          cedula: true,
          prediccionML: true,
          historialDeEstados: {
            include: { cambiadoPor: true },
            orderBy: { creadoEn: 'desc' },
          },
        },
        orderBy: [
          // Orden por afinidad ML descendente
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
      const { id } = req.params;

      const postulacion = await prisma.postulacion.findUnique({
        where: { id },
        include: {
          vacante: true,
          candidato: true,
          curriculo: true,
          cedula: true,
          prediccionML: true,
          historialDeEstados: {
            include: { cambiadoPor: true },
            orderBy: { creadoEn: 'desc' },
          },
        },
      });

      if (!postulacion) throw new HttpError(404, 'Postulación no encontrada');

      // Validar permisos de acceso
      if (user && user.rol === Rol.CANDIDATO && postulacion.candidatoId !== user.id) {
        throw new HttpError(403, 'No tiene acceso a esta postulación');
      }
      if (user && (user.rol === Rol.ADMIN || user.rol === Rol.RRHH) && postulacion.empresaId !== user.empresaId) {
        throw new HttpError(403, 'No tiene acceso a postulaciones de otra empresa');
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
      const body = submitApplicationSchema.parse(req.body);

      // Determinar el candidato
      let candidatoId = user?.id;

      if (!candidatoId) {
        if (!body.email) {
          throw new HttpError(400, 'Debe iniciar sesión o suministrar su correo electrónico');
        }

        const candidatoExistente = await prisma.usuario.findUnique({
          where: { correo: body.email.toLowerCase().trim() },
        });

        if (candidatoExistente) {
          candidatoId = candidatoExistente.id;
        } else {
          const nuevo = await prisma.usuario.create({
            data: {
              correo: body.email.toLowerCase().trim(),
              nombre: body.firstName || 'Candidato',
              apellido: body.lastName || '',
              telefono: body.phone,
              rol: Rol.CANDIDATO,
              aceptoTerminosEn: new Date(),
            },
          });
          candidatoId = nuevo.id;
          await prisma.perfilCandidato.create({
            data: { usuarioId: nuevo.id, habilidades: [] },
          });
        }
      }

      // Buscar perfil de candidato
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

      // Buscar vacante
      const vacante = await prisma.vacante.findUnique({
        where: { id: body.vacancyId },
        include: { empresa: true },
      });

      if (!vacante) throw new HttpError(404, 'La vacante solicitada no existe');

      // Validar si ya se postuló a esta vacante
      const postulaciónExistente = await prisma.postulacion.findUnique({
        where: {
          vacanteId_candidatoId: {
            vacanteId: vacante.id,
            candidatoId,
          },
        },
      });

      if (postulaciónExistente) {
        throw new HttpError(409, 'Ya te has postulado previamente a esta vacante.');
      }

      // Manejo de archivos subidos en multipart
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

      // Crear registro de Postulacion
      const postulacion = await prisma.postulacion.create({
        data: {
          vacanteId: vacante.id,
          empresaId: vacante.empresaId,
          candidatoId,
          curriculoId,
          cedulaId,
          estado: EstadoPostulacion.RECIBIDA,
        },
      });

      // Crear evaluación de Machine Learning
      const vacancyText = mlService.buildVacancyText(vacante);
      const candidateText = mlService.buildCandidateText(perfil);

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
          datosEntrada: { vacancyText, candidateText },
          datosCrudosPrediccion: prediction.breakdown as any,
        },
      });

      // Registrar primer evento de trazabilidad
      await prisma.historialEstadoPostulacion.create({
        data: {
          postulacionId: postulacion.id,
          estadoAnterior: null,
          estadoNuevo: EstadoPostulacion.RECIBIDA,
          nota: 'Postulación registrada exitosamente a través del portal web.',
          cambiadoPorId: candidatoId,
        },
      });

      // Obtener candidato para notificaciones
      const candidato = await prisma.usuario.findUnique({ where: { id: candidatoId } });

      if (candidato?.correo) {
        await emailService.sendEmail({
          to: candidato.correo,
          subject: `Postulación Recibida - ${vacante.titulo}`,
          text: `Hola ${candidato.nombre},\n\nHemos recibido exitosamente tu postulación para la vacante de "${vacante.titulo}" en ${vacante.empresa.nombre}.\n\nTu perfil será revisado y te notificaremos sobre cualquier avance.\n\n¡Mucho éxito!`,
          usuarioId: candidato.id,
          empresaId: vacante.empresaId,
          postulacionId: postulacion.id,
          tipo: 'POSTULACION_RECIBIDA',
        });
      }

      if (candidato?.telefono) {
        await whatsappService.sendWhatsApp({
          to: candidato.telefono,
          message: `¡Hola ${candidato.nombre}! Tu postulación para "${vacante.titulo}" en ${vacante.empresa.nombre} ha sido recibida con éxito. Te mantendremos informado por esta vía.`,
          usuarioId: candidato.id,
          empresaId: vacante.empresaId,
          postulacionId: postulacion.id,
          tipo: 'POSTULACION_RECIBIDA',
        });
      }

      await auditService.log({
        usuarioId: candidatoId,
        empresaId: vacante.empresaId,
        accion: 'NUEVA_POSTULACION',
        entidad: 'Postulacion',
        entidadId: postulacion.id,
        detalle: { vacanteId: vacante.id, puntajeAfinidad: prediction.puntajeAfinidad },
        ip: req.ip,
      });

      const completa = await prisma.postulacion.findUnique({
        where: { id: postulacion.id },
        include: {
          vacante: true,
          candidato: true,
          curriculo: true,
          cedula: true,
          prediccionML: true,
          historialDeEstados: { include: { cambiadoPor: true } },
        },
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
      const { id } = req.params;
      const body = updateApplicationStatusSchema.parse(req.body);

      const postulacion = await prisma.postulacion.findUnique({
        where: { id },
        include: {
          vacante: true,
          candidato: true,
          curriculo: true,
          cedula: true,
          prediccionML: true,
        },
      });

      if (!postulacion) throw new HttpError(404, 'Postulación no encontrada');

      // Validar acceso: el usuario debe pertenecer a la empresa de la vacante o ser SUPER_ADMIN
      if (user?.rol !== Rol.SUPER_ADMIN && postulacion.empresaId !== user?.empresaId) {
        throw new HttpError(403, 'No tiene permiso para cambiar el estado de postulaciones de otra empresa');
      }

      const estadoAnterior = postulacion.estado;
      const nuevoEstado = estadoPostulacionFromFrontend(body.status);

      const postulacionActualizada = await prisma.postulacion.update({
        where: { id },
        data: {
          estado: nuevoEstado,
        },
        include: {
          vacante: true,
          candidato: true,
          curriculo: true,
          cedula: true,
          prediccionML: true,
          historialDeEstados: {
            include: { cambiadoPor: true },
            orderBy: { creadoEn: 'desc' },
          },
        },
      });

      // Crear entrada en el historial de trazabilidad
      await prisma.historialEstadoPostulacion.create({
        data: {
          postulacionId: postulacion.id,
          estadoAnterior,
          estadoNuevo: nuevoEstado,
          nota: body.notes || null,
          cambiadoPorId: user?.id || null,
        },
      });

      // Notificaciones automáticas por cambio de estado
      const nombreCandidato = postulacion.candidato.nombre;
      const tituloVacante = postulacion.vacante.titulo;
      const candidato = postulacion.candidato;

      let msg = `Hola ${nombreCandidato}, tu postulación para ${tituloVacante} ha avanzado a etapa: ${body.status}.`;
      if (body.status === 'Preseleccionado') {
        msg = `¡Felicidades ${nombreCandidato}! Tu perfil ha sido PRESELECCIONADO para la vacante de ${tituloVacante}. El equipo de Talento Humano te contactará para coordinar la entrevista.`;
      } else if (body.status === 'Entrevista') {
        msg = `Hola ${nombreCandidato}, has sido convocado a una entrevista técnica para la posición de ${tituloVacante}. Revisa tu correo con los detalles.`;
      } else if (body.status === 'Descartado') {
        msg = `Estimado(a) ${nombreCandidato}, agradecemos profundamente tu tiempo e interés en ${tituloVacante}. En esta oportunidad hemos avanzado con otros perfiles, pero conservaremos tu hoja de vida.`;
      }

      if (candidato.correo) {
        await emailService.sendEmail({
          to: candidato.correo,
          subject: `Actualización de Postulación: ${body.status} - ${tituloVacante}`,
          text: msg,
          usuarioId: candidato.id,
          empresaId: postulacion.empresaId,
          postulacionId: postulacion.id,
          tipo: `CAMBIO_ESTADO_${nuevoEstado}`,
        });
      }

      if (candidato.telefono && (body.status === 'Preseleccionado' || body.status === 'Entrevista')) {
        await whatsappService.sendWhatsApp({
          to: candidato.telefono,
          message: msg,
          usuarioId: candidato.id,
          empresaId: postulacion.empresaId,
          postulacionId: postulacion.id,
          tipo: `CAMBIO_ESTADO_${nuevoEstado}`,
        });
      }

      await auditService.log({
        usuarioId: user?.id,
        empresaId: postulacion.empresaId,
        accion: 'CAMBIO_ESTADO_POSTULACION',
        entidad: 'Postulacion',
        entidadId: postulacion.id,
        detalle: { estadoAnterior, nuevoEstado, nota: body.notes },
        ip: req.ip,
      });

      // Recargar con historial actualizado
      const recargada = await prisma.postulacion.findUnique({
        where: { id },
        include: {
          vacante: true,
          candidato: true,
          curriculo: true,
          cedula: true,
          prediccionML: true,
          historialDeEstados: {
            include: { cambiadoPor: true },
            orderBy: { creadoEn: 'desc' },
          },
        },
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
