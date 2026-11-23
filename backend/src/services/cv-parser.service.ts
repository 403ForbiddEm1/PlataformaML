// src/services/cv-parser.service.ts
// Lectura REAL del currículum (PDF / DOCX / DOC): extrae el texto del archivo y lo estructura.
// Regla: nunca se inventan datos. Si algo no se encuentra en el CV, queda vacío.
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
  texto: string;
}

// ─── Extracción de texto ──────────────────────────────────────────────────

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
      // .doc antiguo (binario OLE2): se rescatan las cadenas de texto legibles
      const buffer = await fs.promises.readFile(rutaFisica);
      const crudo = buffer.toString('latin1');
      const trozos = crudo.match(/[A-Za-zÁÉÍÓÚáéíóúÑñÜü0-9@.,:;()\-\/%&+ ]{6,}/g) || [];
      textoLocal = normalizarTexto(trozos.join('\n'));
    }
  } catch (err: any) {
    console.warn('[CV_PARSER] Lectura local falló, intentando extractor Python ML:', err?.message);
  }

  // Respaldo real con el extractor del microservicio Python (pypdf / python-docx) si el texto local salió vacío o muy corto
  if (textoLocal.length < 30 && (ext === '.pdf' || ext === '.docx')) {
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
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── Estructuración ───────────────────────────────────────────────────────

type Seccion = 'perfil' | 'educacion' | 'experiencia' | 'habilidades' | 'otra';

const ENCABEZADOS: Array<{ seccion: Seccion; regex: RegExp }> = [
  { seccion: 'perfil', regex: /^(perfil( profesional| personal)?|resumen( profesional)?|sobre m[ií]|acerca de m[ií]|objetivo( profesional)?|presentaci[oó]n|summary|profile|about me)$/i },
  { seccion: 'educacion', regex: /^(educaci[oó]n|formaci[oó]n( acad[eé]mica)?|estudios( realizados)?|datos acad[eé]micos|acad[eé]mic[oa]s?|education)$/i },
  { seccion: 'experiencia', regex: /^(experiencia( laboral| profesional)?|historial laboral|trayectoria( profesional| laboral)?|empleos?|work experience|experience)$/i },
  { seccion: 'habilidades', regex: /^(habilidades( t[eé]cnicas| blandas)?|competencias( t[eé]cnicas)?|conocimientos( t[eé]cnicos)?|tecnolog[ií]as|herramientas|skills|aptitudes|destrezas)$/i },
  { seccion: 'otra', regex: /^(idiomas|referencias|proyectos|cursos|certificaciones|contacto|datos personales|intereses|logros|voluntariado|hobbies|languages|projects|certifications|publicaciones|informaci[oó]n adicional)$/i },
];

function detectarEncabezado(linea: string): Seccion | null {
  const limpia = linea.replace(/[:\-–—•|_*#]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!limpia || limpia.length > 42) return null;
  for (const e of ENCABEZADOS) {
    if (e.regex.test(limpia)) return e.seccion;
  }
  return null;
}

function separarSecciones(lineas: string[]): { cabecera: string[]; secciones: Record<Seccion, string[]> } {
  const secciones: Record<Seccion, string[]> = { perfil: [], educacion: [], experiencia: [], habilidades: [], otra: [] };
  const cabecera: string[] = [];
  let actual: Seccion | null = null;
  for (const linea of lineas) {
    const enc = detectarEncabezado(linea);
    if (enc) {
      actual = enc;
      continue;
    }
    if (actual) secciones[actual].push(linea);
    else cabecera.push(linea);
  }
  return { cabecera, secciones };
}

const DICCIONARIO_HABILIDADES: Array<{ regex: RegExp; label: string }> = [
  { regex: /javascript/i, label: 'JavaScript' },
  { regex: /typescript/i, label: 'TypeScript' },
  { regex: /\breact(\.js|js)?\b/i, label: 'React' },
  { regex: /\bnode(\.js|js)?\b/i, label: 'Node.js' },
  { regex: /\bhtml5?\b/i, label: 'HTML5' },
  { regex: /\bcss3?\b/i, label: 'CSS3' },
  { regex: /tailwind/i, label: 'Tailwind CSS' },
  { regex: /bootstrap/i, label: 'Bootstrap' },
  { regex: /postgres/i, label: 'PostgreSQL' },
  { regex: /\bmysql\b/i, label: 'MySQL' },
  { regex: /\bsql\b/i, label: 'SQL' },
  { regex: /\bpython\b/i, label: 'Python' },
  { regex: /\bjava\b/i, label: 'Java' },
  { regex: /\bc#|\.net\b/i, label: 'C# / .NET' },
  { regex: /\bphp\b/i, label: 'PHP' },
  { regex: /\bgit(hub)?\b/i, label: 'Git / GitHub' },
  { regex: /docker/i, label: 'Docker' },
  { regex: /\bnext\.?js\b/i, label: 'Next.js' },
  { regex: /express/i, label: 'Express.js' },
  { regex: /mongo/i, label: 'MongoDB' },
  { regex: /machine learning|aprendizaje autom[aá]tico/i, label: 'Machine Learning' },
  { regex: /power ?bi/i, label: 'Power BI' },
  { regex: /\bexcel\b/i, label: 'Excel' },
  { regex: /\blinux\b/i, label: 'Linux' },
  { regex: /\baws\b|azure|google cloud/i, label: 'Cloud (AWS / Azure / GCP)' },
  { regex: /figma/i, label: 'Figma' },
  { regex: /adobe xd/i, label: 'Adobe XD' },
  { regex: /photoshop/i, label: 'Photoshop' },
  { regex: /illustrator/i, label: 'Illustrator' },
  { regex: /wordpress/i, label: 'WordPress' },
  { regex: /\bui\s*\/?\s*ux\b|dise[ñn]o de interfaces|experiencia de usuario/i, label: 'UI/UX' },
  { regex: /scrum|agile|[aá]gil/i, label: 'Metodologías ágiles' },
  { regex: /atenci[oó]n al cliente/i, label: 'Atención al cliente' },
  { regex: /trabajo en equipo/i, label: 'Trabajo en equipo' },
  { regex: /liderazgo/i, label: 'Liderazgo' },
  { regex: /contabilidad/i, label: 'Contabilidad' },
  { regex: /marketing/i, label: 'Marketing' },
  { regex: /ventas/i, label: 'Ventas' },
];

function extraerHabilidades(texto: string, seccion: string[]): string[] {
  const resultado = new Set<string>();

  for (const item of DICCIONARIO_HABILIDADES) {
    if (item.regex.test(texto)) resultado.add(item.label);
  }

  // Lo que el candidato escribió literalmente en su sección de habilidades
  for (const linea of seccion) {
    for (const trozo of linea.split(/[,;•·|●▪►◦\u2022\/]|\s{2,}/)) {
      const t = trozo.replace(/^[\s\-–—*•]+|[\s.]+$/g, '').trim();
      if (t.length >= 2 && t.length <= 40 && !/\d{4}/.test(t) && t.split(' ').length <= 5) {
        const ya = Array.from(resultado).some((r) => r.toLowerCase() === t.toLowerCase());
        if (!ya) resultado.add(t);
      }
    }
  }
  return Array.from(resultado).slice(0, 40);
}

const PALABRAS_PROFESION =
  /(dise[ñn]ador|desarrollador|programador|analista|ingenier[oa]|administrador|contador|abogad[oa]|m[eé]dic[oa]|docente|profesor|gerente|asistente|t[eé]cnico|arquitect[oa]|consultor|especialista|coordinador|estudiante|licenciad[oa]|secretari[oa]|vendedor|enfermer[oa]|developer|designer|engineer|manager|analyst)/i;

function extraerTitulo(cabecera: string[]): string {
  const candidatas = cabecera.slice(0, 14);
  for (const l of candidatas) {
    if (l.length <= 70 && PALABRAS_PROFESION.test(l) && !/@|\d{6,}/.test(l)) return l.trim();
  }
  return '';
}

const MESES = '(?:ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic|jan|apr|aug|dec)[a-z]*\\.?';
const RANGO_FECHAS = new RegExp(
  `((?:${MESES}\\s*(?:de\\s*)?)?(?:19|20)\\d{2})\\s*(?:-|–|—|a|al|hasta|to)\\s*((?:${MESES}\\s*(?:de\\s*)?)?(?:(?:19|20)\\d{2}|presente|actualidad|actual|hoy|present|current))`,
  'i',
);

function extraerExperiencia(lineas: string[]): CvExperiencia[] {
  const bloques: string[][] = [];
  let actual: string[] = [];
  for (const l of lineas) {
    if (!l.trim()) {
      if (actual.length) {
        bloques.push(actual);
        actual = [];
      }
      continue;
    }
    // Una línea con rango de fechas inicia un nuevo puesto si el bloque actual ya tiene uno
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
      .map((l) => l.replace(RANGO_FECHAS, '').replace(/^[\s|\-–—•·,()]+|[\s|\-–—•·,()]+$/g, '').trim())
      .filter(Boolean);
    if (sinFecha.length === 0) continue;

    let role = sinFecha[0];
    let company = '';
    if (sinFecha[0].includes('|') || / en | - | – /.test(sinFecha[0])) {
      const partes = sinFecha[0].split(/\s*\|\s*|\s+en\s+|\s+[-–]\s+/);
      role = partes[0];
      company = partes.slice(1).join(' · ');
    } else if (sinFecha[1] && sinFecha[1].length <= 70) {
      company = sinFecha[1];
    }
    const descripcion = sinFecha
      .slice(company && !sinFecha[0].includes('|') && sinFecha[1] === company ? 2 : 1)
      .join(' ')
      .replace(/^[•·\-–]\s*/g, '')
      .slice(0, 500);

    if (role.length > 90 && !period) continue; // párrafo suelto, no un puesto
    resultado.push({ company: company || '—', role: role.slice(0, 90), period, description: descripcion });
  }
  return resultado.slice(0, 12);
}

const PALABRAS_TITULO =
  /(licenciatura|ingenier[ií]a|t[eé]cnico|t\.s\.u|tsu|bachiller|maestr[ií]a|mast[eé]r|doctorado|diplomado|certificaci[oó]n|curso|carrera|especializaci[oó]n|grado|bachelor|degree|dise[ñn]o|administraci[oó]n|contadur[ií]a|derecho|medicina|educaci[oó]n)/i;
const PALABRAS_INSTITUCION = /(universidad|instituto|colegio|academia|escuela|liceo|politécnico|politecnico|facultad|university|college|school)/i;

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
    const anio = l.match(/(?:19|20)\d{2}/g);
    const ultimoAnio = anio ? anio[anio.length - 1] : '';
    const sinAnio = l.replace(RANGO_FECHAS, '').replace(/\b(?:19|20)\d{2}\b/g, '').replace(/[|()\-–—,\s]+$/g, '').trim();

    const esInstitucion = PALABRAS_INSTITUCION.test(l);
    const esTitulo = PALABRAS_TITULO.test(l);

    if (esTitulo && !esInstitucion) {
      if (actual && (actual as CvEducacion).degree) cerrar();
      actual = actual || { institution: '', degree: '', graduationYear: '' };
      (actual as CvEducacion).degree = sinAnio || l;
      if (ultimoAnio) (actual as CvEducacion).graduationYear = ultimoAnio;
    } else if (esInstitucion) {
      if (actual && (actual as CvEducacion).institution) cerrar();
      actual = actual || { institution: '', degree: '', graduationYear: '' };
      (actual as CvEducacion).institution = sinAnio || l;
      if (ultimoAnio) (actual as CvEducacion).graduationYear = ultimoAnio;
    } else if (ultimoAnio && actual) {
      (actual as CvEducacion).graduationYear = (actual as CvEducacion).graduationYear || ultimoAnio;
    } else if (!actual && sinAnio.length <= 90) {
      actual = { institution: '', degree: sinAnio, graduationYear: ultimoAnio };
    }
  }
  cerrar();
  return resultado.slice(0, 10);
}

const UBICACIONES_CONOCIDAS: Array<{ regex: RegExp; label: string }> = [
  { regex: /maracaibo/i, label: 'Maracaibo, Zulia, Venezuela' },
  { regex: /caracas/i, label: 'Caracas, Venezuela' },
  { regex: /valencia[,\s]+(?:carabobo|venezuela)/i, label: 'Valencia, Carabobo, Venezuela' },
  { regex: /barquisimeto/i, label: 'Barquisimeto, Lara, Venezuela' },
  { regex: /san crist[oó]bal/i, label: 'San Cristóbal, Táchira, Venezuela' },
  { regex: /puerto ordaz|ciudad guayana/i, label: 'Puerto Ordaz, Bolívar, Venezuela' },
  { regex: /maracay/i, label: 'Maracay, Aragua, Venezuela' },
  { regex: /cabimas/i, label: 'Cabimas, Zulia, Venezuela' },
  { regex: /santo domingo/i, label: 'Santo Domingo, República Dominicana' },
  { regex: /bogot[aá]/i, label: 'Bogotá, Colombia' },
  { regex: /medell[ií]n/i, label: 'Medellín, Colombia' },
  { regex: /ciudad de m[eé]xico|cdmx/i, label: 'Ciudad de México, México' },
  { regex: /buenos aires/i, label: 'Buenos Aires, Argentina' },
  { regex: /madrid/i, label: 'Madrid, España' },
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

export function estructurarCv(texto: string): CvExtraido {
  const lineas = texto.split('\n').map((l) => l.trim());
  const { cabecera, secciones } = separarSecciones(lineas);

  const bio = secciones.perfil.filter(Boolean).join(' ').slice(0, 700);

  return {
    title: extraerTitulo(cabecera),
    bio,
    skills: extraerHabilidades(texto, secciones.habilidades),
    education: extraerEducacion(secciones.educacion),
    experience: extraerExperiencia(secciones.experiencia),
    location: extraerUbicacion(texto),
    texto,
  };
}

export async function analizarArchivoCv(rutaFisica: string): Promise<CvExtraido> {
  const texto = await extraerTextoDeArchivo(rutaFisica);
  return estructurarCv(texto);
}
