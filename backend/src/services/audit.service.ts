// src/services/audit.service.ts
import { prisma } from '../config/database';

export interface AuditLogData {
  empresaId?: string | null;
  usuarioId?: string | null;
  accion: string;
  entidad: string;
  entidadId?: string | null;
  detalle?: any;
  ip?: string | null;
}

export const auditService = {
  /**
   * Registra una acción de auditoría de forma segura y sin bloquear la operación principal
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      await prisma.registroAuditoria.create({
        data: {
          empresaId: data.empresaId ?? null,
          usuarioId: data.usuarioId ?? null,
          accion: data.accion,
          entidad: data.entidad,
          entidadId: data.entidadId ?? null,
          detalle: data.detalle ?? null,
          ip: data.ip ?? null,
        },
      });
    } catch (error) {
      console.error('[AUDIT_ERROR] Error al registrar auditoría:', error);
    }
  },
};
