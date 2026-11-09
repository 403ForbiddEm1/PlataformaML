// src/server.ts
import { Rol } from '@prisma/client';
import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { hashClave, compararClave } from './utils/password';
import { iniciarJobs, detenerJobs } from './jobs';

async function asegurarSuperAdmin() {
  if (!env.SUPER_ADMIN_EMAIL || !env.SUPER_ADMIN_PASSWORD) return;
  const correo = env.SUPER_ADMIN_EMAIL.toLowerCase().trim();

  try {
    const existente = await prisma.usuario.findUnique({ where: { correo } });
    if (!existente) {
      const claveHash = await hashClave(env.SUPER_ADMIN_PASSWORD);
      const ahora = new Date();
      await prisma.usuario.create({
        data: {
          correo,
          claveHash,
          nombre: 'Super',
          apellido: 'Admin',
          rol: Rol.SUPER_ADMIN,
          empresaId: null,
          activo: true,
          correoVerificadoEn: ahora,
          aceptoTerminosEn: ahora,
        },
      });
      console.log(`[SUPER_ADMIN] Cuenta creada desde .env: ${correo}`);
    } else {
      const mismaClave = existente.claveHash
        ? await compararClave(env.SUPER_ADMIN_PASSWORD, existente.claveHash)
        : false;
      const nuevoHash = mismaClave ? existente.claveHash : await hashClave(env.SUPER_ADMIN_PASSWORD);

      if (
        !mismaClave ||
        existente.rol !== Rol.SUPER_ADMIN ||
        !existente.activo ||
        existente.intentosFallidos > 0 ||
        existente.bloqueadoHasta
      ) {
        await prisma.usuario.update({
          where: { id: existente.id },
          data: {
            claveHash: nuevoHash,
            rol: Rol.SUPER_ADMIN,
            empresaId: null,
            activo: true,
            correoVerificadoEn: existente.correoVerificadoEn ?? new Date(),
            intentosFallidos: 0,
            bloqueadoHasta: null,
          },
        });
        console.log(`[SUPER_ADMIN] Credenciales sincronizadas desde .env: ${correo}`);
      }
    }
  } catch (err) {
    console.error('[SUPER_ADMIN] Error al sincronizar cuenta inicial:', err);
  }
}

const server = app.listen(env.PORT, () => {
  console.log(`API escuchando en http://localhost:${env.PORT}/api`);
  asegurarSuperAdmin();
  iniciarJobs();
});

async function apagar() {
  detenerJobs();
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', apagar);
process.on('SIGTERM', apagar);
