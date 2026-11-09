import { User, UserRole } from '@/types';
import { api } from './api';

export interface LoginCredentials {
  email?: string;
  correo?: string;
  password?: string;
  clave?: string;
  role?: UserRole;
}

export interface RegisterData {
  name?: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  correo?: string;
  password?: string;
  clave?: string;
  phone?: string;
  telefono?: string;
  role?: UserRole;
  tipo?: 'CANDIDATO' | 'EMPRESA';
  aceptaTerminos?: boolean;
  aceptaWhatsapp?: boolean;
  // Campos para registro de Empresa
  nombreEmpresa?: string;
  companyName?: string;
  identificacionFiscal?: string;
  sector?: string;
  correoContacto?: string;
  telefonoContacto?: string;
  sitioWeb?: string;
}

export interface GoogleAuthResponse {
  requiereCompletarPerfil: boolean;
  tokenTemporal?: string;
  correo?: string;
  nombre?: string;
  user?: User;
  token?: string;
}

export interface CompleteGoogleProfilePayload {
  telefono?: string;
  aceptaTerminos: true;
  aceptaWhatsapp?: boolean;
}

export interface AcceptInvitationPayload {
  token: string;
  nombre: string;
  apellido: string;
  clave: string;
  telefono?: string;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<{ user: User; token: string; correoVerificado?: boolean }> {
    const payload = {
      correo: credentials.correo || credentials.email,
      clave: credentials.clave || credentials.password,
    };
    const response = await api.post<{ user: User; token: string; correoVerificado?: boolean }>('/auth/login', payload);
    localStorage.setItem('nexo_auth_token', response.data.token);
    localStorage.setItem('nexo_current_user', JSON.stringify(response.data.user));
    return response.data;
  },

  async register(data: RegisterData): Promise<{ user: User; token: string; mensaje?: string }> {
    const response = await api.post<{ user: User; token: string; mensaje?: string }>('/auth/register', data);
    if (response.data.token && response.data.user) {
      localStorage.setItem('nexo_auth_token', response.data.token);
      localStorage.setItem('nexo_current_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async loginWithGoogle(idToken: string): Promise<GoogleAuthResponse> {
    const response = await api.post<GoogleAuthResponse>('/auth/google', { idToken });
    if (!response.data.requiereCompletarPerfil && response.data.token && response.data.user) {
      localStorage.setItem('nexo_auth_token', response.data.token);
      localStorage.setItem('nexo_current_user', JSON.stringify(response.data.user));
    } else if (response.data.tokenTemporal) {
      localStorage.setItem('nexo_auth_token', response.data.tokenTemporal);
    }
    return response.data;
  },

  async completeGoogleProfile(payload: CompleteGoogleProfilePayload): Promise<{ user: User; token: string }> {
    const response = await api.post<{ user: User; token: string }>('/auth/google/complete-profile', payload);
    localStorage.setItem('nexo_auth_token', response.data.token);
    localStorage.setItem('nexo_current_user', JSON.stringify(response.data.user));
    return response.data;
  },

  async fetchMe(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    localStorage.setItem('nexo_current_user', JSON.stringify(response.data));
    return response.data;
  },

  getCurrentUser(): User | null {
    try {
      const stored = localStorage.getItem('nexo_current_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  logout(): void {
    localStorage.removeItem('nexo_auth_token');
    localStorage.removeItem('nexo_current_user');
  },

  async verifyEmail(token: string): Promise<{ mensaje: string }> {
    const response = await api.post<{ mensaje: string }>('/auth/verify-email', { token });
    return response.data;
  },

  async resendVerification(): Promise<{ mensaje: string }> {
    const response = await api.post<{ mensaje: string }>('/auth/resend-verification');
    return response.data;
  },

  async recoverPassword(email: string): Promise<boolean> {
    const response = await api.post<{ mensaje: string }>('/auth/recover-password', { correo: email, email });
    return response.success;
  },

  async resetPassword(token: string, nuevaClave: string): Promise<{ mensaje: string }> {
    const response = await api.post<{ mensaje: string }>('/auth/reset-password', {
      token,
      nuevaClave,
      password: nuevaClave,
    });
    return response.data;
  },

  async acceptInvitation(payload: AcceptInvitationPayload): Promise<{ user: User; token: string }> {
    const response = await api.post<{ user: User; token: string }>('/auth/accept-invitation', payload);
    localStorage.setItem('nexo_auth_token', response.data.token);
    localStorage.setItem('nexo_current_user', JSON.stringify(response.data.user));
    return response.data;
  },
};
