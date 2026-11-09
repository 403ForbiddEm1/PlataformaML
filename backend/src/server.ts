// src/server.ts
import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/database';

const server = app.listen(env.PORT, () => {
  console.log(`API escuchando en http://localhost:${env.PORT}/api`);
});

async function apagar() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', apagar);
process.on('SIGTERM', apagar);