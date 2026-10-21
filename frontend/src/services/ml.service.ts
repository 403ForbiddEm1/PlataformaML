import { MLModelMetrics } from '@/types';
import { api, USE_MOCK } from './api';
import { mockStore } from './mockData';

export const mlService = {
  async getModelMetrics(): Promise<MLModelMetrics> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200));
      return mockStore.getMLMetrics();
    }
    const response = await api.get<MLModelMetrics>('/ml/metrics');
    return response.data;
  },

  async retrainModel(onProgress?: (progress: number, epoch: number) => void): Promise<MLModelMetrics> {
    if (USE_MOCK) {
      // Simulate live training epochs
      for (let i = 1; i <= 5; i++) {
        await new Promise((r) => setTimeout(r, 500));
        if (onProgress) onProgress(i * 20, i);
      }

      const metrics = mockStore.getMLMetrics();
      const newAccuracy = Math.min(96.5, +(metrics.accuracy + 0.6).toFixed(1));
      const newF1 = Math.min(95.0, +(metrics.f1Score + 0.5).toFixed(1));

      const updated: MLModelMetrics = {
        ...metrics,
        accuracy: newAccuracy,
        f1Score: newF1,
        precision: +(metrics.precision + 0.4).toFixed(1),
        recall: +(metrics.recall + 0.5).toFixed(1),
        datasetSize: metrics.datasetSize + 45,
        lastTrainedAt: new Date().toISOString(),
        version: `v2.${parseInt(metrics.version.split('.')[1] || '4') + 1}.0-prod`,
      };

      mockStore.saveMLMetrics(updated);
      return updated;
    }

    const response = await api.post<MLModelMetrics>('/ml/train');
    return response.data;
  },

  async uploadDataset(file: File): Promise<{ recordsProcessed: number; message: string }> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 700));
      const metrics = mockStore.getMLMetrics();
      metrics.datasetSize += 120;
      mockStore.saveMLMetrics(metrics);
      return {
        recordsProcessed: 120,
        message: `Dataset "${file.name}" cargado y normalizado correctamente (120 registros procesados sin variables sensibles).`,
      };
    }

    const formData = new FormData();
    formData.append('dataset', file);
    const response = await api.upload<{ recordsProcessed: number; message: string }>('/ml/upload-dataset', formData);
    return response.data;
  },
};
