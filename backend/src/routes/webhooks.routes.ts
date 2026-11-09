// src/routes/webhooks.routes.ts — Webhook de WhatsApp (Meta Cloud API, Sección 7.3)
import { Router, type Request, type Response } from 'express';
import { whatsappService } from '../services/whatsapp.service';

export const webhooksRouter = Router();

// Verificación inicial cuando se registra el webhook en el panel de Meta
webhooksRouter.get('/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && verifyToken && token === verifyToken) {
    return res.status(200).send(String(challenge ?? ''));
  }
  return res.status(403).json({ success: false, error: 'Token de verificación inválido' });
});

// Recepción de eventos: exige firma HMAC-SHA256 válida sobre el cuerpo crudo
webhooksRouter.post('/whatsapp', (req: Request, res: Response) => {
  const firma = req.headers['x-hub-signature-256'] as string | undefined;
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;

  if (!whatsappService.verificarFirmaWebhook(rawBody, firma)) {
    return res.status(401).json({ success: false, error: 'Firma inválida' });
  }

  // Responder 200 de inmediato (Meta reintenta si tarda) y procesar después
  res.status(200).json({ success: true });
  whatsappService.procesarWebhook(req.body).catch((err) => {
    console.error('[WHATSAPP_WEBHOOK_ERROR]', err?.message);
  });
});

