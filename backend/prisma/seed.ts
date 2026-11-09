// backend/prisma/seed.ts
// Datos de DEMOSTRACIÓN. Nunca ejecutar en producción (claves conocidas).
import 'dotenv/config';
import {
  PrismaClient,
  Rol,
  EstadoEmpresa,
  NivelEducativo,
  EstadoVacante,
  EstadoPostulacion,
  EstadoNotificacion,
  TipoDocumento,
  CanalNotificacion,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

if (process.env.NODE_ENV === 'production') {
  console.error('El seed de demostración no se puede ejecutar en producción.');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const CLAVE_DEMO = 'Password123!';
const VACANTE_DEMO_ID = '00000000-0000-4000-8000-000000000001';

async function main() {
  console.log('Iniciando seed v3...');
  const ahora = new Date();
  const claveHash = await bcrypt.hash(CLAVE_DEMO, 10);

  // 1. Modelo de ML activo (formato que lee el panel: porcentajes)
  const modelo = await prisma.modeloML.upsert({
    where: { nombre_version: { nombre: 'random_forest', version: 'v1' } },
    update: {},
    create: {
      nombre: 'random_forest',
      version: 'v1',
      algoritmo: 'RandomForestClassifier',
      metricas: {
        accuracy: 86,
        precision: 87,
        recall: 81,
        f1Score: 84,
        isFairnessCompliant: true,
        trainingHistory: [
          { epoch: 1, accuracy: 70, loss: 0.62 },
          { epoch: 2, accuracy: 79, loss: 0.45 },
          { epoch: 3, accuracy: 86, loss: 0.33 },
        ],
      },
      totalEntrenamiento: 1000,
      entrenadoEn: ahora,
      activo: true,
    },
  });

  // 2. Super administrador (equipo de la plataforma, sin empresa)
  const superAdmin = await prisma.usuario.upsert({
    where: { correo: 'superadmin@plataforma.test' },
    update: {},
    create: {
      correo: 'superadmin@plataforma.test',
      claveHash,
      nombre: 'Super',
      apellido: 'Admin',
      rol: Rol.SUPER_ADMIN,
      correoVerificadoEn: ahora,
      aceptoTerminosEn: ahora,
    },
  });

  // 3. Empresa ACTIVA (aprobada por el super admin)
  const empresa = await prisma.empresa.upsert({
    where: { nombre: 'TechNova C.A.' },
    update: {},
    create: {
      nombre: 'TechNova C.A.',
      razonSocial: 'TechNova Compañía Anónima',
      identificacionFiscal: 'J-12345678-9',
      correoContacto: 'contacto@technova.test',
      estado: EstadoEmpresa.ACTIVA,
      aprobadaPorId: superAdmin.id,
      aprobadaEn: ahora,
    },
  });

  // 3b. Empresa PENDIENTE (para probar el flujo de aprobación del super admin)
  const empresaPendiente = await prisma.empresa.upsert({
    where: { nombre: 'Distribuidora Andina C.A.' },
    update: {},
    create: {
      nombre: 'Distribuidora Andina C.A.',
      razonSocial: 'Distribuidora Andina Compañía Anónima',
      identificacionFiscal: 'J-98765432-1',
      correoContacto: 'contacto@andina.test',
      estado: EstadoEmpresa.PENDIENTE_APROBACION,
    },
  });

  await prisma.usuario.upsert({
    where: { correo: 'admin@andina.test' },
    update: {},
    create: {
      correo: 'admin@andina.test',
      claveHash,
      nombre: 'Luis',
      apellido: 'Rivas',
      rol: Rol.ADMIN,
      empresaId: empresaPendiente.id,
      correoVerificadoEn: ahora,
      aceptoTerminosEn: ahora,
    },
  });

  // 3c. Línea base "antes de la plataforma" (reporte comparativo)
  await prisma.lineaBaseProceso.upsert({
    where: { empresaId: empresa.id },
    update: {},
    create: {
      empresaId: empresa.id,
      tiempoFiltradoManualDias: 4.8,
      precisionFiltradoManual: 42.0,
      satisfaccionReclutadores: 9.2,
    },
  });

  // 4. Admin de la empresa
  const admin = await prisma.usuario.upsert({
    where: { correo: 'admin@technova.test' },
    update: {},
    create: {
      correo: 'admin@technova.test',
      claveHash,
      nombre: 'Ana',
      apellido: 'Gómez',
      rol: Rol.ADMIN,
      empresaId: empresa.id,
      correoVerificadoEn: ahora,
      aceptoTerminosEn: ahora,
    },
  });

  // 5. Personal de RRHH
  await prisma.usuario.upsert({
    where: { correo: 'rrhh@technova.test' },
    update: {},
    create: {
      correo: 'rrhh@technova.test',
      claveHash,
      nombre: 'Carlos',
      apellido: 'Arismendi',
      rol: Rol.RRHH,
      empresaId: empresa.id,
      correoVerificadoEn: ahora,
      aceptoTerminosEn: ahora,
    },
  });

  // 6. Candidato con perfil, educación, experiencia y documentos
  //    (aniosExperiencia y nivelEducativo coinciden con experiencia[] y educacion[])
  const candidato = await prisma.usuario.upsert({
    where: { correo: 'maria@candidato.test' },
    update: {},
    create: {
      correo: 'maria@candidato.test',
      claveHash,
      nombre: 'María',
      apellido: 'Pérez',
      rol: Rol.CANDIDATO,
      correoVerificadoEn: ahora,
      aceptoTerminosEn: ahora,
      perfilCandidato: {
        create: {
          titulo: 'Desarrolladora Backend',
          ubicacion: 'Maracaibo, Zulia',
          aniosExperiencia: 3,
          nivelEducativo: NivelEducativo.LICENCIATURA,
          habilidades: ['Node', 'SQL', 'Docker', 'Git'],
          idiomas: ['Español', 'Inglés'],
          educacion: {
            create: [
              {
                institucion: 'Universidad de ejemplo',
                titulo: 'Licenciatura en Informática',
                anioGraduacion: 2022,
              },
            ],
          },
          experiencia: {
            create: [
              {
                empresa: 'Soluciones Zulia',
                cargo: 'Desarrolladora Backend',
                anioInicio: 2023,
                anioFin: null,
                descripcion: 'APIs REST con Node.js y PostgreSQL.',
              },
            ],
          },
          documentos: {
            create: [
              {
                tipo: TipoDocumento.CURRICULO,
                nombreArchivo: 'CV_Maria.pdf',
                rutaAlmacenamiento: 'storage/private/cv/cv_maria.pdf',
                tipoMime: 'application/pdf',
                tamanioBytes: 102400,
              },
              {
                tipo: TipoDocumento.CEDULA,
                nombreArchivo: 'Cedula_Maria.pdf',
                rutaAlmacenamiento: 'storage/private/cedulas/cedula_maria.pdf',
                tipoMime: 'application/pdf',
                tamanioBytes: 51200,
              },
            ],
          },
        },
      },
    },
    include: { perfilCandidato: { include: { documentos: true } } },
  });

  const documentos = candidato.perfilCandidato?.documentos ?? [];
  const cvId = documentos.find((d) => d.tipo === TipoDocumento.CURRICULO)?.id;
  const cedulaId = documentos.find((d) => d.tipo === TipoDocumento.CEDULA)?.id;

  // 7. Vacante
  const vacante = await prisma.vacante.upsert({
    where: { id: VACANTE_DEMO_ID },
    update: {},
    create: {
      id: VACANTE_DEMO_ID,
      titulo: 'Desarrollador Backend',
      descripcion: 'Se busca Desarrollador Backend para TechNova.',
      requisitos: 'Experiencia mínima de 2 años\nConocimiento de Node.js y SQL',
      ubicacion: 'Maracaibo, Zulia',
      habilidadesRequeridas: ['Node', 'SQL', 'Docker'],
      aniosExperienciaMinimos: 2,
      nivelEducativoMinimo: NivelEducativo.LICENCIATURA,
      estado: EstadoVacante.ABIERTA,
      publicadaEn: ahora,
      empresaId: empresa.id,
      creadaPorId: admin.id,
    },
  });

  // 8. Postulación con predicción de ML, historial y notificación
  const postulacion = await prisma.postulacion.upsert({
    where: { vacanteId_candidatoId: { vacanteId: vacante.id, candidatoId: candidato.id } },
    update: {},
    create: {
      empresaId: empresa.id,
      vacanteId: vacante.id,
      candidatoId: candidato.id,
      curriculoId: cvId,
      cedulaId: cedulaId,
      estado: EstadoPostulacion.RECIBIDA,
      prediccionML: {
        create: {
          puntajeAfinidad: 0.94,
          esApto: true,
          versionModelo: 'random_forest_v1',
          modeloId: modelo.id,
          datosEntrada: {
            aniosExperiencia: 3,
            nivelEducativo: 'LICENCIATURA',
            habilidades: ['Node', 'SQL', 'Docker', 'Git'],
          },
          datosCrudosPrediccion: {
            experienceMatch: 95,
            educationMatch: 92,
            skillsMatch: 96,
            matchingSkills: ['Node', 'SQL', 'Docker'],
            missingSkills: [],
            keyFactors: [
              'Supera los 2 años de experiencia mínima',
              'Cumple el nivel educativo requerido',
              'Domina las 3 habilidades requeridas',
            ],
            explanation: 'Perfil con alta afinidad con los requisitos de la vacante.',
            fairnessChecked: true,
          },
        },
      },
      historialDeEstados: {
        create: {
          estadoNuevo: EstadoPostulacion.RECIBIDA,
          nota: 'Postulación recibida en el sistema',
        },
      },
      notificaciones: {
        create: {
          empresaId: empresa.id,
          usuarioId: candidato.id,
          canal: CanalNotificacion.CORREO,
          tipo: 'POSTULACION_RECIBIDA',
          destinatario: 'maria@candidato.test',
          asunto: 'Recibimos tu postulación',
          mensaje: 'Hola María, recibimos tu postulación a Desarrollador Backend.',
          // ya "enviada": evita que el worker intente mandar correo a una dirección de prueba
          estado: EstadoNotificacion.ENVIADA,
          intentos: 1,
          enviadaEn: ahora,
        },
      },
    },
  });

  // 9. Auditoría (solo si no existe ya, para que el seed se pueda repetir)
  const yaAuditada = await prisma.registroAuditoria.findFirst({
    where: { accion: 'POSTULACION_CREADA', entidadId: postulacion.id },
  });
  if (!yaAuditada) {
    await prisma.registroAuditoria.create({
      data: {
        empresaId: empresa.id,
        usuarioId: candidato.id,
        accion: 'POSTULACION_CREADA',
        entidad: 'Postulacion',
        entidadId: postulacion.id,
        detalle: { vacante: vacante.titulo },
      },
    });
  }

  console.log('Seed v3 completado.');
  console.log('--------------------------------------------------');
  console.log(`Clave para todos: ${CLAVE_DEMO}`);
  console.log('SuperAdmin:      superadmin@plataforma.test');
  console.log('Admin empresa:   admin@technova.test');
  console.log('RRHH:            rrhh@technova.test');
  console.log('Candidato:       maria@candidato.test');
  console.log('Empresa pendiente (admin): admin@andina.test');
  console.log('--------------------------------------------------');
}

main()
  .catch((error) => {
    console.error('Error en el seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });