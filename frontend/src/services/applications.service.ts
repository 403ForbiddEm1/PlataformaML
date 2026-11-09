import { Application, ApplicationStatus } from '@/types';
import { api } from './api';

export interface SubmitApplicationPayload {
  vacancyId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  idCardFile?: File | null;
  cvFile?: File | null;
  respuestasAdicionales?: Record<string, unknown>;
}

export const applicationsService = {
  async getAll(filters?: { vacancyId?: string; status?: ApplicationStatus }): Promise<Application[]> {
    const params = new URLSearchParams();
    if (filters?.vacancyId) params.set('vacancyId', filters.vacancyId);
    if (filters?.status) params.set('status', filters.status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get<Application[]>(`/applications${qs}`);
    return response.data;
  },

  async getMyApplications(): Promise<Application[]> {
    const response = await api.get<Application[]>('/applications/me');
    return response.data;
  },

  async getByCandidateEmail(_email?: string): Promise<Application[]> {
    // El backend identifica al candidato autenticado desde el JWT
    const response = await api.get<Application[]>('/applications');
    return response.data;
  },

  async getByVacancyId(vacancyId: string): Promise<Application[]> {
    const response = await api.get<Application[]>(`/applications?vacancyId=${encodeURIComponent(vacancyId)}`);
    return response.data;
  },

  async getById(id: string): Promise<Application | undefined> {
    const response = await api.get<Application>(`/applications/${id}`);
    return response.data;
  },

  async submitApplication(payload: SubmitApplicationPayload): Promise<Application> {
    const formData = new FormData();
    formData.append('vacancyId', payload.vacancyId);
    if (payload.email) formData.append('email', payload.email);
    if (payload.firstName) formData.append('firstName', payload.firstName);
    if (payload.lastName) formData.append('lastName', payload.lastName);
    if (payload.phone) formData.append('phone', payload.phone);
    if (payload.idCardFile) formData.append('idCard', payload.idCardFile);
    if (payload.cvFile) formData.append('cv', payload.cvFile);
    if (payload.respuestasAdicionales) {
      formData.append('respuestasAdicionales', JSON.stringify(payload.respuestasAdicionales));
    }

    const response = await api.upload<Application>('/applications', formData);
    return response.data;
  },

  async updateStatus(
    id: string,
    newStatus: ApplicationStatus,
    actorName?: string,
    notes?: string,
  ): Promise<Application> {
    const response = await api.patch<Application>(`/applications/${id}/status`, {
      status: newStatus,
      actorName,
      notes,
    });
    return response.data;
  },
};
