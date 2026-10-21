import { NotificationItem } from '@/types';
import { api, USE_MOCK } from './api';
import { mockStore } from './mockData';

export interface SendNotificationPayload {
  recipient: string;
  channel: 'WhatsApp' | 'Email';
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
    const response = await api.get<NotificationItem[]>('/notifications');
    return response.data;
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
};
