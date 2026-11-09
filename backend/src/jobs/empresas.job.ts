// src/jobs/empresas.job.ts
// Desactivación automática de empresas:
// 1. Por vencimiento (activaHasta <= ahora) -> VENCIMIENTO
// 2. Por inactividad (3 meses sin publicar vacantes) -> INACTIVIDAD
import { EstadoEmpresa, MotivoDesactivacion, Rol } from '@prisma/client';
import { prisma } from '../config/database';
import { emailService } from '../services/email.service';

export async function ejecutarRevisionEmpresas(): Promise<{ suspendidas: number }> {
  const ahora = new Date();
  const haceTresMeses = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const candidatas = await prisma.empresa.findMany({
    where: {
      estado: EstadoEmpresa.ACTIVA,
      OR: [
        { activaHasta: { lte: ahora } },
        { ultimaVacanteEn: { lt: haceTresMeses } },
        {
          ultimaVacanteEn: null,
          aprobadaEn: { lt: haceTresMeses },
        },
      ],
    },
  });

  for (const emp of candidatas) {
    const esPorVencimiento = !!(emp.activaHasta && emp.activaHasta <= ahora);
    const motivo = esPorVencimiento
      ? MotivoDesactivacion.VENCIMIENTO
      : MotivoDesactivacion.INACTIVIDAD;

    await prisma.$transaction([
      prisma.empresa.update({
        where: { id: emp.id },
        data: {
          estado: EstadoEmpresa.SUSPENDIDA,
          desactivadaEn: ahora,
          motivoDesactivacion: motivo,
        },
      }),
      prisma.registroAuditoria.create({
        data: {
          empresaId: emp.id,
          accion: 'EMPRESA_DESACTIVADA_AUTO',
          entidad: 'Empresa',
          entidadId: emp.id,
          detalle: { motivo },
        },
      }),
    ]);

    const admins = await prisma.usuario.findMany({
      where: { empresaId: emp.id, rol: Rol.ADMIN, activo: true },
      select: { id: true, correo: true },
    });

    for (const admin of admins) {
      await emailService
        .sendDirect({
          to: admin.correo,
          subject: 'Tu empresa ha sido suspendida automáticamente',
          text: `La cuenta de "${emp.nombre}" fue suspendida automáticamente por ${
            motivo === MotivoDesactivacion.VENCIMIENTO
              ? 'vencimiento del plazo activo'
              : 'inactividad de 3 meses sin publicar vacantes'
          }. Contacta al administrador de la plataforma para reactivarla.`,
        })
        .catch(() => {});
    }
  }

  return { suspendidas: candidatas.length };
}

