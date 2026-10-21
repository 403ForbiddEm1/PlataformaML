const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
} = require('docx');

function createCell(text, isHeader = false, widthPercent = 25, isBold = false) {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: isHeader
      ? { type: ShadingType.CLEAR, fill: '059669', color: 'FFFFFF' }
      : undefined,
    children: [
      new Paragraph({
        alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: isHeader || isBold,
            color: isHeader ? 'FFFFFF' : '1E293B',
            font: 'Arial',
            size: 19,
          }),
        ],
      }),
    ],
  });
}

const doc = new Document({
  styles: {
    default: {
      document: {
        run: {
          font: 'Arial',
          size: 22,
          color: '1E293B',
        },
        paragraph: {
          spacing: { after: 120, line: 276 },
        },
      },
    },
  },
  sections: [
    {
      properties: {},
      children: [
        // PORTADA INSTITUCIONAL
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: 'UNIVERSIDAD JOSÉ GREGORIO HERNÁNDEZ',
              bold: true,
              size: 26,
              color: '0F172A',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: 'FACULTAD DE INGENIERÍA · ESCUELA DE COMPUTACIÓN Y SISTEMAS',
              size: 20,
              color: '475569',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [
            new TextRun({
              text: 'ÁREA TEMÁTICA: ANÁLISIS Y DISEÑO DE SISTEMAS DE INFORMACIÓN',
              size: 18,
              color: '059669',
              bold: true,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 600, after: 600 },
          children: [
            new TextRun({
              text: 'PLATAFORMA WEB CON ALGORITMOS DE APRENDIZAJE AUTOMÁTICO PARA LA OPTIMIZACIÓN DEL PROCESO DE RECLUTAMIENTO Y SELECCIÓN DE PERSONAL',
              bold: true,
              size: 32,
              color: '059669',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 800 },
          children: [
            new TextRun({
              text: 'DOCUMENTO TÉCNICO DE ARQUITECTURA FRONTEND, DISEÑO UI/UX Y ESPECIFICACIÓN DE INTEGRACIÓN BACKEND',
              italics: true,
              size: 20,
              color: '334155',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: 800, after: 80 },
          children: [
            new TextRun({ text: 'EQUIPO DE INVESTIGACIÓN Y DESARROLLO:', bold: true, size: 20 }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 40 },
          children: [
            new TextRun({ text: 'Diaz Acosta Maria Jose — C.I. 34.105.779 — Mariadiaz779@ujgh.edu.ve', size: 19 }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 40 },
          children: [
            new TextRun({ text: 'Higuera Gonzalez Santiago Kayros — C.I. 32.699.066 — Santiagohiguera066@ujgh.edu.ve', size: 19 }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 400 },
          children: [
            new TextRun({ text: 'Ramirez Carvajal Emiliangely Maria — C.I. 32.577.915 — Emiliangelyramirez915@ujgh.edu.ve', size: 19 }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 600 },
          children: [
            new TextRun({ text: 'OCTUBRE DE 2026', bold: true, size: 20, color: '64748B' }),
          ],
        }),

        // SALTO DE PÁGINA (Representado con espaciado amplio o títulos nuevos)
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 800, after: 200 },
          children: [new TextRun({ text: '1. INTRODUCCIÓN Y OBJETIVOS DEL PROYECTO', bold: true, size: 28, color: '059669' })],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'En muchas organizaciones contemporáneas, el reclutamiento y la selección de personal se siguen realizando mediante métodos predominantemente manuales: las postulaciones ingresan de manera fragmentada por correos electrónicos o canales dispersos, los currículums vítae se analizan individualmente sin criterios uniformes y el seguimiento de cada candidato se gestiona en hojas de cálculo.',
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Esta situación genera demoras críticas en los tiempos de respuesta, saturación del personal de talento humano, escasa trazabilidad y un riesgo elevado de introducir sesgos subjetivos en las evaluaciones preliminares. El presente proyecto aborda esta problemática mediante el diseño e implementación de una plataforma web moderna dotada de algoritmos de Machine Learning (RandomForest + Vectorización TF-IDF), garantizando clasificación predictiva de afinidad, explicabilidad y apego a la decisión humana ética.',
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Objetivo General: ', bold: true }),
            new TextRun({
              text: 'Desarrollar una plataforma web con algoritmos de aprendizaje automático para la optimización del proceso de reclutamiento y selección de personal.',
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Objetivos Específicos: ', bold: true }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '1. Determinar los requerimientos funcionales y no funcionales del proceso de reclutamiento y selección.\n2. Diseñar la arquitectura técnica de la plataforma web a partir de los requerimientos identificados.\n3. Construir los módulos de la plataforma web para la recepción de postulaciones, la gestión de candidatos y el envío de notificaciones automáticas por correo y WhatsApp.\n4. Integrar algoritmos de aprendizaje automático para el filtrado, la clasificación objetiva y el scoring de perfiles.\n5. Validar el funcionamiento y la seguridad de la plataforma mediante pruebas en un entorno controlado.\n6. Evaluar la optimización del proceso de selección comparando métricas e indicadores antes y después del uso de la plataforma.' }),
          ],
        }),

        // CAPÍTULO 2
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 600, after: 200 },
          children: [new TextRun({ text: '2. MATRIZ DE REQUERIMIENTOS Y SU IMPLEMENTACIÓN FRONTEND', bold: true, size: 28, color: '059669' })],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'El frontend desarrollado en React 19, TypeScript y Tailwind CSS implementa de forma íntegra y modular cada uno de los requerimientos funcionales (RF) y no funcionales (RNF) definidos en el informe preliminar:',
            }),
          ],
        }),

        // TABLA DE REQUERIMIENTOS FUNCIONALES
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createCell('Cód.', true, 10),
                createCell('Requerimiento Funcional', true, 35),
                createCell('Implementación en el Frontend', true, 55),
              ],
            }),
            new TableRow({
              children: [
                createCell('RF01', false, 10, true),
                createCell('Registro e inicio de sesión con roles (Candidato, RRHH, Administrador)', false, 35),
                createCell('Pantalla de Login con selector de 3 pestañas dinámicas, validación de credenciales, cambio rápido de usuario demo y modal de registro de postulantes.', false, 55),
              ],
            }),
            new TableRow({
              children: [
                createCell('RF02', false, 10, true),
                createCell('Gestión de vacantes (crear, editar, requisitos)', false, 35),
                createCell('Módulo de Talento Humano con formulario modal para definir cargo, departamento, modalidad, habilidades clave y requisitos académicos.', false, 55),
              ],
            }),
            new TableRow({
              children: [
                createCell('RF03', false, 10, true),
                createCell('Postulación en línea con carga de hoja de vida y cédula', false, 35),
                createCell('Formulario público con drag & drop para Cédula (PDF/JPG) y CV (PDF/Word) con límite de 5 MB, validación en tiempo real y microcopia tranquilizadora.', false, 55),
              ],
            }),
            new TableRow({
              children: [
                createCell('RF04', false, 10, true),
                createCell('Gestión de candidatos (listar, buscar, filtrar y perfil)', false, 35),
                createCell('Barra de herramientas interactiva con búsqueda por texto libre, selector de vacante y filtro por estado (Recibida, En revisión, Preseleccionado, etc.).', false, 55),
              ],
            }),
            new TableRow({
              children: [
                createCell('RF05', false, 10, true),
                createCell('Estructuración de datos de perfil (educación, experiencia, skills)', false, 35),
                createCell('Pestaña "Mi Perfil" en el Portal del Candidato que estructura los antecedentes en formato normalizado apto para el modelo de ML.', false, 55),
              ],
            }),
            new TableRow({
              children: [
                createCell('RF06', false, 10, true),
                createCell('Clasificación automática: puntaje de afinidad y ranking ordenado', false, 35),
                createCell('Ordenamiento inteligente por afinidad decreciente (0-100%) con insignias cromáticas según el nivel de compatibilidad algorítmica.', false, 55),
              ],
            }),
            new TableRow({
              children: [
                createCell('RF07', false, 10, true),
                createCell('Mostrar el puntaje y factores que más influyeron (Explicabilidad)', false, 35),
                createCell('Modal de Inteligencia Artificial Explicable (XAI) con barras de progreso de experiencia, educación, coincidencia de habilidades y texto interpretativo.', false, 55),
              ],
            }),
            new TableRow({
              children: [
                createCell('RF08', false, 10, true),
                createCell('Decisión humana: preseleccionar, descartar o avanzar', false, 35),
                createCell('Botonera de decisión rápida en el panel de RRHH y drawer detallado con campo para observaciones y justificación del evaluador.', false, 55),
              ],
            }),
            new TableRow({
              children: [
                createCell('RF09', false, 10, true),
                createCell('Notificaciones automáticas por correo y WhatsApp', false, 35),
                createCell('Generación de mensajes simulados instantáneos vía API con canal específico y visualización en la bandeja del postulante.', false, 55),
              ],
            }),
            new TableRow({
              children: [
                createCell('RF10', false, 10, true),
                createCell('Historial de cada postulación (quién hizo qué y cuándo)', false, 35),
                createCell('Línea de tiempo auditada en el expediente del candidato que registra cada evento con autor, sello de tiempo y canal de notificación.', false, 55),
              ],
            }),
            new TableRow({
              children: [
                createCell('RF11', false, 10, true),
                createCell('Reportes e indicadores (tiempos y comparativa antes vs después)', false, 35),
                createCell('Panel de administración con tarjetas KPI que contrastan el proceso manual (4.8 días) frente al automatizado (12 minutos, -96%).', false, 55),
              ],
            }),
            new TableRow({
              children: [
                createCell('RF12', false, 10, true),
                createCell('Gestión del modelo: carga de dataset, reentrenar y métricas', false, 35),
                createCell('Consola MLOps interactiva con visualización de Accuracy (92.4%), Precision, Recall, F1-Score, subida de CSV y animación de épocas.', false, 55),
              ],
            }),
          ],
        }),

        // TABLA DE REQUERIMIENTOS NO FUNCIONALES
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 150 },
          children: [new TextRun({ text: 'Requerimientos No Funcionales (RNF)', bold: true, size: 24, color: '059669' })],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createCell('Cód.', true, 10),
                createCell('Requerimiento No Funcional', true, 30),
                createCell('Estrategia de Cumplimiento en el Frontend', true, 60),
              ],
            }),
            new TableRow({
              children: [
                createCell('RNF01', false, 10, true),
                createCell('Seguridad y Control de Acceso', false, 30),
                createCell('Rutas protegidas por AuthContext, inyección de tokens JWT en el encabezado Authorization y bloqueo de vistas no autorizadas.', false, 60),
              ],
            }),
            new TableRow({
              children: [
                createCell('RNF02', false, 10, true),
                createCell('Privacidad y Protección de Datos', false, 30),
                createCell('Avisos de privacidad visibles, limitación estricta de visibilidad de datos sensibles a usuarios autorizados.', false, 60),
              ],
            }),
            new TableRow({
              children: [
                createCell('RNF03', false, 10, true),
                createCell('Equidad Algorítmica y Cero Sesgo', false, 30),
                createCell('Insignia y comprobante de equidad que certifica la exclusión de variables demográficas (género, edad, fotografía) del modelo de ML.', false, 60),
              ],
            }),
            new TableRow({
              children: [
                createCell('RNF04', false, 10, true),
                createCell('Precisión del Modelo', false, 30),
                createCell('Monitoreo en tiempo real de umbrales mínimos aprobados por el equipo (Accuracy > 90%, F1 > 88%).', false, 60),
              ],
            }),
            new TableRow({
              children: [
                createCell('RNF05', false, 10, true),
                createCell('Rendimiento y Agilidad', false, 30),
                createCell('Empaquetado optimizado con Vite 8 y React 19, compilación en menos de 1 segundo y carga de componentes en menos de 200 ms.', false, 60),
              ],
            }),
            new TableRow({
              children: [
                createCell('RNF06', false, 10, true),
                createCell('Usabilidad Intuitiva', false, 30),
                createCell('Diseño centrado en el usuario (Front Design) sin sobrecarga visual, con navegación clara e iconos semánticos.', false, 60),
              ],
            }),
            new TableRow({
              children: [
                createCell('RNF07', false, 10, true),
                createCell('Compatibilidad y Diseño Responsivo', false, 30),
                createCell('Totalmente adaptado a dispositivos móviles (Páginas 2 y 4 de los mockups) y pantallas de escritorio mediante clases fluidas de Tailwind.', false, 60),
              ],
            }),
            new TableRow({
              children: [
                createCell('RNF09', false, 10, true),
                createCell('Mantenibilidad y Modularidad', false, 30),
                createCell('Separación limpia en capas: componentes visuales, servicios HTTP desacoplados, tipos TypeScript e interfaces independientes.', false, 60),
              ],
            }),
            new TableRow({
              children: [
                createCell('RNF10', false, 10, true),
                createCell('Manejo de Errores y Disponibilidad', false, 30),
                createCell('Sistema reactivo de alertas (Toasts) y fallbacks claros ante incidencias de red o formularios incompletos.', false, 60),
              ],
            }),
          ],
        }),

        // CAPÍTULO 3
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 600, after: 200 },
          children: [new TextRun({ text: '3. GUÍA DE CONEXIÓN CON EL BACKEND Y ARQUITECTURA TÉCNICA', bold: true, size: 28, color: '059669' })],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'El frontend está concebido como una capa completamente desacoplada lista para conectarse con la arquitectura global de microservicios establecida para el proyecto:',
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '• Backend Principal: ', bold: true }),
            new TextRun({ text: 'Node.js con Express, TypeScript y Prisma ORM sobre PostgreSQL.\n' }),
            new TextRun({ text: '• Microservicio de Aprendizaje Automático: ', bold: true }),
            new TextRun({ text: 'Python con FastAPI, Scikit-learn, Pandas y NumPy.\n' }),
            new TextRun({ text: '• Servicios Externos: ', bold: true }),
            new TextRun({ text: 'Nodemailer para correo SMTP y WhatsApp Business Platform API para mensajería instantánea.' }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Configuración de Conmutación (Mock ➔ Producción):', bold: true }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'En el archivo "frontend/.env", basta con cambiar la variable "VITE_USE_MOCK=false". De inmediato, el cliente HTTP de "src/services/api.ts" comenzará a despachar peticiones REST reales a la URL base "VITE_API_URL" (por defecto "http://localhost:4000/api") adjuntando automáticamente el encabezado "Authorization: Bearer <token>" en cada solicitud.',
            }),
          ],
        }),

        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
          children: [new TextRun({ text: 'Especificación de Endpoints REST Consumidos:', bold: true, size: 22, color: '059669' })],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '1. Autenticación y Usuarios:\n', bold: true }),
            new TextRun({ text: '   POST /api/auth/login -> Inicia sesión por rol y retorna token JWT.\n' }),
            new TextRun({ text: '   POST /api/auth/register -> Registra postulantes.\n' }),
            new TextRun({ text: '   POST /api/auth/recover-password -> Envía enlace de recuperación.\n\n' }),

            new TextRun({ text: '2. Gestión de Vacantes:\n', bold: true }),
            new TextRun({ text: '   GET /api/vacancies -> Obtiene el catálogo de vacantes.\n' }),
            new TextRun({ text: '   POST /api/vacancies -> Crea una nueva vacante con ponderaciones de competencias.\n' }),
            new TextRun({ text: '   PUT /api/vacancies/:id -> Edita requisitos o cierra la vacante.\n\n' }),

            new TextRun({ text: '3. Postulaciones y Selección:\n', bold: true }),
            new TextRun({ text: '   POST /api/applications (Multipart FormData) -> Carga datos personales, CV y Cédula.\n' }),
            new TextRun({ text: '   GET /api/applications -> Lista postulaciones con filtros por vacante y estado.\n' }),
            new TextRun({ text: '   PATCH /api/applications/:id/status -> Registra la decisión humana (Preselección, Descarte) y dispara notificaciones.\n\n' }),

            new TextRun({ text: '4. Machine Learning & MLOps:\n', bold: true }),
            new TextRun({ text: '   GET /api/ml/metrics -> Retorna indicadores de desempeño (Accuracy, Precision, Recall).\n' }),
            new TextRun({ text: '   POST /api/ml/train -> Dispara el reentrenamiento del clasificador.\n' }),
            new TextRun({ text: '   POST /api/ml/upload-dataset -> Carga lotes históricos anonimizados.\n\n' }),

            new TextRun({ text: '5. Notificaciones y Reportes:\n', bold: true }),
            new TextRun({ text: '   GET /api/notifications -> Bandeja de mensajes remitidos vía WhatsApp y Correo.\n' }),
            new TextRun({ text: '   GET /api/reports/comparison -> Métricas comparativas del proceso de selección.' }),
          ],
        }),

        // CAPÍTULO 4
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 600, after: 200 },
          children: [new TextRun({ text: '4. INSTRUCCIONES DE EJECUCIÓN Y PRUEBAS', bold: true, size: 28, color: '059669' })],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Para ejecutar y probar la solución en un entorno local, se deben seguir los siguientes pasos en la consola PowerShell o terminal:\n\n' +
                '1. Navegar al directorio del frontend:\n' +
                '   cd d:\\proyectos\\proyectoAnalisis\\frontend\n\n' +
                '2. Iniciar el servidor de desarrollo Vite:\n' +
                '   npm run dev\n\n' +
                '3. Abrir la URL mostrada en el navegador (habitualmente http://localhost:5173).\n\n' +
                '4. Compilar para despliegue en producción:\n' +
                '   npm run build\n' +
                '   (Genera la carpeta "dist/" optimizada, lista para servir en Render o Nginx).\n\n' +
                'La barra de navegación rápida superior permite alternar instantáneamente entre las 6 vistas del sistema para su demostración y evaluación académica.',
            }),
          ],
        }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  const outputPath1 = path.join(__dirname, '..', 'docs', 'Documentacion_Frontend_Plataforma_Reclutamiento_ML.docx');
  const outputPath2 = path.join(__dirname, '..', 'Documentacion_Frontend_Plataforma_Reclutamiento_ML.docx');
  fs.writeFileSync(outputPath1, buffer);
  fs.writeFileSync(outputPath2, buffer);
  console.log('Documentación Word generada exitosamente en:');
  console.log(outputPath1);
  console.log(outputPath2);
});
