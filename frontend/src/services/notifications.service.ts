import { NotificationItem } from '@/types';
import { api, USE_MOCK } from './api';
import { mockStore } from './mockData';

export interface SendNotificationPayload {
  recipient: string;
  channel: 'Telegram' | 'WhatsApp' | 'Email';
  title: string;
  message: string;
  relatedApplicationId?: string;
}

export const notificationsService = {
  async getNotifications(): Promise<NotificationItem[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 150));
      return mockStore.getNotifications();
    }
    try {
      const response = await api.get<any>('/notifications');
      const list = (response.data as any)?.data ?? response.data;
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  },

  async sendNotification(payload: SendNotificationPayload): Promise<NotificationItem> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200));
      const notifs = mockStore.getNotifications();
      const newItem: NotificationItem = {
        id: `notif-${Date.now()}`,
        recipient: payload.recipient,
        channel: payload.channel,
        title: payload.title,
        message: payload.message,
        timestamp: new Date().toLocaleString('es-DO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        status: 'Entregado',
        relatedApplicationId: payload.relatedApplicationId,
      };
      notifs.unshift(newItem);
      mockStore.saveNotifications(notifs);
      return newItem;
    }

    const response = await api.post<NotificationItem>('/notifications/send', payload);
    return response.data;
  },

  /** Plantillas activas visibles para la empresa (propias + predeterminadas de la plataforma) */
  async getTemplates(): Promise<NotificationTemplateDto[]> {
    const response = await api.get<NotificationTemplateDto[]>('/company/notification-templates');
    return Array.isArray(response.data) ? response.data : [];
  },

  async saveTemplate(data: {
    evento: TemplateEvent;
    canal: TemplateChannel;
    asunto?: string | null;
    cuerpo: string;
  }): Promise<NotificationTemplateDto> {
    const response = await api.put<NotificationTemplateDto>('/company/notification-templates', data);
    return response.data;
  },

  async restoreTemplate(evento: TemplateEvent, canal: TemplateChannel): Promise<void> {
    await api.delete(`/company/notification-templates/${evento}/${canal}`);
  },
};

export type TemplateEvent =
  | 'POSTULACION_RECIBIDA'
  | 'EN_REVISION'
  | 'PRESELECCIONADA'
  | 'ENTREVISTA_1'
  | 'ENTREVISTA_2'
  | 'CONTRATADA'
  | 'RECHAZADA'
  | 'MENSAJE_NUEVO';

/** CORREO = correo electrónico · WHATSAPP = canal de mensajería instantánea (Telegram) */
export type TemplateChannel = 'CORREO' | 'WHATSAPP' | 'APP';

export interface NotificationTemplateDto {
  id: string;
  empresaId: string | null;
  evento: TemplateEvent;
  canal: TemplateChannel;
  asunto: string | null;
  cuerpo: string;
  version: number;
  activa: boolean;
}
