// src/middlewares/rate-limit.middleware.ts
import rateLimit from 'express-rate-limit';

const mensaje = { success: false, error: 'Demasiados intentos. Inténtalo más tarde.' };

// login, registro y Google: 10 intentos por 15 min por IP
export const limiteAutenticacion = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: mensaje,
});

// recuperar clave y reenviar verificación: 5 por hora
export const limiteRecuperacion = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: mensaje,
});

