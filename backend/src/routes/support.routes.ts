import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export interface SupportTicketRecord {
  id: string;
  folio: string;
  createdAt: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderRole: string;
  senderPhone?: string;
  empresaNombre?: string;
  categoria: string;
  prioridad: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  moduloAfectado: string;
  asunto: string;
  queja: string;
  estado: 'Abierto' | 'En Revisión' | 'Resuelto';
  respuestaAdmin?: string;
  atendidoPor?: string;
  actualizadoEn?: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'support-tickets.json');

const SEED_TICKETS: SupportTicketRecord[] = [];

function readTickets(): SupportTicketRecord[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_TICKETS, null, 2), 'utf8');
      return [...SEED_TICKETS];
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...SEED_TICKETS];
  } catch {
    return [...SEED_TICKETS];
  }
}

function writeTickets(tickets: SupportTicketRecord[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(tickets, null, 2), 'utf8');
  } catch {
    // fallback silencioso si el FS está bloqueado
  }
}

export const supportRouter = Router();

supportRouter.get('/tickets', (_req: Request, res: Response) => {
  const tickets = readTickets().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  res.json({ success: true, data: tickets });
});

supportRouter.post('/tickets', (req: Request, res: Response) => {
  const body = req.body || {};
  const tickets = readTickets();
  const nextNumber = 2042 + tickets.length;
  const nowIso = new Date().toISOString();

  const newTicket: SupportTicketRecord = {
    id: `tck-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    folio: `TCK-${nextNumber}`,
    createdAt: nowIso,
    senderId: String(body.senderId || 'anon'),
    senderName: String(body.senderName || 'Usuario PlataformaML').trim(),
    senderEmail: String(body.senderEmail || 'sin-correo@plataformaml.com').trim(),
    senderRole: String(body.senderRole || 'candidato').trim(),
    senderPhone: body.senderPhone ? String(body.senderPhone).trim() : undefined,
    empresaNombre: body.empresaNombre ? String(body.empresaNombre).trim() : undefined,
    categoria: String(body.categoria || 'Queja o Reclamo').trim(),
    prioridad: (['Baja', 'Media', 'Alta', 'Crítica'].includes(body.prioridad)
      ? body.prioridad
      : 'Media') as SupportTicketRecord['prioridad'],
    moduloAfectado: String(body.moduloAfectado || 'General').trim(),
    asunto: String(body.asunto || 'Reporte de soporte').trim(),
    queja: String(body.queja || '').trim(),
    estado: 'Abierto',
  };

  tickets.unshift(newTicket);
  writeTickets(tickets);
  res.status(201).json({ success: true, data: newTicket });
});

supportRouter.patch('/tickets/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body || {};
  const tickets = readTickets();
  const idx = tickets.findIndex((t) => t.id === id);
  if (idx === -1) {
    res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    return;
  }

  const current = tickets[idx];
  const updated: SupportTicketRecord = {
    ...current,
    estado: (['Abierto', 'En Revisión', 'Resuelto'].includes(body.estado)
      ? body.estado
      : current.estado) as SupportTicketRecord['estado'],
    respuestaAdmin:
      body.respuestaAdmin !== undefined ? String(body.respuestaAdmin).trim() : current.respuestaAdmin,
    atendidoPor: body.atendidoPor ? String(body.atendidoPor).trim() : current.atendidoPor || 'Superadmin Global',
    actualizadoEn: new Date().toISOString(),
  };

  tickets[idx] = updated;
  writeTickets(tickets);
  res.json({ success: true, data: updated });
});
