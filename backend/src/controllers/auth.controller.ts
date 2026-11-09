// src/controllers/auth.controller.ts
// Traduce peticiones HTTP a llamadas de auth.service y google.service.
// NUNCA contiene reglas de negocio ni toca Prisma directamente.
import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/http-error';
import * as authService from '../services/auth.service';
import * as googleService from '../services/google.service';
import {
  registroCandidatoSchema,
  registroEmpresaSchema,
  loginSchema,
  googleSchema,
  completarPerfilGoogleSchema,
  verificarCorreoSchema,
  recuperarClaveSchema,
  restablecerClaveSchema,
  aceptarInvitacionSchema,
  registerSchema,
  loginSchemaLegacy,
} from '../validators/auth.validator';

export const authController = {
  // ─── Registro público: bifurca entre candidato y empresa ────────────────
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body;
      const ip = req.ip as string | undefined;

      // El front puede enviar `tipo: 'EMPRESA'` o `role: 'administrador'`/`role: 'admin'`
      const esEmpresa =
        body.tipo === 'EMPRESA' ||
        body.role === 'administrador' ||
        body.role === 'admin' ||
        Boolean(body.companyName && body.role !== 'candidato');

      if (esEmpresa) {
        // Adaptar nombres de campos si vienen en formato frontend antiguo
        const datosEmpresa = {
          nombre: body.nombre || body.name?.split(' ')[0] || 'Admin',
          apellido: body.apellido || body.name?.split(' ').slice(1).join(' ') || '',
          correo: body.correo || body.email,
          clave: body.clave || body.password,
          telefono: body.telefono || body.phone,
          aceptaTerminos: body.aceptaTerminos ?? true,
          nombreEmpresa: body.nombreEmpresa || body.companyName || 'Mi Empresa',
          identificacionFiscal: body.identificacionFiscal,
          sector: body.sector,
          correoContacto: body.correoContacto,
          telefonoContacto: body.telefonoContacto,
          sitioWeb: body.sitioWeb,
        };

        const validado = registroEmpresaSchema.parse(datosEmpresa);
        const resultado = await authService.registrarEmpresa(validado, ip);
        res.status(201).json({ success: true, data: resultado });
      } else {
        // Candidato
        const datosCandidato = {
          nombre: body.nombre || body.name?.split(' ')[0] || 'Candidato',
          apellido: body.apellido || body.name?.split(' ').slice(1).join(' ') || '',
          correo: body.correo || body.email,
          clave: body.clave || body.password,
          telefono: body.telefono || body.phone,
          aceptaTerminos: body.aceptaTerminos ?? true,
          aceptaWhatsapp: body.aceptaWhatsapp ?? false,
        };

        const validado = registroCandidatoSchema.parse(datosCandidato);
        const resultado = await authService.registrarCandidato(validado, ip);
        res.status(201).json({ success: true, data: resultado });
      }
    } catch (err) {
      next(err);
    }
  },

  // ─── Login único: detecta rol automáticamente ───────────────────────────
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body;
      const ip = req.ip as string | undefined;

      // Soportar tanto { correo, clave } como { email, password } del front
      const correo = (body.correo || body.email || '').toLowerCase().trim();
      const clave = body.clave || body.password || '';

      const validado = loginSchema.parse({ correo, clave });
      const resultado = await authService.login(validado, ip);

      res.json({
        success: true,
        data: {
          user: resultado.user,
          token: resultado.token,
          correoVerificado: resultado.correoVerificado,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // ─── Google Auth ─────────────────────────────────────────────────────────
  async google(req: Request, res: Response, next: NextFunction) {
    try {
      const validado = googleSchema.parse(req.body);
      const ip = req.ip as string | undefined;

      const resultado = await googleService.iniciarConGoogle(validado.idToken, ip);

      if (resultado.tipo === 'REQUIERE_COMPLETAR_PERFIL') {
        res.status(200).json({
          success: true,
          data: {
            requiereCompletarPerfil: true,
            tokenTemporal: resultado.tokenTemporal,
            correo: resultado.correo,
            nombre: resultado.nombre,
          },
        });
      } else {
        res.status(200).json({
          success: true,
          data: {
            requiereCompletarPerfil: false,
            user: resultado.user,
            token: resultado.token,
          },
        });
      }
    } catch (err) {
      next(err);
    }
  },

  // ─── Completar perfil después de Google ─────────────────────────────────
  async completeGoogleProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpError(401, 'No autenticado');
      const validado = completarPerfilGoogleSchema.parse(req.body);
      const ip = req.ip as string | undefined;

      const resultado = await googleService.completarPerfilGoogle(req.user.id, validado, ip);
      res.json({ success: true, data: resultado });
    } catch (err) {
      next(err);
    }
  },

  // ─── Obtener perfil de la sesión actual ───────────────────────────────────
  async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpError(401, 'No autenticado');
      const resultado = await authService.obtenerPerfilSesion(req.user.id);
      res.json({ success: true, data: resultado.user });
    } catch (err) {
      next(err);
    }
  },

  // ─── Verificar correo ─────────────────────────────────────────────────────
  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = verificarCorreoSchema.parse(req.body);
      const resultado = await authService.verificarCorreo(token);
      res.json({ success: true, data: resultado });
    } catch (err) {
      next(err);
    }
  },

  // ─── Reenviar enlace de verificación ─────────────────────────────────────
  async resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpError(401, 'No autenticado');
      const resultado = await authService.reenviarVerificacion(req.user.id);
      res.json({ success: true, data: resultado });
    } catch (err) {
      next(err);
    }
  },

  // ─── Solicitar recuperación de contraseña ────────────────────────────────
  async recoverPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const correo = req.body.correo || req.body.email;
      const validado = recuperarClaveSchema.parse({ correo });
      const resultado = await authService.solicitarRecuperacion(validado.correo);
      res.json({ success: true, data: resultado });
    } catch (err) {
      next(err);
    }
  },

  // ─── Restablecer contraseña con token ────────────────────────────────────
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.body.token;
      const nuevaClave = req.body.nuevaClave || req.body.password;
      const validado = restablecerClaveSchema.parse({ token, nuevaClave });
      const ip = req.ip as string | undefined;

      const resultado = await authService.restablecerClave(validado, ip);
      res.json({ success: true, data: resultado });
    } catch (err) {
      next(err);
    }
  },

  // ─── Aceptar invitación de equipo (ADMIN o RRHH) ─────────────────────────
  async acceptInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body;
      const validado = aceptarInvitacionSchema.parse({
        token: body.token,
        nombre: body.nombre || body.firstName,
        apellido: body.apellido || body.lastName,
        clave: body.clave || body.password,
        telefono: body.telefono || body.phone,
      });
      const ip = req.ip as string | undefined;

      const resultado = await authService.aceptarInvitacion(validado, ip);
      res.status(201).json({ success: true, data: resultado });
    } catch (err) {
      next(err);
    }
  },
};
