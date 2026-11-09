import { api } from './api';

export interface ChatMessageDto {
  id: string;
  conversacionId: string;
  remitenteId: string;
  cuerpo: string;
  leidoEn: string | null;
  creadoEn: string;
  remitente?: {
    id: string;
    nombre: string;
    apellido: string;
    rol: string;
    urlFoto: string | null;
  };
}

export interface ChatConversationDto {
  id: string;
  empresaId: string;
  candidatoId: string;
  postulacionId: string;
  ultimoMensajeEn: string | null;
  creadoEn: string;
  empresa?: { id: string; nombre: string; urlLogo: string | null };
  candidato?: { id: string; nombre: string; apellido: string; correo: string; urlFoto: string | null };
  postulacion?: {
    id: string;
    estado: string;
    vacante: { id: string; titulo: string; departamento: string | null };
  };
  mensajes?: ChatMessageDto[];
  noLeidos?: number;
}

export const chatService = {
  async getConversations(): Promise<ChatConversationDto[]> {
    const response = await api.get<ChatConversationDto[]>('/chat/conversations');
    return response.data;
  },

  async getMessages(conversationId: string): Promise<ChatMessageDto[]> {
    const response = await api.get<ChatMessageDto[]>(`/chat/conversations/${conversationId}/messages`);
    return response.data;
  },

  async sendMessage(conversationId: string, cuerpo: string): Promise<ChatMessageDto> {
    const response = await api.post<ChatMessageDto>(`/chat/conversations/${conversationId}/messages`, {
      cuerpo,
    });
    return response.data;
  },

  async markAsRead(conversationId: string): Promise<{ actualizados: number }> {
    const response = await api.patch<{ actualizados: number }>(`/chat/conversations/${conversationId}/read`);
    return response.data;
  },
};

