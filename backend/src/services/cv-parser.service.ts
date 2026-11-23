// src/services/cv-parser.service.ts
// Lectura REAL y precisa del currículum (PDF / DOCX / DOC): extrae el texto real del archivo
// (con respaldo del extractor Python pypdf/python-docx de ml-service) y lo estructura con alta precisión.
// Regla estricta: NUNCA se inventan datos. Si un campo no está en el CV, queda vacío.
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import { mlService } from './ml.service';
// pdf-parse/lib evita el modo "debug" del index.js que intenta abrir un PDF de prueba
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (data: Buffer) => Promise<{ text: string }> = require('pdf-parse/lib/pdf-parse.js');

export interface CvEducacion {
  institution: string;
  degree: string;
  graduationYear: string;
}

export interface CvExperiencia {
  company: string;
  role: string;
  period: string;
  description: string;
}

export interface CvExtraido {
  title: string;
  bio: string;
  skills: string[];
  education: CvEducacion[];
  experience: CvExperiencia[];
  location: string;
  phone: string;
  texto: string;
}

// ─── 1. Extracción real de texto ──────────────────────────────────────────

export async function extraerTextoDeArchivo(rutaFisica: string): Promise<string> {
  const ext = path.extname(rutaFisica).toLowerCase();
  let textoLocal = '';

  try {
    if (ext === '.pdf') {
      const buffer = await fs.promises.readFile(rutaFisica);
      const res = await pdfParse(buffer);
      textoLocal = normalizarTexto(res.text || '');
    } else if (ext === '.docx') {
      const res = await mammoth.extractRawText({ path: rutaFisica });
      textoLocal = normalizarTexto(res.value || '');
    } else if (ext === '.doc') {
      const buffer = await fs.promises.readFile(rutaFisica);
      const crudo = buffer.toString('latin1');
      const trozos = crudo.match(/[A-Za-zÁÉÍÓÚáéíóúÑñÜü0-9@.,:;()\-\/%&+ ]{6,}/g) || [];
      textoLocal = normalizarTexto(trozos.join('\n'));
    }
  } catch (err: any) {
    console.warn('[CV_PARSER] Lectura local falló, intentando extractor Python ML:', err?.message);
  }

  // Respaldo con el extractor Python (pypdf / python-docx) si el texto local salió vacío o muy corto
  if (textoLocal.length < 40 && (ext === '.pdf' || ext === '.docx')) {
    try {
      const mlExtract = await mlService.extractText(rutaFisica, path.basename(rutaFisica));
      if (mlExtract?.text && mlExtract.text.trim().length > textoLocal.length) {
        return normalizarTexto(mlExtract.text);
      }
    } catch (err: any) {
      console.warn('[CV_PARSER] Extractor Python ML no disponible:', err?.message);
    }
  }

  return textoLocal;
}

