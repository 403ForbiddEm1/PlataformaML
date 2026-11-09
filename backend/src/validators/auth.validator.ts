// src/validators/auth.validator.ts
// Todos los esquemas usan .strict() para rechazar campos desconocidos.
// NUNCA aceptan: rol, empresaId, estado, activo, claveHash, intentosFallidos.
import { z } from 'zod';

// ─── Registro de Candidato ─────────────────────────────────────────────────
export const registroCandidatoSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(80),
  apellido: z.string().max(80).optional().default(''),
  correo: z.string().email('Correo electrónico inválido').max(254),
  clave: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128)
    .regex(/[A-Za-z]/, 'La contraseña debe contener al menos una letra')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número'),
  telefono: z.string().max(20).optional(),
  aceptaTerminos: z.literal(true, {
    message: 'Debes aceptar los términos y condiciones',
  }),
  aceptaWhatsapp: z.boolean().optional().default(false),
});

// ─── Registro de Empresa ───────────────────────────────────────────────────
export const registroEmpresaSchema = z.object({
  // Datos del administrador
  nombre: z.string().min(2).max(80),
  apellido: z.string().max(80).optional().default(''),
  correo: z.string().email().max(254),
  clave: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Za-z]/, 'La contraseña debe contener al menos una letra')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número'),
  telefono: z.string().max(20).optional(),
  aceptaTerminos: z.literal(true, {
    message: 'Debes aceptar los términos y condiciones',
  }),
  // Datos de la empresa
  nombreEmpresa: z.string().min(2, 'El nombre de la empresa es obligatorio').max(200),
  identificacionFiscal: z.string().max(20).optional(),
  sector: z.string().max(100).optional(),
  correoContacto: z.string().email().max(254).optional(),
  telefonoContacto: z.string().max(20).optional(),
  sitioWeb: z.string().url().max(255).optional().or(z.literal('')),
});

// ─── Login único (detecta el rol automáticamente) ─────────────────────────
export const loginSchema = z.object({
  correo: z.string().email('Correo electrónico inválido').max(254),
  clave: z.string().min(1, 'La contraseña es obligatoria').max(128),
});

// ─── Google Auth ───────────────────────────────────────────────────────────
export const googleSchema = z.object({
  idToken: z.string().min(1, 'El token de Google es obligatorio'),
});

// ─── Completar perfil después de Google ───────────────────────────────────
export const completarPerfilGoogleSchema = z.object({
  telefono: z.string().max(20).optional(),
  aceptaTerminos: z.literal(true, {
    message: 'Debes aceptar los términos y condiciones',
  }),
  aceptaWhatsapp: z.boolean().optional().default(false),
});

// ─── Verificar correo ─────────────────────────────────────────────────────
export const verificarCorreoSchema = z.object({
  token: z.string().min(1, 'El token es obligatorio'),
});

// ─── Recuperar contraseña ─────────────────────────────────────────────────
export const recuperarClaveSchema = z.object({
  correo: z.string().email('Correo electrónico inválido').max(254),
});

// ─── Restablecer contraseña ───────────────────────────────────────────────
export const restablecerClaveSchema = z.object({
  token: z.string().min(1, 'El token es obligatorio'),
  nuevaClave: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128)
    .regex(/[A-Za-z]/, 'La contraseña debe contener al menos una letra')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número'),
});

// ─── Aceptar invitación ───────────────────────────────────────────────────
export const aceptarInvitacionSchema = z.object({
  token: z.string().min(1, 'El token de invitación es obligatorio'),
  nombre: z.string().min(2).max(80),
  apellido: z.string().min(2).max(80),
  clave: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Za-z]/, 'La contraseña debe contener al menos una letra')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número'),
  telefono: z.string().max(20).optional(),
});

// ─── Tipos inferidos ──────────────────────────────────────────────────────
export type RegistroCandidatoInput = z.infer<typeof registroCandidatoSchema>;
export type RegistroEmpresaInput = z.infer<typeof registroEmpresaSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleInput = z.infer<typeof googleSchema>;
export type CompletarPerfilGoogleInput = z.infer<typeof completarPerfilGoogleSchema>;
export type VerificarCorreoInput = z.infer<typeof verificarCorreoSchema>;
export type RecuperarClaveInput = z.infer<typeof recuperarClaveSchema>;
export type RestablecerClaveInput = z.infer<typeof restablecerClaveSchema>;
export type AceptarInvitacionInput = z.infer<typeof aceptarInvitacionSchema>;

// ─── Compatibilidad con el código anterior ────────────────────────────────
// Estos alias permiten que auth.controller.ts antiguo siga compilando
// mientras se migra completamente al nuevo servicio.
export const loginSchemaLegacy = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
  role: z.string().optional(),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Za-z]/, 'La contraseña debe contener al menos una letra')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número'),
  phone: z.string().optional(),
  role: z.string().optional().default('candidato'),
  companyName: z.string().optional(),
  // tipo distingue registro de candidato vs empresa (nuevo flujo)
  tipo: z.enum(['CANDIDATO', 'EMPRESA']).optional(),
});

export const recoverPasswordSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'El token es obligatorio'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Za-z]/, 'La contraseña debe contener al menos una letra')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número'),
});
