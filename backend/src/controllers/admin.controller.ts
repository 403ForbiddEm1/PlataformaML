// src/controllers/admin.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { HttpError } from '../utils/http-error';
import { EstadoEmpresa, Rol } from '@prisma/client';
import { auditService } from '../services/audit.service';
import { z } from 'zod';
import crypto from 'crypto';
import { emailService } from '../services/email.service';

const updateCompanyStatusSchema = z.object({
  status: z.enum(['ACTIVA', 'SUSPENDIDA', 'RECHAZADA', 'PENDIENTE_APROBACION']).optional(),
  rejectionReason: z.string().optional(),
  activaHasta: z.string().nullable().optional(),
});

const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'RRHH']).default('RRHH'),
});

export const adminController = {
  async getCompanies(req: Request, res: Response, next: NextFunction) {
    try {
      const empresas = await prisma.empresa.findMany({
        include: {
          _count: {
            select: { usuarios: true, vacantes: true, postulaciones: true },
          },
        },
        orderBy: { creadoEn: 'desc' },
      });

      res.json({
        success: true,
        data: empresas,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateCompanyStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      const id = req.params.id as string;
      const body = updateCompanyStatusSchema.parse(req.body);

      const empresa = await prisma.empresa.findUnique({ where: { id } });
      if (!empresa) throw new HttpError(404, 'Empresa no encontrada');

      const estadoAnterior = empresa.estado;
      const nuevoEstado = (body.status as EstadoEmpresa) || empresa.estado;

      const updateData: any = {
        estado: nuevoEstado,
        motivoRechazo: body.rejectionReason !== undefined ? body.rejectionReason : empresa.motivoRechazo,
        aprobadaEn: nuevoEstado === EstadoEmpresa.ACTIVA ? (empresa.aprobadaEn || new Date()) : empresa.aprobadaEn,
        aprobadaPorId: nuevoEstado === EstadoEmpresa.ACTIVA ? (empresa.aprobadaPorId || user?.id) : empresa.aprobadaPorId,
      };

      if (body.activaHasta !== undefined) {
        updateData.activaHasta = body.activaHasta ? new Date(body.activaHasta) : null;
      }

      const actualizada = await prisma.empresa.update({
        where: { id },
        data: updateData,
      });

      await auditService.log({
        usuarioId: user?.id,
        empresaId: id,
        accion: `EMPRESA_${nuevoEstado}`,
        entidad: 'Empresa',
        entidadId: id,
        detalle: { estadoAnterior, nuevoEstado, motivo: body.rejectionReason },
        ip: req.ip as string | undefined,
      });

      res.json({
        success: true,
        data: actualizada,
      });
    } catch (err) {
      next(err);
    }
  },

  async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const logs = await prisma.registroAuditoria.findMany({
        include: {
          usuario: { select: { nombre: true, apellido: true, correo: true, rol: true } },
          empresa: { select: { nombre: true } },
        },
        orderBy: { creadoEn: 'desc' },
        take: 100,
      });

      res.json({
        success: true,
        data: logs,
      });
    } catch (err) {
      next(err);
    }
  },

  async getUserProfileReadOnly(req: Request, res: Response, next: NextFunction) {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const usuario = await prisma.usuario.findUnique({
        where: { id },
        select: {
          id: true,
          correo: true,
          nombre: true,
          apellido: true,
          telefono: true,
          fotoRuta: true,
          rol: true,
          activo: true,
          creadoEn: true,
          ultimoAccesoEn: true,
          empresa: {
            select: {
              id: true,
              nombre: true,
              sector: true,
              estado: true,
              identificacionFiscal: true,
              correoContacto: true,
              telefonoContacto: true,
            },
          },
          perfilCandidato: {
            include: {
              educacion: true,
              experiencia: true,
              documentos: {
                where: { vigente: true },
                select: { id: true, tipo: true, nombreArchivo: true, creadoEn: true },
              },
            },
          },
          postulaciones: {
            select: {
              id: true,
              estado: true,
              postuladaEn: true,
              vacante: { select: { id: true, titulo: true, empresa: { select: { nombre: true } } } },
              prediccionML: { select: { puntajeAfinidad: true } },
            },
            orderBy: { postuladaEn: 'desc' },
            take: 20,
          },
        },
      });
      if (!usuario) throw new HttpError(404, 'Usuario no encontrado');
      res.json({ success: true, data: usuario });
    } catch (err) {
      next(err);
    }
  },

  async inviteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user?.empresaId) throw new HttpError(403, 'Solo administradores de empresa pueden enviar invitaciones');

      const body = inviteUserSchema.parse(req.body);
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      const invitacion = await prisma.invitacion.create({
        data: {
          empresaId: user.empresaId,
          correo: body.email.toLowerCase().trim(),
          rol: body.role as Rol,
          tokenHash,
          expiraEn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
          invitadoPorId: user.id,
        },
      });

      await emailService.sendEmail({
        to: body.email,
        subject: 'Invitación para unirte al equipo de Talento Humano',
        text: `Has sido invitado a formar parte de la plataforma de reclutamiento con el rol de ${body.role}. Token de invitación: ${rawToken}`,
        empresaId: user.empresaId,
        tipo: 'INVITACION_EQUIPO',
      });

      res.status(201).json({
        success: true,
        data: {
          id: invitacion.id,
          email: invitacion.correo,
          role: invitacion.rol,
          message: 'Invitación enviada exitosamente',
        },
      });
    } catch (err) {
      next(err);
    }
  },
};
