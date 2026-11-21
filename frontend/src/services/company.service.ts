import { api } from './api';

export interface CompanyDto {
  id: string;
  nombre: string;
  razonSocial: string | null;
  identificacionFiscal: string | null;
  sector: string | null;
  sitioWeb: string | null;
  urlLogo: string | null;
  descripcion: string | null;
  correoContacto: string;
  telefonoContacto: string | null;
  estado: 'PENDIENTE_APROBACION' | 'ACTIVA' | 'RECHAZADA' | 'SUSPENDIDA';
  activaHasta: string | null;
  ultimaVacanteEn: string | null;
  creadoEn: string;
}

export interface CompanyMemberDto {
  id: string;
  correo: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  rol: 'ADMIN' | 'RRHH';
  activo: boolean;
  ultimoAccesoEn: string | null;
  creadoEn: string;
}

export interface CompanyInvitationDto {
  id: string;
  correo: string;
  rol: 'ADMIN' | 'RRHH';
  expiraEn: string;
  creadoEn: string;
}

export const companyService = {
  async getMyCompany(): Promise<CompanyDto> {
    const response = await api.get<CompanyDto>('/company');
    return response.data;
  },

  async updateMyCompany(updates: Partial<CompanyDto>): Promise<CompanyDto> {
    const response = await api.put<CompanyDto>('/company', updates);
    return response.data;
  },

  async getMembers(): Promise<{ miembros: CompanyMemberDto[]; invitacionesPendientes: CompanyInvitationDto[] }> {
    const response = await api.get<{ miembros: CompanyMemberDto[]; invitacionesPendientes: CompanyInvitationDto[] }>(
      '/company/members',
    );
    return response.data;
  },

  async inviteMember(correo: string, rol: 'ADMIN' | 'RRHH' = 'RRHH'): Promise<{ mensaje: string }> {
    const response = await api.post<{ mensaje: string }>('/company/invitations', { correo, rol });
    return response.data;
  },

  async toggleMemberStatus(memberId: string, activo: boolean): Promise<CompanyMemberDto> {
    const response = await api.patch<CompanyMemberDto>(`/company/members/${memberId}`, { activo });
    return response.data;
  },

  async getTelegramStatus(): Promise<{
    conectado: boolean;
    apiConfigurada: boolean;
    telefono: string | null;
    username: string | null;
    nombreCuenta: string | null;
    vinculadoEn?: string | null;
  }> {
    const response = await api.get<{
      conectado: boolean;
      apiConfigurada: boolean;
      telefono: string | null;
      username: string | null;
      nombreCuenta: string | null;
      vinculadoEn?: string | null;
    }>('/company/telegram/status');
    return response.data;
  },

  async sendTelegramCode(telefono: string): Promise<{ mensaje: string; telefono: string }> {
    const response = await api.post<{ mensaje: string; telefono: string }>('/company/telegram/send-code', {
      telefono,
    });
    return response.data;
  },

  async verifyTelegramCode(
    codigo: string,
    password2FA?: string,
  ): Promise<{ conectado: boolean; telefono: string; username: string | null; nombreCuenta: string }> {
    const response = await api.post<{
      conectado: boolean;
      telefono: string;
      username: string | null;
      nombreCuenta: string;
    }>('/company/telegram/verify-code', { codigo, password2FA });
    return response.data;
  },
};

