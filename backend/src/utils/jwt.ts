// src/utils/jwt.ts
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface TokenPayload {
  sub: string; // id del usuario; el rol NO va en el token, se lee de la base
  iat?: number; // segundo en que se emitió (para invalidar sesiones tras cambio de clave)
}

export function firmarToken(usuarioId: string): string {
  return jwt.sign({ sub: usuarioId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

export function verificarToken(token: string): TokenPayload {
  const payload = jwt.verify(token, env.JWT_SECRET);
  if (typeof payload === 'string' || typeof payload.sub !== 'string') {
    throw new Error('Token inválido');
  }
  return { sub: payload.sub, iat: typeof payload.iat === 'number' ? payload.iat : undefined };
}
