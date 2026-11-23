import { Application, ApplicationStatus, ApplicationTimelineEvent } from '@/types';
import { api, USE_MOCK } from './api';
import { mockStore } from './mockData';
import { notificationsService } from './notifications.service';
import { candidatesService } from './candidates.service';

export interface SubmitApplicationPayload {
  vacancyId: string;
  email: string;
  firstName: string;
  lastName: string;
  age?: number;
  phone: string;
  idCardFile?: File | null;
  cvFile?: File | null;
}

function normalizeApplication(app: any): Application {
  if (!app) return app;
  return {
    ...app,
    empresaId: app.companyId || app.empresaId,
    empresaNombre: app.companyName || app.empresaNombre,
  };
}

function getDeletedUserEmails(): Set<string> {
  try {
    const list = JSON.parse(localStorage.getItem('nexo_deleted_user_emails') || '[]');
    return new Set(list.map((e: string) => (e || '').trim().toLowerCase()));
  } catch {
    return new Set();
  }
}

function filterOutDeletedCandidates(apps: Application[]): Application[] {
  const deletedEmails = getDeletedUserEmails();
  if (deletedEmails.size === 0) return apps;
  return apps.filter((app) => {
    const email = (app.candidateEmail || '').trim().toLowerCase();
    return !deletedEmails.has(email);
  });
}

const APP_STATUS_OVERRIDES_KEY = 'nexo_app_status_overrides';

interface LocalStatusOverride {
  status: ApplicationStatus;
  updatedDate: string;
  notes?: string;
  timelineEvent?: ApplicationTimelineEvent;
}

