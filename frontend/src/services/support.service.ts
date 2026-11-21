import { api } from './api';

export type SupportPriority = 'Baja' | 'Media' | 'Alta' | 'Crítica';
export type SupportStatus = 'Abierto' | 'En Revisión' | 'Resuelto';

export type SupportCategory =
  | 'Queja o Reclamo'
  | 'Problema Técnico'
  | 'Evaluación IA / CV'
  | 'Postulación o Vacante'
  | 'Cuenta y Acceso'
  | 'Sugerencia / Otro';

export interface SupportTicket {
  id: string;
  folio: string;
  createdAt: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderRole: string;
  senderPhone?: string;
  empresaNombre?: string;
  categoria: SupportCategory | string;
  prioridad: SupportPriority;
  moduloAfectado: string;
  asunto: string;
  queja: string;
  estado: SupportStatus;
  respuestaAdmin?: string;
  atendidoPor?: string;
  actualizadoEn?: string;
}

const STORAGE_KEY = 'nexo_support_tickets_v1';

const FALLBACK_SEED: SupportTicket[] = [];

function readLocalTickets(): SupportTicket[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const cleaned = parsed.filter((t) => t.id !== 'tck-seed-1' && t.id !== 'tck-seed-2');
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [...FALLBACK_SEED];
  }
}

function writeLocalTickets(tickets: SupportTicket[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
    window.dispatchEvent(new CustomEvent('support-tickets-updated'));
  } catch {
    // ignore storage errors
  }
}

export const supportService = {
  async getTickets(): Promise<SupportTicket[]> {
    try {
      const res = await api.get<SupportTicket[]>('/support/tickets');
      if (Array.isArray(res.data)) {
        writeLocalTickets(res.data);
        return res.data;
      }
    } catch {
      // fallback a almacenamiento local si el endpoint aún no se recargó
    }
    return readLocalTickets().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },

  async createTicket(payload: {
    senderId: string;
    senderName: string;
    senderEmail: string;
    senderRole: string;
    senderPhone?: string;
    empresaNombre?: string;
    categoria: string;
    prioridad: SupportPriority;
    moduloAfectado: string;
    asunto: string;
    queja: string;
  }): Promise<SupportTicket> {
    try {
      const res = await api.post<SupportTicket>('/support/tickets', payload);
      if (res.data?.id) {
        const current = readLocalTickets().filter((t) => t.id !== res.data.id);
        writeLocalTickets([res.data, ...current]);
        return res.data;
      }
    } catch {
      // fallback local
    }

    const current = readLocalTickets();
    const created: SupportTicket = {
      id: `tck-${Date.now()}`,
      folio: `TCK-${2042 + current.length}`,
      createdAt: new Date().toISOString(),
      ...payload,
      estado: 'Abierto',
    };
    writeLocalTickets([created, ...current]);
    return created;
  },

  async updateTicket(
    id: string,
    payload: { estado?: SupportStatus; respuestaAdmin?: string; atendidoPor?: string },
  ): Promise<SupportTicket> {
    try {
      const res = await api.patch<SupportTicket>(`/support/tickets/${id}`, payload);
      if (res.data?.id) {
        const current = readLocalTickets().map((t) => (t.id === id ? res.data : t));
        writeLocalTickets(current);
        return res.data;
      }
    } catch {
      // fallback local
    }

    const current = readLocalTickets();
    let updatedTicket: SupportTicket | undefined;
    const next = current.map((t) => {
      if (t.id !== id) return t;
      updatedTicket = {
        ...t,
        ...payload,
        actualizadoEn: new Date().toISOString(),
      };
      return updatedTicket;
    });
    writeLocalTickets(next);
    if (!updatedTicket) throw new Error('Ticket no encontrado');
    return updatedTicket;
  },
};
