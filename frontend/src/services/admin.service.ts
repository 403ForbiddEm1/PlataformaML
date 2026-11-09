import { api } from './api';
import type { CompanyDto } from './company.service';

export interface AdminUserDto {
  id: string;
  correo: string;
  nombre: string;
  apellido: string;
  rol: 'SUPER_ADMIN' | 'ADMIN' | 'RRHH' | 'CANDIDATO';
  activo: boolean;
  correoVerificadoEn: string | null;
  ultimoAccesoEn: string | null;
  creadoEn: string;
  empresa: { id: string; nombre: string; estado: string } | null;
}

export const adminService = {
  async listCompanies(filters?: { estado?: string; inactivas?: boolean }): Promise<CompanyDto[]> {
    const params = new URLSearchParams();
    if (filters?.estado) params.set('estado', filters.estado);
    if (filters?.inactivas) params.set('inactivas', 'true');
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get<CompanyDto[]>(`/admin/companies${qs}`);
    return response.data;
  },

  async approveCompany(companyId: string, activaHasta?: string): Promise<CompanyDto> {
    const response = await api.patch<CompanyDto>(`/admin/companies/${companyId}/approve`, {
      ...(activaHasta ? { activaHasta } : {}),
    });
    return response.data;
  },

  async rejectCompany(companyId: string, motivoRechazo: string): Promise<CompanyDto> {
    const response = await api.patch<CompanyDto>(`/admin/companies/${companyId}/reject`, {
      motivoRechazo,
    });
    return response.data;
  },

  async deactivateCompany(companyId: string, motivoDesactivacion: string): Promise<CompanyDto> {
    const response = await api.patch<CompanyDto>(`/admin/companies/${companyId}/deactivate`, {
      motivoDesactivacion,
    });
    return response.data;
  },

  async activateCompany(companyId: string, activaHasta?: string): Promise<CompanyDto> {
    const response = await api.patch<CompanyDto>(`/admin/companies/${companyId}/activate`, {
      ...(activaHasta ? { activaHasta } : {}),
    });
    return response.data;
  },

  async listUsers(): Promise<AdminUserDto[]> {
    const response = await api.get<AdminUserDto[]>('/admin/users');
    return response.data;
  },
};