function getStatusOverrides(): Record<string, LocalStatusOverride> {
  try {
    return JSON.parse(localStorage.getItem(APP_STATUS_OVERRIDES_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function saveStatusOverride(id: string, override: LocalStatusOverride | null): void {
  try {
    const map = getStatusOverrides();
    if (!override) {
      delete map[id];
    } else {
      map[id] = override;
    }
    localStorage.setItem(APP_STATUS_OVERRIDES_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

function applyStatusOverrides(apps: Application[]): Application[] {
  const overrides = getStatusOverrides();
  const keys = Object.keys(overrides);
  if (keys.length === 0) return apps;
  return apps.map((app) => {
    const ov = overrides[app.id];
    if (!ov) return app;
    const notes = Array.isArray(app.recruiterNotes) ? [...app.recruiterNotes] : [];
    if (ov.notes && !notes.includes(ov.notes)) {
      notes.push(ov.notes);
    }
    const timeline = Array.isArray(app.timeline) ? [...app.timeline] : [];
    if (ov.timelineEvent && !timeline.some((t) => t.id === ov.timelineEvent!.id)) {
      timeline.push(ov.timelineEvent);
    }
    return {
      ...app,
      status: ov.status,
      updatedDate: ov.updatedDate,
      recruiterNotes: notes,
      timeline,
    };
  });
}

function isLocalSessionToken(): boolean {
  const token = localStorage.getItem('nexo_auth_token') || '';
  return !token || token.startsWith('local-') || token.startsWith('mock-');
}

export const applicationsService = {
  async getAll(): Promise<Application[]> {
    if (USE_MOCK) {
      const localApps = mockStore.getApplications().map(normalizeApplication);
      await new Promise((r) => setTimeout(r, 200));
      return filterOutDeletedCandidates(applyStatusOverrides(localApps));
    }
    try {
      const response = await api.get<any[]>('/applications');
      const list = Array.isArray(response.data)
        ? response.data
        : (response as any)?.data?.data && Array.isArray((response as any).data.data)
        ? (response as any).data.data
        : [];
      const remoteApps = list.map(normalizeApplication);
      mockStore.saveApplications(remoteApps);
      return filterOutDeletedCandidates(remoteApps);
    } catch {
      return [];
    }
  },

  async getByCandidateEmail(email: string): Promise<Application[]> {
    const cleanEmail = (email || '').trim().toLowerCase();
    const deletedEmails = getDeletedUserEmails();
    if (deletedEmails.has(cleanEmail)) {
      return [];
    }

    if (USE_MOCK) {
      const localApps = mockStore
        .getApplications()
        .filter((app) => (app.candidateEmail || '').trim().toLowerCase() === cleanEmail)
        .map(normalizeApplication);
      await new Promise((r) => setTimeout(r, 200));
      return filterOutDeletedCandidates(localApps);
    }
    try {
      const response = await api.get<any[]>(`/applications?email=${encodeURIComponent(cleanEmail)}`);
      const list = Array.isArray(response.data)
        ? response.data
        : (response as any)?.data?.data && Array.isArray((response as any).data.data)
        ? (response as any).data.data
        : [];
      const remoteApps = list.map(normalizeApplication);
      mockStore.saveApplications(remoteApps);
      return filterOutDeletedCandidates(remoteApps);
    } catch {
      return [];
    }
  },

  async getByVacancyId(vacancyId: string): Promise<Application[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200));
      return filterOutDeletedCandidates(
        mockStore.getApplications().filter((app) => app.vacancyId === vacancyId)
      );
    }
    try {
      const response = await api.get<any[]>(`/applications?vacancyId=${vacancyId}`);
      const list = Array.isArray(response.data)
        ? response.data
        : (response as any)?.data?.data && Array.isArray((response as any).data.data)
        ? (response as any).data.data
        : [];
      return filterOutDeletedCandidates(list.map(normalizeApplication));
    } catch {
      return filterOutDeletedCandidates(
        mockStore
          .getApplications()
          .filter((app) => app.vacancyId === vacancyId)
          .map(normalizeApplication)
      );
    }
  },

  async getById(id: string): Promise<Application | undefined> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 150));
      return mockStore.getApplications().find((a) => a.id === id);
    }
    try {
      const response = await api.get<any>(`/applications/${id}`);
      if (response.data) return normalizeApplication(response.data);
    } catch {}
    const mockApp = mockStore.getApplications().find((a) => a.id === id);
    return mockApp ? normalizeApplication(mockApp) : undefined;
  },

  async submitApplication(payload: SubmitApplicationPayload): Promise<Application> {
    // Si el postulante adjunta un CV, subirlo al backend real para que extraiga y guarde en Neon
    if (payload.cvFile) {
      try {
        await candidatesService.uploadCVDocument(payload.cvFile);
      } catch (cvErr) {
        console.warn('Error subiendo y analizando CV en el backend:', cvErr);
      }
    }

    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 600));
      const vacancies = mockStore.getVacancies();
      const vacancy = vacancies.find((v) => v.id === payload.vacancyId) || vacancies[0];

      // Generate realistic ML affinity score and factors
      const calculatedScore = Math.floor(Math.random() * 20) + 78; // 78 - 98%
      const newAppId = `app-${Date.now().toString().slice(-4)}`;

      const newTimeline: ApplicationTimelineEvent[] = [
        {
          id: `evt-${Date.now()}-1`,
          stage: 'Registro',
          title: 'Postulación Recibida en Línea',
          description: 'El candidato completó el formulario y adjuntó su CV y Cédula.',
          timestamp: new Date().toLocaleString('es-DO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          actor: `${payload.firstName} ${payload.lastName} (Candidato)`,
          channel: 'Sistema',
        },
        {
          id: `evt-${Date.now()}-2`,
          stage: 'Recibida',
          title: 'Notificación Automática de Recepción',
          description: 'Aviso automático enviado al correo y WhatsApp del postulante.',
          timestamp: new Date().toLocaleString('es-DO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          actor: 'Servicio Automático Nexo',
          channel: 'WhatsApp',
        },
        {
          id: `evt-${Date.now()}-3`,
          stage: 'En revisión',
          title: 'Clasificación Automática con Aprendizaje Automático',
          description: `El modelo RandomForest calculó un puntaje de afinidad del ${calculatedScore}%.`,
          timestamp: new Date().toLocaleString('es-DO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          actor: 'Modelo ML (FastAPI v2.4)',
          channel: 'Sistema',
        },
      ];

      const newApplication: Application = {
        id: newAppId,
        vacancyId: vacancy.id,
        vacancyTitle: vacancy.title,
        vacancyDepartment: `${vacancy.department} · ${vacancy.workMode}`,
        empresaId: (vacancy as any).companyId || (vacancy as any).empresaId,
        empresaNombre: (vacancy as any).companyName || (vacancy as any).empresaNombre,
        candidateId: `cand-${Date.now()}`,
        candidateName: `${payload.firstName} ${payload.lastName}`,
        candidateAge: payload.age || 26,
        candidateEmail: payload.email,
        candidatePhone: payload.phone,
        idCardFileName: payload.idCardFile ? payload.idCardFile.name : 'Cedula_Identidad.pdf',
        cvFileName: payload.cvFile ? payload.cvFile.name : 'Curriculum_Vitae.pdf',
        status: 'Recibida',
        appliedDate: `${new Date().toLocaleDateString('es-DO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}, ${new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })}`,
        updatedDate: new Date().toISOString(),
        mlScore: calculatedScore,
        mlBreakdown: {
          affinityScore: calculatedScore,
          experienceMatch: Math.min(100, calculatedScore + 2),
          educationMatch: Math.min(100, calculatedScore - 3),
          skillsMatch: Math.min(100, calculatedScore + 1),
          matchingSkills: vacancy.requiredSkills.slice(0, 4),
          missingSkills: vacancy.requiredSkills.slice(4),
          keyFactors: [
            'Formación universitaria compatible con el área del cargo',
            'Competencias técnicas declaradas con alta concordancia vectorial',
          ],
          explanation: `El postulante presenta una correspondencia del ${calculatedScore}% con los requisitos y competencias de ${vacancy.title}.`,
          fairnessChecked: true,
        },
        recruiterNotes: ['Postulación recién recibida a través de la convocatoria web abierta.'],
        timeline: newTimeline,
      };

      const applications = mockStore.getApplications();
      applications.unshift(newApplication);
      mockStore.saveApplications(applications);

      // Increment vacancy counter
      vacancy.appliedCount += 1;
      mockStore.saveVacancies(vacancies);

      // Trigger automatic WhatsApp & Email notifications (RF09)
      await notificationsService.sendNotification({
        recipient: payload.email,
        channel: 'WhatsApp',
        title: 'Postulación Recibida - Nexo Tecnología',
        message: `¡Hola ${payload.firstName}! Hemos recibido con éxito tu postulación para la vacante de ${vacancy.title}. Mantente atento a este canal para novedades.`,
        relatedApplicationId: newAppId,
      });

      return newApplication;
    }

    if (!USE_MOCK) {
      const formData = new FormData();
      formData.append('vacancyId', payload.vacancyId);
      formData.append('email', payload.email);
      formData.append('firstName', payload.firstName);
      formData.append('lastName', payload.lastName);
      formData.append('phone', payload.phone);
      if (payload.idCardFile) formData.append('idCard', payload.idCardFile);
      if (payload.cvFile) formData.append('cv', payload.cvFile);

      const response = await api.upload<any>('/applications', formData);
      const app = (response.data as any)?.data || response.data;
      if (app && app.id) {
        return normalizeApplication(app);
      }
      throw new Error('No se pudo registrar la postulación en el servidor.');
    }

    // Local resilient submission fallback
    const vacancies = mockStore.getVacancies();
    const vacancy = vacancies.find((v) => v.id === payload.vacancyId) || {
      id: payload.vacancyId,
      title: 'Puesto Profesional',
      department: 'Tecnología',
      location: 'Santo Domingo',
      workMode: 'Híbrido',
      type: 'Tiempo completo',
      status: 'Abierta',
      description: 'Convocatoria abierta para talento profesional.',
      requirements: ['Experiencia previa en el área'],
      requiredSkills: ['Trabajo en equipo', 'Resolución de problemas'],
      minExperienceYears: 2,
      openings: 1,
      appliedCount: 0,
      createdAt: new Date().toISOString(),
    };

    const calculatedScore = Math.floor(Math.random() * (96 - 72 + 1)) + 72;
    const newAppId = `app-${Date.now()}`;

    const newApplication: Application = {
      id: newAppId,
      vacancyId: vacancy.id,
      vacancyTitle: vacancy.title,
      vacancyDepartment: `${vacancy.department} · ${vacancy.workMode}`,
      empresaId: (vacancy as any).companyId || (vacancy as any).empresaId,
      empresaNombre: (vacancy as any).companyName || (vacancy as any).empresaNombre,
      candidateId: `cand-${Date.now()}`,
      candidateName: `${payload.firstName} ${payload.lastName}`,
      candidateAge: payload.age || 26,
      candidateEmail: payload.email,
      candidatePhone: payload.phone,
      idCardFileName: payload.idCardFile ? payload.idCardFile.name : 'Cedula_Identidad.pdf',
      cvFileName: payload.cvFile ? payload.cvFile.name : 'Curriculum_Vitae.pdf',
      status: 'Recibida',
      appliedDate: new Date().toLocaleDateString('es-DO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      updatedDate: new Date().toISOString(),
      mlScore: calculatedScore,
      mlBreakdown: {
        affinityScore: calculatedScore,
        experienceMatch: Math.min(100, calculatedScore + 2),
        educationMatch: Math.min(100, calculatedScore - 3),
        skillsMatch: Math.min(100, calculatedScore + 1),
        matchingSkills: vacancy.requiredSkills.slice(0, 4),
        missingSkills: vacancy.requiredSkills.slice(4),
        keyFactors: [
          'Formación universitaria compatible con el área del cargo',
          'Competencias técnicas declaradas con alta concordancia vectorial',
        ],
        explanation: `El postulante presenta una correspondencia del ${calculatedScore}% con los requisitos y competencias de ${vacancy.title}.`,
        fairnessChecked: true,
      },
      recruiterNotes: ['Postulación recibida a través del portal de vacantes.'],
      timeline: [
        {
          id: `evt-${Date.now()}-1`,
          stage: 'Registro',
          title: 'Postulación Recibida en Línea',
          description: 'El candidato completó el formulario y adjuntó su CV y Cédula.',
          timestamp: new Date().toLocaleString('es-DO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          actor: `${payload.firstName} ${payload.lastName} (Candidato)`,
          channel: 'Sistema',
        },
      ],
    };

    const applications = mockStore.getApplications();
    applications.unshift(newApplication);
    mockStore.saveApplications(applications);
    return newApplication;
  },

  async updateStatus(
    id: string,
    newStatus: ApplicationStatus,
    actorName: string,
    notes?: string
  ): Promise<Application> {
    if (!USE_MOCK) {
      try {
        const response = await api.patch<any>(`/applications/${id}/status`, {
          status: newStatus,
          actorName,
          notes,
        });
        const app = (response.data as any)?.data || response.data;
        if (app && app.id) {
          const normalized = normalizeApplication(app);
          saveStatusOverride(id, null);
          const applications = mockStore.getApplications();
          const idx = applications.findIndex((a) => a.id === id);
          if (idx !== -1) {
            applications[idx] = normalized;
            mockStore.saveApplications(applications);
          }
          return normalized;
        }
      } catch (err: any) {
        if (!isLocalSessionToken() && err?.response?.status) {
          throw err;
        }
        console.warn('Backend update application status failed, updating locally:', err);
      }
    }

    const nowIso = new Date().toISOString();
    const noteEntry = notes
      ? `[${new Date().toLocaleDateString('es-DO')}] ${actorName}: ${notes}`
      : undefined;
    const event: ApplicationTimelineEvent = {
      id: `evt-${Date.now()}`,
      stage: newStatus,
      title: `Cambio de Estado: ${newStatus}`,
      description: notes
        ? `Decisión tomada por ${actorName}. Justificación: ${notes}`
        : `Estado actualizado a ${newStatus} por ${actorName}.`,
      timestamp: new Date().toLocaleString('es-DO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      actor: actorName,
      channel: 'Sistema',
    };

    saveStatusOverride(id, {
      status: newStatus,
      updatedDate: nowIso,
      notes: noteEntry,
      timelineEvent: event,
    });

    const applications = mockStore.getApplications();
    const index = applications.findIndex((a) => a.id === id);
    if (index === -1) {
      const fallbackApp: Application = {
        id,
        vacancyId: 'vac-01',
        vacancyTitle: 'Vacante',
        vacancyDepartment: 'General',
        candidateId: 'cand-01',
        candidateName: 'Postulante',
        candidateEmail: '',
        candidatePhone: '',
        status: newStatus,
        appliedDate: new Date().toLocaleDateString('es-DO'),
        updatedDate: nowIso,
        mlScore: 85,
        recruiterNotes: noteEntry ? [noteEntry] : [],
        timeline: [event],
      };
      return fallbackApp;
    }

    const app = applications[index];
    const previousStatus = app.status;
    app.status = newStatus;
    app.updatedDate = nowIso;

    if (noteEntry) {
      app.recruiterNotes = app.recruiterNotes || [];
      app.recruiterNotes.unshift(noteEntry);
    }

    // Record timeline event for audit (RF10)
    event.title = `Cambio de Estado: ${previousStatus} ➔ ${newStatus}`;
    app.timeline = app.timeline || [];
    app.timeline.unshift(event);
    mockStore.saveApplications(applications);

    return normalizeApplication(app);
  },

  async quickNotify(
    applicationId: string,
    payload: {
      channel: 'AMBOS' | 'TELEGRAM' | 'CORREO';
      status?: string;
      message?: string;
      companyLogoUrl?: string;
    }
  ): Promise<{ application: Application; sentChannels: string[] }> {
    const res = await api.post<any>(`/applications/${applicationId}/quick-notify`, payload);
    const data = (res.data as any)?.data || res.data;
    return {
      application: normalizeApplication(data?.application || data),
      sentChannels: Array.isArray(data?.sentChannels) ? data.sentChannels : [],
    };
  },

  async bulkRejectBelow50(payload: {
    vacancyId?: string;
    threshold?: number;
    channel?: 'AMBOS' | 'TELEGRAM' | 'CORREO';
    companyLogoUrl?: string;
  }): Promise<{ rejectedCount: number; ids: string[] }> {
    const res = await api.post<any>('/applications/bulk-reject-below-50', payload);
    const data = (res.data as any)?.data || res.data;
    return {
      rejectedCount: Number(data?.rejectedCount || 0),
      ids: Array.isArray(data?.ids) ? data.ids : [],
    };
  },
};

export type NotifyChannel = 'AMBOS' | 'TELEGRAM' | 'CORREO';
