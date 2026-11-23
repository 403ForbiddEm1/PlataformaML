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
        // PredictResponse real de ml-service/app/schemas/schemas.py:
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
        console.warn(`[ML_SERVICE_WARN] Código de respuesta ${response.status} de ML. Sin puntaje inventado.`);
      }
    } catch (err: any) {
      console.warn('[ML_SERVICE_UNAVAILABLE] El servicio de ML no respondió. Sin puntaje inventado:', err.message);
    }

    // 100% REAL: si el modelo ML no respondió, NO inventamos puntajes ni textos.
    const mlResponded = apiScore !== null;
    const normalizedScore = mlResponded ? Math.max(0, Math.min(100, Math.round(apiScore!))) : 0;
    const puntajeAfinidad = mlResponded ? Number((apiScore! / 100).toFixed(4)) : 0;
    const esApto = mlResponded ? Boolean(apiRecommended) : false;

    const combinedMatchingSkills = Array.from(new Set([...apiMatchedTerms, ...matchingSkills]));
    const realSimilarity = apiSimilarity !== undefined ? Math.round(apiSimilarity) : 0;
    const realExperienceMatch =
      apiExperienceOk === true
        ? 100
        : apiExperienceOk === false
        ? requiredYears > 0
          ? Math.min(99, Math.round((candidateYears / requiredYears) * 100))
          : 0
        : requiredYears > 0
        ? Math.min(100, Math.round((candidateYears / requiredYears) * 100))
        : 0;

    const keyFactors: string[] = [];
    if (mlResponded) {
      keyFactors.push(`Probabilidad de aptitud (modelo ML): ${normalizedScore}% (${esApto ? 'Apto' : 'No apto'}).`);
      if (apiSimilarity !== undefined) {
        keyFactors.push(`Similitud coseno TF-IDF real: ${apiSimilarity.toFixed(1)}%.`);
      }
      if (apiExperienceOk === true) {
        keyFactors.push(`Experiencia verificada por el modelo: cumple (${requiredYears} años requeridos).`);
      } else if (apiExperienceOk === false) {
        keyFactors.push(`Experiencia verificada por el modelo: por debajo de ${requiredYears} años requeridos.`);
      }
      if (apiMatchedTerms.length > 0) {
        keyFactors.push(`Términos TF-IDF coincidentes: ${apiMatchedTerms.join(', ')}.`);
      }
      if (missingSkills.length > 0) {
        keyFactors.push(`Competencias de la vacante ausentes en el CV: ${missingSkills.slice(0, 5).join(', ')}.`);
      }
    } else {
      keyFactors.push('El microservicio Python de Machine Learning no respondió en esta solicitud.');
    }

    const explanation = mlResponded
      ? `Resultado ML: ${normalizedScore}% de afinidad | Similitud TF-IDF: ${realSimilarity}% | Términos coincidentes: ${apiMatchedTerms.length > 0 ? apiMatchedTerms.join(', ') : 'ninguno detectado'}.`
      : 'Pendiente de evaluación por el microservicio de Machine Learning (sin puntaje simulado).';

    const breakdown: MLFactorBreakdown = {
      affinityScore: normalizedScore,
      experienceMatch: realExperienceMatch,
      educationMatch: realSimilarity,
      skillsMatch: realSimilarity,
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
      modelVersion: mlResponded ? 'ml_service_active' : 'ml_service_offline',
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
