// src/controllers/candidates.controller.ts
import fs from 'fs';
import path from 'path';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { HttpError } from '../utils/http-error';
import { updateCandidateProfileSchema } from '../validators/candidate.validator';
import { CandidateProfileResponse } from '../types';
import { TipoDocumento, Rol } from '@prisma/client';
import { storageService } from '../services/storage.service';
import { auditService } from '../services/audit.service';
import { analizarArchivoCv, analizarTextoCv } from '../services/cv-parser.service';

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
        ...((usuario as any).telegramUsername ? { telegramUsername: (usuario as any).telegramUsername } : {}),
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
        ...(usuario.fotoRuta ? { photoUrl: usuario.fotoRuta } : {}),
      } as CandidateProfileResponse & { photoUrl?: string };

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

      // Actualizar datos del usuario si se enviaron (teléfono, @usuario Telegram, nombre, apellido)
      const userUpdate: any = {};
      if (body.phone !== undefined) {
        userUpdate.telefono = body.phone;
        if (body.phone && body.phone.trim().length >= 5 && body.telegramLinked !== false) {
          userUpdate.consentimientoWhatsappEn = new Date();
        }
      }
      if (body.telegramUsername !== undefined) {
        const cleanHandle = body.telegramUsername.trim().replace(/^@+/, '');
        userUpdate.telegramUsername = cleanHandle ? `@${cleanHandle}` : null;
        if (cleanHandle && body.telegramLinked !== false) {
          userUpdate.consentimientoWhatsappEn = new Date();
        }
      }
      if (body.firstName !== undefined) userUpdate.nombre = body.firstName;
      if (body.lastName !== undefined) userUpdate.apellido = body.lastName;
      if (body.photoUrl !== undefined) userUpdate.fotoRuta = body.photoUrl;
      if (body.telegramLinked === true) {
        userUpdate.consentimientoWhatsappEn = new Date();
      } else if (body.telegramLinked === false) {
        userUpdate.consentimientoWhatsappEn = null;
      }

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

      let extracted: any = null;
      if (tipo === TipoDocumento.CURRICULO && file.path) {
        try {
          extracted = await analizarArchivoCv(file.path);

          let totalExpYears = 0;
          const currentYear = new Date().getFullYear();
          if (extracted.experience && extracted.experience.length > 0) {
            for (const exp of extracted.experience) {
              const years = exp.period?.match(/\d{4}/g);
              const isPresent = /presente|actualidad|actual|hoy|present|current/i.test(exp.period || '');
              if (years && years.length >= 2) {
                totalExpYears += Math.max(1, parseInt(years[1]) - parseInt(years[0]));
              } else if (years && years.length === 1 && isPresent) {
                totalExpYears += Math.max(1, currentYear - parseInt(years[0]));
              } else {
                totalExpYears += 1;
              }
            }
          }

          await prisma.perfilCandidato.update({
            where: { id: perfil.id },
            data: {
              titulo: extracted.title || null,
              biografia: extracted.bio || null,
              ...(extracted.location ? { ubicacion: extracted.location } : {}),
              habilidades: extracted.skills || [],
              textoExtraido: extracted.texto || null,
              aniosExperiencia: totalExpYears,
              actualizadoEn: new Date(),
            },
          });

          // Si el usuario no tenía teléfono registrado y el CV lo contiene, lo guardamos
          if (extracted.phone) {
            const usrActual = await prisma.usuario.findUnique({ where: { id: userId }, select: { telefono: true } });
            if (!usrActual?.telefono) {
              await prisma.usuario.update({ where: { id: userId }, data: { telefono: extracted.phone } });
            }
          }

          await prisma.educacionCandidato.deleteMany({ where: { perfilId: perfil.id } });
          if (Array.isArray(extracted.education) && extracted.education.length > 0) {
            await prisma.educacionCandidato.createMany({
              data: extracted.education.map((e: any) => ({
                perfilId: perfil!.id,
                institucion: e.institution || '—',
                titulo: e.degree || '—',
                anioGraduacion: e.graduationYear ? parseInt(String(e.graduationYear)) || null : null,
              })),
            });
          }

          await prisma.experienciaCandidato.deleteMany({ where: { perfilId: perfil.id } });
          if (Array.isArray(extracted.experience) && extracted.experience.length > 0) {
            await prisma.experienciaCandidato.createMany({
              data: extracted.experience.map((x: any) => {
                const years = x.period?.match(/\d{4}/g);
                const anioInicio = years && years[0] ? parseInt(years[0]) : new Date().getFullYear();
                const anioFin = years && years[1] ? parseInt(years[1]) : null;
                return {
                  perfilId: perfil!.id,
                  empresa: x.company || '—',
                  cargo: x.role || '—',
                  anioInicio,
                  anioFin,
                  descripcion: x.description || null,
                };
              }),
            });
          }
        } catch (parseErr: any) {
          console.warn('[UPLOAD_CV_PARSE]', parseErr?.message);
        }
      }

      res.status(201).json({
        success: true,
        data: {
          id: nuevoDoc.id,
          filename: nuevoDoc.nombreArchivo,
          tipo: nuevoDoc.tipo,
          extracted,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async reanalyzeCurrentCV(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new HttpError(401, 'No autenticado');

      const perfil = await prisma.perfilCandidato.findUnique({
        where: { usuarioId: userId },
        include: {
          documentos: {
            where: { tipo: TipoDocumento.CURRICULO, vigente: true },
            orderBy: { creadoEn: 'desc' },
            take: 1,
          },
        },
      });

      if (!perfil) throw new HttpError(404, 'Perfil de candidato no encontrado');

      const docVigente = perfil.documentos[0];
      const diskPath = docVigente?.rutaAlmacenamiento
        ? path.join(process.cwd(), 'uploads', docVigente.rutaAlmacenamiento)
        : null;

      let extracted = null;
      if (diskPath && fs.existsSync(diskPath)) {
        extracted = await analizarArchivoCv(diskPath);
      } else if (perfil.textoExtraido && perfil.textoExtraido.trim().length >= 20) {
        extracted = await analizarTextoCv(perfil.textoExtraido);
      } else {
        throw new HttpError(400, 'Sube tu CV nuevamente (PDF o DOCX) para poder analizarlo con Gemini.');
      }

      let totalExpYears = 0;
      const currentYear = new Date().getFullYear();
      if (extracted.experience && extracted.experience.length > 0) {
        for (const exp of extracted.experience) {
          const years = exp.period?.match(/\d{4}/g);
          const isPresent = /presente|actualidad|actual|hoy|present|current/i.test(exp.period || '');
          if (years && years.length >= 2) {
            totalExpYears += Math.max(1, parseInt(years[1]) - parseInt(years[0]));
          } else if (years && years.length === 1 && isPresent) {
            totalExpYears += Math.max(1, currentYear - parseInt(years[0]));
          } else {
            totalExpYears += 1;
          }
        }
      }

      await prisma.perfilCandidato.update({
        where: { id: perfil.id },
        data: {
          titulo: extracted.title || null,
          biografia: extracted.bio || null,
          ...(extracted.location ? { ubicacion: extracted.location } : {}),
          habilidades: extracted.skills || [],
          textoExtraido: extracted.texto || perfil.textoExtraido || null,
          aniosExperiencia: totalExpYears,
          actualizadoEn: new Date(),
        },
      });

      await prisma.educacionCandidato.deleteMany({ where: { perfilId: perfil.id } });
      if (Array.isArray(extracted.education) && extracted.education.length > 0) {
        await prisma.educacionCandidato.createMany({
          data: extracted.education.map((e) => ({
            perfilId: perfil.id,
            institucion: e.institution || '—',
            titulo: e.degree || '—',
            anioGraduacion: e.graduationYear ? parseInt(String(e.graduationYear)) || null : null,
          })),
        });
      }

      await prisma.experienciaCandidato.deleteMany({ where: { perfilId: perfil.id } });
      if (Array.isArray(extracted.experience) && extracted.experience.length > 0) {
        await prisma.experienciaCandidato.createMany({
          data: extracted.experience.map((x) => {
            const years = x.period?.match(/\d{4}/g);
            const anioInicio = years && years[0] ? parseInt(years[0]) : currentYear;
            const anioFin = years && years[1] ? parseInt(years[1]) : null;
            return {
              perfilId: perfil.id,
              empresa: x.company || '—',
              cargo: x.role || '—',
              anioInicio,
              anioFin,
              descripcion: x.description || null,
            };
          }),
        });
      }

      res.json({
        success: true,
        data: {
          extractor: extracted.extractor,
          extracted,
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
