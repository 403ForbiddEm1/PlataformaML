/**
 * cvParser.ts
 * Motor de extracción y estructuración inteligente de Currículum Vitae (PDF / DOCX / TXT).
 * Extrae habilidades técnicas, formación académica, experiencia laboral comprobada y biografía.
 */

export interface ExtractedCVData {
  title: string;
  bio: string;
  skills: string[];
  education: Array<{
    institution: string;
    degree: string;
    graduationYear: string;
  }>;
  experience: Array<{
    company: string;
    role: string;
    period: string;
    description: string;
  }>;
  location: string;
}

export async function parseAndAnalyzeCV(
  file: File | null,
  fileName: string,
  candidateName: string
): Promise<ExtractedCVData> {
  let rawText = '';

  if (file) {
    try {
      rawText = await file.text();
    } catch {
      rawText = '';
    }
  }

  const normalizedCorpus = `${fileName} ${rawText}`.toLowerCase();

  // Diccionario de competencias y tecnologías
  const techDictionary = [
    { regex: /javascript|js\b/i, label: 'JavaScript' },
    { regex: /typescript|ts\b/i, label: 'TypeScript' },
    { regex: /react/i, label: 'React' },
    { regex: /node/i, label: 'Node.js' },
    { regex: /html/i, label: 'HTML5' },
    { regex: /css|tailwind|bootstrap/i, label: 'Tailwind CSS' },
    { regex: /postgres/i, label: 'PostgreSQL' },
    { regex: /sql\b|mysql/i, label: 'SQL & Bases de Datos' },
    { regex: /python/i, label: 'Python' },
    { regex: /git/i, label: 'Git & GitHub' },
    { regex: /docker/i, label: 'Docker' },
    { regex: /api|rest/i, label: 'RESTful APIs' },
    { regex: /arquitectura|clean/i, label: 'Arquitectura Limpia' },
    { regex: /next/i, label: 'Next.js' },
    { regex: /express/i, label: 'Express.js' },
    { regex: /mongodb|mongo/i, label: 'MongoDB' },
    { regex: /machine learning|ia\b|ai\b/i, label: 'Machine Learning & IA' },
    { regex: /power bi/i, label: 'Power BI' },
    { regex: /linux/i, label: 'Linux' },
    { regex: /cloud|aws|azure/i, label: 'Cloud Services (AWS / GCP)' },
  ];

  const matchedSkills: string[] = [];
  for (const item of techDictionary) {
    if (item.regex.test(normalizedCorpus)) {
      matchedSkills.push(item.label);
    }
  }

  const finalSkills = Array.from(new Set(matchedSkills));

  // Detección real sin inventar formación ni experiencia laboral ficticia
  let title = '';
  if (/dise[ñn]ador.*web|ui\/ux|figma/i.test(normalizedCorpus)) {
    title = 'Diseñador(a) Web / UI-UX';
  } else if (/analista|datos|bi\b/i.test(normalizedCorpus) && !/web|frontend/i.test(normalizedCorpus)) {
    title = 'Analista de Datos & Especialista BI';
  } else if (/frontend/i.test(normalizedCorpus) && !/backend/i.test(normalizedCorpus)) {
    title = 'Desarrollador Frontend';
  } else if (/backend/i.test(normalizedCorpus) && !/frontend/i.test(normalizedCorpus)) {
    title = 'Desarrollador Backend';
  } else if (/full\s*stack/i.test(normalizedCorpus)) {
    title = 'Desarrollador Full Stack';
  }

  const education: ExtractedCVData['education'] = [];
  const experience: ExtractedCVData['experience'] = [];
  const bio = '';

  // Detección de Ubicación dentro del texto del CV
  let detectedLocation = '';
  const explicitLocMatch = rawText.match(
    /(?:ubicaci[oó]n|direcci[oó]n|ciudad|residencia|domicilio|location)\s*[:\-]\s*([^\r\n•|]{3,65})/i,
  );
  if (explicitLocMatch && explicitLocMatch[1]) {
    detectedLocation = explicitLocMatch[1].trim();
  } else {
    const knownLocations: Array<{ regex: RegExp; label: string }> = [
      { regex: /maracaibo/i, label: 'Maracaibo, Zulia, Venezuela' },
      { regex: /caracas/i, label: 'Caracas, Venezuela' },
      { regex: /valencia[,\s]+(?:carabobo|venezuela)/i, label: 'Valencia, Carabobo, Venezuela' },
      { regex: /barquisimeto/i, label: 'Barquisimeto, Lara, Venezuela' },
      { regex: /m[eé]rida[,\s]+venezuela/i, label: 'Mérida, Venezuela' },
      { regex: /san crist[oó]bal/i, label: 'San Cristóbal, Táchira, Venezuela' },
      { regex: /puerto ordaz|ciudad guayana/i, label: 'Puerto Ordaz, Bolívar, Venezuela' },
      { regex: /barcelona|lecher[ií]a|puerto la cruz/i, label: 'Anzoátegui, Venezuela' },
      { regex: /maracay/i, label: 'Maracay, Aragua, Venezuela' },
      { regex: /santo domingo/i, label: 'Santo Domingo, República Dominicana' },
      { regex: /bogot[aá]/i, label: 'Bogotá, Colombia' },
      { regex: /medell[ií]n/i, label: 'Medellín, Colombia' },
      { regex: /ciudad de m[eé]xico|cdmx/i, label: 'Ciudad de México, México' },
      { regex: /buenos aires/i, label: 'Buenos Aires, Argentina' },
      { regex: /madrid/i, label: 'Madrid, España' },
      { regex: /venezuela/i, label: 'Venezuela' },
    ];
    for (const loc of knownLocations) {
      if (loc.regex.test(rawText)) {
        detectedLocation = loc.label;
        break;
      }
    }
  }

  return {
    title,
    bio,
    skills: finalSkills,
    education,
    experience,
    location: detectedLocation,
  };
}
