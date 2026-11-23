import { Vacancy } from '@/types';
import { api, USE_MOCK } from './api';
import { mockStore } from './mockData';

const LOCAL_VACANCIES_KEY = 'nexo_local_vacancies';

function getStoredLocalVacancies(): Vacancy[] {
  try {
    const raw = localStorage.getItem(LOCAL_VACANCIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistLocalVacancy(v: Vacancy) {
  try {
    const list = getStoredLocalVacancies();
    const idx = list.findIndex((item) => item.id === v.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...v };
    } else {
      list.unshift(v);
    }
    localStorage.setItem(LOCAL_VACANCIES_KEY, JSON.stringify(list));
  } catch {}
}

function persistAllLocalVacancies(list: Vacancy[]) {
  try {
    localStorage.setItem(LOCAL_VACANCIES_KEY, JSON.stringify(list));
  } catch {}
}

function normalizeVacancy(v: any): Vacancy {
  const companyId = v.companyId || v.empresaId || '';
  const companyName = v.companyName || v.empresaNombre || 'Empresa';
  return {
    ...v,
    empresaId: companyId,
    companyId: companyId,
    empresaNombre: companyName,
    companyName: companyName,
    status: v.status || 'Abierta',
    requiredSkills: Array.isArray(v.requiredSkills) ? v.requiredSkills : [],
    requirements: Array.isArray(v.requirements)
      ? v.requirements
      : typeof v.requirements === 'string'
      ? v.requirements.split('\n').filter(Boolean)
      : [],
    minExperienceYears: v.minExperienceYears ?? 0,
    openings: v.openings ?? 1,
    appliedCount: v.appliedCount ?? 0,
    createdAt: v.createdAt || new Date().toISOString(),
  };
}

export const vacanciesService = {
  async getAll(): Promise<Vacancy[]> {
    let apiList: Vacancy[] = [];

    if (!USE_MOCK) {
      try {
        const response = await api.get<any>('/vacancies');
        const raw = Array.isArray(response.data)
          ? response.data
          : Array.isArray((response as any)?.data?.data)
          ? (response as any).data.data
          : [];
        apiList = raw.map(normalizeVacancy);
        persistAllLocalVacancies(apiList);
        return apiList;
      } catch (err) {
        console.warn('Backend /vacancies GET failed or offline, using local vacancies:', err);
      }
    }

    const localList = getStoredLocalVacancies().map(normalizeVacancy);
    const mockList = mockStore.getVacancies().map(normalizeVacancy);

    // Combinar manteniendo IDs únicos
    const map = new Map<string, Vacancy>();

    for (const v of mockList) {
      map.set(v.id, v);
    }
    for (const v of apiList) {
      map.set(v.id, v);
    }
    for (const v of localList) {
      map.set(v.id, v);
    }

    return Array.from(map.values());
  },

  async getById(id: string): Promise<Vacancy | undefined> {
    const local = getStoredLocalVacancies().find((v) => v.id === id);
    if (local) return normalizeVacancy(local);

    if (!USE_MOCK) {
      try {
        const response = await api.get<any>(`/vacancies/${id}`);
        const v = (response.data as any)?.data || response.data;
        if (v && v.id) return normalizeVacancy(v);
      } catch (err) {
        console.warn(`Backend /vacancies/${id} GET failed:`, err);
      }
    }

    const mock = mockStore.getVacancies().find((v) => v.id === id);
    return mock ? normalizeVacancy(mock) : undefined;
  },

  async create(data: Omit<Vacancy, 'id' | 'appliedCount' | 'createdAt'>): Promise<Vacancy> {
    const newId = `vac-${Date.now()}`;
    const companyId = data.empresaId || (data as any).companyId || 'emp-local';
    const companyName = data.empresaNombre || (data as any).companyName || 'Empresa';

    const newVacancy: Vacancy = normalizeVacancy({
      ...data,
      id: newId,
      appliedCount: 0,
      createdAt: new Date().toISOString(),
      empresaId: companyId,
      companyId: companyId,
      empresaNombre: companyName,
      companyName: companyName,
      status: data.status || 'Abierta',
    });

    if (!USE_MOCK) {
      const backendPayload = {
        title: data.title,
        department: data.department || 'General',
        location: data.location || 'Remoto',
        workMode: data.workMode || 'Híbrido',
        type: data.type || 'Tiempo completo',
        description: data.description,
        requirements: data.requirements || [],
        requiredSkills: data.requiredSkills || [],
        minExperienceYears: data.minExperienceYears ?? 0,
        openings: data.openings ?? 1,
        status: data.status || 'Abierta',
      };

      const response = await api.post<any>('/vacancies', backendPayload);
      const created = (response.data as any)?.data || response.data;
      if (created && created.id) {
        const merged = normalizeVacancy({
          ...newVacancy,
          ...created,
          empresaId: created.companyId || created.empresaId || companyId,
          empresaNombre: created.companyName || created.empresaNombre || companyName,
        });
        persistLocalVacancy(merged);
        return merged;
      }
    }

    // Persistir localmente y en mockStore para sincronización total en tiempo real
    persistLocalVacancy(newVacancy);

    const mockVacancies = mockStore.getVacancies();
    if (!mockVacancies.some((v) => v.id === newVacancy.id)) {
      mockVacancies.unshift(newVacancy);
      mockStore.saveVacancies(mockVacancies);
    }

    return newVacancy;
  },

  async update(id: string, updates: Partial<Vacancy>): Promise<Vacancy> {
    const localList = getStoredLocalVacancies();
    const lIdx = localList.findIndex((v) => v.id === id);
    let updated: Vacancy | null = null;

    if (lIdx !== -1) {
      localList[lIdx] = normalizeVacancy({ ...localList[lIdx], ...updates });
      persistAllLocalVacancies(localList);
      updated = localList[lIdx];
    }

    const mockList = mockStore.getVacancies();
    const mIdx = mockList.findIndex((v) => v.id === id);
    if (mIdx !== -1) {
      mockList[mIdx] = normalizeVacancy({ ...mockList[mIdx], ...updates });
      mockStore.saveVacancies(mockList);
      if (!updated) updated = mockList[mIdx];
    }

    if (!USE_MOCK) {
      try {
        const response = await api.put<any>(`/vacancies/${id}`, updates);
        const v = (response.data as any)?.data || response.data;
        if (v && v.id) {
          const normalized = normalizeVacancy({ ...(updated || v), ...v, ...updates });
          persistLocalVacancy(normalized);
          return normalized;
        }
      } catch (err) {
        console.warn('Backend /vacancies PUT failed, preserving local update:', err);
      }
    }

    if (!updated) {
      const fallback: Vacancy = normalizeVacancy({
        id,
        title: updates.title || 'Vacante',
        department: updates.department || 'General',
        location: updates.location || 'Remoto',
        workMode: updates.workMode || 'Híbrido',
        type: updates.type || 'Tiempo completo',
        status: updates.status || 'Abierta',
        description: updates.description || '',
        ...updates,
      });
      persistLocalVacancy(fallback);
      return fallback;
    }

    return updated;
  },

  async toggleStatus(id: string): Promise<Vacancy> {
    const vacancy = await this.getById(id);
    if (!vacancy) throw new Error('Vacante no encontrada');
    const isActiva = vacancy.status === 'Abierta';
    const newStatus = isActiva ? 'Cerrada' : 'Abierta';
    return this.update(id, { status: newStatus });
  },
};
