import { ComparisonMetrics } from '@/types';
import { api } from './api';

export const reportsService = {
  async getComparisonMetrics(): Promise<ComparisonMetrics> {
    const response = await api.get<ComparisonMetrics>('/reports/comparison');
    return response.data;
  },
};
