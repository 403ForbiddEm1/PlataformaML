// src/controllers/company.controller.ts — traduce HTTP ↔ company.service
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CanalNotificacion, EventoNotificacion } from '@prisma/client';
import { HttpError } from '../utils/http-error';
import * as companyService from '../services/company.service';
import { templateService } from '../services/template.service';
import { telegramService } from '../services/telegram.service';
import { prisma } from '../config/database';

const actualizarEmpresaSchema = z
  .object({
    razonSocial: z.string().min(2).max(200).optional(),
    sector: z.string().max(100).optional(),
    correoContacto: z.string().email().max(254).optional(),
    telefonoContacto: z.string().max(20).optional(),
    sitioWeb: z.string().url().max(255).optional().or(z.literal('')),
    direccion: z.string().max(255).optional(),
    descripcion: z.string().max(2000).optional(),
    visibilidadPerfil: z.enum(['PUBLICO', 'SOLO_REGISTRADOS', 'NADIE']).optional(),
    latitud: z.number().min(-90).max(90).optional(),
    longitud: z.number().min(-180).max(180).optional(),
  })
  .strict();

const invitarSchema = z
  .object({
    correo: z.string().email().max(254),
    rol: z.enum(['RRHH', 'ADMIN']).default('RRHH'),
    nombre: z.string().max(120).optional(),
    telefono: z.string().max(30).optional(),
    password: z.string().max(120).optional(),
  });

const estadoMiembroSchema = z.object({ activo: z.boolean() }).strict();

const editarPlantillaSchema = z
  .object({
    evento: z.nativeEnum(EventoNotificacion),
    canal: z.nativeEnum(CanalNotificacion),
    asunto: z.string().max(255).optional().nullable(),
    cuerpo: z.string().min(5, 'El cuerpo es demasiado corto').max(2000),
  })
  .strict();

function actorDe(req: Request): companyService.Actor {
  if (!req.user) throw new HttpError(401, 'No autenticado');
  return req.user;
}

export const companyController = {
  async getPublicProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const empresa = await prisma.empresa.findUnique({
        where: { id },
        select: {
          id: true,
          nombre: true,
          razonSocial: true,
          identificacionFiscal: true,
          sector: true,
          sitioWeb: true,
          dominio: true,
          descripcion: true,
          visibilidadPerfil: true,
          correoContacto: true,
          telefonoContacto: true,
          direccion: true,
          estado: true,
          activaHasta: true,
          creadoEn: true,
          vacantes: {
            select: {
              id: true,
              titulo: true,
              departamento: true,
              ubicacion: true,
              modalidad: true,
              tipoContrato: true,
              cantidadVacantes: true,
              estado: true,
              creadoEn: true,
            },
            orderBy: { creadoEn: 'desc' },
          },
          _count: {
            select: { vacantes: true, postulaciones: true },
          },
        },
      });
      if (!empresa) throw new HttpError(404, 'Empresa no encontrada');

      const viewer = req.user;
      const isSuperAdmin = viewer?.rol === 'SUPER_ADMIN';
      const isOwnCompany = Boolean(viewer?.empresaId && viewer.empresaId === empresa.id);
      const visibilidad = empresa.visibilidadPerfil || 'PUBLICO';

      if (!isSuperAdmin && !isOwnCompany) {
        if (visibilidad === 'NADIE') {
          res.status(403).json({
            success: false,
            error: 'Esta empresa ha configurado su perfil como privado.',
            visibilityBlocked: 'NADIE',
          });
          return;
        }
        if (visibilidad === 'SOLO_REGISTRADOS' && !viewer) {
          res.status(403).json({
            success: false,
            error: 'Debes iniciar sesión con una cuenta registrada para ver el perfil de esta empresa.',
            visibilityBlocked: 'SOLO_REGISTRADOS',
          });
          return;
        }
      }

      const vacantesActivas = empresa.vacantes.filter((v) => v.estado === 'ABIERTA');
      const historialVacantes = empresa.vacantes.filter((v) => v.estado !== 'ABIERTA');

      res.json({
        success: true,
        data: {
          ...empresa,
          vacantes: vacantesActivas,
          vacantesActivas,
          historialVacantes,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await companyService.obtenerEmpresa(actorDe(req)) });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const datos = actualizarEmpresaSchema.parse(req.body);
      const data = await companyService.actualizarEmpresa(actorDe(req), datos, req.ip as string | undefined);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async members(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await companyService.listarMiembros(actorDe(req)) });
    } catch (err) {
      next(err);
    }
  },

  async invite(req: Request, res: Response, next: NextFunction) {
    try {
      const datos = invitarSchema.parse(req.body);
      const data = await companyService.invitarMiembro(actorDe(req), datos, req.ip as string | undefined);
      res.status(201).json({ success: true, data, message: 'Invitación enviada' });
    } catch (err) {
      next(err);
    }
  },

  async setMemberStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { activo } = estadoMiembroSchema.parse(req.body);
      const id = z.string().uuid().parse(req.params.id);
      const data = await companyService.cambiarEstadoMiembro(actorDe(req), id, activo, req.ip as string | undefined);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async listTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await templateService.listarDeEmpresa(actorDe(req));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async updateTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const body = editarPlantillaSchema.parse(req.body);
      const data = await templateService.editar(actorDe(req), body, req.ip as string | undefined);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async restoreTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const evento = z.nativeEnum(EventoNotificacion).parse(req.params.evento);
      const canal = z.nativeEnum(CanalNotificacion).parse(req.params.canal);
      const data = await templateService.restaurarPredeterminada(
        actorDe(req),
        evento,
        canal,
        req.ip as string | undefined,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async audit(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = actorDe(req);
      if (!actor.empresaId) throw new HttpError(403, 'Acceso denegado');
      const logs = await prisma.registroAuditoria.findMany({
        where: { empresaId: actor.empresaId },
        include: {
          usuario: { select: { nombre: true, apellido: true, correo: true, rol: true } },
        },
        orderBy: { creadoEn: 'desc' },
        take: 100,
      });
      res.json({ success: true, data: logs });
    } catch (err) {
      next(err);
    }
  },

  async telegramStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = actorDe(req);
      if (!actor.empresaId) throw new HttpError(403, 'Acceso denegado');
      const data = await telegramService.obtenerEstadoTelegramEmpresa(actor.empresaId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async telegramSendCode(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = actorDe(req);
      if (!actor.empresaId) throw new HttpError(403, 'Acceso denegado');
      const { telefono } = z.object({ telefono: z.string().min(6) }).parse(req.body);
      const data = await telegramService.solicitarCodigoVinculacionEmpresa(actor.empresaId, telefono);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async telegramVerifyCode(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = actorDe(req);
      if (!actor.empresaId) throw new HttpError(403, 'Acceso denegado');
      const { codigo, password2FA } = z
        .object({
          codigo: z.string().min(3),
          password2FA: z.string().optional(),
        })
        .parse(req.body);
      const data = await telegramService.confirmarCodigoVinculacionEmpresa(
        actor.empresaId,
        actor.id,
        codigo,
        password2FA,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
};

