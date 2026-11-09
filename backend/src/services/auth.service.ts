// src/services/auth.service.ts
// Toda la lógica de negocio de autenticación.
// NUNCA recibe req ni res: recibe parámetros simples y devuelve datos.
import crypto from 'crypto';
import { prisma } from '../config/database';
import { HttpError } from '../utils/http-error';
import { hashClave, compararClave, CLAVE_FALSA_HASH } from '../utils/password';
import { firmarToken } from '../utils/jwt';
import { auditService } from './audit.service';
import { emailService } from './email.service';
import {
  Rol,
  EstadoEmpresa,
  TipoToken,
} from '@prisma/client';
import type {
  RegistroCandidatoInput,
  RegistroEmpresaInput,
  LoginInput,
  RestablecerClaveInput,
  AceptarInvitacionInput,
} from '../validators/auth.validator';
import { rolToFrontend, type UserResponse } from '../types';

// ─── Helpers internos ──────────────────────────────────────────────────────

function generarTokenPlano(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function mapearUsuario(usuario: any): UserResponse {
  return {
    id: usuario.id,
    email: usuario.correo,
    name: `${usuario.nombre} ${usuario.apellido}`.trim(),
    role: rolToFrontend(usuario.rol),
    avatar: `${usuario.nombre?.[0] ?? ''}${usuario.apellido?.[0] ?? ''}`.toUpperCase(),
    phone: usuario.telefono ?? undefined,
    companyId: usuario.empresaId ?? null,
    companyName: usuario.empresa?.nombre ?? null,
    createdAt: usuario.creadoEn.toISOString(),
  };
}

// ─── 1. Registro de Candidato ─────────────────────────────────────────────

export async function registrarCandidato(
  datos: RegistroCandidatoInput,
  ip?: string,
): Promise<{ mensaje: string; user: UserResponse; token: string }> {
  const correo = datos.correo.toLowerCase().trim();

  // ¿Ya existe?
  const existente = await prisma.usuario.findUnique({ where: { correo } });
  if (existente) throw new HttpError(409, 'Ya existe una cuenta con ese correo');

  const claveHash = await hashClave(datos.clave);
  const autoVerificar = !process.env.SMTP_HOST;

  // Transacción: usuario + perfil vacío
  const usuario = await prisma.$transaction(async (tx) => {
    const u = await tx.usuario.create({
      data: {
        correo,
        claveHash,
        nombre: datos.nombre.trim(),
        apellido: (datos.apellido ?? '').trim(),
        telefono: datos.telefono ?? null,
        rol: Rol.CANDIDATO,          // el servidor fija el rol
        empresaId: null,              // candidatos no tienen empresa
        aceptoTerminosEn: new Date(),
        correoVerificadoEn: autoVerificar ? new Date() : null,
        consentimientoWhatsappEn: datos.aceptaWhatsapp ? new Date() : null,
      },
    });

    await tx.perfilCandidato.create({
      data: {
        usuarioId: u.id,
        habilidades: [],
        idiomas: ['Español'],
      },
    });

    return u;
  });

  // Token de verificación de correo
  const rawToken = generarTokenPlano();
  await prisma.tokenUsuario.create({
    data: {
      usuarioId: usuario.id,
      tipo: TipoToken.VERIFICACION_CORREO,
      tokenHash: hashToken(rawToken),
      expiraEn: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 h
    },
  });

  // Enviar correo (fallo no rompe el flujo)
  const appUrl = process.env.APP_URL ?? 'http://localhost:5173';
  await emailService.sendEmail({
    to: usuario.correo,
    subject: 'Verifica tu correo — Plataforma de Reclutamiento',
    text: `Hola ${usuario.nombre},\n\nVerifica tu correo haciendo clic en el siguiente enlace:\n${appUrl}/verify-email?token=${rawToken}\n\nEl enlace expira en 24 horas.\n\nSi no creaste esta cuenta, ignora este mensaje.`,
    usuarioId: usuario.id,
    tipo: 'VERIFICACION_CORREO',
  }).catch(() => {/* fallo no crítico */});

  // Auditoría
  await auditService.log({
    usuarioId: usuario.id,
    accion: 'REGISTRO_CANDIDATO',
    entidad: 'Usuario',
    entidadId: usuario.id,
    ip,
  });

  const token = firmarToken(usuario.id);
  return {
    mensaje: 'Revisa tu correo para verificar tu cuenta',
    user: mapearUsuario(usuario),
    token,
  };
}

// ─── 2. Registro de Empresa ───────────────────────────────────────────────

export async function registrarEmpresa(
  datos: RegistroEmpresaInput,
  ip?: string,
): Promise<{ mensaje: string }> {
  const correo = datos.correo.toLowerCase().trim();

  // ¿Correo ya registrado?
  const existeUsuario = await prisma.usuario.findUnique({ where: { correo } });
  if (existeUsuario) throw new HttpError(409, 'Ya existe una cuenta con ese correo');

  // ¿Empresa con mismo nombre o identificación fiscal?
  const empresaNombre = datos.nombreEmpresa.trim();
  const existeEmpresaNombre = await prisma.empresa.findFirst({
    where: { nombre: empresaNombre },
  });
  if (existeEmpresaNombre) throw new HttpError(409, 'Ya existe una empresa con ese nombre');

  if (datos.identificacionFiscal) {
    const existeRif = await prisma.empresa.findFirst({
      where: { identificacionFiscal: datos.identificacionFiscal.trim() },
    });
    if (existeRif) throw new HttpError(409, 'Ya existe una empresa con esa identificación fiscal');
  }

  // Detectar correo de dominio gratuito (solo para auditoría, no bloquea)
  const dominiosGratuitos = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'live.com'];
  const dominioCorreo = correo.split('@')[1] ?? '';
  const correoCorporativo = !dominiosGratuitos.includes(dominioCorreo);

  const claveHash = await hashClave(datos.clave);

  // Transacción: empresa + admin
  const { usuario, empresa } = await prisma.$transaction(async (tx) => {
    const emp = await tx.empresa.create({
      data: {
        nombre: empresaNombre,
        razonSocial: empresaNombre,
        identificacionFiscal: datos.identificacionFiscal?.trim() ?? null,
        sector: datos.sector?.trim() ?? null,
        correoContacto: datos.correoContacto?.toLowerCase().trim() ?? correo,
        telefonoContacto: datos.telefonoContacto ?? null,
        sitioWeb: datos.sitioWeb || null,
        estado: EstadoEmpresa.PENDIENTE_APROBACION, // el servidor fija el estado
      },
    });

    const u = await tx.usuario.create({
      data: {
        correo,
        claveHash,
        nombre: datos.nombre.trim(),
        apellido: datos.apellido.trim(),
        telefono: datos.telefono ?? null,
        rol: Rol.ADMIN,              // el servidor fija el rol
        empresaId: emp.id,
        aceptoTerminosEn: new Date(),
      },
    });

    return { usuario: u, empresa: emp };
  });

  // Token de verificación de correo del administrador
  const rawToken = generarTokenPlano();
  await prisma.tokenUsuario.create({
    data: {
      usuarioId: usuario.id,
      tipo: TipoToken.VERIFICACION_CORREO,
      tokenHash: hashToken(rawToken),
      expiraEn: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const appUrl = process.env.APP_URL ?? 'http://localhost:5173';
  await emailService.sendEmail({
    to: usuario.correo,
    subject: 'Verifica tu correo — Plataforma de Reclutamiento',
    text: `Hola ${usuario.nombre},\n\nTu empresa "${empresa.nombre}" ha sido registrada y está pendiente de aprobación.\n\nVerifica tu correo: ${appUrl}/verify-email?token=${rawToken}\n\nTe notificaremos cuando tu empresa sea aprobada.`,
    usuarioId: usuario.id,
    tipo: 'VERIFICACION_CORREO',
  }).catch(() => {});

  // Auditoría
  await auditService.log({
    usuarioId: usuario.id,
    empresaId: empresa.id,
    accion: 'EMPRESA_REGISTRADA',
    entidad: 'Empresa',
    entidadId: empresa.id,
    detalle: { correoCorporativo },
    ip,
  });

  return { mensaje: 'Tu empresa quedó registrada y pendiente de aprobación. Revisa tu correo.' };
}

// ─── 3. Login único ───────────────────────────────────────────────────────

export async function login(
  datos: LoginInput,
  ip?: string,
): Promise<{ user: UserResponse; token: string; correoVerificado: boolean }> {
  const correo = datos.correo.toLowerCase().trim();

  const usuario = await prisma.usuario.findUnique({
    where: { correo },
    include: { empresa: true },
  });

  // Si no existe: comparar contra hash falso para igualar tiempos y luego rechazar
  if (!usuario) {
    await compararClave(datos.clave, CLAVE_FALSA_HASH).catch(() => {});
    throw new HttpError(401, 'Credenciales inválidas');
  }

  // Bloqueo por intentos fallidos
  if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
    await auditService.log({
      usuarioId: usuario.id,
      accion: 'LOGIN_FALLIDO',
      entidad: 'Usuario',
      entidadId: usuario.id,
      ip,
    });
    throw new HttpError(403, 'Cuenta bloqueada temporalmente. Inténtalo más tarde.');
  }

  // Cuenta solo-Google (claveHash = null)
  if (!usuario.claveHash) {
    await compararClave(datos.clave, CLAVE_FALSA_HASH).catch(() => {});
    throw new HttpError(401, 'Credenciales inválidas');
  }

  // Verificar contraseña
  const coincide = await compararClave(datos.clave, usuario.claveHash);
  if (!coincide) {
    const nuevosIntentos = usuario.intentosFallidos + 1;
    const bloquear = nuevosIntentos >= 5;
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        intentosFallidos: nuevosIntentos,
        bloqueadoHasta: bloquear ? new Date(Date.now() + 15 * 60 * 1000) : null,
      },
    });

    await auditService.log({
      usuarioId: usuario.id,
      accion: bloquear ? 'CUENTA_BLOQUEADA' : 'LOGIN_FALLIDO',
      entidad: 'Usuario',
      entidadId: usuario.id,
      ip,
    });

    throw new HttpError(401, 'Credenciales inválidas');
  }

  // Cuenta desactivada
  if (!usuario.activo) throw new HttpError(403, 'Esta cuenta ha sido desactivada');

  // Estado de la empresa (si aplica)
  if (usuario.empresaId && usuario.empresa) {
    const estadoEmpresa = usuario.empresa.estado;
    if (estadoEmpresa === EstadoEmpresa.PENDIENTE_APROBACION) {
      throw new HttpError(403, 'Tu empresa está pendiente de aprobación por el administrador de la plataforma.');
    }
    if (estadoEmpresa === EstadoEmpresa.RECHAZADA) {
      throw new HttpError(403, 'El registro de tu empresa fue rechazado. Contacta al soporte.');
    }
    if (estadoEmpresa === EstadoEmpresa.SUSPENDIDA) {
      throw new HttpError(403, 'Tu empresa está suspendida. Contacta al soporte.');
    }
    // Verificar vencimiento de activaHasta
    if (usuario.empresa.activaHasta && usuario.empresa.activaHasta < new Date()) {
      throw new HttpError(403, 'El período de acceso de tu empresa ha vencido. Contacta al soporte.');
    }
  }

  // Login exitoso: resetear intentos y actualizar último acceso
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      intentosFallidos: 0,
      bloqueadoHasta: null,
      ultimoAccesoEn: new Date(),
    },
  });

  await auditService.log({
    usuarioId: usuario.id,
    empresaId: usuario.empresaId,
    accion: 'LOGIN_EXITOSO',
    entidad: 'Usuario',
    entidadId: usuario.id,
    ip,
  });

  const token = firmarToken(usuario.id);
  const correoVerificado = !!usuario.correoVerificadoEn;

  return { user: mapearUsuario(usuario), token, correoVerificado };
}

