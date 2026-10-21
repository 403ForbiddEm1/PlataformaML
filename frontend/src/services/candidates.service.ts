import { CandidateProfile } from '@/types';
import { api, USE_MOCK } from './api';
import { mockStore } from './mockData';

export const candidatesService = {
  async getProfile(): Promise<CandidateProfile> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200));
      return mockStore.getCandidateProfile();
    }
    const response = await api.get<CandidateProfile>('/candidates/me');
    return response.data;
  },

  async updateProfile(updates: Partial<CandidateProfile>): Promise<CandidateProfile> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300));
      const current = mockStore.getCandidateProfile();
      const updated = { ...current, ...updates };
      mockStore.saveCandidateProfile(updated);
      return updated;
    }
    const response = await api.put<CandidateProfile>('/candidates/me', updates);
    return response.data;
  },
};
