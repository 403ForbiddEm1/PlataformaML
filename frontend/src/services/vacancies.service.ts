import { Vacancy } from '@/types';
import { api, USE_MOCK } from './api';
import { mockStore } from './mockData';

export const vacanciesService = {
  async getAll(): Promise<Vacancy[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200));
      return mockStore.getVacancies();
    }
    const response = await api.get<Vacancy[]>('/vacancies');
    return response.data;
  },

  async getById(id: string): Promise<Vacancy | undefined> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 150));
      return mockStore.getVacancies().find((v) => v.id === id);
    }
    const response = await api.get<Vacancy>(`/vacancies/${id}`);
    return response.data;
  },

  async create(data: Omit<Vacancy, 'id' | 'appliedCount' | 'createdAt'>): Promise<Vacancy> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 350));
      const vacancies = mockStore.getVacancies();
      const newVacancy: Vacancy = {
        ...data,
        id: `vac-${Date.now()}`,
        appliedCount: 0,
        createdAt: new Date().toISOString(),
      };
      vacancies.unshift(newVacancy);
      mockStore.saveVacancies(vacancies);
      return newVacancy;
    }
    const response = await api.post<Vacancy>('/vacancies', data);
    return response.data;
  },

  async update(id: string, updates: Partial<Vacancy>): Promise<Vacancy> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300));
      const vacancies = mockStore.getVacancies();
      const index = vacancies.findIndex((v) => v.id === id);
      if (index === -1) throw new Error('Vacante no encontrada');
      vacancies[index] = { ...vacancies[index], ...updates };
      mockStore.saveVacancies(vacancies);
      return vacancies[index];
    }
    const response = await api.put<Vacancy>(`/vacancies/${id}`, updates);
    return response.data;
  },

  async toggleStatus(id: string): Promise<Vacancy> {
    const vacancy = await this.getById(id);
    if (!vacancy) throw new Error('Vacante no encontrada');
    const newStatus = vacancy.status === 'Abierta' ? 'Cerrada' : 'Abierta';
    return this.update(id, { status: newStatus });
  },
};
