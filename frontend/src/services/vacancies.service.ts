import { Vacancy } from '@/types';
import { api } from './api';

export const vacanciesService = {
  async getAll(): Promise<Vacancy[]> {
    const response = await api.get<Vacancy[]>('/vacancies');
    return response.data;
  },

  async getCompanyVacancies(): Promise<Vacancy[]> {
    const response = await api.get<Vacancy[]>('/vacancies/company');
    return response.data;
  },

  async getById(id: string): Promise<Vacancy | undefined> {
    const response = await api.get<Vacancy>(`/vacancies/${id}`);
    return response.data;
  },

  async create(data: Omit<Vacancy, 'id' | 'appliedCount' | 'createdAt'>): Promise<Vacancy> {
    const response = await api.post<Vacancy>('/vacancies', data);
    return response.data;
  },

  async update(id: string, updates: Partial<Vacancy>): Promise<Vacancy> {
    const response = await api.put<Vacancy>(`/vacancies/${id}`, updates);
    return response.data;
  },

  async updateStatus(id: string, status: Vacancy['status']): Promise<Vacancy> {
    const response = await api.patch<Vacancy>(`/vacancies/${id}/status`, { status });
    return response.data;
  },

  async toggleStatus(id: string): Promise<Vacancy> {
    const vacancy = await this.getById(id);
    if (!vacancy) throw new Error('Vacante no encontrada');
    const newStatus = vacancy.status === 'Abierta' ? 'Cerrada' : 'Abierta';
    return this.updateStatus(id, newStatus);
  },

  async remove(id: string): Promise<Vacancy> {
    const response = await api.delete<Vacancy>(`/vacancies/${id}`);
    return response.data;
  },
};
