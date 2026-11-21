import { api } from './api';

/** Forma real que devuelve el backend (chat.service.ts del backend) */
export interface ChatMessageDto {
  id: string;
  conversacionId: string;
  autorId: string;
  contenido: string;
  leidoEn: string | null;
  creadoEn: string;
  canalEnvio?: 'WEB' | 'TELEGRAM';
  autor?: {
    id: string;
    nombre: string;
    apellido: string;
    rol: 'SUPER_ADMIN' | 'ADMIN' | 'RRHH' | 'CANDIDATO';
  };
}

export interface ChatConversationDto {
  id: string;
  empresaId: string;
  empresaNombre: string;
  candidatoId: string;
  candidatoNombre: string;
  postulacionId: string | null;
  vacanteTitulo: string;
  ultimoMensaje: {
    id: string;
    autorId: string;
    contenido: string;
    leidoEn: string | null;
    creadoEn: string;
  } | null;
  ultimoMensajeEn: string | null;
  cerradaEn: string | null;
  noLeidos: number;
  telegramVinculado?: boolean;
}

export const chatService = {
  async getConversations(): Promise<ChatConversationDto[]> {
    const response = await api.get<ChatConversationDto[]>('/conversations');
    return Array.isArray(response.data) ? response.data : [];
  },

  async getMessages(conversationId: string, after?: string): Promise<ChatMessageDto[]> {
    const qs = after ? `?after=${encodeURIComponent(after)}` : '';
    const response = await api.get<ChatMessageDto[]>(`/conversations/${conversationId}/messages${qs}`);
    return Array.isArray(response.data) ? response.data : [];
  },

  async sendMessage(conversationId: string, contenido: string): Promise<ChatMessageDto> {
    const response = await api.post<ChatMessageDto>(`/conversations/${conversationId}/messages`, {
      contenido,
    });
    return response.data;
  },

  async markAsRead(conversationId: string): Promise<{ marcados: number }> {
    const response = await api.patch<{ marcados: number }>(`/conversations/${conversationId}/read`);
    return response.data;
  },
};
