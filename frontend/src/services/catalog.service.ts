import { api } from './api';

export type CatalogOptionType = 'DEPARTAMENTO' | 'ESPECIALIDAD' | 'CARRERA';

export interface CatalogData {
  departamentos: string[];
  especialidades: string[];
  carreras: string[];
}

export const catalogService = {
  async getCatalog(): Promise<CatalogData> {
    const res = await api.get<CatalogData>('/catalog');
    return (
      res.data || {
        departamentos: [],
        especialidades: [],
        carreras: [],
      }
    );
  },

  async addOption(tipo: CatalogOptionType, nombre: string): Promise<{ nombre: string; alreadyExisted?: boolean }> {
    const res = await api.post<any>('/catalog', { tipo, nombre: nombre.trim() });
    return {
      nombre: res.data?.nombre || nombre.trim(),
      alreadyExisted: Boolean((res as any).alreadyExisted),
    };
  },
};
