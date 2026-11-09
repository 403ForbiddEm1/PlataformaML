// src/jobs/limpieza.job.ts
// Elimina TokenUsuario e Invitacion vencidos hace más de 7 días.
import { prisma } from '../config/database';

export async function ejecutarLimpiezaTokens(): Promise<{ tokensBorrados: number; invitacionesBorradas: number }> {
  const haceSieteDias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [t, i] = await Promise.all([
    prisma.tokenUsuario.deleteMany({
      where: { expiraEn: { lt: haceSieteDias } },
    }),
    prisma.invitacion.deleteMany({
      where: { expiraEn: { lt: haceSieteDias } },
    }),
  ]);

  return { tokensBorrados: t.count, invitacionesBorradas: i.count };
}

