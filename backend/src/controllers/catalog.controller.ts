// src/controllers/catalog.controller.ts
// Catálogo extensible en BD de Departamentos, Especialidades y Carreras
// Cualquier empresa puede agregar nuevas opciones y todas las demás las ven al instante.
import type { Request, Response, NextFunction } from 'express';
import { TipoCatalogo } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/database';
import { HttpError } from '../utils/http-error';

const DEFAULT_DEPARTAMENTOS = [
  'Tecnología & Desarrollo de Software',
  'Datos, Analítica & Machine Learning',
  'Inteligencia de Negocios (BI)',
  'Infraestructura, Cloud & DevOps',
  'Ciberseguridad & Redes',
  'Diseño UI/UX & Producto Digital',
  'Ingeniería Industrial & Producción',
  'Ingeniería Civil & Arquitectura',
  'Ingeniería Eléctrica & Electrónica',
  'Ingeniería Mecánica & Mantenimiento',
  'Talento Humano & Recursos Humanos',
  'Administración & Finanzas',
  'Contabilidad & Auditoría',
  'Marketing Digital & Comunicaciones',
  'Ventas, Comercial & Desarrollo de Negocios',
  'Atención al Cliente & Soporte Técnico',
  'Operaciones, Logística & Cadena de Suministro',
  'Compras & Abastecimiento',
  'Legal, Cumplimiento & Asuntos Regulatorios',
  'Salud, Medicina & Enfermería',
  'Farmacia & Biotecnología',
  'Educación, Docencia & Capacitación',
  'Turismo, Hotelería & Gastronomía',
  'Banca, Seguros & Servicios Financieros',
  'Calidad, Seguridad Industrial & Ambiente (HSE)',
  'Investigación & Desarrollo (I+D)',
  'Comercio Exterior & Aduanas',
  'Bienes Raíces & Construcción',
  'Medios, Diseño Gráfico & Audiovisual',
  'Dirección General & Gerencia de Proyectos',
];

const DEFAULT_ESPECIALIDADES = [
  'Desarrollo Full Stack',
  'Desarrollo Frontend',
  'Desarrollo Backend',
  'Desarrollo Móvil (iOS / Android)',
  'Ciencia de Datos & Machine Learning',
  'Ingeniería de Datos & ETL',
  'Inteligencia Artificial & NLP',
  'Arquitectura Cloud (AWS / Azure / GCP)',
  'DevOps & SRE',
  'QA, Testing & Automatización',
  'Seguridad Informática & Pentesting',
  'Administración de Bases de Datos (DBA)',
  'Soporte TI & Mesa de Ayuda',
  'Diseño de Interfaces (UI/UX)',
  'Product Management & Scrum Master',
  'Análisis Financiero & Presupuesto',
  'Contabilidad General & Tributaria',
  'Auditoría Interna & Externa',
  'Nómina & Compensación',
  'Reclutamiento & Selección de Talento',
  'Capacitación & Desarrollo Organizacional',
  'Marketing de Contenidos & SEO/SEM',
  'Social Media & Community Management',
  'Ventas B2B & Cuentas Clave',
  'Ventas B2C & Retail',
  'Gestión de Inventarios & Almacén',
  'Transporte & Distribución',
  'Control de Calidad (ISO / Six Sigma)',
  'Seguridad y Salud Ocupacional',
  'Derecho Corporativo & Laboral',
  'Atención Médica General & Especializada',
  'Enfermería Clínica',
  'Docencia Universitaria & Escolar',
  'Diseño Gráfico & Branding',
  'Gestión de Proyectos (PMP / Ágil)',
];

const DEFAULT_CARRERAS = [
  'Ingeniería en Sistemas / Informática',
  'Ingeniería de Software',
  'Ciencias de la Computación',
  'Ingeniería en Ciencia de Datos / IA',
  'Ingeniería Electrónica / Telecomunicaciones',
  'Ingeniería Industrial',
  'Ingeniería Civil',
  'Ingeniería Mecánica',
  'Ingeniería Eléctrica',
  'Ingeniería Química',
  'Arquitectura',
  'Administración de Empresas',
  'Contaduría Pública / Contabilidad',
  'Economía',
  'Finanzas & Banca',
  'Mercadeo / Marketing',
  'Comercio Internacional / Negocios Internacionales',
  'Recursos Humanos / Relaciones Industriales',
  'Psicología Industrial / Organizacional',
  'Psicología Clínica',
  'Derecho / Ciencias Jurídicas',
  'Comunicación Social / Periodismo',
  'Diseño Gráfico',
  'Diseño Industrial / Digital',
  'Publicidad & Relaciones Públicas',
  'Medicina',
  'Enfermería',
  'Farmacia / Bioanálisis',
  'Odontología',
  'Nutrición & Dietética',
  'Educación / Pedagogía',
  'Turismo & Hotelería',
  'Gastronomía / Artes Culinarias',
  'Logística & Transporte',
  'Matemáticas / Estadística',
  'Técnico Superior Universitario (TSU)',
  'Bachiller / Formación Técnica',
];

let seededInMemory = false;

async function ensureCatalogSeeded() {
  if (seededInMemory) return;
  const count = await prisma.catalogoOpcion.count();
  if (count === 0) {
    const rows = [
      ...DEFAULT_DEPARTAMENTOS.map((nombre) => ({ tipo: TipoCatalogo.DEPARTAMENTO, nombre })),
      ...DEFAULT_ESPECIALIDADES.map((nombre) => ({ tipo: TipoCatalogo.ESPECIALIDAD, nombre })),
      ...DEFAULT_CARRERAS.map((nombre) => ({ tipo: TipoCatalogo.CARRERA, nombre })),
    ];
    await prisma.catalogoOpcion.createMany({ data: rows, skipDuplicates: true });
  }
  seededInMemory = true;
}

const createOptionSchema = z.object({
  tipo: z.enum(['DEPARTAMENTO', 'ESPECIALIDAD', 'CARRERA']),
  nombre: z.string().trim().min(2, 'El nombre es muy corto').max(120, 'Máximo 120 caracteres'),
});

export const catalogController = {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      await ensureCatalogSeeded();
      const items = await prisma.catalogoOpcion.findMany({
        orderBy: [{ nombre: 'asc' }],
      });

      const departamentos = items.filter((i) => i.tipo === TipoCatalogo.DEPARTAMENTO).map((i) => i.nombre);
      const especialidades = items.filter((i) => i.tipo === TipoCatalogo.ESPECIALIDAD).map((i) => i.nombre);
      const carreras = items.filter((i) => i.tipo === TipoCatalogo.CARRERA).map((i) => i.nombre);

      res.json({
        success: true,
        data: {
          departamentos,
          especialidades,
          carreras,
          items,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpError(401, 'No autenticado');
      const body = createOptionSchema.parse(req.body);
      await ensureCatalogSeeded();

      // Verificar duplicado insensible a mayúsculas
      const existing = await prisma.catalogoOpcion.findFirst({
        where: {
          tipo: body.tipo as TipoCatalogo,
          nombre: { equals: body.nombre, mode: 'insensitive' },
        },
      });

      if (existing) {
        res.status(200).json({
          success: true,
          data: existing,
          alreadyExisted: true,
        });
        return;
      }

      const created = await prisma.catalogoOpcion.create({
        data: {
          tipo: body.tipo as TipoCatalogo,
          nombre: body.nombre,
          creadoPorEmpresaId: req.user.empresaId ?? null,
        },
      });

      res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err) {
      next(err);
    }
  },
};
