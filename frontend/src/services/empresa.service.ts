import { Empresa, User } from '@/types';
import { api, USE_MOCK } from './api';
import { mockStore } from './mockData';

export interface RegisterCompanyPayload {
  nombreEmpresa: string;
  dominio?: string;
  rif?: string;
  descripcion?: string;
  adminName: string;
  adminEmail: string;
  password?: string;
  phone?: string;
}

export const empresaService = {
  async getAll(): Promise<Empresa[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200));
      return mockStore.getCompanies();
    }
    try {
      const response = await api.get<any[]>('/admin/companies');
      const list = Array.isArray(response.data) ? response.data : [];
      return list.map((c: any) => ({
        id: c.id,
        nombre: c.nombre,
        dominio: c.dominio || c.sitioWeb || '',
        rif: c.identificacionFiscal || c.rif || '',
        activa: c.estado === 'ACTIVA' || c.activa === true,
        estado: c.estado,
        descripcion: c.razonSocial || c.descripcion || '',
        telefono: c.telefonoContacto || c.telefono || '',
        creadoEn: c.creadoEn,
        adminsCount: c.admins ?? 0,
        rrhhCount: c.rrhh ?? 0,
      }));
    } catch {
      return [];
    }
  },

  async getById(id: string): Promise<Empresa | undefined> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 150));
      return mockStore.getCompanies().find((c) => c.id === id);
    }
    try {
      const response = await api.get<any[]>('/admin/companies');
      const list = Array.isArray(response.data) ? response.data : [];
      const found = list.find((c: any) => c.id === id);
      if (!found) return undefined;
      return {
        id: found.id,
        nombre: found.nombre,
        dominio: found.dominio || found.sitioWeb || '',
        rif: found.identificacionFiscal || found.rif || '',
        activa: found.estado === 'ACTIVA' || found.activa === true,
        estado: found.estado,
        descripcion: found.razonSocial || found.descripcion || '',
        telefono: found.telefonoContacto || found.telefono || '',
        creadoEn: found.creadoEn,
        adminsCount: found.admins ?? 0,
        rrhhCount: found.rrhh ?? 0,
      };
    } catch {
      return undefined;
    }
  },

  async registerCompany(
    payload: RegisterCompanyPayload
  ): Promise<{ empresa: Empresa; user: User; token: string }> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 500));
      const newEmpresa: Empresa = {
        id: `emp-${Date.now().toString().slice(-4)}`,
        nombre: payload.nombreEmpresa,
        dominio: payload.dominio,
        rif: payload.rif || 'J-00000000-0',
        activa: true,
        descripcion: payload.descripcion || 'Empresa afiliada a la plataforma.',
        telefono: payload.phone,
        creadoEn: new Date().toISOString(),
      };

      const newUser: User = {
        id: `usr-adm-${Date.now().toString().slice(-4)}`,
        email: payload.adminEmail,
        name: payload.adminName,
        role: 'admin',
        empresaId: newEmpresa.id,
        empresaNombre: newEmpresa.nombre,
        phone: payload.phone || '+1 (809) 000-0000',
        avatar: payload.adminName.slice(0, 2).toUpperCase(),
        createdAt: new Date().toISOString(),
      };

      const companies = mockStore.getCompanies();
      companies.push(newEmpresa);
      mockStore.saveCompanies(companies);

      const users = mockStore.getUsers();
      users.push(newUser);

      const token = `mock-jwt-token-${newUser.id}`;
      localStorage.setItem('nexo_auth_token', token);
      localStorage.setItem('nexo_current_user', JSON.stringify(newUser));
      return { empresa: newEmpresa, user: newUser, token };
    }

    // Dividir nombre y apellido del administrador
    const parts = (payload.adminName || 'Admin').trim().split(/\s+/);
    const nombre = parts[0] || 'Admin';
    const apellido = parts.slice(1).join(' ') || 'Empresa';
    const correo = (payload.adminEmail || '').trim().toLowerCase();
    const phone = payload.phone?.trim() || '+1 (809) 555-0100';
    const password = payload.password || 'Password123!';

    // Formatear dominio corporativo a URL válida para cumplir validación estricta de Zod
    let websiteUrl = '';
    if (payload.dominio?.trim()) {
      const d = payload.dominio.trim();
      websiteUrl = d.startsWith('http://') || d.startsWith('https://') ? d : `https://${d}`;
    }

    const body = {
      tipo: 'EMPRESA',
      role: 'admin',
      nombre,
      apellido,
      correo,
      clave: password,
      telefono: phone,
      aceptaTerminos: true,
      nombreEmpresa: payload.nombreEmpresa.trim(),
      identificacionFiscal: payload.rif?.trim() || undefined,
      sector: 'Comercio y Servicios',
      correoContacto: correo,
      telefonoContacto: phone,
      sitioWeb: websiteUrl,
    };

    const response = await api.post<any>('/auth/register', body);

    // Solo actualizar credenciales locales si quien registra NO es SuperAdmin (evita perder sesión del admin global)
    let currentLoggedRole = '';
    try {
      const stored = localStorage.getItem('nexo_current_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        currentLoggedRole = parsed?.role || '';
      }
    } catch {}

    if (currentLoggedRole !== 'superadmin' && response.data?.token) {
      localStorage.setItem('nexo_auth_token', response.data.token);
      if (response.data?.user) {
        localStorage.setItem('nexo_current_user', JSON.stringify(response.data.user));
      }
    }

    const createdEmpresa: Empresa = {
      id: response.data?.empresa?.id || `emp-${Date.now()}`,
      nombre: payload.nombreEmpresa,
      dominio: payload.dominio,
      rif: payload.rif || 'J-00000000-0',
      activa: false, // En backend queda PENDIENTE_APROBACION inicialmente
      estado: 'PENDIENTE_APROBACION',
      descripcion: payload.descripcion || 'Empresa afiliada.',
      telefono: phone,
      creadoEn: new Date().toISOString(),
    };

    const createdUser: User = {
      id: response.data?.user?.id || `usr-${Date.now()}`,
      email: correo,
      name: payload.adminName,
      role: 'admin',
      empresaId: createdEmpresa.id,
      empresaNombre: createdEmpresa.nombre,
      phone,
      avatar: nombre.slice(0, 2).toUpperCase(),
      createdAt: new Date().toISOString(),
    };

    return { empresa: createdEmpresa, user: createdUser, token: response.data?.token || '' };
  },

  async approveCompany(id: string): Promise<any> {
    if (USE_MOCK) return { success: true };
    return api.post(`/admin/companies/${id}/approve`);
  },

  async rejectCompany(id: string, motivo: string): Promise<any> {
    if (USE_MOCK) return { success: true };
    return api.post(`/admin/companies/${id}/reject`, { motivo });
  },

  async activateCompany(id: string): Promise<any> {
    if (USE_MOCK) return { success: true };
    return api.post(`/admin/companies/${id}/activate`, {});
  },

  async deactivateCompany(id: string, motivo?: string): Promise<any> {
    if (USE_MOCK) return { success: true };
    return api.post(`/admin/companies/${id}/deactivate`, { motivo: motivo || 'Desactivación administrativa' });
  },
};
