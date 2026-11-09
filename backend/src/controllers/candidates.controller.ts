// src/controllers/candidates.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { HttpError } from '../utils/http-error';
import { updateCandidateProfileSchema } from '../validators/candidate.validator';
import { CandidateProfileResponse } from '../types';
import { TipoDocumento, Rol } from '@prisma/client';
import { storageService } from '../services/storage.service';
import { auditService } from '../services/audit.service';

export const candidatesController = {
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new HttpError(401, 'No autenticado');

      const usuario = await prisma.usuario.findUnique({
        where: { id: userId },
        include: {
          perfilCandidato: {
            include: {
              educacion: true,
              experiencia: true,
              documentos: { where: { vigente: true } },
            },
          },
        },
      });

      if (!usuario) throw new HttpError(404, 'Usuario no encontrado');

      let perfil = usuario.perfilCandidato;
      if (!perfil) {
        perfil = await prisma.perfilCandidato.create({
          data: {
            usuarioId: usuario.id,
            habilidades: [],
            idiomas: ['Español'],
          },
          include: {
            educacion: true,
            experiencia: true,
            documentos: { where: { vigente: true } },
          },
        });
      }

      const cvDoc = perfil.documentos.find((d) => d.tipo === TipoDocumento.CURRICULO);
      const cedulaDoc = perfil.documentos.find((d) => d.tipo === TipoDocumento.CEDULA);

      const profileDto: CandidateProfileResponse = {
        id: perfil.id,
        userId: usuario.id,
        firstName: usuario.nombre,
        lastName: usuario.apellido,
        email: usuario.correo,
        phone: usuario.telefono || '',
        title: perfil.titulo || '',
        bio: perfil.biografia || '',
        location: perfil.ubicacion || '',
        education: perfil.educacion.map((e) => ({
          institution: e.institucion,
          degree: e.titulo,
          graduationYear: e.anioGraduacion ? String(e.anioGraduacion) : '',
        })),
        experience: perfil.experiencia.map((x) => ({
          company: x.empresa,
          role: x.cargo,
          period: x.anioFin ? `${x.anioInicio} - ${x.anioFin}` : `${x.anioInicio} - Presente`,
          description: x.descripcion || '',
        })),
        skills: perfil.habilidades || [],
        cvFileName: cvDoc?.nombreArchivo,
        idCardFileName: cedulaDoc?.nombreArchivo,
      };

      res.json({
        success: true,
        data: profileDto,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new HttpError(401, 'No autenticado');

      const body = updateCandidateProfileSchema.parse(req.body);

      let perfil = await prisma.perfilCandidato.findUnique({
        where: { usuarioId: userId },
      });

      if (!perfil) {
        perfil = await prisma.perfilCandidato.create({
          data: { usuarioId: userId, habilidades: [] },
        });
      }

      // Actualizar datos del usuario si se enviaron (teléfono, nombre, apellido)
      const userUpdate: any = {};
      if (body.phone !== undefined) userUpdate.telefono = body.phone;
      if (body.firstName !== undefined) userUpdate.nombre = body.firstName;
      if (body.lastName !== undefined) userUpdate.apellido = body.lastName;

      if (Object.keys(userUpdate).length > 0) {
        await prisma.usuario.update({
          where: { id: userId },
          data: userUpdate,
        });
      }

      // Calcular años de experiencia a partir de la lista
      let totalExperienceYears = 0;
      if (body.experience && body.experience.length > 0) {
        for (const exp of body.experience) {
          const years = exp.period?.match(/\d{4}/g);
          if (years && years.length >= 2) {
            totalExperienceYears += Math.max(1, parseInt(years[1]) - parseInt(years[0]));
          } else {
            totalExperienceYears += 1;
          }
        }
      }

      const updateData: any = {
        actualizadoEn: new Date(),
      };
      if (body.title !== undefined) updateData.titulo = body.title;
      if (body.bio !== undefined) updateData.biografia = body.bio;
      if (body.location !== undefined) updateData.ubicacion = body.location;
      if (body.cedulaNumero !== undefined) updateData.cedulaNumero = body.cedulaNumero;
      if (body.perfilVisible !== undefined) updateData.perfilVisible = body.perfilVisible;
      if (body.skills !== undefined) updateData.habilidades = body.skills;
      if (body.experience !== undefined) updateData.aniosExperiencia = totalExperienceYears;

      await prisma.perfilCandidato.update({
        where: { id: perfil.id },
        data: updateData,
      });

      // Actualizar educaciones si se enviaron
      if (body.education) {
        await prisma.educacionCandidato.deleteMany({ where: { perfilId: perfil.id } });
        await prisma.educacionCandidato.createMany({
          data: body.education.map((e) => ({
            perfilId: perfil!.id,
            institucion: e.institution,
            titulo: e.degree,
            anioGraduacion: e.graduationYear ? parseInt(String(e.graduationYear)) : null,
          })),
        });
      }

      // Actualizar experiencias si se enviaron
      if (body.experience) {
        await prisma.experienciaCandidato.deleteMany({ where: { perfilId: perfil.id } });
        await prisma.experienciaCandidato.createMany({
          data: body.experience.map((x) => {
            const years = x.period?.match(/\d{4}/g);
            const anioInicio = years && years[0] ? parseInt(years[0]) : new Date().getFullYear();
            const anioFin = years && years[1] ? parseInt(years[1]) : null;

            return {
              perfilId: perfil!.id,
              empresa: x.company,
              cargo: x.role,
              anioInicio,
              anioFin,
              descripcion: x.description || null,
            };
          }),
        });
      }

      return candidatesController.getProfile(req, res, next);
    } catch (err) {
      next(err);
    }
  },

  async uploadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new HttpError(401, 'No autenticado');
      const file = req.file;
      if (!file) throw new HttpError(400, 'No se adjuntó ningún archivo');

      const tipoStr = req.body.tipo || req.body.type;
      const tipo = tipoStr?.toUpperCase() === 'CEDULA' ? TipoDocumento.CEDULA : TipoDocumento.CURRICULO;

      let perfil = await prisma.perfilCandidato.findUnique({
        where: { usuarioId: userId },
      });
      if (!perfil) {
        perfil = await prisma.perfilCandidato.create({
          data: { usuarioId: userId, habilidades: [] },
        });
      }

      // Marcar documento previo como no vigente
      await prisma.documentoCandidato.updateMany({
        where: { perfilId: perfil.id, tipo, vigente: true },
        data: { vigente: false },
      });

      const nuevoDoc = await prisma.documentoCandidato.create({
        data: {
          perfilId: perfil.id,
          tipo,
          nombreArchivo: file.originalname,
          rutaAlmacenamiento: file.filename,
          tipoMime: file.mimetype,
          tamanioBytes: file.size,
          vigente: true,
        },
      });

      res.status(201).json({
        success: true,
        data: {
          id: nuevoDoc.id,
          filename: nuevoDoc.nombreArchivo,
          tipo: nuevoDoc.tipo,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async downloadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) throw new HttpError(401, 'No autenticado');

      const id = req.params.id as string;
      const documento = await prisma.documentoCandidato.findUnique({
        where: { id },
        include: {
          perfil: {
            include: { usuario: true },
          },
          postulacionesComoCurriculo: { select: { empresaId: true } },
          postulacionesComoCedula: { select: { empresaId: true } },
        },
      });

      if (!documento) throw new HttpError(404, 'Documento no encontrado');

      // Control de acceso riguroso (OWASP A01):
      // 1. El propio candidato dueño del documento
      // 2. Un SUPER_ADMIN
      // 3. Un ADMIN o RRHH de la empresa donde el candidato se postuló
      const esPropietario = documento.perfil.usuarioId === user.id;
      const esSuperAdmin = user.rol === Rol.SUPER_ADMIN;

      let esEmpresaDestino = false;
      if (user.empresaId) {
        const empresasConPostulacion = [
          ...documento.postulacionesComoCurriculo.map((p) => p.empresaId),
          ...documento.postulacionesComoCedula.map((p) => p.empresaId),
        ];
        esEmpresaDestino = empresasConPostulacion.includes(user.empresaId);
      }

      if (!esPropietario && !esSuperAdmin && !esEmpresaDestino) {
        throw new HttpError(404, 'Documento no encontrado');
      }

      if (documento.tipo === TipoDocumento.CEDULA && !esPropietario) {
        await auditService.log({
          usuarioId: user.id,
          empresaId: user.empresaId,
          accion: 'DOCUMENTO_CEDULA_CONSULTADA',
          entidad: 'DocumentoCandidato',
          entidadId: documento.id,
          detalle: { candidatoId: documento.perfil.usuarioId },
          ip: req.ip as string | undefined,
        });
      }

      const filePath = storageService.resolvePath(documento.rutaAlmacenamiento);
      if (!filePath) {
        throw new HttpError(404, 'El archivo físico no se encuentra en el servidor');
      }

      res.download(filePath, documento.nombreArchivo);
    } catch (err) {
      next(err);
    }
  },

  async uploadPhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new HttpError(401, 'No autenticado');
      const file = req.file;
      if (!file) throw new HttpError(400, 'No se adjuntó ninguna imagen');

      const usuario = await prisma.usuario.findUnique({
        where: { id: userId },
        select: { fotoRuta: true },
      });

      if (usuario?.fotoRuta) {
        await storageService.deleteFile(usuario.fotoRuta);
      }

      await prisma.usuario.update({
        where: { id: userId },
        data: { fotoRuta: file.filename },
      });

      res.json({
        success: true,
        data: { fotoRuta: file.filename },
      });
    } catch (err) {
      next(err);
    }
  },
};