function normalizarTexto(texto: string): string {
  return texto
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\u200b/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── 2. Detección inteligente de secciones ────────────────────────────────

type Seccion = 'perfil' | 'educacion' | 'experiencia' | 'habilidades' | 'otra';

const ENCABEZADOS: Array<{ seccion: Seccion; regex: RegExp }> = [
  {
    seccion: 'perfil',
    regex: /^(?:perfil(?:\s+profesional|\s+personal|\s+ocupacional|\s+laboral)?|resumen(?:\s+profesional|\s+ejecutivo)?|sobre\s+m[ií]|acerca\s+de\s+m[ií]|objetivo(?:\s+profesional|\s+laboral)?|presentaci[oó]n|extracto|summary|professional\s+summary|profile|about\s+me)$/i,
  },
  {
    seccion: 'educacion',
    regex: /^(?:educaci[oó]n(?:\s+y\s+formaci[oó]n)?|formaci[oó]n(?:\s+acad[eé]mica|\s+profesional|\s+y\s+estudios|\s+y\s+cursos)?|estudios(?:\s+realizados|\s+acad[eé]micos|\s+superiores)?|datos\s+acad[eé]micos|acad[eé]mic[oa]s?|t[ií]tulos\s+acad[eé]micos|education|academic\s+background)$/i,
  },
  {
    seccion: 'experiencia',
    regex: /^(?:experiencia(?:\s+laboral|\s+profesional|\s+relevante|\s+de\s+trabajo)?|historial\s+laboral|trayectoria(?:\s+profesional|\s+laboral)?|empleos?(?:\s+anteriores)?|puestos\s+anteriores|work\s+experience|professional\s+experience|experience|employment\s+history)$/i,
  },
  {
    seccion: 'habilidades',
    regex: /^(?:habilidades(?:\s+t[eé]cnicas|\s+blandas|\s+clave|\s+y\s+competencias|\s+profesionales)?|competencias(?:\s+t[eé]cnicas|\s+clave|\s+profesionales)?|conocimientos(?:\s+t[eé]cnicos|\s+inform[aá]ticos)?|tecnolog[ií]as(?:\s+y\s+herramientas)?|herramientas(?:\s+y\s+tecnolog[ií]as)?|stack\s+tecnol[oó]gico|skills|technical\s+skills|core\s+competencies|aptitudes|destrezas)$/i,
  },
  {
    seccion: 'otra',
    regex: /^(?:idiomas|referencias(?:\s+personales|\s+laborales)?|proyectos(?:\s+destacados|\s+personales|\s+de\s+portafolio)?|portafolio|cursos(?:\s+y\s+certificaciones)?|certificaciones(?:\s+y\s+cursos)?|contacto|datos\s+personales|informaci[oó]n\s+de\s+contacto|intereses|logros|reconocimientos|voluntariado|hobbies|languages|projects|certifications|publicaciones|informaci[oó]n\s+adicional|disponibilidad)$/i,
  },
];

function limpiarParaEncabezado(linea: string): string {
  return linea
    .replace(/^\s*(?:\d+[.)]\s*)?/, '')
    .replace(/[:\-–—•|_*#▪►●◆■]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectarEncabezado(linea: string): Seccion | null {
  const limpia = limpiarParaEncabezado(linea);
  if (!limpia || limpia.length > 48) return null;
  for (const e of ENCABEZADOS) {
    if (e.regex.test(limpia)) return e.seccion;
  }
  return null;
}

function separarSecciones(lineas: string[]): { cabecera: string[]; secciones: Record<Seccion, string[]> } {
  const secciones: Record<Seccion, string[]> = {
    perfil: [],
    educacion: [],
    experiencia: [],
    habilidades: [],
    otra: [],
  };
  const cabecera: string[] = [];
  let actual: Seccion | null = null;

  for (const linea of lineas) {
    const enc = detectarEncabezado(linea);
    if (enc) {
      actual = enc;
      continue;
    }
    // También detectar encabezados en línea tipo "Perfil Profesional: Soy ingeniero..."
    const inlineMatch = linea.match(/^([^:]{3,35}):\s+(.+)$/);
    if (inlineMatch) {
      const encInline = detectarEncabezado(inlineMatch[1]);
      if (encInline) {
        actual = encInline;
        secciones[actual].push(inlineMatch[2].trim());
        continue;
      }
    }

    if (actual) secciones[actual].push(linea);
    else cabecera.push(linea);
  }
  return { cabecera, secciones };
}

function esLineaContacto(linea: string): boolean {
  return /@|https?:\/\/|www\.|linkedin\.com|github\.com|behance\.net|dribbble\.com|\+?\d[\d\s\-().]{7,}\d/i.test(linea);
}

// ─── 3. Habilidades (diccionario amplio + literales limpias) ──────────────

const DICCIONARIO_HABILIDADES: Array<{ regex: RegExp; label: string }> = [
  // Desarrollo Web & Software
  { regex: /\bjavascript\b/i, label: 'JavaScript' },
  { regex: /\btypescript\b/i, label: 'TypeScript' },
  { regex: /\breact(\.js|js)?\b/i, label: 'React' },
  { regex: /\breact\s+native\b/i, label: 'React Native' },
  { regex: /\bnext\.?js\b/i, label: 'Next.js' },
  { regex: /\bvue(\.js|js)?\b/i, label: 'Vue.js' },
  { regex: /\bangular\b/i, label: 'Angular' },
  { regex: /\bsvelte\b/i, label: 'Svelte' },
  { regex: /\bnode(\.js|js)?\b/i, label: 'Node.js' },
  { regex: /\bexpress(\.js)?\b/i, label: 'Express.js' },
  { regex: /\bnestjs\b/i, label: 'NestJS' },
  { regex: /\bhtml5?\b/i, label: 'HTML5' },
  { regex: /\bcss3?\b/i, label: 'CSS3' },
  { regex: /\bsass\b|\bscss\b/i, label: 'SASS / SCSS' },
  { regex: /tailwind/i, label: 'Tailwind CSS' },
  { regex: /bootstrap/i, label: 'Bootstrap' },
  { regex: /\bpython\b/i, label: 'Python' },
  { regex: /\bdjango\b/i, label: 'Django' },
  { regex: /\bfastapi\b/i, label: 'FastAPI' },
  { regex: /\bflask\b/i, label: 'Flask' },
  { regex: /\bjava\b(?!script)/i, label: 'Java' },
  { regex: /spring\s*boot/i, label: 'Spring Boot' },
  { regex: /\bc#|\.net\b/i, label: 'C# / .NET' },
  { regex: /\bc\+\+\b/i, label: 'C++' },
  { regex: /\bphp\b/i, label: 'PHP' },
  { regex: /\blaravel\b/i, label: 'Laravel' },
  { regex: /\bflutter\b/i, label: 'Flutter' },
  { regex: /\bkotlin\b/i, label: 'Kotlin' },
  { regex: /\bswift\b/i, label: 'Swift' },
  { regex: /\bgolang\b|\bgo\s+language\b/i, label: 'Go' },
  { regex: /\brust\b/i, label: 'Rust' },
  { regex: /\bwordpress\b/i, label: 'WordPress' },
  { regex: /\bshopify\b/i, label: 'Shopify' },
  { regex: /\bgraphql\b/i, label: 'GraphQL' },
  { regex: /\bapi\s*rest\b|\brest\s*api\b|\brestful\b/i, label: 'REST APIs' },
  // Bases de datos & Datos & ML
  { regex: /postgres/i, label: 'PostgreSQL' },
  { regex: /\bmysql\b/i, label: 'MySQL' },
  { regex: /sql\s*server/i, label: 'SQL Server' },
  { regex: /\boracle\b/i, label: 'Oracle' },
  { regex: /\bsql\b/i, label: 'SQL' },
  { regex: /mongo(db)?/i, label: 'MongoDB' },
  { regex: /\bredis\b/i, label: 'Redis' },
  { regex: /\bfirebase\b/i, label: 'Firebase' },
  { regex: /\bsupabase\b/i, label: 'Supabase' },
  { regex: /\bprisma\b/i, label: 'Prisma ORM' },
  { regex: /machine\s+learning|aprendizaje\s+autom[aá]tico/i, label: 'Machine Learning' },
  { regex: /deep\s+learning/i, label: 'Deep Learning' },
  { regex: /scikit[\-\s]?learn/i, label: 'Scikit-Learn' },
  { regex: /tensorflow/i, label: 'TensorFlow' },
  { regex: /pytorch/i, label: 'PyTorch' },
  { regex: /\bpandas\b/i, label: 'Pandas' },
  { regex: /\bnumpy\b/i, label: 'NumPy' },
  { regex: /power\s*bi/i, label: 'Power BI' },
  { regex: /\btableau\b/i, label: 'Tableau' },
  { regex: /\blooker\b/i, label: 'Looker' },
  { regex: /an[aá]lisis\s+de\s+datos|data\s+analysis/i, label: 'Análisis de Datos' },
  // Cloud & DevOps
  { regex: /\bgit(hub|lab)?\b/i, label: 'Git / GitHub' },
  { regex: /\bdocker\b/i, label: 'Docker' },
  { regex: /\bkubernetes\b/i, label: 'Kubernetes' },
  { regex: /\blinux\b/i, label: 'Linux' },
  { regex: /\baws\b|amazon\s+web\s+services/i, label: 'AWS' },
  { regex: /\bazure\b/i, label: 'Microsoft Azure' },
  { regex: /google\s+cloud|\bgcp\b/i, label: 'Google Cloud' },
  { regex: /\bci\s*\/\s*cd\b/i, label: 'CI/CD' },
  // Diseño & Multimedia
  { regex: /\bfigma\b/i, label: 'Figma' },
  { regex: /adobe\s+xd/i, label: 'Adobe XD' },
  { regex: /photoshop/i, label: 'Adobe Photoshop' },
  { regex: /illustrator/i, label: 'Adobe Illustrator' },
  { regex: /indesign/i, label: 'Adobe InDesign' },
  { regex: /premiere/i, label: 'Adobe Premiere' },
  { regex: /after\s+effects/i, label: 'After Effects' },
  { regex: /\bcanva\b/i, label: 'Canva' },
  { regex: /\bui\s*\/?\s*ux\b|dise[ñn]o\s+de\s+interfaces|experiencia\s+de\s+usuario/i, label: 'UI/UX' },
  { regex: /dise[ñn]o\s+web/i, label: 'Diseño Web' },
  { regex: /dise[ñn]o\s+gr[aá]fico/i, label: 'Diseño Gráfico' },
  { regex: /autocad/i, label: 'AutoCAD' },
  { regex: /\brevit\b/i, label: 'Revit' },
  // Gestión, Oficina, Negocios & ERP
  { regex: /\bexcel\b/i, label: 'Microsoft Excel' },
  { regex: /microsoft\s+office|paquete\s+office|ofim[aá]tica/i, label: 'Microsoft Office' },
  { regex: /\bsap\b/i, label: 'SAP' },
  { regex: /\bodoo\b/i, label: 'Odoo' },
  { regex: /\bjira\b/i, label: 'Jira' },
  { regex: /\btrello\b/i, label: 'Trello' },
  { regex: /\bnotion\b/i, label: 'Notion' },
  { regex: /\bscrum\b|\bagile\b|metodolog[ií]as\s+[aá]giles/i, label: 'Metodologías Ágiles / Scrum' },
  { regex: /contabilidad/i, label: 'Contabilidad' },
  { regex: /marketing\s+digital/i, label: 'Marketing Digital' },
  { regex: /\bseo\b|\bsem\b/i, label: 'SEO / SEM' },
  { regex: /redes\s+sociales|social\s+media/i, label: 'Redes Sociales' },
  { regex: /ventas|comercial/i, label: 'Ventas' },
  { regex: /atenci[oó]n\s+al\s+cliente|servicio\s+al\s+cliente/i, label: 'Atención al Cliente' },
  { regex: /recursos\s+humanos|reclutamiento|selecci[oó]n\s+de\s+personal/i, label: 'Recursos Humanos' },
  { regex: /log[ií]stica|cadena\s+de\s+suministro/i, label: 'Logística' },
  { regex: /gesti[oó]n\s+de\s+proyectos|project\s+management/i, label: 'Gestión de Proyectos' },
  // Habilidades blandas
  { regex: /trabajo\s+en\s+equipo/i, label: 'Trabajo en equipo' },
  { regex: /liderazgo/i, label: 'Liderazgo' },
  { regex: /comunicaci[oó]n\s+asertiva|comunicaci[oó]n\s+efectiva/i, label: 'Comunicación efectiva' },
  { regex: /resoluci[oó]n\s+de\s+problemas/i, label: 'Resolución de problemas' },
];

function extraerHabilidades(texto: string, seccion: string[]): string[] {
  const resultado = new Set<string>();
  const agregar = (item: string) => {
    const clean = item.trim();
    if (!clean) return;
    const existe = Array.from(resultado).some((r) => r.toLowerCase() === clean.toLowerCase());
    if (!existe) resultado.add(clean);
  };

  for (const item of DICCIONARIO_HABILIDADES) {
    if (item.regex.test(texto)) agregar(item.label);
  }

  // Lo que el candidato escribió literalmente en su sección de habilidades
  for (const linea of seccion) {
    if (!linea || esLineaContacto(linea)) continue;
    // Quitar prefijo tipo "Lenguajes:" o "Herramientas:"
    const sinCategoria = linea.replace(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{2,28}:\s*/, '');
    for (const trozo of sinCategoria.split(/[,;•·|●▪►◦\u2022]|\s{2,}/)) {
      const t = trozo.replace(/^[\s\-–—*•]+|[\s.:]+$/g, '').trim();
      const palabras = t.split(/\s+/).filter(Boolean);
      if (
        t.length >= 2 &&
        t.length <= 38 &&
        palabras.length <= 4 &&
        !/\d{4}/.test(t) &&
        !/^(nivel|b[aá]sico|intermedio|avanzado|nativo|alto|medio|bajo)$/i.test(t)
      ) {
        agregar(t);
      }
    }
  }
  return Array.from(resultado).slice(0, 45);
}

// ─── 4. Título profesional, teléfono y ubicación ──────────────────────────

const PALABRAS_PROFESION =
  /(dise[ñn]ador[a]?|desarrollador[a]?|programador[a]?|analista|ingenier[oa]|administrador[a]?|contador[a]?|abogad[oa]|m[eé]dic[oa]|docente|profesor[a]?|gerente|asistente|auxiliar|t[eé]cnic[oa]|arquitect[oa]|consultor[a]?|especialista|coordinador[a]?|supervisor[a]?|director[a]?|estudiante|licenciad[oa]|secretari[oa]|vendedor[a]?|ejecutiv[oa]|enfermer[oa]|psic[oó]log[oa]|periodista|comunicador[a]?|community\s+manager|cient[ií]fic[oa]\s+de\s+datos|full\s*stack|front[\-\s]?end|back[\-\s]?end|ui\s*\/?\s*ux|developer|designer|engineer|manager|analyst|specialist|consultant|intern|pasante)/i;

function extraerTitulo(cabecera: string[], perfil: string[]): string {
  const candidatas = cabecera.filter((l) => l && !esLineaContacto(l)).slice(0, 14);
  for (const l of candidatas) {
    const clean = l.replace(/^[\s•·\-–—|]+|[\s•·\-–—|]+$/g, '').trim();
    if (clean.length >= 4 && clean.length <= 80 && PALABRAS_PROFESION.test(clean)) {
      return clean;
    }
  }
  // Respaldo: si el perfil inicia con el rol (ej. "Diseñadora Web Junior con experiencia en...")
  const primera = perfil.find((l) => l && !esLineaContacto(l)) || '';
  const m = primera.match(/^([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúÑñ\s\/()&+\-]{4,60}?)(?:\s+(?:con|enfocad[oa]|especializad[oa]|apasionad[oa]|orientad[oa]|comprometid[oa])|[.,])/);
  if (m?.[1] && PALABRAS_PROFESION.test(m[1])) {
    return m[1].trim();
  }
  return '';
}

function extraerTelefono(texto: string): string {
  const m = texto.match(/(?:\+\d{1,3}[\s\-]?)?(?:\(?\d{2,4}\)?[\s\-]?)?\d{3,4}[\s\-]?\d{4}/);
  if (!m) return '';
  const digits = m[0].replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return '';
  return m[0].trim();
}

// ─── 5. Experiencia laboral ───────────────────────────────────────────────

const MESES = '(?:ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|set(?:iembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?';
const RANGO_FECHAS = new RegExp(
  `((?:${MESES}\\s*(?:de\\s*)?)?(?:19|20)\\d{2})\\s*(?:-|–|—|a|al|hasta|to|\\/)\\s*((?:${MESES}\\s*(?:de\\s*)?)?(?:(?:19|20)\\d{2}|presente|actualidad|actual|hoy|present|current))`,
  'i',
);

function extraerExperiencia(lineas: string[]): CvExperiencia[] {
  const limpias = lineas.map((l) => l.trim());
  const textoCompleto = limpias.join(' ');
  if (/sin\s+experiencia\s+(?:laboral|previa)|no\s+poseo\s+experiencia/i.test(textoCompleto)) {
    return [];
  }

  const bloques: string[][] = [];
  let actual: string[] = [];

  for (const l of limpias) {
    if (!l) {
      if (actual.length) {
        bloques.push(actual);
        actual = [];
      }
      continue;
    }
    if (RANGO_FECHAS.test(l) && actual.some((x) => RANGO_FECHAS.test(x))) {
      bloques.push(actual);
      actual = [];
    }
    actual.push(l);
  }
  if (actual.length) bloques.push(actual);

  const resultado: CvExperiencia[] = [];
  for (const bloque of bloques) {
    const texto = bloque.join(' ');
    const m = texto.match(RANGO_FECHAS);
    const period = m ? `${m[1]} - ${m[2]}` : '';
    const sinFecha = bloque
      .map((l) =>
        l
          .replace(RANGO_FECHAS, '')
          .replace(/^[\s|\-–—•·,()]+|[\s|\-–—•·,()]+$/g, '')
          .trim(),
      )
      .filter((l) => Boolean(l) && !esLineaContacto(l));

    if (sinFecha.length === 0) continue;

    let role = sinFecha[0];
    let company = '';
    let descStart = 1;

    if (sinFecha[0].includes('|') || /\s+en\s+|\s+[-–—]\s+/.test(sinFecha[0])) {
      const partes = sinFecha[0].split(/\s*\|\s*|\s+en\s+|\s+[-–—]\s+/);
      role = partes[0].trim();
      company = partes.slice(1).join(' · ').trim();
    } else if (sinFecha[1] && sinFecha[1].length <= 75 && !/^[•·\-*]/.test(bloque[1] || '')) {
      // Si la segunda línea parece el cargo (contiene palabra de profesión) y la primera no, invertimos
      if (!PALABRAS_PROFESION.test(sinFecha[0]) && PALABRAS_PROFESION.test(sinFecha[1])) {
        company = sinFecha[0];
        role = sinFecha[1];
      } else {
        company = sinFecha[1];
      }
      descStart = 2;
    }

    const descripcion = sinFecha
      .slice(descStart)
      .join(' ')
      .replace(/^[•·\-–*]\s*/g, '')
      .slice(0, 600);

    // Filtrar párrafos sueltos que no son un puesto real
    if (!period && !company && role.length > 85) continue;

    resultado.push({
      company: company || '—',
      role: role.slice(0, 100),
      period,
      description: descripcion,
    });
  }
  return resultado.slice(0, 12);
}

// ─── 6. Educación / Formación Académica ───────────────────────────────────

const PALABRAS_TITULO =
  /(licenciatura|ingenier[ií]a|t[eé]cnico|t\.s\.u|tsu|bachiller|maestr[ií]a|mast[eé]r|doctorado|diplomado|certificaci[oó]n|curso|carrera|especializaci[oó]n|grado|bachelor|degree|dise[ñn]o|administraci[oó]n|contadur[ií]a|derecho|medicina|educaci[oó]n|inform[aá]tica|sistemas|computaci[oó]n|mercadeo|marketing|psicolog[ií]a|enfermer[ií]a|arquitectura|econom[ií]a|finanzas|comunicaci[oó]n)/i;
const PALABRAS_INSTITUCION =
  /(universidad|instituto|colegio|academia|escuela|liceo|polit[eé]cnico|facultad|university|college|school|platzi|coursera|udemy|google|meta|microsoft|ibm|aws|urbe|luz|ucv|usb|ucab|unimet|ula|udo|uneg|intec|pucmm|uasd|apec|unphu)/i;

function extraerEducacion(lineas: string[]): CvEducacion[] {
  const resultado: CvEducacion[] = [];
  let actual: CvEducacion | null = null;

  const cerrar = () => {
    if (actual && (actual.degree || actual.institution)) {
      resultado.push({
        institution: actual.institution || '—',
        degree: actual.degree || '—',
        graduationYear: actual.graduationYear,
      });
    }
    actual = null;
  };

  for (const crudo of lineas) {
    const l = crudo.replace(/^[\s•·\-–—*]+/, '').trim();
    if (!l) {
      cerrar();
      continue;
    }
    if (esLineaContacto(l)) continue;

    const anios = l.match(/(?:19|20)\d{2}/g);
    const ultimoAnio = anios ? anios[anios.length - 1] : '';
    const sinAnio = l
      .replace(RANGO_FECHAS, '')
      .replace(/\(\s*(?:19|20)\d{2}\s*\)/g, '')
      .replace(/\b(?:19|20)\d{2}\b/g, '')
      .replace(/^[\s|\-–—,]+|[\s|\-–—,]+$/g, '')
      .trim();

    const esInstitucion = PALABRAS_INSTITUCION.test(sinAnio);
    const esTitulo = PALABRAS_TITULO.test(sinAnio);

    // Caso 1: La misma línea trae TANTO el título como la institución (ej. "Ingeniería en Sistemas | URBE (2024)")
    if (esTitulo && esInstitucion) {
      cerrar();
      const tieneSeparadorFuerte = /\s*\|\s*|\s+[-–—]\s+|\s*,\s*/.test(sinAnio);
      const partes = (tieneSeparadorFuerte
        ? sinAnio.split(/\s*\|\s*|\s+[-–—]\s+|\s*,\s*/)
        : sinAnio.split(/\s+en\s+(?=(?:la\s+|el\s+)?(?:universidad|instituto|colegio|academia|escuela|liceo|polit[eé]cnico|facultad|university|college|school|platzi|coursera|udemy))/i)
      )
        .map((p) => p.trim())
        .filter(Boolean);
      const instPart = partes.find((p) => PALABRAS_INSTITUCION.test(p)) || '';
      const degPart = partes.find((p) => p !== instPart && PALABRAS_TITULO.test(p)) || partes.find((p) => p !== instPart) || sinAnio;
      resultado.push({
        institution: instPart || '—',
        degree: degPart || '—',
        graduationYear: ultimoAnio,
      });
      continue;
    }

    if (esTitulo) {
      if (actual && actual.degree) cerrar();
      actual = actual || { institution: '', degree: '', graduationYear: '' };
      actual.degree = sinAnio || l;
      if (ultimoAnio) actual.graduationYear = ultimoAnio;
    } else if (esInstitucion) {
      if (actual && actual.institution) cerrar();
      actual = actual || { institution: '', degree: '', graduationYear: '' };
      actual.institution = sinAnio || l;
      if (ultimoAnio) actual.graduationYear = ultimoAnio;
    } else if (ultimoAnio && actual) {
      actual.graduationYear = actual.graduationYear || ultimoAnio;
    } else if (!actual && sinAnio.length >= 4 && sinAnio.length <= 95) {
      actual = { institution: '', degree: sinAnio, graduationYear: ultimoAnio };
    }
  }
  cerrar();
  return resultado.slice(0, 12);
}

// ─── 7. Ubicación ─────────────────────────────────────────────────────────

const UBICACIONES_CONOCIDAS: Array<{ regex: RegExp; label: string }> = [
  { regex: /maracaibo/i, label: 'Maracaibo, Zulia, Venezuela' },
  { regex: /caracas/i, label: 'Caracas, Venezuela' },
  { regex: /valencia[,\s]+(?:carabobo|venezuela)/i, label: 'Valencia, Carabobo, Venezuela' },
  { regex: /barquisimeto/i, label: 'Barquisimeto, Lara, Venezuela' },
  { regex: /san\s+crist[oó]bal/i, label: 'San Cristóbal, Táchira, Venezuela' },
  { regex: /puerto\s+ordaz|ciudad\s+guayana/i, label: 'Puerto Ordaz, Bolívar, Venezuela' },
  { regex: /maracay/i, label: 'Maracay, Aragua, Venezuela' },
  { regex: /cabimas/i, label: 'Cabimas, Zulia, Venezuela' },
  { regex: /m[eé]rida/i, label: 'Mérida, Venezuela' },
  { regex: /lecher[ií]a|barcelona|puerto\s+la\s+cruz/i, label: 'Anzoátegui, Venezuela' },
  { regex: /santo\s+domingo/i, label: 'Santo Domingo, República Dominicana' },
  { regex: /santiago\s+de\s+los\s+caballeros/i, label: 'Santiago, República Dominicana' },
  { regex: /bogot[aá]/i, label: 'Bogotá, Colombia' },
  { regex: /medell[ií]n/i, label: 'Medellín, Colombia' },
  { regex: /ciudad\s+de\s+m[eé]xico|cdmx/i, label: 'Ciudad de México, México' },
  { regex: /buenos\s+aires/i, label: 'Buenos Aires, Argentina' },
  { regex: /madrid/i, label: 'Madrid, España' },
  { regex: /barcelona[,\s]+espa[ñn]a/i, label: 'Barcelona, España' },
  { regex: /miami/i, label: 'Miami, Estados Unidos' },
  { regex: /venezuela/i, label: 'Venezuela' },
];

function extraerUbicacion(texto: string): string {
  const explicita = texto.match(
    /(?:ubicaci[oó]n|direcci[oó]n|ciudad|residencia|domicilio|location)\s*[:\-]\s*([^\n•|]{3,70})/i,
  );
  if (explicita?.[1]) return explicita[1].trim();
  for (const loc of UBICACIONES_CONOCIDAS) {
    if (loc.regex.test(texto)) return loc.label;
  }
  return '';
}

// ─── 8. Orquestador principal ─────────────────────────────────────────────

export function estructurarCv(texto: string): CvExtraido {
  const lineas = texto.split('\n').map((l) => l.trim());
  const { cabecera, secciones } = separarSecciones(lineas);

  const bioLineas = secciones.perfil.filter((l) => Boolean(l) && !esLineaContacto(l));
  const bio = bioLineas.join(' ').slice(0, 800);

  return {
    title: extraerTitulo(cabecera, bioLineas),
    bio,
    skills: extraerHabilidades(texto, secciones.habilidades),
    education: extraerEducacion(secciones.educacion),
    experience: extraerExperiencia(secciones.experiencia),
    location: extraerUbicacion(texto),
    phone: extraerTelefono(texto),
    texto,
  };
}

export async function analizarArchivoCv(rutaFisica: string): Promise<CvExtraido> {
  const texto = await extraerTextoDeArchivo(rutaFisica);
  return estructurarCv(texto);
}
