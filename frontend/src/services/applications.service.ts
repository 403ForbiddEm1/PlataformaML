import { Application, ApplicationStatus, ApplicationTimelineEvent } from '@/types';
import { api, USE_MOCK } from './api';
import { mockStore } from './mockData';
import { notificationsService } from './notifications.service';

export interface SubmitApplicationPayload {
  vacancyId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  idCardFile?: File | null;
  cvFile?: File | null;
}

export const applicationsService = {
  async getAll(): Promise<Application[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200));
      return mockStore.getApplications();
    }
    const response = await api.get<Application[]>('/applications');
    return response.data;
  },

  async getByCandidateEmail(email: string): Promise<Application[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200));
      return mockStore
        .getApplications()
        .filter((app) => app.candidateEmail.toLowerCase() === email.toLowerCase());
    }
    const response = await api.get<Application[]>(`/applications?email=${encodeURIComponent(email)}`);
    return response.data;
  },

  async getByVacancyId(vacancyId: string): Promise<Application[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200));
      return mockStore.getApplications().filter((app) => app.vacancyId === vacancyId);
    }
    const response = await api.get<Application[]>(`/applications?vacancyId=${vacancyId}`);
    return response.data;
  },

  async getById(id: string): Promise<Application | undefined> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 150));
      return mockStore.getApplications().find((a) => a.id === id);
    }
    const response = await api.get<Application>(`/applications/${id}`);
    return response.data;
  },

  async submitApplication(payload: SubmitApplicationPayload): Promise<Application> {
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
        candidateId: `cand-${Date.now()}`,
        candidateName: `${payload.firstName} ${payload.lastName}`,
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

    const formData = new FormData();
    formData.append('vacancyId', payload.vacancyId);
    formData.append('email', payload.email);
    formData.append('firstName', payload.firstName);
    formData.append('lastName', payload.lastName);
    formData.append('phone', payload.phone);
    if (payload.idCardFile) formData.append('idCard', payload.idCardFile);
    if (payload.cvFile) formData.append('cv', payload.cvFile);

    const response = await api.upload<Application>('/applications', formData);
    return response.data;
  },

  async updateStatus(
    id: string,
    newStatus: ApplicationStatus,
    actorName: string,
    notes?: string
  ): Promise<Application> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 400));
      const applications = mockStore.getApplications();
      const index = applications.findIndex((a) => a.id === id);
      if (index === -1) throw new Error('Postulación no encontrada');

      const app = applications[index];
      const previousStatus = app.status;
      app.status = newStatus;
      app.updatedDate = new Date().toISOString();

      if (notes) {
        app.recruiterNotes = app.recruiterNotes || [];
        app.recruiterNotes.unshift(`[${new Date().toLocaleDateString('es-DO')}] ${actorName}: ${notes}`);
      }

      // Record timeline event for audit (RF10)
      const event: ApplicationTimelineEvent = {
        id: `evt-${Date.now()}`,
        stage: newStatus,
        title: `Cambio de Estado: ${previousStatus} ➔ ${newStatus}`,
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
      app.timeline.unshift(event);
      mockStore.saveApplications(applications);

      // Trigger notification according to status change (RF09)
      const channel = newStatus === 'Preseleccionado' ? 'WhatsApp' : 'Email';
      let notifMessage = '';
      if (newStatus === 'Preseleccionado') {
        notifMessage = `¡Felicidades ${app.candidateName}! Tu perfil ha sido PRESELECCIONADO para la vacante de ${app.vacancyTitle}. El equipo de Talento Humano te contactará para coordinar la entrevista.`;
      } else if (newStatus === 'Entrevista') {
        notifMessage = `Hola ${app.candidateName}, has sido convocado a una entrevista técnica para la posición de ${app.vacancyTitle}. Revisa tu correo con los detalles del enlace.`;
      } else if (newStatus === 'Descartado') {
        notifMessage = `Estimado(a) ${app.candidateName}, agradecemos profundamente tu tiempo e interés en ${app.vacancyTitle}. En esta oportunidad hemos avanzado con otros candidatos, pero conservaremos tu perfil para futuras convocatorias.`;
      } else {
        notifMessage = `Tu postulación para ${app.vacancyTitle} se encuentra en etapa: ${newStatus}.`;
      }

      await notificationsService.sendNotification({
        recipient: app.candidateEmail,
        channel,
        title: `Actualización de Postulación: ${newStatus}`,
        message: notifMessage,
        relatedApplicationId: app.id,
      });

      return app;
    }

    const response = await api.patch<Application>(`/applications/${id}/status`, {
      status: newStatus,
      actorName,
      notes,
    });
    return response.data;
  },
};
