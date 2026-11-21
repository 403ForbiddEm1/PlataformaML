// src/routes/webhooks.routes.ts — Webhook de Telegram
import { Router, type Request, type Response } from 'express';
import { telegramService } from '../services/telegram.service';

export const webhooksRouter = Router();

webhooksRouter.post('/telegram', (req: Request, res: Response) => {
  const secretEsperado = process.env.TELEGRAM_WEBHOOK_SECRET;
  const secretRecibido = req.headers['x-telegram-bot-api-secret-token'] as string | undefined;

  if (secretEsperado && secretRecibido !== secretEsperado) {
    return res.status(401).json({ success: false, error: 'Token secreto de Telegram inválido' });
  }

  res.status(200).json({ ok: true });
  telegramService.procesarUpdateTelegram(req.body).catch((err) => {
    console.error('[TELEGRAM_WEBHOOK_ERROR]', err?.message);
  });
});
