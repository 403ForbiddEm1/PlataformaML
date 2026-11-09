// src/routes/admin.routes.ts
import { Router } from 'express';
import { z } from 'zod';
import { Rol, EstadoEmpresa } from '@prisma/client';
import { adminController } from '../controllers/admin.controller';
import { autenticar, exigirRol } from '../middlewares/auth.middleware';
import * as adminService from '../services/admin.service';
import { HttpError } from '../utils/http-error';

export const adminRouter = Router();

const soloSuper = [autenticar, exigirRol(Rol.SUPER_ADMIN)];
const idParam = (v: unknown) => z.string().uuid().parse(v);
const actorDe = (req: any) => {
  if (!req.user) throw new HttpError(401, 'No autenticado');
  return req.user;
};
const ip = (req: any) => req.ip as string | undefined;

// ─── Super Admin: empresas ─────────────────────────────────────────────────
adminRouter.get('/companies', ...soloSuper, async (req, res, next) => {
  try {
    const estado = z.nativeEnum(EstadoEmpresa).optional().parse(req.query.estado);
    res.json({ success: true, data: await adminService.listarEmpresas(actorDe(req), estado) });
  } catch (e) { next(e); }
});

adminRouter.post('/companies/:id/approve', ...soloSuper, async (req, res, next) => {
  try {
    res.json({ success: true, data: await adminService.aprobar(actorDe(req), idParam(req.params.id), ip(req)) });
  } catch (e) { next(e); }
});

adminRouter.post('/companies/:id/reject', ...soloSuper, async (req, res, next) => {
  try {
    const { motivo } = z.object({ motivo: z.string().min(3).max(1000) }).strict().parse(req.body);
    res.json({ success: true, data: await adminService.rechazar(actorDe(req), idParam(req.params.id), motivo, ip(req)) });
  } catch (e) { next(e); }
});

adminRouter.post('/companies/:id/deactivate', ...soloSuper, async (req, res, next) => {
  try {
    const { motivo } = z.object({ motivo: z.string().max(1000).optional() }).strict().parse(req.body ?? {});
    res.json({ success: true, data: await adminService.desactivar(actorDe(req), idParam(req.params.id), motivo, ip(req)) });
  } catch (e) { next(e); }
});

adminRouter.post('/companies/:id/activate', ...soloSuper, async (req, res, next) => {
  try {
    const { activaHasta } = z.object({ activaHasta: z.coerce.date().optional() }).strict().parse(req.body ?? {});
    res.json({ success: true, data: await adminService.activar(actorDe(req), idParam(req.params.id), activaHasta, ip(req)) });
  } catch (e) { next(e); }
});

adminRouter.get('/users', ...soloSuper, async (req, res, next) => {
  try {
    res.json({ success: true, data: await adminService.listarUsuarios(actorDe(req)) });
  } catch (e) { next(e); }
});

adminRouter.get('/audit', ...soloSuper, adminController.getAuditLogs);

// ─── Rutas anteriores (compatibilidad con el front actual) ────────────────
adminRouter.patch('/companies/:id/status', ...soloSuper, adminController.updateCompanyStatus);
adminRouter.post('/invitations', autenticar, exigirRol(Rol.ADMIN, Rol.SUPER_ADMIN), adminController.inviteUser);
