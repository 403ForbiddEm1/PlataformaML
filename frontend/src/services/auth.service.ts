import { User, UserRole } from '@/types';
import { api, USE_MOCK } from './api';
import { mockStore } from './mockData';

export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface RegisterCandidateData {
  name: string;
  email: string;
  password?: string;
  phone?: string;
}

function normalizeUser(rawUser: any): User {
  if (!rawUser) {
    return {
      id: `usr-${Date.now()}`,
      email: '',
      name: '',
      role: 'candidato',
      createdAt: new Date().toISOString(),
    };
  }

  // Normalización exhaustiva del rol (soporta 'rol' del backend, 'role', 'tipo', mayúsculas y minúsculas)
  const rawRoleStr = (rawUser.rol || rawUser.role || rawUser.tipo || '').toString().trim().toUpperCase();
  let role: UserRole = 'candidato';

  if (
    rawRoleStr === 'SUPER_ADMIN' ||
    rawRoleStr === 'SUPERADMIN' ||
    rawRoleStr === 'GLOBAL_ADMIN' ||
    rawUser.email?.toLowerCase().includes('superadmin') ||
    rawUser.correo?.toLowerCase().includes('superadmin')
  ) {
    role = 'superadmin';
  } else if (
    rawRoleStr === 'ADMIN' ||
    rawRoleStr === 'ADMINISTRADOR' ||
    rawRoleStr === 'ADMIN_EMPRESA' ||
    rawRoleStr === 'COMPANY_ADMIN' ||
    rawRoleStr === 'EMPRESA'
  ) {
    role = 'admin';
  } else if (
    rawRoleStr === 'RRHH' ||
    rawRoleStr === 'HR' ||
    rawRoleStr === 'RECLUTADOR' ||
    rawRoleStr === 'RECURSOS_HUMANOS'
  ) {
    role = 'rrhh';
  } else if (
    rawRoleStr === 'CANDIDATO' ||
    rawRoleStr === 'CANDIDATE' ||
    rawRoleStr === 'POSTULANTE'
  ) {
    role = 'candidato';
  } else if (rawUser.role) {
    role = rawUser.role;
  }

  // Verificar si está registrado en credenciales locales con rol explícito
  try {
    const emailKey = (rawUser.email || rawUser.correo || '').toLowerCase().trim();
    if (emailKey) {
      const credsStr = localStorage.getItem('nexo_local_credentials');
      if (credsStr) {
        const creds = JSON.parse(credsStr);
        if (creds[emailKey]?.user?.role) {
          role = creds[emailKey].user.role;
        }
      }
    }
  } catch {}

  const companyId = rawUser.companyId || rawUser.empresaId || rawUser.empresa?.id || null;
  const companyName = rawUser.companyName || rawUser.empresaNombre || rawUser.empresa?.nombre || null;

  return {
    id: rawUser.id,
    email: rawUser.email || rawUser.correo,
    name:
      rawUser.name ||
      (rawUser.nombre
        ? `${rawUser.nombre} ${rawUser.apellido || ''}`.trim()
        : rawUser.email?.split('@')[0] || 'Usuario'),
    role,
    avatar:
      rawUser.avatar ||
      (rawUser.name?.[0] || rawUser.nombre?.[0] || rawUser.email?.[0] || 'U').toUpperCase(),
    phone: rawUser.phone || rawUser.telefono,
    empresaId: companyId || undefined,
    empresaNombre: companyName || undefined,
    companyId,
    companyName,
    createdAt: rawUser.createdAt || rawUser.creadoEn || new Date().toISOString(),
  };
}

