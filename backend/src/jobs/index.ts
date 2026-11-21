// src/jobs/index.ts
// Orquestador de trabajos en segundo plano (notificaciones, empresas inactivas y limpieza).
import { notificationService } from '../services/notification.service';
import { telegramService } from '../services/telegram.service';
import { ejecutarRevisionEmpresas } from './empresas.job';
import { ejecutarLimpiezaTokens } from './limpieza.job';

let intervalos: NodeJS.Timeout[] = [];

export function iniciarJobs(): void {
  if (process.env.NODE_ENV === 'test') return;

  // Iniciar sincronización bidireccional con Telegram Bot API (si TELEGRAM_BOT_TOKEN está en .env)
  telegramService.iniciarPolling();

  // Ejecutar una pasada inicial sin bloquear el arranque
  notificationService.procesarCola().catch(() => {});
  ejecutarRevisionEmpresas().catch(() => {});
  ejecutarLimpiezaTokens().catch(() => {});

  // Worker de notificaciones cada 60 segundos
  const tNotif = setInterval(() => {
    notificationService.procesarCola().catch(() => {});
  }, 60 * 1000);

  // Revisión de empresas y limpieza de tokens cada 24 horas
  const tDiario = setInterval(() => {
    ejecutarRevisionEmpresas().catch(() => {});
    ejecutarLimpiezaTokens().catch(() => {});
  }, 24 * 60 * 60 * 1000);

  tNotif.unref();
  tDiario.unref();
  intervalos = [tNotif, tDiario];
}

export function detenerJobs(): void {
  telegramService.detenerPolling();
  for (const t of intervalos) clearInterval(t);
  intervalos = [];
}

