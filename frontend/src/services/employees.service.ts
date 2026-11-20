import { Application, ApplicationTimelineEvent, Employee, TerminationDetails, User } from '@/types';
import { api, USE_MOCK } from './api';
import { mockStore } from './mockData';
import { notificationsService } from './notifications.service';
import { authService } from './auth.service';
import { applicationsService } from './applications.service';

export interface HiredContractTerms {
  salary: number;
  role: string;
  department: string;
  hiredDate: string;
}

const HIRED_TERMS_STORAGE_KEY = 'nexo_hired_contract_terms';

function getStoredHiredTermsMap(): Record<string, HiredContractTerms> {
  try {
    const raw = localStorage.getItem(HIRED_TERMS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function parseContractTermsFromHistory(
  recruiterNotes?: string[],
  timeline?: ApplicationTimelineEvent[]
): Partial<HiredContractTerms> {
  const texts: string[] = [
    ...(recruiterNotes || []),
    ...(timeline || []).map((t) => t.description || ''),
  ];

  for (const text of texts) {
    if (!text) continue;
    const salaryMatch = /Sueldo asignado:\s*RD\$\s*([\d.,]+)/i.exec(text);
    const roleMatch = /Cargo:\s*([^|\n]+)/i.exec(text);
    const deptMatch = /Departamento:\s*([^|\n]+)/i.exec(text);
    const dateMatch = /Ingreso:\s*(\d{4}-\d{2}-\d{2})/i.exec(text);

    if (salaryMatch || roleMatch || deptMatch || dateMatch) {
      const numericSalary = salaryMatch
        ? Number(salaryMatch[1].replace(/,/g, ''))
        : undefined;
      return {
        salary: numericSalary && !Number.isNaN(numericSalary) ? numericSalary : undefined,
        role: roleMatch ? roleMatch[1].trim() : undefined,
        department: deptMatch ? deptMatch[1].trim() : undefined,
        hiredDate: dateMatch ? dateMatch[1].trim() : undefined,
      };
    }
  }
  return {};
}

function resolveSyncedUserPhoto(userId?: string, email?: string, explicitUrl?: string): string | undefined {
  if (explicitUrl && (explicitUrl.startsWith('data:image/') || explicitUrl.startsWith('http') || explicitUrl.startsWith('/'))) {
    return explicitUrl;
  }
  try {
    if (userId) {
      const byId = localStorage.getItem(`nexo_user_photo_${userId}`);
      if (byId) return byId;
    }
    const cleanEmail = (email || '').trim().toLowerCase();
    if (cleanEmail) {
      const byEmail = localStorage.getItem(`nexo_photo_by_email_${cleanEmail}`);
      if (byEmail) return byEmail;
    }
    const currentStr = localStorage.getItem('nexo_current_user');
    if (currentStr) {
      const cur = JSON.parse(currentStr);
      const curEmail = (cur?.email || '').trim().toLowerCase();
      if (cur?.photoUrl && ((userId && cur?.id === userId) || (cleanEmail && curEmail === cleanEmail))) {
        return cur.photoUrl;
      }
    }
  } catch {}
  return undefined;
}

function mapHiredApplicationsToEmployees(
  appsList: Application[],
  empresaId?: string
): Employee[] {
  const storedTermsMap = getStoredHiredTermsMap();
  const seenKeys = new Set<string>();
  const hired: Employee[] = [];

  for (const h of appsList) {
    const matchesStatus = (h.status || '').toLowerCase().trim() === 'contratado';
    const appEmpresaId = h.empresaId || (h as any).companyId;
    const matchesEmpresa = !empresaId || !appEmpresaId || appEmpresaId === empresaId;
    if (!matchesStatus || !matchesEmpresa) continue;

    const email = (h.candidateEmail || '').toLowerCase().trim();
    const dedupeKey = email || h.candidateId || h.id;
    if (seenKeys.has(dedupeKey)) continue;
    seenKeys.add(dedupeKey);

    const noteTerms = parseContractTermsFromHistory(h.recruiterNotes, h.timeline);
    const cachedTerms = storedTermsMap[h.id];
    const syncedAvatar = resolveSyncedUserPhoto(
      h.candidateId,
      h.candidateEmail,
      (h as any).candidatePhotoUrl || (h as any).photoUrl
    );
    hired.push({
      id: `emp-hired-${h.id}`,
      candidateId: h.candidateId,
      empresaId: empresaId || appEmpresaId || '',
      empresaNombre: h.empresaNombre || (h as any).companyName || '',
      name: h.candidateName,
      age: h.candidateAge || 28,
      avatar: syncedAvatar,
      email: h.candidateEmail || '',
      phone: h.candidatePhone || '+1 (809) 555-0155',
      role: noteTerms.role || cachedTerms?.role || h.vacancyTitle || 'Especialista Técnico',
      department: noteTerms.department || cachedTerms?.department || h.vacancyDepartment || 'Operaciones',
      status: 'Activo',
      hiredDate:
        noteTerms.hiredDate ||
        cachedTerms?.hiredDate ||
        h.updatedDate ||
        h.appliedDate ||
        new Date().toISOString(),
      salary: noteTerms.salary ?? cachedTerms?.salary ?? 88000,
    });
  }

  return hired;
}

export const employeesService = {
  saveHiredContractTerms(applicationId: string, terms: HiredContractTerms): void {
    try {
      const current = getStoredHiredTermsMap();
      current[applicationId] = terms;
      localStorage.setItem(HIRED_TERMS_STORAGE_KEY, JSON.stringify(current));
    } catch {}
  },

  /**
   * Obtiene exclusivamente los candidatos cuya postulación alcanzó el estado "Contratado",
   * unificando backend (/applications), mockStore y caché local de términos contractuales.
   */
  async getHiredCandidates(empresaId?: string, preloadedApps?: Application[]): Promise<Employee[]> {
    const appsList = preloadedApps ?? (await applicationsService.getAll());
    return mapHiredApplicationsToEmployees(appsList, empresaId);
  },
  /**
   * Obtiene la plantilla integral de colaboradores contratados y personal afiliado.
   * Unifica:
   * 1. Miembros de RRHH y administración creados para la empresa.
   * 2. Candidatos que culminaron con éxito su proceso de selección y fueron contratados.
   * 3. Miembros del endpoint oficial del backend /company/members.
   */
  async getAll(empresaId?: string): Promise<Employee[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 150));
      const all = mockStore.getEmployees();
      if (!empresaId) return all;
      return all.filter((e) => e.empresaId === empresaId);
    }

    const resultEmployees: Employee[] = [];
    const seenEmails = new Set<string>();

    // 1. Obtener miembros devueltos por el endpoint del backend /company/members
    try {
      const response = await api.get<any[]>('/company/members');
      const list = Array.isArray(response.data) ? response.data : [];
      for (const m of list) {
        const email = (m.correo || m.email || '').toLowerCase().trim();
        if (email && !seenEmails.has(email)) {
          seenEmails.add(email);
          resultEmployees.push({
            id: m.id,
            name: `${m.nombre} ${m.apellido || ''}`.trim(),
            email: m.correo || m.email,
            phone: m.telefono || '+1 (809) 555-0100',
            role: m.rol === 'ADMIN' ? 'Administrador Corporativo' : 'Especialista de RRHH',
            department: m.rol === 'ADMIN' ? 'Dirección General' : 'Gestión de Talento Humano',
            empresaId: empresaId || '',
            empresaNombre: '',
            status: m.activo ? 'Activo' : 'Despedido',
            hiredDate: m.creadoEn || new Date().toISOString(),
            salary: 85000,
          });
        }
      }
    } catch {
      // Ignorar fallo si el rol no es admin o endpoint no responde
    }

    // 2. Obtener miembros de RRHH registrados localmente para la empresa
    if (empresaId) {
      const localMembers = authService.getLocalCompanyMembers(empresaId);
      for (const m of localMembers) {
        const email = m.email.toLowerCase().trim();
        if (email && !seenEmails.has(email)) {
          seenEmails.add(email);
          resultEmployees.push({
            id: m.id,
            name: m.name,
            email: m.email,
            phone: m.phone || '+1 (809) 555-0200',
            role: 'Especialista de RRHH',
            department: 'Gestión de Talento Humano',
            empresaId: empresaId,
            empresaNombre: m.empresaNombre || '',
            status: 'Activo',
            hiredDate: m.createdAt,
            salary: 82000,
          });
        }
      }
    }

    // 3. Obtener candidatos cuya postulación haya concluido en "Contratado"
    try {
      const hiredEmployees = await this.getHiredCandidates(empresaId);
      for (const emp of hiredEmployees) {
        const email = (emp.email || '').toLowerCase().trim();
        if (email) seenEmails.add(email);
        resultEmployees.push(emp);
      }
    } catch {
      // Ignorar fallo de consulta de postulaciones
    }

    // Filtrar estrictamente cualquier empleado demo remanente de pruebas
    const filteredEmployees = resultEmployees.filter(
      (e) =>
        !e.email?.toLowerCase().includes('@nexo.com') &&
        e.empresaId !== 'emp-01' &&
        !e.id?.startsWith('emp-worker-')
    );

    return filteredEmployees;
  },

  /**
   * Obtiene la lista de usuarios miembros de RRHH de la empresa.
   */
  async getCompanyMembers(empresaId?: string): Promise<User[]> {
    const byEmail = new Map<string, User>();

    try {
      const response = await api.get<any[]>('/company/members');
      const list = Array.isArray(response.data) ? response.data : [];
      for (const m of list) {
        const email = (m.correo || m.email || '').toLowerCase().trim();
        if (email) {
          byEmail.set(email, {
            id: m.id,
            email: m.correo || m.email,
            name: `${m.nombre || ''} ${m.apellido || ''}`.trim() || email.split('@')[0],
            role: m.rol === 'ADMIN' ? 'admin' : 'rrhh',
            phone: m.telefono || undefined,
            empresaId: empresaId,
            createdAt: m.creadoEn || new Date().toISOString(),
            pendiente: Boolean(m.pendiente),
          });
        }
      }
    } catch {}

    if (empresaId) {
      const local = authService.getLocalCompanyMembers(empresaId);
      for (const u of local) {
        const email = u.email.toLowerCase().trim();
        const existing = byEmail.get(email);
        if (!existing) {
          byEmail.set(email, u);
        } else if (!existing.phone && u.phone) {
          byEmail.set(email, { ...existing, phone: u.phone });
        }
      }
    }

    return Array.from(byEmail.values());
  },

  async getById(id: string): Promise<Employee | undefined> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 100));
      return mockStore.getEmployees().find((e) => e.id === id);
    }
    const all = await this.getAll();
    return all.find((e) => e.id === id);
  },

  async dismissEmployee(id: string, details: TerminationDetails): Promise<Employee> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300));
      const list = mockStore.getEmployees();
      const index = list.findIndex((e) => e.id === id);
      if (index === -1) {
        throw new Error('Colaborador no encontrado.');
      }

      const emp = list[index];
      const updated: Employee = {
        ...emp,
        status: 'Despedido',
        terminationDetails: details,
      };

      list[index] = updated;
      mockStore.saveEmployees(list);

      if (details.notifiedViaEmail) {
        await notificationsService.sendNotification({
          recipient: emp.email,
          channel: 'Email',
          title: `Comunicado Oficial de Término Laboral · ${emp.empresaNombre}`,
          message: `Estimado(a) ${emp.name}, se ha formalizado la conclusión de su vínculo laboral con motivo: "${details.reason}". Su cuadre total de liquidación es de RD$ ${details.totalSettlement.toLocaleString('es-DO', { minimumFractionDigits: 2 })}. Procesado por: ${details.processedBy}.`,
        });
      }

      return updated;
    }

    // Si está conectado al backend, intentar cambiar el estado del miembro
    try {
      await api.patch(`/company/members/${id}/status`, { activo: false });
    } catch (e) {
      console.warn('[DISMISS_EMPLOYEE] Error al desactivar miembro:', e);
    }

    const all = mockStore.getEmployees();
    const emp = all.find((e) => e.id === id) || {
      id,
      name: 'Colaborador',
      email: 'colaborador@empresa.com',
      phone: '+1 (809) 555-0100',
      role: 'Especialista',
      department: 'Operaciones',
      empresaId: '',
      empresaNombre: '',
      status: 'Despedido' as const,
      hiredDate: new Date().toISOString(),
      salary: details.totalSettlement,
    };

    return {
      ...emp,
      status: 'Despedido',
      terminationDetails: details,
    };
  },

  /**
   * Elimina formalmente un colaborador de la nómina y registros de la empresa.
   */
  async deleteEmployee(id: string): Promise<void> {
    const target = id.trim().toLowerCase();
    try {
      const all = mockStore.getEmployees();
      const filtered = all.filter((e) => e.id !== id && e.email.trim().toLowerCase() !== target);
      mockStore.saveEmployees(filtered);
    } catch {}

    if (!USE_MOCK) {
      try {
        await api.delete(`/company/members/${id}`);
      } catch (e) {
        console.warn('[DELETE_EMPLOYEE] Endpoint /company/members/:id error o no disponible:', e);
      }
    }
  },
};
