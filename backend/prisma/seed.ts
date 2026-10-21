// backend/prisma/seed.ts
// Datos de prueba para desarrollo. Se puede ejecutar varias veces sin duplicar.
import 'dotenv/config';
import {
  PrismaClient,
  Rol,
  NivelEducativo,
  EstadoVacante,
  EstadoPostulacion,
  CanalNotificacion,
  type Vacante,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const CLAVE_DEMO = 'Password123!'; // solo para desarrollo

// Afinidad simple: proporción de habilidades requeridas que tiene el candidato
function afinidad(habilidades: string[], requeridas: string[]): number {
  if (requeridas.length === 0) return 0;
  const coincidencias = requeridas.filter((r) => habilidades.includes(r)).length;
  return Number((coincidencias / requeridas.length).toFixed(2));
}

const empresasDemo = [
  {
    nombre: 'TechNova C.A.',
    dominio: 'technova.test',
    admin: 'admin@technova.test',
    vacantes: [
      { titulo: 'Desarrollador Backend', habilidades: ['Node', 'SQL', 'Docker'], anios: 2, nivel: NivelEducativo.LICENCIATURA },
      { titulo: 'Analista de Datos', habilidades: ['Python', 'SQL', 'Excel'], anios: 1, nivel: NivelEducativo.LICENCIATURA },
      { titulo: 'Desarrollador Frontend', habilidades: ['React', 'TypeScript', 'Git'], anios: 1, nivel: NivelEducativo.TECNICO },
    ],
  },
  {
    nombre: 'Zulia Logística',
    dominio: 'zulialogistica.test',
    admin: 'admin@zulialogistica.test',
    vacantes: [
      { titulo: 'Coordinador de Operaciones', habilidades: ['Excel', 'Liderazgo', 'Logística'], anios: 3, nivel: NivelEducativo.LICENCIATURA },
      { titulo: 'Asistente Administrativo', habilidades: ['Excel', 'Atención al cliente'], anios: 0, nivel: NivelEducativo.BACHILLERATO },
      { titulo: 'Analista de Inventario', habilidades: ['SQL', 'Excel', 'Logística'], anios: 2, nivel: NivelEducativo.TECNICO },
    ],
  },
];

const candidatosDemo = [
  { correo: 'maria@candidato.test', nombre: 'María', apellido: 'Pérez', anios: 3, nivel: NivelEducativo.LICENCIATURA, habilidades: ['Node', 'SQL', 'Docker', 'Git'] },
  { correo: 'jose@candidato.test', nombre: 'José', apellido: 'Rivas', anios: 1, nivel: NivelEducativo.TECNICO, habilidades: ['React', 'TypeScript', 'Git'] },
  { correo: 'ana@candidato.test', nombre: 'Ana', apellido: 'Morales', anios: 4, nivel: NivelEducativo.MAESTRIA, habilidades: ['Python', 'SQL', 'Excel'] },
  { correo: 'luis@candidato.test', nombre: 'Luis', apellido: 'Fernández', anios: 5, nivel: NivelEducativo.LICENCIATURA, habilidades: ['Excel', 'Liderazgo', 'Logística'] },
  { correo: 'carla@candidato.test', nombre: 'Carla', apellido: 'Núñez', anios: 0, nivel: NivelEducativo.BACHILLERATO, habilidades: ['Excel', 'Atención al cliente'] },
];

async function main() {
  const claveHash = await bcrypt.hash(CLAVE_DEMO, 10);

  // 1. Modelo de ML activo
  const modelo = await prisma.modeloML.upsert({
    where: { nombre_version: { nombre: 'random_forest', version: 'v1' } },
    update: {},
    create: {
      nombre: 'random_forest',
      version: 'v1',
      algoritmo: 'RandomForestClassifier',
      metricas: { precision: 0.87, sensibilidad: 0.81, f1: 0.84, auc: 0.91 },
      totalEntrenamiento: 1000,
      entrenadoEn: new Date(),
      activo: true,
    },
  });

  // 2. Super administrador (sin empresa)
  await prisma.usuario.upsert({
    where: { correo: 'superadmin@plataforma.test' },
    update: {},
    create: {
      correo: 'superadmin@plataforma.test',
      claveHash,
      nombre: 'Super',
      apellido: 'Admin',
      rol: Rol.SUPER_ADMIN,
    },
  });

  // 3. Empresas, administradores y vacantes
  const vacantes: Array<Vacante & { habilidadesRequeridas: string[] }> = [];

  for (const e of empresasDemo) {
    const empresa = await prisma.empresa.upsert({
      where: { nombre: e.nombre },
      update: {},
      create: { nombre: e.nombre, dominio: e.dominio },
    });

    const admin = await prisma.usuario.upsert({
      where: { correo: e.admin },
      update: {},
      create: {
        correo: e.admin,
        claveHash,
        nombre: 'Admin',
        apellido: e.nombre,
        rol: Rol.ADMIN,
        empresaId: empresa.id,
      },
    });

    for (const v of e.vacantes) {
      const existente = await prisma.vacante.findFirst({
        where: { empresaId: empresa.id, titulo: v.titulo },
      });

      const vacante =
        existente ??
        (await prisma.vacante.create({
          data: {
            titulo: v.titulo,
            descripcion: `Se busca ${v.titulo} para ${e.nombre}.`,
            requisitos: `Experiencia mínima de ${v.anios} año(s).`,
            ubicacion: 'Maracaibo, Zulia',
            habilidadesRequeridas: v.habilidades,
            aniosExperienciaMinimos: v.anios,
            nivelEducativoMinimo: v.nivel,
            estado: EstadoVacante.ABIERTA,
            publicadaEn: new Date(),
            empresaId: empresa.id,
            creadaPorId: admin.id,
          },
        }));

      vacantes.push(vacante);
    }
  }

  // 4. Candidatos con su perfil
  const candidatos = [];
  for (const c of candidatosDemo) {
    const usuario = await prisma.usuario.upsert({
      where: { correo: c.correo },
      update: {},
      create: {
        correo: c.correo,
        claveHash,
        nombre: c.nombre,
        apellido: c.apellido,
        rol: Rol.CANDIDATO,
        perfilCandidato: {
          create: {
            aniosExperiencia: c.anios,
            nivelEducativo: c.nivel,
            habilidades: c.habilidades,
            idiomas: ['Español', 'Inglés'],
          },
        },
      },
    });
    candidatos.push({ usuario, datos: c });
  }

  // 5. Postulaciones [índice de candidato, índice de vacante]
  // Vacantes 0-2 son de TechNova, 3-5 de Zulia Logística
  const pares: Array<[number, number]> = [
    [0, 0], [1, 0], [2, 0], [3, 0],
    [0, 1], [2, 1],
    [1, 2],
    [3, 3], [4, 3],
    [4, 4], [3, 5],
  ];

  for (const [ic, iv] of pares) {
    const { usuario, datos } = candidatos[ic];
    const vacante = vacantes[iv];
    const puntaje = afinidad(datos.habilidades, vacante.habilidadesRequeridas);

    await prisma.postulacion.upsert({
      where: { vacanteId_candidatoId: { vacanteId: vacante.id, candidatoId: usuario.id } },
      update: {},
      create: {
        empresaId: vacante.empresaId,
        vacanteId: vacante.id,
        candidatoId: usuario.id,
        prediccionML: {
          create: {
            puntajeAfinidad: puntaje,
            esApto: puntaje >= 0.6,
            versionModelo: 'random_forest_v1',
            modeloId: modelo.id,
            datosEntrada: {
              habilidades: datos.habilidades,
              aniosExperiencia: datos.anios,
              nivelEducativo: datos.nivel,
            },
          },
        },
        historialDeEstados: {
          create: { estadoNuevo: EstadoPostulacion.RECIBIDA, nota: 'Postulación recibida' },
        },
        notificaciones: {
          create: {
            empresaId: vacante.empresaId,
            usuarioId: usuario.id,
            canal: CanalNotificacion.CORREO,
            tipo: 'POSTULACION_RECIBIDA',
            destinatario: datos.correo,
            asunto: 'Recibimos tu postulación',
            mensaje: `Hola ${datos.nombre}, recibimos tu postulación a "${vacante.titulo}".`,
          },
        },
      },
    });
  }

  console.log('Seed completado.');
  console.log(`Clave de todos los usuarios de prueba: ${CLAVE_DEMO}`);
}

main()
  .catch((error) => {
    console.error('Error en el seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });