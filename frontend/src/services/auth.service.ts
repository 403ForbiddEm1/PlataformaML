import { User, UserRole } from '@/types';
import { api, USE_MOCK } from './api';
import { mockStore } from './mockData';

export interface LoginCredentials {
  email: string;
  password?: string;
  role: UserRole;
}

export interface RegisterData {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  role: UserRole;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 400));
      const users = mockStore.getUsers();
      // Match by email or role default
      let found = users.find(
        (u) =>
          u.email.toLowerCase() === credentials.email.toLowerCase() &&
          u.role === credentials.role
      );

      // If user typed custom email with role
      if (!found) {
        found = {
          id: `usr-${Date.now()}`,
          email: credentials.email,
          name: credentials.email.split('@')[0].replace('.', ' '),
          role: credentials.role,
          avatar: credentials.email.substring(0, 2).toUpperCase(),
          phone: '+1 (809) 555-0100',
          createdAt: new Date().toISOString(),
        };
      }

      const token = `mock-jwt-token-${found.id}-${Date.now()}`;
      localStorage.setItem('nexo_auth_token', token);
      localStorage.setItem('nexo_current_user', JSON.stringify(found));
      return { user: found, token };
    }

    const response = await api.post<{ user: User; token: string }>('/auth/login', credentials);
    localStorage.setItem('nexo_auth_token', response.data.token);
    localStorage.setItem('nexo_current_user', JSON.stringify(response.data.user));
    return response.data;
  },

  async register(data: RegisterData): Promise<{ user: User; token: string }> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 500));
      const newUser: User = {
        id: `usr-${Date.now()}`,
        email: data.email,
        name: data.name,
        role: data.role,
        avatar: data.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2),
        phone: data.phone || '+1 (809) 000-0000',
        createdAt: new Date().toISOString(),
      };

      const users = mockStore.getUsers();
      users.push(newUser);

      const token = `mock-jwt-token-${newUser.id}`;
      localStorage.setItem('nexo_auth_token', token);
      localStorage.setItem('nexo_current_user', JSON.stringify(newUser));
      return { user: newUser, token };
    }

    const response = await api.post<{ user: User; token: string }>('/auth/register', data);
    localStorage.setItem('nexo_auth_token', response.data.token);
    localStorage.setItem('nexo_current_user', JSON.stringify(response.data.user));
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

  async recoverPassword(email: string): Promise<boolean> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 600));
      return true;
    }
    const response = await api.post<{ success: boolean }>('/auth/recover-password', { email });
    return response.success;
  },
};
