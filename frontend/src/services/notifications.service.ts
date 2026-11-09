import { NotificationItem } from '@/types';
import { api } from './api';

export interface SendNotificationPayload {
  recipient: string;
  channel: 'WhatsApp' | 'Email';
  title: string;
  message: string;
  relatedApplicationId?: string;
}

export interface NotificationTemplateDto {
  evento: string;
  canal: 'CORREO' | 'WHATSAPP';
  asunto: string | null;
  cuerpo: string;
  activa: boolean;
  esPersonalizada: boolean;
}

export const notificationsService = {
  async getNotifications(): Promise<NotificationItem[]> {
    const response = await api.get<NotificationItem[]>('/notifications');
    return response.data;
  },

  async sendNotification(payload: SendNotificationPayload): Promise<NotificationItem> {
    const response = await api.post<NotificationItem>('/notifications/send', payload);
    return response.data;
  },

  async getTemplates(): Promise<NotificationTemplateDto[]> {
    const response = await api.get<NotificationTemplateDto[]>('/notifications/templates');
    return response.data;
  },

  async updateTemplate(
    evento: string,
    canal: 'CORREO' | 'WHATSAPP',
    datos: { asunto?: string | null; cuerpo: string; activa?: boolean },
  ): Promise<NotificationTemplateDto> {
    const response = await api.put<NotificationTemplateDto>(
      `/notifications/templates/${encodeURIComponent(evento)}/${encodeURIComponent(canal)}`,
      datos,
    );
    return response.data;
  },

  async resetTemplate(evento: string, canal: 'CORREO' | 'WHATSAPP'): Promise<{ mensaje: string }> {
    const response = await api.delete<{ mensaje: string }>(
      `/notifications/templates/${encodeURIComponent(evento)}/${encodeURIComponent(canal)}`,
    );
    return response.data;
  },
};