// ─── 4. Verificar correo ──────────────────────────────────────────────────

export async function verificarCorreo(tokenPlano: string): Promise<{ mensaje: string }> {
  const tokenHash = hashToken(tokenPlano);

  const registro = await prisma.tokenUsuario.findUnique({ where: { tokenHash } });

  if (!registro || registro.usadoEn || registro.expiraEn < new Date() || registro.tipo !== TipoToken.VERIFICACION_CORREO) {
    throw new HttpError(400, 'El enlace de verificación es inválido o ha expirado.');
  }

  await prisma.$transaction([
    prisma.tokenUsuario.update({
      where: { id: registro.id },
      data: { usadoEn: new Date() },
    }),
    prisma.usuario.update({
      where: { id: registro.usuarioId },
      data: { correoVerificadoEn: new Date() },
    }),
  ]);

  return { mensaje: 'Correo verificado exitosamente. Ya puedes iniciar sesión.' };
}

// ─── 5. Reenviar verificación ─────────────────────────────────────────────

export async function reenviarVerificacion(usuarioId: string): Promise<{ mensaje: string }> {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) throw new HttpError(404, 'Usuario no encontrado');
  if (usuario.correoVerificadoEn) {
    return { mensaje: 'El correo ya fue verificado.' };
  }

  const rawToken = generarTokenPlano();
  await prisma.tokenUsuario.create({
    data: {
      usuarioId: usuario.id,
      tipo: TipoToken.VERIFICACION_CORREO,
      tokenHash: hashToken(rawToken),
      expiraEn: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const appUrl = process.env.APP_URL ?? 'http://localhost:5173';
  await emailService.sendEmail({
    to: usuario.correo,
    subject: 'Nuevo enlace de verificación',
    text: `Hola ${usuario.nombre},\n\nTu nuevo enlace de verificación:\n${appUrl}/verify-email?token=${rawToken}\n\nExpira en 24 horas.`,
    usuarioId: usuario.id,
    tipo: 'VERIFICACION_CORREO',
  }).catch(() => {});

  return { mensaje: 'Se envió un nuevo enlace de verificación a tu correo.' };
}

// ─── 6. Solicitar recuperación de clave ───────────────────────────────────

export async function solicitarRecuperacion(correoRaw: string): Promise<{ mensaje: string }> {
  const correo = correoRaw.toLowerCase().trim();
  const RESPUESTA = 'Si el correo existe en nuestro sistema, recibirás las instrucciones.';

  const usuario = await prisma.usuario.findUnique({ where: { correo } });

  // Siempre la misma respuesta (evita enumerar usuarios)
  if (!usuario || !usuario.claveHash) return { mensaje: RESPUESTA };

  const rawToken = generarTokenPlano();
  await prisma.tokenUsuario.create({
    data: {
      usuarioId: usuario.id,
      tipo: TipoToken.RECUPERACION_CLAVE,
      tokenHash: hashToken(rawToken),
      expiraEn: new Date(Date.now() + 60 * 60 * 1000), // 1 h
    },
  });

  const appUrl = process.env.APP_URL ?? 'http://localhost:5173';
  await emailService.sendEmail({
    to: usuario.correo,
    subject: 'Recuperación de contraseña',
    text: `Hola ${usuario.nombre},\n\nHaz clic en el enlace para restablecer tu contraseña:\n${appUrl}/reset-password?token=${rawToken}\n\nExpira en 1 hora. Si no solicitaste esto, ignora el mensaje.`,
    usuarioId: usuario.id,
    tipo: 'RECUPERACION_CLAVE',
  }).catch(() => {});

  return { mensaje: RESPUESTA };
}

// ─── 7. Restablecer clave ─────────────────────────────────────────────────

export async function restablecerClave(
  datos: RestablecerClaveInput,
  ip?: string,
): Promise<{ mensaje: string }> {
  const tokenHash = hashToken(datos.token);

  const registro = await prisma.tokenUsuario.findUnique({ where: { tokenHash } });

  if (!registro || registro.usadoEn || registro.expiraEn < new Date() || registro.tipo !== TipoToken.RECUPERACION_CLAVE) {
    throw new HttpError(400, 'El enlace de recuperación es inválido o ha expirado.');
  }

  const claveHash = await hashClave(datos.nuevaClave);
  const ahora = new Date();

  await prisma.$transaction([
    prisma.usuario.update({
      where: { id: registro.usuarioId },
      data: {
        claveHash,
        claveCambiadaEn: ahora,
        intentosFallidos: 0,
        bloqueadoHasta: null,
      },
    }),
    prisma.tokenUsuario.update({
      where: { id: registro.id },
      data: { usadoEn: ahora },
    }),
    // Invalidar otros tokens de recuperación pendientes
    prisma.tokenUsuario.updateMany({
      where: {
        usuarioId: registro.usuarioId,
        tipo: TipoToken.RECUPERACION_CLAVE,
        usadoEn: null,
        id: { not: registro.id },
      },
      data: { usadoEn: ahora },
    }),
  ]);

  await auditService.log({
    usuarioId: registro.usuarioId,
    accion: 'CLAVE_RESTABLECIDA',
    entidad: 'Usuario',
    entidadId: registro.usuarioId,
    ip,
  });

  return { mensaje: 'Contraseña restablecida exitosamente.' };
}

// ─── 8. Aceptar invitación ────────────────────────────────────────────────

export async function aceptarInvitacion(
  datos: AceptarInvitacionInput,
  ip?: string,
): Promise<{ user: UserResponse; token: string }> {
  const tokenHash = hashToken(datos.token);

  const invitacion = await prisma.invitacion.findUnique({ where: { tokenHash } });

  if (!invitacion || invitacion.usadaEn || invitacion.expiraEn < new Date()) {
    throw new HttpError(400, 'La invitación es inválida o ha expirado.');
  }

  // Verificar que el correo de la invitación no esté ya registrado
  const existente = await prisma.usuario.findUnique({ where: { correo: invitacion.correo } });
  if (existente) throw new HttpError(409, 'Ya existe una cuenta con este correo.');

  const claveHash = await hashClave(datos.clave);
  const ahora = new Date();

  const usuario = await prisma.$transaction(async (tx) => {
    await tx.invitacion.update({
      where: { id: invitacion.id },
      data: { usadaEn: ahora },
    });

    return tx.usuario.create({
      data: {
        correo: invitacion.correo,
        claveHash,
        nombre: datos.nombre.trim(),
        apellido: datos.apellido.trim(),
        telefono: datos.telefono ?? null,
        rol: invitacion.rol,         // el rol viene de la invitación, no del body
        empresaId: invitacion.empresaId,
        correoVerificadoEn: ahora,  // el enlace llegó a ese correo → verificado
        aceptoTerminosEn: ahora,
      },
      include: { empresa: true },
    });
  });

  await auditService.log({
    usuarioId: usuario.id,
    empresaId: invitacion.empresaId,
    accion: 'MIEMBRO_ACTIVADO',
    entidad: 'Usuario',
    entidadId: usuario.id,
    ip,
  });

  const token = firmarToken(usuario.id);
  return { user: mapearUsuario(usuario), token };
}

// ─── 9. Perfil de sesión ──────────────────────────────────────────────────

export async function obtenerPerfilSesion(
  usuarioId: string,
): Promise<{ user: UserResponse; correoVerificado: boolean }> {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: { empresa: true },
  });

  if (!usuario) throw new HttpError(404, 'Usuario no encontrado');

  return {
    user: mapearUsuario(usuario),
    correoVerificado: !!usuario.correoVerificadoEn,
  };
}