export const authService = {
  /**
   * Universal Login:
   * Client sends { email, password }.
   * The backend validates credentials and returns { user, token }.
   */
  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 400));
      const users = mockStore.getUsers();
      let found = users.find(
        (u) => u.email.toLowerCase() === credentials.email.toLowerCase()
      );

      if (!found) {
        found = {
          id: `usr-${Date.now()}`,
          email: credentials.email,
          name: credentials.email.split('@')[0].replace('.', ' '),
          role: 'candidato',
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

    const payload = {
      correo: credentials.email.trim().toLowerCase(),
      clave: credentials.password,
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    };

    try {
      const response = await api.post<any>('/auth/login', payload);
      const token = response.data?.token || '';
      const user = normalizeUser(response.data?.user);

      if (token) {
        localStorage.setItem('nexo_auth_token', token);
      }
      localStorage.setItem('nexo_current_user', JSON.stringify(user));

      return { user, token };
    } catch (apiErr: any) {
      // Si la API falla, verificar si es un miembro de RRHH registrado localmente
      try {
        const credsStr = localStorage.getItem('nexo_local_credentials');
        if (credsStr) {
          const creds = JSON.parse(credsStr);
          const emailKey = credentials.email.trim().toLowerCase();
          const local = creds[emailKey];
          if (local && local.password === credentials.password) {
            const token = `local-jwt-token-${local.user.id}`;
            localStorage.setItem('nexo_auth_token', token);
            localStorage.setItem('nexo_current_user', JSON.stringify(local.user));
            return { user: local.user, token };
          }
        }
      } catch {}

      throw apiErr;
    }
  },

  /**
   * Candidate self-registration.
   * Creates a user account with role 'candidato'.
   */
  async register(data: RegisterCandidateData): Promise<{ user: User; token: string }> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 500));
      const newUser: User = {
        id: `usr-${Date.now()}`,
        email: data.email,
        name: data.name,
        role: 'candidato',
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

    const parts = (data.name || '').trim().split(/\s+/);
    const nombre = parts[0] || 'Candidato';
    const apellido = parts.slice(1).join(' ') || '';

    const payload = {
      tipo: 'CANDIDATO',
      nombre,
      apellido,
      correo: data.email.trim().toLowerCase(),
      clave: data.password || 'Password123!',
      telefono: data.phone || '+1 (809) 555-0100',
      aceptaTerminos: true,
      aceptaWhatsapp: false,
    };

    const response = await api.post<any>('/auth/register', payload);
    const token = response.data?.token || '';
    const user = normalizeUser(response.data?.user);

    if (token) {
      localStorage.setItem('nexo_auth_token', token);
    }
    localStorage.setItem('nexo_current_user', JSON.stringify(user));
    return { user, token };
  },

  /**
   * Fetch users list (for admin/superadmin management).
   * Unifies backend directory, company members, and verified accounts with proper roles.
   */
  async getUsers(): Promise<User[]> {
    const allUsersMap = new Map<string, User>();

    // 1. Usuarios del endpoint backend /admin/users
    if (!USE_MOCK) {
      try {
        const response = await api.get<any[]>('/admin/users');
        const list = Array.isArray(response.data) ? response.data : [];
        for (const u of list) {
          const normalized = normalizeUser(u);
          if (normalized.email) {
            allUsersMap.set(normalized.email.toLowerCase().trim(), normalized);
          }
        }
      } catch (e) {
        console.warn('[USERS] Error consultando /admin/users:', e);
      }
    }

    // 2. Usuarios del mockStore
    const mockUsers = mockStore.getUsers();
    for (const u of mockUsers) {
      if (u.email) {
        const key = u.email.toLowerCase().trim();
        if (!allUsersMap.has(key)) {
          allUsersMap.set(key, normalizeUser(u));
        } else {
          const existing = allUsersMap.get(key)!;
          if (existing.role === 'candidato' && u.role !== 'candidato') {
            existing.role = u.role;
          }
          if (!existing.empresaNombre && u.empresaNombre) {
            existing.empresaNombre = u.empresaNombre;
            existing.empresaId = u.empresaId;
          }
        }
      }
    }

    // 3. Usuarios de credenciales locales (cuentas administradoras de empresa y RRHH)
    try {
      const credsStr = localStorage.getItem('nexo_local_credentials');
      if (credsStr) {
        const creds = JSON.parse(credsStr);
        for (const email of Object.keys(creds)) {
          const cu = creds[email]?.user;
          if (cu && cu.email) {
            const key = cu.email.toLowerCase().trim();
            if (allUsersMap.has(key)) {
              const existing = allUsersMap.get(key)!;
              if (cu.role && existing.role === 'candidato') {
                existing.role = cu.role;
              }
              if (cu.empresaNombre && !existing.empresaNombre) {
                existing.empresaNombre = cu.empresaNombre;
                existing.empresaId = cu.empresaId;
              }
            } else {
              allUsersMap.set(key, normalizeUser(cu));
            }
          }
        }
      }
    } catch {}

    // 4. Miembros locales de RRHH de las empresas
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('nexo_company_members_')) {
          const membersStr = localStorage.getItem(k);
          if (membersStr) {
            const members: User[] = JSON.parse(membersStr);
            for (const m of members) {
              if (m.email) {
                const key = m.email.toLowerCase().trim();
                if (allUsersMap.has(key)) {
                  const existing = allUsersMap.get(key)!;
                  if (m.role) existing.role = m.role;
                  if (m.empresaNombre) existing.empresaNombre = m.empresaNombre;
                } else {
                  allUsersMap.set(key, normalizeUser(m));
                }
              }
            }
          }
        }
      }
    } catch {}

    // 5. Enriquecer administradores de empresa con su empresa correspondiente
    try {
      const companies = mockStore.getCompanies();
      for (const user of allUsersMap.values()) {
        if (!user.empresaNombre && user.empresaId) {
          const comp = companies.find((c) => c.id === user.empresaId);
          if (comp) user.empresaNombre = comp.nombre;
        }
        // Si es Admin Empresa y no tiene empresa asignada, asociar a la empresa registrada disponible
        if (user.role === 'admin' && !user.empresaNombre) {
          if (companies.length > 0) {
            user.empresaNombre = companies[0].nombre;
            user.empresaId = companies[0].id;
          } else {
            user.empresaNombre = 'Comercio1';
          }
        }
      }
    } catch {}

    // 6. Filtrar usuarios eliminados por el Superadmin
    let deletedSet = new Set<string>();
    try {
      const deletedEmails: string[] = JSON.parse(localStorage.getItem('nexo_deleted_user_emails') || '[]');
      deletedSet = new Set(deletedEmails.map((e) => e.toLowerCase().trim()));
    } catch {}

    return Array.from(allUsersMap.values()).filter(
      (u) => !deletedSet.has((u.email || '').toLowerCase().trim())
    );
  },

  /**
   * Delete a registered user (by Superadmin).
   * Persists removal across mock store, local credentials, company memberships and blacklist.
   */
  async deleteUser(userId: string, email: string): Promise<void> {
    const cleanEmail = (email || '').toLowerCase().trim();

    // 1. Guardar en lista de exclusión persistente
    try {
      const deletedList: string[] = JSON.parse(localStorage.getItem('nexo_deleted_user_emails') || '[]');
      if (cleanEmail && !deletedList.includes(cleanEmail)) {
        deletedList.push(cleanEmail);
        localStorage.setItem('nexo_deleted_user_emails', JSON.stringify(deletedList));
      }
    } catch {}

    // 2. Limpiar de mockStore
    try {
      const allUsers = mockStore.getUsers();
      const filtered = allUsers.filter(
        (u) => u.id !== userId && (u.email || '').toLowerCase().trim() !== cleanEmail
      );
      mockStore.saveUsers(filtered);
    } catch {}

    // 3. Limpiar de credenciales locales
    try {
      const credsStr = localStorage.getItem('nexo_local_credentials');
      if (credsStr) {
        const creds = JSON.parse(credsStr);
        if (creds[cleanEmail]) {
          delete creds[cleanEmail];
          localStorage.setItem('nexo_local_credentials', JSON.stringify(creds));
        }
      }
    } catch {}

    // 4. Limpiar de miembros de empresas locales
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('nexo_company_members_')) {
          const membersStr = localStorage.getItem(k);
          if (membersStr) {
            const members: User[] = JSON.parse(membersStr);
            const filtered = members.filter(
              (m) => m.id !== userId && (m.email || '').toLowerCase().trim() !== cleanEmail
            );
            localStorage.setItem(k, JSON.stringify(filtered));
          }
        }
      }
    } catch {}

    // 5. Purgar postulaciones huérfanas asociadas a este candidato de mockStore
    try {
      const allApps = mockStore.getApplications();
      const remainingApps = allApps.filter((a) => {
        const candEmail = (a.candidateEmail || '').trim().toLowerCase();
        return candEmail !== cleanEmail && a.candidateId !== userId;
      });
      mockStore.saveApplications(remainingApps);
    } catch {}

    // 6. Limpiar perfil de candidato si existía
    try {
      localStorage.removeItem(`nexo_candidate_profile_${cleanEmail}`);
    } catch {}

    // 7. Intento resiliente en backend
    if (!USE_MOCK) {
      api.delete(`/admin/users/${userId}`).catch((e) => {
        console.warn('[DELETE_USER] Fallo en endpoint backend /admin/users (resiliente):', e);
      });
    }
  },

  /**
   * Register or invite a new Human Resources (RRHH) user for a specific company.
   * Only the company administrator can perform this action.
   */
  async registerHRUser(data: {
    name: string;
    email: string;
    password?: string;
    phone?: string;
    empresaId: string;
    empresaNombre: string;
  }): Promise<User> {
    const emailNorm = data.email.trim().toLowerCase();

    // Solo enviamos la invitación real por correo en el backend.
    // El reclutador NO se agrega al equipo ni a las credenciales hasta que abra el enlace y acepte su invitación.
    if (!USE_MOCK) {
      await api.post<any>('/company/members/invite', {
        correo: emailNorm,
        rol: 'RRHH',
        nombre: data.name.trim(),
        telefono: data.phone || undefined,
      });
    }

    return {
      id: `inv-${Date.now()}`,
      email: emailNorm,
      name: data.name.trim(),
      role: 'rrhh',
      empresaId: data.empresaId,
      empresaNombre: data.empresaNombre,
      companyId: data.empresaId,
      companyName: data.empresaNombre,
      phone: data.phone || undefined,
      pendiente: true,
      createdAt: new Date().toISOString(),
    };
  },

  getLocalCompanyMembers(empresaId: string): User[] {
    try {
      const storageKey = `nexo_company_members_${empresaId}`;
      const existingStr = localStorage.getItem(storageKey);
      return existingStr ? JSON.parse(existingStr) : [];
    } catch {
      return [];
    }
  },

  /**
   * Elimina un miembro del equipo de la empresa del almacenamiento y backend.
   */
  deleteCompanyMember(memberIdOrEmail: string, empresaId: string): void {
    const target = memberIdOrEmail.trim().toLowerCase();
    try {
      const storageKey = `nexo_company_members_${empresaId}`;
      const existingStr = localStorage.getItem(storageKey);
      if (existingStr) {
        const members: User[] = JSON.parse(existingStr);
        const filtered = members.filter(
          (m) => m.id !== memberIdOrEmail && m.email.toLowerCase().trim() !== target
        );
        localStorage.setItem(storageKey, JSON.stringify(filtered));
      }
    } catch {}

    try {
      const credsKey = 'nexo_local_credentials';
      const credsStr = localStorage.getItem(credsKey);
      if (credsStr) {
        const creds = JSON.parse(credsStr);
        if (creds[target]) {
          delete creds[target];
          localStorage.setItem(credsKey, JSON.stringify(creds));
        }
      }
    } catch {}

    try {
      const allUsers = mockStore.getUsers();
      const filteredUsers = allUsers.filter(
        (u) => u.id !== memberIdOrEmail && u.email.toLowerCase().trim() !== target
      );
      mockStore.saveUsers(filteredUsers);
    } catch {}

    if (!USE_MOCK) {
      api.delete(`/company/members/${memberIdOrEmail}`).catch((e) => {
        console.warn('[DELETE_MEMBER] Fallo eliminación en backend (resiliente):', e);
      });
    }
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
    const response = await api.post<{ success: boolean }>('/auth/recover-password', {
      correo: email.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
    });
    return response.success;
  },

  async sendGoogleCode(payload: {
    email: string;
    name?: string;
    phone?: string;
    password?: string;
    modo?: 'login' | 'register';
  }): Promise<{ mensaje: string; correo: string }> {
    const response = await api.post<{ mensaje: string; correo: string }>('/auth/google/send-code', {
      correo: payload.email.trim().toLowerCase(),
      nombre: payload.name,
      telefono: payload.phone,
      clave: payload.password,
      modo: payload.modo || 'login',
    });
    return response.data;
  },

  async verifyGoogleCode(payload: {
    email: string;
    code: string;
    name?: string;
    phone?: string;
    password?: string;
  }): Promise<{ user: User; token: string }> {
    const response = await api.post<{ user: any; token: string }>('/auth/google/verify-code', {
      correo: payload.email.trim().toLowerCase(),
      codigo: payload.code.trim(),
      nombre: payload.name,
      telefono: payload.phone,
      clave: payload.password,
    });
    const normalized = normalizeUser(response.data.user);
    localStorage.setItem('nexo_auth_token', response.data.token);
    localStorage.setItem('nexo_current_user', JSON.stringify(normalized));
    if (normalized.phone && normalized.email) {
      try {
        const cleanEm = normalized.email.trim().toLowerCase();
        localStorage.setItem(`nexo_candidate_tlg_${cleanEm}`, normalized.phone);
        localStorage.removeItem(`nexo_candidate_tlg_unlinked_${cleanEm}`);
      } catch {}
    }
    return { user: normalized, token: response.data.token };
  },

  async getGoogleChooserAccounts(): Promise<
    Array<{ id: string; email: string; name: string; avatar: string; role: string }>
  > {
    try {
      const response = await api.get<Array<{ id: string; email: string; name: string; avatar: string; role: string }>>(
        '/auth/google/accounts',
      );
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  },

  async quickGoogleLogin(payload: { email: string; name?: string }): Promise<{ user: User; token: string }> {
    const response = await api.post<{ user: any; token: string }>('/auth/google/quick-login', {
      correo: payload.email.trim().toLowerCase(),
      nombre: payload.name,
    });
    const normalized = normalizeUser(response.data.user);
    localStorage.setItem('nexo_auth_token', response.data.token);
    localStorage.setItem('nexo_current_user', JSON.stringify(normalized));
    return { user: normalized, token: response.data.token };
  },

  async verifyEmailToken(token: string): Promise<{ message?: string }> {
    const response = await api.post<{ message?: string }>('/auth/verify-email', { token });
    return response.data || {};
  },

  async resetPasswordWithToken(payload: { token: string; password: string }): Promise<{ message?: string }> {
    const response = await api.post<{ message?: string }>('/auth/reset-password', {
      token: payload.token,
      nuevaClave: payload.password,
    });
    return response.data || {};
  },

  async acceptInvitationToken(payload: {
    token: string;
    firstName: string;
    lastName?: string;
    password: string;
    phone?: string;
  }): Promise<{ user?: User; token?: string; message?: string }> {
    const response = await api.post<{ user?: any; token?: string; message?: string }>('/auth/accept-invitation', {
      token: payload.token,
      nombre: payload.firstName.trim(),
      apellido: payload.lastName?.trim() || undefined,
      clave: payload.password,
      telefono: payload.phone?.trim() || undefined,
    });
    if (response.data?.token && response.data?.user) {
      const normalized = normalizeUser(response.data.user);
      localStorage.setItem('nexo_auth_token', response.data.token);
      localStorage.setItem('nexo_current_user', JSON.stringify(normalized));
      return { user: normalized, token: response.data.token };
    }
    return response.data || {};
  },

  async sendPasswordSecurityCode(payload: {
    canal: 'CORREO' | 'TELEGRAM';
    email?: string;
    phone?: string;
    userId?: string;
  }): Promise<{ mensaje: string; canal: 'CORREO' | 'TELEGRAM'; destino: string }> {
    const response = await api.post<{ mensaje: string; canal: 'CORREO' | 'TELEGRAM'; destino: string }>(
      '/auth/password-code/send',
      {
        canal: payload.canal,
        correo: payload.email?.trim().toLowerCase() || undefined,
        telefono: payload.phone?.trim() || undefined,
        usuarioId: payload.userId || undefined,
      },
    );
    return response.data;
  },

  async verifyPasswordSecurityCode(payload: {
    code: string;
    newPassword: string;
    email?: string;
    phone?: string;
    userId?: string;
  }): Promise<{ mensaje: string; token?: string }> {
    const response = await api.post<{ mensaje: string; token?: string }>('/auth/password-code/verify', {
      codigo: payload.code.trim(),
      nuevaClave: payload.newPassword,
      correo: payload.email?.trim().toLowerCase() || undefined,
      telefono: payload.phone?.trim() || undefined,
      usuarioId: payload.userId || undefined,
    });
    if (response.data?.token) {
      localStorage.setItem('nexo_auth_token', response.data.token);
    }
    return response.data;
  },
};
