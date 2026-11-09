// src/controllers/auth.controller.ts
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { HttpError } from '../utils/http-error';
import { firmarToken } from '../utils/jwt';
import { loginSchema, registerSchema, recoverPasswordSchema, resetPasswordSchema } from '../validators/auth.validator';
import { rolFromFrontend, rolToFrontend, UserResponse } from '../types';
import { Rol, EstadoEmpresa, TipoToken } from '@prisma/client';
import { auditService } from '../services/audit.service';
import { emailService } from '../services/email.service';
import crypto from 'crypto';

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = loginSchema.parse(req.body);
      const email = data.email.toLowerCase().trim();

      const usuario = await prisma.usuario.findUnique({
        where: { correo: email },
        include: { empresa: true },
      });

      if (!usuario) {
        throw new HttpError(401, 'Credenciales incorrectas');
      }

      // Verificación de bloqueo por intentos fallidos
      if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
        const minutosRestantes = Math.ceil((usuario.bloqueadoHasta.getTime() - Date.now()) / 60000);
        throw new HttpError(429, `Cuenta bloqueada temporalmente. Intente nuevamente en ${minutosRestantes} minutos.`);
      }

      // Verificación de contraseña
      const coincide = usuario.claveHash ? await bcrypt.compare(data.password, usuario.claveHash) : false;
      if (!coincide) {
        const nuevosIntentos = usuario.intentosFallidos + 1;
        const bloquear = nuevosIntentos >= 5;
        const bloqueadoHasta = bloquear ? new Date(Date.now() + 15 * 60 * 1000) : null;

        await prisma.usuario.update({
          where: { id: usuario.id },
          data: {
            intentosFallidos: nuevosIntentos,
            bloqueadoHasta,
          },
        });

        await auditService.log({
          usuarioId: usuario.id,
          empresaId: usuario.empresaId,
          accion: 'LOGIN_FALLIDO',
          entidad: 'Usuario',
          entidadId: usuario.id,
          ip: req.ip,
        });

        throw new HttpError(401, 'Credenciales incorrectas');
      }

      // Verificar si la cuenta está activa
      if (!usuario.activo) {
        throw new HttpError(403, 'Esta cuenta ha sido desactivada');
      }

      // Verificar estado de la empresa si no es SUPER_ADMIN ni CANDIDATO
      if (usuario.empresaId && usuario.empresa) {
        if (usuario.empresa.estado === EstadoEmpresa.PENDIENTE_APROBACION) {
          throw new HttpError(403, 'La empresa se encuentra pendiente de aprobación por el Super Administrador.');
        }
        if (usuario.empresa.estado === EstadoEmpresa.SUSPENDIDA || usuario.empresa.estado === EstadoEmpresa.RECHAZADA) {
          throw new HttpError(403, `La empresa no tiene acceso (${usuario.empresa.estado}).`);
        }
      }

      // Restablecer intentos fallidos y actualizar último acceso
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          intentosFallidos: 0,
          bloqueadoHasta: null,
          ultimoAccesoEn: new Date(),
        },
      });

      const token = firmarToken(usuario.id);

      const userDto: UserResponse = {
        id: usuario.id,
        email: usuario.correo,
        name: `${usuario.nombre} ${usuario.apellido}`.trim(),
        role: rolToFrontend(usuario.rol),
        avatar: `${usuario.nombre[0] || ''}${usuario.apellido[0] || ''}`.toUpperCase(),
        phone: usuario.telefono || undefined,
        companyId: usuario.empresaId,
        companyName: usuario.empresa?.nombre,
        createdAt: usuario.creadoEn.toISOString(),
      };

      await auditService.log({
        usuarioId: usuario.id,
        empresaId: usuario.empresaId,
        accion: 'LOGIN_EXITOSO',
        entidad: 'Usuario',
        entidadId: usuario.id,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: {
          user: userDto,
          token,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = registerSchema.parse(req.body);
      const email = data.email.toLowerCase().trim();

      const existente = await prisma.usuario.findUnique({
        where: { correo: email },
      });

      if (existente) {
        throw new HttpError(409, 'El correo electrónico ya se encuentra registrado');
      }

      const claveHash = await bcrypt.hash(data.password, 10);
      const nombres = data.name.trim().split(' ');
      const nombre = nombres[0] || 'Usuario';
      const apellido = nombres.slice(1).join(' ') || '';

      const rolAsignado = rolFromFrontend(data.role);

      let empresaId: string | null = null;
      let empresaCreada = null;

      // Si el rol es Administrador de empresa y colocó nombre de empresa
      if (rolAsignado === Rol.ADMIN && data.companyName) {
        empresaCreada = await prisma.empresa.create({
          data: {
            nombre: data.companyName.trim(),
            razonSocial: data.companyName.trim(),
            correoContacto: email,
            estado: EstadoEmpresa.PENDIENTE_APROBACION,
          },
        });
        empresaId = empresaCreada.id;
      }

      const nuevoUsuario = await prisma.usuario.create({
        data: {
          correo: email,
          claveHash,
          nombre,
          apellido,
          telefono: data.phone,
          rol: rolAsignado,
          empresaId,
          aceptoTerminosEn: new Date(),
        },
        include: { empresa: true },
      });

      // Si es candidato, crear perfil de candidato vacío por defecto
      if (rolAsignado === Rol.CANDIDATO) {
        await prisma.perfilCandidato.create({
          data: {
            usuarioId: nuevoUsuario.id,
            habilidades: [],
            idiomas: ['Español'],
          },
        });
      }

      const token = firmarToken(nuevoUsuario.id);

      const userDto: UserResponse = {
        id: nuevoUsuario.id,
        email: nuevoUsuario.correo,
        name: `${nuevoUsuario.nombre} ${nuevoUsuario.apellido}`.trim(),
        role: rolToFrontend(nuevoUsuario.rol),
        avatar: `${nuevoUsuario.nombre[0] || ''}${nuevoUsuario.apellido[0] || ''}`.toUpperCase(),
        phone: nuevoUsuario.telefono || undefined,
        companyId: nuevoUsuario.empresaId,
        companyName: nuevoUsuario.empresa?.nombre,
        createdAt: nuevoUsuario.creadoEn.toISOString(),
      };

      await auditService.log({
        usuarioId: nuevoUsuario.id,
        empresaId,
        accion: 'REGISTRO_USUARIO',
        entidad: 'Usuario',
        entidadId: nuevoUsuario.id,
        ip: req.ip,
      });

      res.status(201).json({
        success: true,
        data: {
          user: userDto,
          token,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpError(401, 'No autenticado');

      const usuario = await prisma.usuario.findUnique({
        where: { id: req.user.id },
        include: { empresa: true },
      });

      if (!usuario) throw new HttpError(404, 'Usuario no encontrado');

      const userDto: UserResponse = {
        id: usuario.id,
        email: usuario.correo,
        name: `${usuario.nombre} ${usuario.apellido}`.trim(),
        role: rolToFrontend(usuario.rol),
        avatar: `${usuario.nombre[0] || ''}${usuario.apellido[0] || ''}`.toUpperCase(),
        phone: usuario.telefono || undefined,
        companyId: usuario.empresaId,
        companyName: usuario.empresa?.nombre,
        createdAt: usuario.creadoEn.toISOString(),
      };

      res.json({ success: true, data: userDto });
    } catch (err) {
      next(err);
    }
  },

  async recoverPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = recoverPasswordSchema.parse(req.body);
      const usuario = await prisma.usuario.findUnique({
        where: { correo: email.toLowerCase().trim() },
      });

      if (usuario) {
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

        await prisma.tokenUsuario.create({
          data: {
            usuarioId: usuario.id,
            tipo: TipoToken.RECUPERACION_CLAVE,
            tokenHash,
            expiraEn: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
          },
        });

        await emailService.sendEmail({
          to: usuario.correo,
          subject: 'Recuperación de Contraseña',
          text: `Hola ${usuario.nombre},\n\nPara restablecer tu contraseña, utiliza el siguiente código o enlace: ${rawToken}\n\nSi no solicitaste este cambio, puedes ignorar este mensaje.`,
          usuarioId: usuario.id,
          tipo: 'RECUPERACION_CONTRASENA',
        });
      }

      // Siempre retornamos éxito para no enumerar usuarios existentes
      res.json({
        success: true,
        data: { message: 'Si el correo se encuentra registrado, recibirá un enlace de restablecimiento.' },
      });
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const tokenRecord = await prisma.tokenUsuario.findUnique({
        where: { tokenHash },
      });

      if (!tokenRecord || tokenRecord.expiraEn < new Date() || tokenRecord.usadoEn) {
        throw new HttpError(400, 'El enlace de recuperación es inválido o ha expirado.');
      }

      const claveHash = await bcrypt.hash(password, 10);

      await prisma.$transaction([
        prisma.usuario.update({
          where: { id: tokenRecord.usuarioId },
          data: { claveHash },
        }),
        prisma.tokenUsuario.update({
          where: { id: tokenRecord.id },
          data: { usadoEn: new Date() },
        }),
      ]);

      res.json({
        success: true,
        data: { message: 'Contraseña actualizada con éxito.' },
      });
    } catch (err) {
      next(err);
    }
  },
};
