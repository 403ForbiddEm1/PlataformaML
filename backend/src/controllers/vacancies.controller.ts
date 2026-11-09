// src/controllers/vacancies.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { HttpError } from '../utils/http-error';
import { createVacancySchema, updateVacancySchema } from '../validators/vacancy.validator';
import {
  estadoVacanteFromFrontend,
  estadoVacanteToFrontend,
  modalidadFromFrontend,
  modalidadToFrontend,
  tipoContratoFromFrontend,
  tipoContratoToFrontend,
  VacancyResponse,
} from '../types';
import { EstadoEmpresa, EstadoVacante, Rol } from '@prisma/client';
import { auditService } from '../services/audit.service';

function formatVacancy(v: any): VacancyResponse {
  const requirementsArray = typeof v.requisitos === 'string'
    ? v.requisitos.split('\n').map((r: string) => r.trim()).filter(Boolean)
    : [];

  return {
    id: v.id,
    title: v.titulo,
    department: v.departamento || 'General',
    location: v.ubicacion || 'Remoto',
    workMode: modalidadToFrontend(v.modalidad),
    type: tipoContratoToFrontend(v.tipoContrato),
    status: estadoVacanteToFrontend(v.estado),
    description: v.descripcion,
    requirements: requirementsArray,
    requiredSkills: v.habilidadesRequeridas || [],
    minExperienceYears: v.aniosExperienciaMinimos || 0,
    openings: v.cantidadVacantes || 1,
    appliedCount: v._count?.postulaciones ?? (Array.isArray(v.postulaciones) ? v.postulaciones.length : 0),
    createdAt: v.creadoEn.toISOString(),
    companyId: v.empresaId,
    companyName: v.empresa?.nombre,
  };
}

export const vacanciesController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      let whereClause: any = {};

      if (user && (user.rol === Rol.ADMIN || user.rol === Rol.RRHH) && user.empresaId) {
        // Personal de la empresa ve todas las vacantes de su empresa
        whereClause = { empresaId: user.empresaId };
      } else {
        // Visitantes o candidatos solo ven vacantes abiertas de empresas activas
        whereClause = {
          estado: EstadoVacante.ABIERTA,
          empresa: { estado: EstadoEmpresa.ACTIVA },
        };
      }

      const vacantes = await prisma.vacante.findMany({
        where: whereClause,
        include: {
          empresa: { select: { nombre: true, estado: true } },
          _count: { select: { postulaciones: true } },
        },
        orderBy: { creadoEn: 'desc' },
      });

      res.json({
        success: true,
        data: vacantes.map(formatVacancy),
      });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const vacante = await prisma.vacante.findUnique({
        where: { id },
        include: {
          empresa: { select: { nombre: true, estado: true } },
          _count: { select: { postulaciones: true } },
        },
      });

      if (!vacante) {
        throw new HttpError(404, 'Vacante no encontrada');
      }

      res.json({
        success: true,
        data: formatVacancy(vacante),
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user || !user.empresaId) {
        throw new HttpError(403, 'Debe pertenecer a una empresa activa para crear vacantes');
      }

      const body = createVacancySchema.parse(req.body);

      const requisitosTexto = Array.isArray(body.requirements)
        ? body.requirements.join('\n')
        : String(body.requirements);

      const vacante = await prisma.vacante.create({
        data: {
          titulo: body.title,
          departamento: body.department,
          ubicacion: body.location,
          modalidad: modalidadFromFrontend(body.workMode),
          tipoContrato: tipoContratoFromFrontend(body.type),
          descripcion: body.description,
          requisitos: requisitosTexto,
          habilidadesRequeridas: body.requiredSkills,
          aniosExperienciaMinimos: body.minExperienceYears,
          cantidadVacantes: body.openings,
          estado: estadoVacanteFromFrontend(body.status),
          empresaId: user.empresaId,
          creadaPorId: user.id,
          publicadaEn: new Date(),
        },
        include: {
          empresa: { select: { nombre: true } },
          _count: { select: { postulaciones: true } },
        },
      });

      await auditService.log({
        usuarioId: user.id,
        empresaId: user.empresaId,
        accion: 'CREAR_VACANTE',
        entidad: 'Vacante',
        entidadId: vacante.id,
        detalle: { titulo: vacante.titulo },
        ip: req.ip,
      });

      res.status(201).json({
        success: true,
        data: formatVacancy(vacante),
      });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      const { id } = req.params;

      const vacanteExistente = await prisma.vacante.findUnique({
        where: { id },
      });

      if (!vacanteExistente) {
        throw new HttpError(404, 'Vacante no encontrada');
      }

      if (user?.rol !== Rol.SUPER_ADMIN && vacanteExistente.empresaId !== user?.empresaId) {
        throw new HttpError(403, 'No tiene permiso para modificar vacantes de otra empresa');
      }

      const body = updateVacancySchema.parse(req.body);

      const updateData: any = {};
      if (body.title !== undefined) updateData.titulo = body.title;
      if (body.department !== undefined) updateData.departamento = body.department;
      if (body.location !== undefined) updateData.ubicacion = body.location;
      if (body.workMode !== undefined) updateData.modalidad = modalidadFromFrontend(body.workMode);
      if (body.type !== undefined) updateData.tipoContrato = tipoContratoFromFrontend(body.type);
      if (body.description !== undefined) updateData.descripcion = body.description;
      if (body.requirements !== undefined) {
        updateData.requisitos = Array.isArray(body.requirements)
          ? body.requirements.join('\n')
          : String(body.requirements);
      }
      if (body.requiredSkills !== undefined) updateData.habilidadesRequeridas = body.requiredSkills;
      if (body.minExperienceYears !== undefined) updateData.aniosExperienciaMinimos = body.minExperienceYears;
      if (body.openings !== undefined) updateData.cantidadVacantes = body.openings;
      if (body.status !== undefined) updateData.estado = estadoVacanteFromFrontend(body.status);

      const vacanteActualizada = await prisma.vacante.update({
        where: { id },
        data: updateData,
        include: {
          empresa: { select: { nombre: true } },
          _count: { select: { postulaciones: true } },
        },
      });

      await auditService.log({
        usuarioId: user?.id,
        empresaId: user?.empresaId,
        accion: 'ACTUALIZAR_VACANTE',
        entidad: 'Vacante',
        entidadId: id,
        detalle: updateData,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: formatVacancy(vacanteActualizada),
      });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      const { id } = req.params;

      const vacante = await prisma.vacante.findUnique({
        where: { id },
      });

      if (!vacante) throw new HttpError(404, 'Vacante no encontrada');

      if (user?.rol !== Rol.SUPER_ADMIN && vacante.empresaId !== user?.empresaId) {
        throw new HttpError(403, 'No tiene permiso para eliminar vacantes de otra empresa');
      }

      // En vez de borrar físicamente si hay postulaciones, la cerramos
      await prisma.vacante.update({
        where: { id },
        data: { estado: EstadoVacante.CERRADA },
      });

      res.json({
        success: true,
        data: { message: 'Vacante cerrada exitosamente' },
      });
    } catch (err) {
      next(err);
    }
  },
};
