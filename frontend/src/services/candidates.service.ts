import { CandidateProfile } from '@/types';
import { api, API_BASE_URL } from './api';

export interface CandidateDocumentDto {
  id: string;
  type: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export const candidatesService = {
  async getProfile(): Promise<CandidateProfile> {
    const response = await api.get<CandidateProfile>('/candidates/me');
    return response.data;
  },

  async updateProfile(updates: Partial<CandidateProfile> & { cedulaNumero?: string; perfilVisible?: boolean }): Promise<CandidateProfile> {
    const response = await api.put<CandidateProfile>('/candidates/me', updates);
    return response.data;
  },

  async uploadPhoto(photoFile: File): Promise<{ photoUrl: string }> {
    const formData = new FormData();
    formData.append('photo', photoFile);
    const response = await api.upload<{ photoUrl: string }>('/candidates/me/photo', formData);
    return response.data;
  },

  async uploadCv(cvFile: File): Promise<{ cvFileName: string; documentId: string }> {
    const formData = new FormData();
    formData.append('cv', cvFile);
    const response = await api.upload<{ cvFileName: string; documentId: string }>('/candidates/me/cv', formData);
    return response.data;
  },

  async uploadDocument(file: File, tipo: 'CURRICULO' | 'CEDULA' | 'CERTIFICADO' | 'OTRO' = 'OTRO'): Promise<CandidateDocumentDto> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo', tipo);
    const response = await api.upload<CandidateDocumentDto>('/candidates/me/documents', formData);
    return response.data;
  },

  async deleteDocument(documentId: string): Promise<void> {
    await api.delete(`/candidates/me/documents/${documentId}`);
  },

  getDocumentDownloadUrl(documentId: string): string {
    return `${API_BASE_URL}/candidates/documents/${documentId}`;
  },
};
