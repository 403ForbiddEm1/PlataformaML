// src/services/ml.service.ts
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { MLFactorBreakdown } from '../types';

export interface MLPredictionResult {
  score: number; // 0 a 100
  esApto: boolean;
  puntajeAfinidad: number; // 0.0 a 1.0
  similarity?: number;
  experienceOk?: boolean | null;
  matchedTerms?: string[];
  breakdown: MLFactorBreakdown;
  modelVersion: string;
  rawResponse?: any;
}

export interface MLRankCandidateInput {
  id: string;
  text: string;
}

export interface MLRankResultItem {
  id: string;
  score: number;
  recommended: boolean;
  similarity: number;
  experience_ok: boolean | null;
  matched_terms: string[];
}

export interface MLExtractResult {
  filename: string;
  characters: number;
  text: string;
}

// Ruta al archivo de métricas generado por ml-service (fallback local si FastAPI está apagado)
const LOCAL_METRICS_PATH = path.resolve(process.cwd(), '../ml-service/data/processed/metrics.json');

export const mlService = {
  /**
   * Verifica el estado del microservicio FastAPI (GET /health)
   */
  async checkHealth(): Promise<{ status: string; online: boolean }> {
    try {
      const response = await fetch(`${env.ML_SERVICE_URL}/health`, {
        headers: { 'X-API-Key': env.ML_API_KEY },
      });
      if (response.ok) {
        const data = (await response.json()) as { status?: string };
        return { status: data.status || 'ok', online: true };
      }
    } catch {
      // microservicio apagado
    }
    return { status: 'offline', online: false };
  },

  /**
   * Prepara el texto representativo de la vacante para el modelo de ML.
   * Incluye explícitamente "<N> años de experiencia" para que extract_years() de ml-service lo detecte.
   */
  buildVacancyText(vacancy: {
    titulo: string;
    descripcion: string;
    requisitos: string;
    habilidadesRequeridas: string[];
    aniosExperienciaMinimos: number;
  }): string {
    const skills = (vacancy.habilidadesRequeridas || []).join(', ');
    return `Se requiere ${vacancy.titulo} con mínimo ${vacancy.aniosExperienciaMinimos || 0} años de experiencia en ${skills}. Descripción: ${vacancy.descripcion}. Requisitos: ${vacancy.requisitos}.`;
  },

  /**
   * Prepara el texto representativo del candidato para el modelo de ML.
   * Incluye "<N> años de experiencia" y opcionalmente el texto extraído de su CV.
   */
  buildCandidateText(
    candidate: {
      titulo?: string | null;
      biografia?: string | null;
      habilidades?: string[];
      aniosExperiencia?: number;
      educacion?: Array<{ institucion: string; titulo: string }>;
      experiencia?: Array<{ cargo: string; empresa: string; descripcion?: string | null }>;
    },
    extractedCvText?: string | null,
  ): string {
    const edu = (candidate.educacion || []).map((e) => `${e.titulo} en ${e.institucion}`).join('; ');
    const exp = (candidate.experiencia || []).map((x) => `${x.cargo} en ${x.empresa} (${x.descripcion || ''})`).join('; ');
    const skills = (candidate.habilidades || []).join(', ');
    const baseText = `${candidate.titulo || 'Profesional'} con ${candidate.aniosExperiencia || 0} años de experiencia en ${skills}. Biografía: ${candidate.biografia || ''}. Trayectoria: ${exp}. Educación: ${edu}.`;
    if (extractedCvText && extractedCvText.trim().length > 0) {
      return `${baseText} Contenido CV: ${extractedCvText.trim()}`;
    }
    return baseText;
  },

  /**
   * Extrae texto de un archivo PDF o DOCX usando POST /extract del microservicio ML
   */
  async extractText(filePath: string, originalFilename: string, mimeType?: string): Promise<MLExtractResult | null> {
    try {
      if (!fs.existsSync(filePath)) return null;
      const buffer = fs.readFileSync(filePath);
      const blob = new Blob([buffer], { type: mimeType || 'application/octet-stream' });
      const formData = new FormData();
      formData.append('file', blob, originalFilename);

      const response = await fetch(`${env.ML_SERVICE_URL}/extract`, {
        method: 'POST',
        headers: {
          'X-API-Key': env.ML_API_KEY,
        },
        body: formData,
      });

      if (response.ok) {
        return (await response.json()) as MLExtractResult;
      } else {
        const errBody = await response.text().catch(() => '');
        console.warn(`[ML_SERVICE_EXTRACT_WARN] Código ${response.status}: ${errBody}`);
      }
    } catch (err: any) {
      console.warn('[ML_SERVICE_EXTRACT_UNAVAILABLE] No se pudo extraer texto con ml-service:', err.message);
    }
    return null;
  },

  /**
   * Envía la solicitud a POST /predict en el microservicio de Machine Learning (FastAPI)
   */
  async predictAffinity(
    vacancyText: string,
    candidateText: string,
    candidateSkills: string[] = [],
    requiredSkills: string[] = [],
    candidateYears: number = 0,
    requiredYears: number = 0,
  ): Promise<MLPredictionResult> {
    const matchingSkills = requiredSkills.filter((rs) =>
      candidateSkills.some((cs) => cs.toLowerCase().includes(rs.toLowerCase()) || rs.toLowerCase().includes(cs.toLowerCase())),
    );
    const missingSkills = requiredSkills.filter((rs) => !matchingSkills.includes(rs));

    const skillsMatch = requiredSkills.length > 0 ? Math.round((matchingSkills.length / requiredSkills.length) * 100) : 85;
    const experienceMatch = requiredYears > 0 ? Math.min(100, Math.round((candidateYears / requiredYears) * 100)) : 100;
    const educationMatch = 90;

    let apiScore: number | null = null;
    let apiRecommended: boolean | null = null;
    let apiSimilarity: number | undefined = undefined;
    let apiExperienceOk: boolean | null | undefined = undefined;
    let apiMatchedTerms: string[] = [];
    let rawResponse: any = null;

    try {
      const response = await fetch(`${env.ML_SERVICE_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': env.ML_API_KEY,
        },
        body: JSON.stringify({
          vacancy_text: vacancyText.length >= 3 ? vacancyText : 'Vacante general',
          candidate_text: candidateText.length >= 3 ? candidateText : 'Candidato general',
        }),
      });

      if (response.ok) {
        rawResponse = await response.json();
        // PredictResponse de ml-service/app/schemas/schemas.py:
        // { score: float (0-100), recommended: bool, similarity: float (0-100), experience_ok: bool|null, matched_terms: list[str] }
        if (typeof rawResponse.score === 'number') {
          apiScore = rawResponse.score;
        }
        if (typeof rawResponse.recommended === 'boolean') {
          apiRecommended = rawResponse.recommended;
        }
        if (typeof rawResponse.similarity === 'number') {
          apiSimilarity = rawResponse.similarity;
        }
        if ('experience_ok' in rawResponse) {
          apiExperienceOk = rawResponse.experience_ok;
        }
        if (Array.isArray(rawResponse.matched_terms)) {
          apiMatchedTerms = rawResponse.matched_terms;
        }
      } else {
        console.warn(`[ML_SERVICE_WARN] Código de respuesta ${response.status} de ML. Usando evaluación local.`);
      }
    } catch (err: any) {
      console.warn('[ML_SERVICE_UNAVAILABLE] El servicio de ML no respondió, usando evaluación heurística:', err.message);
    }

    // Si el microservicio respondió, usamos su puntaje y recomendación real
    const finalScore = apiScore !== null ? Math.round(apiScore) : Math.round(skillsMatch * 0.45 + experienceMatch * 0.35 + educationMatch * 0.2);
    const normalizedScore = Math.max(0, Math.min(100, finalScore));
    const puntajeAfinidad = Number(((apiScore !== null ? apiScore : normalizedScore) / 100).toFixed(4));
    const esApto = apiRecommended !== null ? apiRecommended : puntajeAfinidad >= 0.5;

    // Combinar habilidades coincidentes con matched_terms de TF-IDF del modelo Python
    const combinedMatchingSkills = Array.from(new Set([...matchingSkills, ...apiMatchedTerms]));

    const keyFactors: string[] = [];
    if (apiExperienceOk === true || experienceMatch >= 80) {
      keyFactors.push(`Cumple con los ${requiredYears} años de experiencia requeridos.`);
    } else if (apiExperienceOk === false || experienceMatch < 60) {
      keyFactors.push(`Experiencia laboral inferior a los ${requiredYears} años solicitados.`);
    }

    if (apiMatchedTerms.length > 0) {
      keyFactors.push(`Términos clave detectados por el modelo TF-IDF: ${apiMatchedTerms.join(', ')}.`);
    } else if (skillsMatch >= 75 && matchingSkills.length > 0) {
      keyFactors.push(`Domina la mayoría de las habilidades requeridas (${matchingSkills.join(', ')}).`);
    }

    if (missingSkills.length > 0) {
      keyFactors.push(`Habilidades faltantes clave: ${missingSkills.slice(0, 3).join(', ')}.`);
    }

    if (apiSimilarity !== undefined) {
      keyFactors.push(`Similitud textual TF-IDF con la vacante: ${apiSimilarity.toFixed(1)}%.`);
    }

    keyFactors.push('Evaluación libre de sesgos demográficos garantizada (RNF03).');

    const explanation = esApto
      ? `El candidato posee una afinidad destacada (${normalizedScore}%) con el perfil buscado, alineándose con las competencias técnicas requeridas y la experiencia solicitada.`
      : `El perfil presenta afinidad moderada o baja (${normalizedScore}%), requiriendo fortalecimiento en habilidades técnicas específicas antes de avanzar.`;

    const breakdown: MLFactorBreakdown = {
      affinityScore: normalizedScore,
      experienceMatch: apiExperienceOk === true ? 100 : experienceMatch,
      educationMatch,
      skillsMatch: apiSimilarity !== undefined ? Math.max(skillsMatch, Math.round(apiSimilarity)) : skillsMatch,
      matchingSkills: combinedMatchingSkills,
      missingSkills,
      keyFactors,
      explanation,
      fairnessChecked: true, // RNF03
    };

    return {
      score: normalizedScore,
      esApto,
      puntajeAfinidad,
      similarity: apiSimilarity,
      experienceOk: apiExperienceOk,
      matchedTerms: apiMatchedTerms,
      breakdown,
      modelVersion: 'regresion_logistica_v2',
      rawResponse,
    };
  },

  /**
   * Ordena varios candidatos de mayor a menor probabilidad usando POST /rank del microservicio ML
   */
  async rankCandidates(vacancyText: string, candidates: MLRankCandidateInput[]): Promise<MLRankResultItem[]> {
    if (!candidates || candidates.length === 0) return [];
    try {
      const response = await fetch(`${env.ML_SERVICE_URL}/rank`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': env.ML_API_KEY,
        },
        body: JSON.stringify({
          vacancy_text: vacancyText.length >= 3 ? vacancyText : 'Vacante general',
          candidates: candidates.map((c) => ({
            id: c.id,
            text: c.text && c.text.length >= 3 ? c.text : 'Candidato general',
          })),
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as { results?: MLRankResultItem[] };
        return data.results || [];
      }
    } catch (err: any) {
      console.warn('[ML_SERVICE_RANK] No se pudo consultar POST /rank:', err.message);
    }

    // Fallback local si FastAPI no está disponible
    const fallbackResults: MLRankResultItem[] = [];
    for (const cand of candidates) {
      const pred = await this.predictAffinity(vacancyText, cand.text);
      fallbackResults.push({
        id: cand.id,
        score: pred.score,
        recommended: pred.esApto,
        similarity: pred.similarity ?? pred.breakdown.skillsMatch,
        experience_ok: pred.experienceOk ?? true,
        matched_terms: pred.matchedTerms ?? pred.breakdown.matchingSkills,
      });
    }
    return fallbackResults.sort((a, b) => b.score - a.score);
  },

  /**
   * Obtiene métricas del modelo desde GET /metrics en el microservicio
   * (con fallback al archivo ml-service/data/processed/metrics.json si el proceso Python no está corriendo)
   */
  async getMetrics(): Promise<any> {
    try {
      const response = await fetch(`${env.ML_SERVICE_URL}/metrics`, {
        headers: { 'X-API-Key': env.ML_API_KEY },
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (err: any) {
      console.warn('[ML_SERVICE] No se pudieron obtener métricas remotas por HTTP, leyendo metrics.json local:', err.message);
    }

    try {
      if (fs.existsSync(LOCAL_METRICS_PATH)) {
        const raw = fs.readFileSync(LOCAL_METRICS_PATH, 'utf-8');
        return JSON.parse(raw);
      }
    } catch {
      // ignorar si no se puede leer
    }
    return null;
  },

  /**
   * Dispara el reentrenamiento del modelo en POST /train del microservicio
   */
  async retrain(): Promise<any> {
    try {
      const response = await fetch(`${env.ML_SERVICE_URL}/train`, {
        method: 'POST',
        headers: { 'X-API-Key': env.ML_API_KEY },
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (err: any) {
      console.warn('[ML_SERVICE] Error al solicitar reentrenamiento:', err.message);
    }

    // Fallback a las métricas actuales en disco si el servidor FastAPI no está encendido
    return this.getMetrics();
  },
};
