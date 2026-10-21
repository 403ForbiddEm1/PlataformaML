import { ComparisonMetrics } from '@/types';
import { api, USE_MOCK } from './api';
import { mockStore } from './mockData';

export const reportsService = {
  async getComparisonMetrics(): Promise<ComparisonMetrics> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200));
      return mockStore.getComparisonMetrics();
    }
    const response = await api.get<ComparisonMetrics>('/reports/comparison');
    return response.data;
  },
};
