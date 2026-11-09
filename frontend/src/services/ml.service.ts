import { MLFactorBreakdown, MLModelMetrics } from '@/types';
import { api } from './api';

export interface MLPredictRequest {
  vacancy_text: string;
  candidate_text: string;
  candidateSkills?: string[];
  requiredSkills?: string[];
  candidateYears?: number;
  requiredYears?: number;
}

export interface MLPredictResponse {
  score: number;
  recommended: boolean;
  similarity: number;
  experience_ok: boolean | null;
  matched_terms: string[];
  breakdown?: MLFactorBreakdown;
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

export interface MLExtractResponse {
  filename: string;
  characters: number;
  text: string;
}

export const mlService = {
  /**
   * GET /api/ml/health -> verifica estado de ml-service FastAPI
   */
  async checkHealth(): Promise<{ status: string; online: boolean }> {
    const response = await api.get<{ status: string; online: boolean }>('/ml/health');
    return response.data;
  },

  /**
   * POST /api/ml/predict -> conecta con POST /predict de ml-service/app/api/routes.py
   */
  async predict(payload: MLPredictRequest): Promise<MLPredictResponse> {
    const response = await api.post<MLPredictResponse>('/ml/predict', payload);
    return response.data;
  },

  /**
   * POST /api/ml/rank -> conecta con POST /rank de ml-service/app/api/routes.py
   */
  async rankCandidates(vacancyText: string, candidates: MLRankCandidateInput[]): Promise<MLRankResultItem[]> {
    const response = await api.post<{ results: MLRankResultItem[] }>('/ml/rank', {
      vacancy_text: vacancyText,
      candidates,
    });
    return response.data.results;
  },

  /**
   * POST /api/ml/extract -> conecta con POST /extract de ml-service/app/api/routes.py
   */
  async extractResumeText(file: File): Promise<MLExtractResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.upload<MLExtractResponse>('/ml/extract', formData);
    return response.data;
  },

  /**
   * GET /api/ml/metrics -> conecta con GET /metrics de ml-service/app/api/routes.py
   */
  async getModelMetrics(): Promise<MLModelMetrics & { rawMetrics?: any }> {
    const response = await api.get<MLModelMetrics & { rawMetrics?: any }>('/ml/metrics');
    return response.data;
  },

  /**
   * POST /api/ml/train -> conecta con POST /train de ml-service/app/api/routes.py
   */
  async retrainModel(onProgress?: (progress: number, epoch: number) => void): Promise<MLModelMetrics & { rawMetrics?: any }> {
    if (onProgress) onProgress(30, 1);
    const response = await api.post<MLModelMetrics & { rawMetrics?: any }>('/ml/train');
    if (onProgress) onProgress(100, 3);
    return response.data;
  },

  /**
   * POST /api/ml/upload-dataset -> carga CSV de pares vacante/candidato y actualiza ml-service
   */
  async uploadDataset(file: File): Promise<{ recordsProcessed: number; message: string }> {
    const formData = new FormData();
    formData.append('dataset', file);
    const response = await api.upload<{ recordsProcessed: number; message: string }>('/ml/upload-dataset', formData);
    return response.data;
  },
};
