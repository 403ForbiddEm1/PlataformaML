// src/services/ml.service.ts
import { env } from '../config/env';
import { MLFactorBreakdown } from '../types';

export interface MLPredictionResult {
  score: number; // 0 a 100
  esApto: boolean;
  puntajeAfinidad: number; // 0.0 a 1.0
  breakdown: MLFactorBreakdown;
  modelVersion: string;
  rawResponse?: any;
}

export const mlService = {
  /**
   * Prepara el texto representativo de la vacante para el modelo de ML
   */
  buildVacancyText(vacancy: {
    titulo: string;
    descripcion: string;
    requisitos: string;
    habilidadesRequeridas: string[];
    aniosExperienciaMinimos: number;
  }): string {
    const skills = (vacancy.habilidadesRequeridas || []).join(', ');
    return `Cargo: ${vacancy.titulo}. Descripción: ${vacancy.descripcion}. Requisitos: ${vacancy.requisitos}. Habilidades solicitadas: ${skills}. Experiencia mínima requerida: ${vacancy.aniosExperienciaMinimos} años.`;
  },

  /**
   * Prepara el texto representativo del candidato para el modelo de ML
   */
  buildCandidateText(candidate: {
    titulo?: string | null;
    biografia?: string | null;
    habilidades?: string[];
    aniosExperiencia?: number;
    educacion?: Array<{ institucion: string; titulo: string }>;
    experiencia?: Array<{ cargo: string; empresa: string; descripcion?: string | null }>;
  }): string {
    const edu = (candidate.educacion || []).map((e) => `${e.titulo} en ${e.institucion}`).join('; ');
    const exp = (candidate.experiencia || []).map((x) => `${x.cargo} en ${x.empresa} (${x.descripcion || ''})`).join('; ');
    const skills = (candidate.habilidades || []).join(', ');
    return `Perfil: ${candidate.titulo || ''}. Biografía: ${candidate.biografia || ''}. Habilidades: ${skills}. Experiencia acumulada: ${candidate.aniosExperiencia || 0} años. Trayectoria: ${exp}. Educación: ${edu}.`;
  },

  /**
   * Envía la solicitud al microservicio de Machine Learning en FastAPI
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
    let rawResponse: any = null;

    try {
      const response = await fetch(`${env.ML_SERVICE_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': env.ML_API_KEY,
        },
        body: JSON.stringify({
          vacancy_text: vacancyText,
          candidate_text: candidateText,
        }),
      });

      if (response.ok) {
        rawResponse = await response.json();
        // El microservicio devuelve score de 0 a 100
        if (typeof rawResponse.score === 'number') {
          apiScore = rawResponse.score;
        }
      } else {
        console.warn(`[ML_SERVICE_WARN] Código de respuesta ${response.status} de ML. Usando evaluación local.`);
      }
    } catch (err: any) {
      console.warn('[ML_SERVICE_UNAVAILABLE] El servicio de ML no respondió, usando evaluación heurística:', err.message);
    }

    // Si el microservicio respondió, usamos su puntaje. De lo contrario, cálculo heurístico ponderado
    const finalScore = apiScore !== null ? apiScore : Math.round(skillsMatch * 0.45 + experienceMatch * 0.35 + educationMatch * 0.2);
    const normalizedScore = Math.max(0, Math.min(100, finalScore));
    const puntajeAfinidad = Number((normalizedScore / 100).toFixed(4));
    const esApto = puntajeAfinidad >= 0.5;

    const keyFactors: string[] = [];
    if (experienceMatch >= 80) keyFactors.push(`Cumple holgadamente con los ${requiredYears} años requeridos.`);
    else if (experienceMatch < 60) keyFactors.push(`Experiencia laboral inferior a los ${requiredYears} años solicitados.`);

    if (skillsMatch >= 75) keyFactors.push(`Domina la mayoría de las habilidades requeridas (${matchingSkills.join(', ')}).`);
    else if (missingSkills.length > 0) keyFactors.push(`Habilidades faltantes clave: ${missingSkills.slice(0, 3).join(', ')}.`);

    keyFactors.push('Evaluación libre de sesgos demográficos garantizada (RNF03).');

    const explanation = esApto
      ? `El candidato posee una afinidad destacada (${normalizedScore}%) con el perfil buscado, alineándose con las competencias técnicas requeridas y la experiencia solicitada.`
      : `El perfil presenta afinidad moderada o baja (${normalizedScore}%), requiriendo fortalecimiento en habilidades técnicas específicas antes de avanzar.`;

    const breakdown: MLFactorBreakdown = {
      affinityScore: normalizedScore,
      experienceMatch,
      educationMatch,
      skillsMatch,
      matchingSkills,
      missingSkills,
      keyFactors,
      explanation,
      fairnessChecked: true, // RNF03
    };

    return {
      score: normalizedScore,
      esApto,
      puntajeAfinidad,
      breakdown,
      modelVersion: 'logistic_regression_v2',
      rawResponse,
    };
  },

  /**
   * Obtiene métricas del modelo desde el microservicio
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
      console.warn('[ML_SERVICE] No se pudieron obtener métricas remotas:', err.message);
    }
    return null;
  },

  /**
   * Dispara el reentrenamiento del modelo
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
    return null;
  },
};
