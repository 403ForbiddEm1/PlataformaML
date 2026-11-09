// src/utils/password.ts
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

/** Hash de una contraseña real */
export async function hashClave(clave: string): Promise<string> {
  return bcrypt.hash(clave, BCRYPT_ROUNDS);
}

/** Comparación segura entre texto plano y hash */
export async function compararClave(clave: string, hash: string): Promise<boolean> {
  return bcrypt.compare(clave, hash);
}

/**
 * Hash precalculado para comparar cuando el correo no existe.
 * Garantiza que el tiempo de respuesta sea igual en ambos casos,
 * evitando ataques de enumeración de usuarios por tiempo (timing attack).
 */
export const CLAVE_FALSA_HASH = bcrypt.hashSync('clave-falsa-no-usar-jamas', BCRYPT_ROUNDS);

/**
 * Valida la fortaleza de la contraseña:
 * - Mínimo 8 caracteres
 * - Al menos una letra
 * - Al menos un número
 */
export function validarFortaleza(clave: string): { valida: boolean; mensaje?: string } {
  if (clave.length < 8) {
    return { valida: false, mensaje: 'La contraseña debe tener al menos 8 caracteres' };
  }
  if (!/[A-Za-z]/.test(clave)) {
    return { valida: false, mensaje: 'La contraseña debe contener al menos una letra' };
  }
  if (!/[0-9]/.test(clave)) {
    return { valida: false, mensaje: 'La contraseña debe contener al menos un número' };
  }
  return { valida: true };
}

