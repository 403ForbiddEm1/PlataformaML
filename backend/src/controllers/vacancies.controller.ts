// src/controllers/vacancies.controller.ts — traduce HTTP ↔ vacancy.service
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
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
import * as vacancyService from '../services/vacancy.service';

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
    appliedCount: v._count?.postulaciones ?? 0,
    createdAt: v.creadoEn.toISOString(),
    companyId: v.empresaId,
    companyName: v.empresa?.nombre,
  };
}

const idSchema = z.string().uuid('Identificador inválido');
const ip = (req: Request) => req.ip as string | undefined;

function actorRequerido(req: Request) {
  if (!req.user) throw new HttpError(401, 'No autenticado');
  return req.user;
}

const reqToText = (r: string | string[]) => (Array.isArray(r) ? r.join('\n') : String(r));

export const vacanciesController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const vacantes = await vacancyService.listar(req.user);
      res.json({ success: true, data: vacantes.map(formatVacancy) });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const vacante = await vacancyService.obtener(idSchema.parse(req.params.id), req.user);
      res.json({ success: true, data: formatVacancy(vacante) });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = actorRequerido(req);
      const body = createVacancySchema.parse(req.body);

      const vacante = await vacancyService.crear(
        actor,
        {
          titulo: body.title,
          departamento: body.department,
          ubicacion: body.location,
          modalidad: modalidadFromFrontend(body.workMode),
          tipoContrato: tipoContratoFromFrontend(body.type),
          descripcion: body.description,
          requisitos: reqToText(body.requirements),
          habilidadesRequeridas: body.requiredSkills,
          aniosExperienciaMinimos: body.minExperienceYears,
          cantidadVacantes: body.openings,
          estado: estadoVacanteFromFrontend(body.status),
        },
        ip(req),
      );
      res.status(201).json({ success: true, data: formatVacancy(vacante) });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = actorRequerido(req);
      const id = idSchema.parse(req.params.id);
      const body = updateVacancySchema.parse(req.body);

      const datos: Record<string, unknown> = {};
      if (body.title !== undefined) datos.titulo = body.title;
      if (body.department !== undefined) datos.departamento = body.department;
      if (body.location !== undefined) datos.ubicacion = body.location;
      if (body.workMode !== undefined) datos.modalidad = modalidadFromFrontend(body.workMode);
      if (body.type !== undefined) datos.tipoContrato = tipoContratoFromFrontend(body.type);
      if (body.description !== undefined) datos.descripcion = body.description;
      if (body.requirements !== undefined) datos.requisitos = reqToText(body.requirements);
      if (body.requiredSkills !== undefined) datos.habilidadesRequeridas = body.requiredSkills;
      if (body.minExperienceYears !== undefined) datos.aniosExperienciaMinimos = body.minExperienceYears;
      if (body.openings !== undefined) datos.cantidadVacantes = body.openings;
      if (body.status !== undefined) datos.estado = estadoVacanteFromFrontend(body.status);

      const vacante = await vacancyService.actualizar(actor, id, datos, ip(req));
      res.json({ success: true, data: formatVacancy(vacante) });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = actorRequerido(req);
      await vacancyService.cerrar(actor, idSchema.parse(req.params.id), ip(req));
      res.json({ success: true, data: { message: 'Vacante cerrada exitosamente' } });
    } catch (err) {
      next(err);
    }
  },
};
