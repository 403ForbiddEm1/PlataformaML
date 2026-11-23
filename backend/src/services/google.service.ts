// src/services/google.service.ts
// Valida el idToken con Google y gestiona el flujo de autenticación.
// Regla estricta: NUNCA crea usuarios con rol ADMIN ni RRHH por Google.
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/database';
import { HttpError } from '../utils/http-error';
import { firmarToken } from '../utils/jwt';
import { hashClave } from '../utils/password';
import { auditService } from './audit.service';
import { emailService } from './email.service';
import { Rol, TipoToken } from '@prisma/client';
import { rolToFrontend, type UserResponse } from '../types';
import type { CompletarPerfilGoogleInput } from '../validators/auth.validator';

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(googleClientId);

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

export type GoogleAuthResult =
  | { tipo: 'SESION_INICIADA'; user: UserResponse; token: string }
  | { tipo: 'REQUIERE_COMPLETAR_PERFIL'; tokenTemporal: string; correo: string; nombre: string };

/**
 * Inicia sesión o inicia el registro de un candidato con un token de Google.
 */
export async function iniciarConGoogle(
  idToken: string,
  ip?: string,
): Promise<GoogleAuthResult> {
  let payload: any;

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: googleClientId,
    });
    payload = ticket.getPayload();
  } catch (err: any) {
    throw new HttpError(401, 'Token de Google inválido');
  }

  if (!payload || !payload.email_verified) {
    throw new HttpError(401, 'El correo de Google no está verificado');
  }

  const googleId = payload.sub as string;
  const correo = (payload.email as string).toLowerCase().trim();
  const nombre = (payload.given_name as string) || (payload.name as string) || 'Usuario';
  const apellido = (payload.family_name as string) || '';

  // 1. Buscar por googleId existente
  let usuario = await prisma.usuario.findUnique({
    where: { googleId },
    include: { empresa: true },
  });

  if (usuario) {
    if (!usuario.activo) throw new HttpError(403, 'Esta cuenta ha sido desactivada');

    // Actualizar último acceso
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoAccesoEn: new Date() },
    });

    await auditService.log({
      usuarioId: usuario.id,
      accion: 'LOGIN_GOOGLE',
      entidad: 'Usuario',
      entidadId: usuario.id,
      ip,
    });

    const token = firmarToken(usuario.id);
    return { tipo: 'SESION_INICIADA', user: mapearUsuario(usuario), token };
  }

  // 2. Buscar por correo
  usuario = await prisma.usuario.findUnique({
    where: { correo },
    include: { empresa: true },
  });

  if (usuario) {
    // Si la cuenta existe, vincular googleId
    usuario = await prisma.usuario.update({
      where: { id: usuario.id },
      data: { googleId, ultimoAccesoEn: new Date() },
      include: { empresa: true },
    });

    if (!usuario.activo) throw new HttpError(403, 'Esta cuenta ha sido desactivada');

    await auditService.log({
      usuarioId: usuario.id,
      accion: 'VINCULAR_GOOGLE',
      entidad: 'Usuario',
      entidadId: usuario.id,
      ip,
    });

    const token = firmarToken(usuario.id);
    return { tipo: 'SESION_INICIADA', user: mapearUsuario(usuario), token };
  }

  // 3. Crear cuenta nueva (CANDIDATO incompleto)
  // NUNCA crea ADMIN ni RRHH por Google
  const nuevoUsuario = await prisma.$transaction(async (tx) => {
    const u = await tx.usuario.create({
      data: {
        correo,
        googleId,
        nombre,
        apellido,
        rol: Rol.CANDIDATO,          // estrictamente CANDIDATO
        empresaId: null,
        claveHash: null,              // solo-Google
        correoVerificadoEn: new Date(),
        // aceptoTerminosEn queda null hasta completar el perfil
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

  await auditService.log({
    usuarioId: nuevoUsuario.id,
    accion: 'REGISTRO_GOOGLE',
    entidad: 'Usuario',
    entidadId: nuevoUsuario.id,
    ip,
  });

  // Token temporal para completar el perfil
  const tokenTemporal = firmarToken(nuevoUsuario.id);

  return {
    tipo: 'REQUIERE_COMPLETAR_PERFIL',
    tokenTemporal,
    correo: nuevoUsuario.correo,
    nombre: nuevoUsuario.nombre,
  };
}

/**
 * Completa el perfil del candidato creado con Google (términos + teléfono).
 */
export async function completarPerfilGoogle(
  usuarioId: string,
  datos: CompletarPerfilGoogleInput,
  ip?: string,
): Promise<{ user: UserResponse; token: string }> {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: { empresa: true },
  });

  if (!usuario) throw new HttpError(404, 'Usuario no encontrado');

  const actualizado = await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      telefono: datos.telefono ?? usuario.telefono,
      aceptoTerminosEn: new Date(),
      consentimientoWhatsappEn: datos.aceptaWhatsapp ? new Date() : null,
      ultimoAccesoEn: new Date(),
    },
    include: { empresa: true },
  });

  await auditService.log({
    usuarioId: usuario.id,
    accion: 'COMPLETO_PERFIL_GOOGLE',
    entidad: 'Usuario',
    entidadId: usuario.id,
    ip,
  });

  const token = firmarToken(actualizado.id);
  return { user: mapearUsuario(actualizado), token };
}

// Almacén en memoria para códigos OTP de 6 dígitos (además de TokenUsuario cuando el usuario ya existe)
const otpPendientes = new Map<
  string,
  {
    codigoHash: string;
    expiraEn: number;
    nombre?: string;
    telefono?: string;
    clave?: string;
  }
>();

function hashOtp(correo: string, codigo: string): string {
  return crypto.createHash('sha256').update(`${correo.toLowerCase().trim()}:${codigo.trim()}`).digest('hex');
}

/**
 * Envía un código de confirmación de 6 dígitos al correo (Gmail) del candidato
 * para iniciar sesión o registrarse con Google / verificación por código.
 */
export async function enviarCodigoGoogle(datos: {
  correo: string;
  nombre?: string;
  telefono?: string;
  clave?: string;
  modo?: 'login' | 'register';
}): Promise<{ mensaje: string; correo: string }> {
  const correo = datos.correo.toLowerCase().trim();
  if (!correo || !correo.includes('@')) {
    throw new HttpError(400, 'Ingresa un correo electrónico válido');
  }

  const existente = await prisma.usuario.findUnique({ where: { correo } });

  if (datos.modo === 'login' && !existente) {
    // Si intenta iniciar sesión con Google y aún no tiene cuenta, igual permitimos crearla como CANDIDATO al verificar el código
  }

  if (existente && !existente.activo) {
    throw new HttpError(403, 'Esta cuenta ha sido desactivada');
  }

  // Generar código numérico de 6 dígitos
  const codigo = String(crypto.randomInt(100000, 999999));
  const codigoHash = hashOtp(correo, codigo);
  const expiraEnMs = Date.now() + 15 * 60 * 1000; // 15 minutos

  otpPendientes.set(correo, {
    codigoHash,
    expiraEn: expiraEnMs,
    nombre: datos.nombre,
    telefono: datos.telefono,
    clave: datos.clave,
  });

  if (existente) {
    await prisma.tokenUsuario
      .create({
        data: {
          usuarioId: existente.id,
          tipo: TipoToken.VERIFICACION_CORREO,
          tokenHash: codigoHash,
          expiraEn: new Date(expiraEnMs),
        },
      })
      .catch(() => {});
  }

  const nombreSaludo = datos.nombre?.trim() || existente?.nombre || correo.split('@')[0];

  await emailService.sendDirect({
    to: correo,
    subject: `${codigo} es tu código de verificación — PlataformaML`,
    text: `Hola ${nombreSaludo},\n\nTu código de verificación de 6 dígitos para confirmar tu cuenta de Google en PlataformaML es:\n\n${codigo}\n\nEste código es válido por 15 minutos.\n\nSi no solicitaste este código, puedes ignorar este correo.`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; background: #090A0C; color: #F1F2EC; border-radius: 16px; border: 1px solid rgba(200,255,69,0.3);">
        <div style="font-size: 12px; letter-spacing: 0.12em; color: #C8FF45; font-weight: 700; text-transform: uppercase;">PlataformaML · Verificación de Identidad</div>
        <h2 style="margin: 12px 0 8px; color: #F1F2EC; font-size: 22px;">Confirma tu cuenta con Google</h2>
        <p style="color: #A1A1AA; font-size: 14px; line-height: 1.5;">Hola <b>${nombreSaludo}</b>, ingresa el siguiente código de 6 dígitos en la pantalla de la plataforma para confirmar tu acceso:</p>
        <div style="margin: 22px 0; padding: 18px; background: #12151C; border: 1px solid #C8FF45; border-radius: 12px; text-align: center;">
          <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #C8FF45;">${codigo}</span>
        </div>
        <p style="color: #71717A; font-size: 12px;">Este código expira en 15 minutos. Si no solicitaste este acceso, ignora este mensaje.</p>
      </div>
    `,
    senderName: 'PlataformaML · Seguridad',
  });

  return {
    mensaje: `Enviamos un código de 6 dígitos a ${correo}. Revisa tu bandeja de entrada.`,
    correo,
  };
}

/**
 * Verifica el código de 6 dígitos enviado al correo del usuario y devuelve su sesión JWT activa.
 * Si el usuario no existía, lo registra automáticamente como CANDIDATO con correoVerificadoEn.
 */
export async function verificarCodigoGoogle(
  datos: {
    correo: string;
    codigo: string;
    nombre?: string;
    telefono?: string;
    clave?: string;
  },
  ip?: string,
): Promise<{ user: UserResponse; token: string }> {
  const correo = datos.correo.toLowerCase().trim();
  const codigoLimpio = datos.codigo.replace(/\s+/g, '');
  const esperadoHash = hashOtp(correo, codigoLimpio);

  const enMemoria = otpPendientes.get(correo);
  let codigoValido = false;

  if (enMemoria && enMemoria.codigoHash === esperadoHash && enMemoria.expiraEn > Date.now()) {
    codigoValido = true;
  } else {
    const tokenBd = await prisma.tokenUsuario.findUnique({
      where: { tokenHash: esperadoHash },
    });
    if (tokenBd && !tokenBd.usadoEn && tokenBd.expiraEn > new Date()) {
      codigoValido = true;
      await prisma.tokenUsuario.update({
        where: { id: tokenBd.id },
        data: { usadoEn: new Date() },
      });
    }
  }

  if (!codigoValido) {
    throw new HttpError(400, 'El código de verificación es incorrecto o ha expirado');
  }

  const datosGuardados = otpPendientes.get(correo);
  otpPendientes.delete(correo);

  let usuario = await prisma.usuario.findUnique({
    where: { correo },
    include: { empresa: true },
  });

  const ahora = new Date();

  if (usuario) {
    if (!usuario.activo) throw new HttpError(403, 'Esta cuenta ha sido desactivada');

    usuario = await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        correoVerificadoEn: usuario.correoVerificadoEn ?? ahora,
        ultimoAccesoEn: ahora,
        intentosFallidos: 0,
        bloqueadoHasta: null,
      },
      include: { empresa: true },
    });

    await auditService.log({
      usuarioId: usuario.id,
      empresaId: usuario.empresaId,
      accion: 'LOGIN_GOOGLE_CODIGO',
      entidad: 'Usuario',
      entidadId: usuario.id,
      ip,
    });
  } else {
    // Crear cuenta nueva de CANDIDATO verificada
    const nombreCompleto = (datos.nombre || datosGuardados?.nombre || correo.split('@')[0]).trim();
    const partes = nombreCompleto.split(/\s+/);
    const nombre = partes[0] || 'Candidato';
    const apellido = partes.slice(1).join(' ') || '';
    const telefono = (datos.telefono || datosGuardados?.telefono || '').trim() || null;
    const claveRaw = datos.clave || datosGuardados?.clave;
    const claveHash = claveRaw && claveRaw.length >= 6 ? await hashClave(claveRaw) : null;

    usuario = await prisma.$transaction(async (tx) => {
      const nuevo = await tx.usuario.create({
        data: {
          correo,
          claveHash,
          nombre,
          apellido,
          telefono,
          rol: Rol.CANDIDATO,
          empresaId: null,
          correoVerificadoEn: ahora,
          aceptoTerminosEn: ahora,
          consentimientoWhatsappEn: telefono ? ahora : null,
          ultimoAccesoEn: ahora,
        },
        include: { empresa: true },
      });

      await tx.perfilCandidato.create({
        data: {
          usuarioId: nuevo.id,
          habilidades: [],
          idiomas: ['Español'],
        },
      });

      return nuevo;
    });

    await auditService.log({
      usuarioId: usuario.id,
      accion: 'REGISTRO_GOOGLE_CODIGO',
      entidad: 'Usuario',
      entidadId: usuario.id,
      ip,
    });
  }

  const token = firmarToken(usuario.id);
  return { user: mapearUsuario(usuario), token };
}

/**
 * Por privacidad y seguridad, el servidor NUNCA devuelve correos de otras personas.
 * Cada navegador guarda únicamente las cuentas que el propio usuario haya verificado e iniciado en su dispositivo.
 */
export async function listarCuentasGoogleDisponibles(): Promise<
  Array<{ id: string; email: string; name: string; avatar: string; role: string }>
> {
  return [];
}

/**
 * Inicio de sesión rápido con 1 clic al seleccionar una cuenta en el selector de Google (sin esperar código)
 */
export async function loginRapidoGoogle(
  datos: { correo: string; nombre?: string },
  ip?: string,
): Promise<{ user: UserResponse; token: string }> {
  const correo = datos.correo.toLowerCase().trim();
  if (!correo || !correo.includes('@')) {
    throw new HttpError(400, 'Selecciona un correo de Google válido');
  }

  let usuario = await prisma.usuario.findUnique({
    where: { correo },
    include: { empresa: true },
  });

  const ahora = new Date();

  if (usuario) {
    if (!usuario.activo) throw new HttpError(403, 'Esta cuenta ha sido desactivada');

    usuario = await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        correoVerificadoEn: usuario.correoVerificadoEn ?? ahora,
        ultimoAccesoEn: ahora,
        intentosFallidos: 0,
        bloqueadoHasta: null,
      },
      include: { empresa: true },
    });
  } else {
    const nombreBase = (datos.nombre || correo.split('@')[0].replace(/[._-]/g, ' ')).trim();
    const partes = nombreBase.split(/\s+/);
    const nombre = (partes[0] ? partes[0][0].toUpperCase() + partes[0].slice(1) : 'Candidato');
    const apellido = partes.slice(1).map((p) => p[0]?.toUpperCase() + p.slice(1)).join(' ') || '';

    usuario = await prisma.$transaction(async (tx) => {
      const nuevo = await tx.usuario.create({
        data: {
          correo,
          claveHash: null,
          nombre,
          apellido,
          rol: Rol.CANDIDATO,
          empresaId: null,
          correoVerificadoEn: ahora,
          aceptoTerminosEn: ahora,
          ultimoAccesoEn: ahora,
        },
        include: { empresa: true },
      });

      await tx.perfilCandidato.create({
        data: {
          usuarioId: nuevo.id,
          habilidades: [],
          idiomas: ['Español'],
        },
      });

      return nuevo;
    });
  }

  await auditService.log({
    usuarioId: usuario.id,
    empresaId: usuario.empresaId,
    accion: 'LOGIN_GOOGLE_RAPIDO',
    entidad: 'Usuario',
    entidadId: usuario.id,
    ip,
  });

  const token = firmarToken(usuario.id);
  return { user: mapearUsuario(usuario), token };
}

/**
 * Envía un código de 6 dígitos por CORREO o TELEGRAM para cambiar/agregar contraseña o recuperarla.
 */
export async function enviarCodigoSeguridadClave(datos: {
  canal: 'CORREO' | 'TELEGRAM';
  correo?: string;
  telefono?: string;
  usuarioId?: string;
}): Promise<{ mensaje: string; canal: 'CORREO' | 'TELEGRAM'; destino: string }> {
  let usuario: any = null;

  if (datos.usuarioId) {
    usuario = await prisma.usuario.findUnique({ where: { id: datos.usuarioId } });
  }
  if (!usuario && datos.correo) {
    usuario = await prisma.usuario.findUnique({
      where: { correo: datos.correo.toLowerCase().trim() },
    });
  }
  if (!usuario && datos.telefono) {
    const digitos = datos.telefono.replace(/\D/g, '').slice(-8);
    if (digitos.length >= 6) {
      const todos = await prisma.usuario.findMany({
        where: { telefono: { not: null } },
      });
      usuario = todos.find((u) => (u.telefono || '').replace(/\D/g, '').endsWith(digitos)) || null;
    }
  }

  if (!usuario) {
    throw new HttpError(
      404,
      datos.canal === 'TELEGRAM'
        ? 'No encontramos una cuenta con ese número de Telegram registrado.'
        : 'No encontramos una cuenta con ese correo electrónico.',
    );
  }

  const codigo = Math.floor(100000 + Math.random() * 900000).toString();
  const claveMapa = `pwd:${usuario.id}`;
  const codigoHash = hashOtp(claveMapa, codigo);
  const expiraEnMs = Date.now() + 15 * 60 * 1000;

  otpPendientes.set(claveMapa, {
    codigoHash,
    expiraEn: expiraEnMs,
  });

  await prisma.tokenUsuario
    .create({
      data: {
        usuarioId: usuario.id,
        tipo: TipoToken.RECUPERACION_CLAVE,
        tokenHash: codigoHash,
        expiraEn: new Date(expiraEnMs),
      },
    })
    .catch(() => {});

  const destinoTelefono = (datos.telefono || usuario.telefono || '').trim();
  const destinoCorreo = (usuario.correo || datos.correo || '').trim();

  if (datos.canal === 'TELEGRAM') {
    if (!destinoTelefono) {
      throw new HttpError(400, 'Esta cuenta no tiene un número de Telegram vinculado.');
    }

    let enviadoPorTelegram = false;
    try {
      const { telegramService } = await import('./telegram.service');
      const sesionEmpresa = await prisma.registroAuditoria.findFirst({
        where: { accion: 'EMPRESA_TELEGRAM_SESION' },
        select: { empresaId: true },
        orderBy: { creadoEn: 'desc' },
      });
      const resTlg = await telegramService.sendDirect({
        empresaId: sesionEmpresa?.empresaId ?? null,
        usuarioId: usuario.id,
        toFallback: destinoTelefono,
        message: `🔐 PlataformaML · Código de seguridad\n\nTu código de 6 dígitos para cambiar o recuperar tu contraseña es:\n\n${codigo}\n\nVálido por 15 minutos.`,
      });
      enviadoPorTelegram = resTlg.success;
    } catch {
      enviadoPorTelegram = false;
    }

    // Si aún no hay sesión de Telegram corporativa activa, enviamos respaldo al correo si existe
    if (!enviadoPorTelegram && destinoCorreo && destinoCorreo.includes('@')) {
      await emailService
        .sendDirect({
          to: destinoCorreo,
          subject: `${codigo} es tu código de seguridad (Respaldo Telegram) — PlataformaML`,
          text: `Hola ${usuario.nombre},\n\nSolicitaste un código por Telegram (${destinoTelefono}) para cambiar o recuperar tu contraseña:\n\n${codigo}\n\nVálido por 15 minutos.`,
          senderName: 'PlataformaML · Seguridad',
        })
        .catch(() => {});
    }

    return {
      mensaje: enviadoPorTelegram
        ? `Enviamos el código de 6 dígitos a tu Telegram (${destinoTelefono}).`
        : `Código de verificación generado para tu número de Telegram (${destinoTelefono})${destinoCorreo ? ' y enviado con copia de respaldo a tu correo' : ''}.`,
      canal: 'TELEGRAM',
      destino: destinoTelefono,
    };
  }

  if (!destinoCorreo || !destinoCorreo.includes('@')) {
    throw new HttpError(400, 'No hay un correo registrado. Solicita el código por Telegram.');
  }

  await emailService.sendDirect({
    to: destinoCorreo,
    subject: `${codigo} es tu código para cambiar o recuperar tu contraseña — PlataformaML`,
    text: `Hola ${usuario.nombre},\n\nTu código de 6 dígitos para cambiar o restablecer tu contraseña en PlataformaML es:\n\n${codigo}\n\nEste código expira en 15 minutos.`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; background: #170F09; color: #F6EEE2; border-radius: 16px; border: 1px solid rgba(200,255,69,0.35);">
        <div style="font-size: 12px; letter-spacing: 0.12em; color: #C8FF45; font-weight: 700; text-transform: uppercase;">PlataformaML · Seguridad de Cuenta</div>
        <h2 style="margin: 12px 0 8px; color: #F6EEE2; font-size: 22px;">Código para cambiar o recuperar tu contraseña</h2>
        <p style="color: #D5C3AA; font-size: 14px; line-height: 1.5;">Hola <b>${usuario.nombre}</b>, ingresa este código de 6 dígitos para confirmar tu nueva contraseña:</p>
        <div style="margin: 22px 0; padding: 18px; background: #090A0C; border: 1px solid #C8FF45; border-radius: 12px; text-align: center;">
          <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #C8FF45;">${codigo}</span>
        </div>
        <p style="color: #9A9B94; font-size: 12px;">Válido por 15 minutos.</p>
      </div>
    `,
    senderName: 'PlataformaML · Seguridad',
  });

  return {
    mensaje: `Enviamos un código de 6 dígitos a tu correo (${destinoCorreo}).`,
    canal: 'CORREO',
    destino: destinoCorreo,
  };
}

/**
 * Verifica el código de 6 dígitos (enviado por correo o Telegram) y actualiza la contraseña del usuario.
 */
export async function verificarCodigoYActualizarClave(datos: {
  codigo: string;
  nuevaClave: string;
  correo?: string;
  telefono?: string;
  usuarioId?: string;
}): Promise<{ mensaje: string }> {
  if (!datos.nuevaClave || datos.nuevaClave.length < 6) {
    throw new HttpError(400, 'La contraseña debe tener al menos 6 caracteres.');
  }

  let usuario: any = null;
  if (datos.usuarioId) {
    usuario = await prisma.usuario.findUnique({ where: { id: datos.usuarioId } });
  }
  if (!usuario && datos.correo) {
    usuario = await prisma.usuario.findUnique({
      where: { correo: datos.correo.toLowerCase().trim() },
    });
  }
  if (!usuario && datos.telefono) {
    const digitos = datos.telefono.replace(/\D/g, '').slice(-8);
    if (digitos.length >= 6) {
      const todos = await prisma.usuario.findMany({
        where: { telefono: { not: null } },
      });
      usuario = todos.find((u) => (u.telefono || '').replace(/\D/g, '').endsWith(digitos)) || null;
    }
  }

  if (!usuario) {
    throw new HttpError(404, 'Usuario no encontrado.');
  }

  const claveMapa = `pwd:${usuario.id}`;
  const codigoLimpio = datos.codigo.replace(/\s+/g, '');
  const esperadoHash = hashOtp(claveMapa, codigoLimpio);
  const enMemoria = otpPendientes.get(claveMapa);

  let valido = false;
  if (enMemoria && enMemoria.codigoHash === esperadoHash && enMemoria.expiraEn > Date.now()) {
    valido = true;
    otpPendientes.delete(claveMapa);
  } else {
    const tokenBd = await prisma.tokenUsuario.findUnique({
      where: { tokenHash: esperadoHash },
    });
    if (tokenBd && !tokenBd.usadoEn && tokenBd.expiraEn > new Date()) {
      valido = true;
      await prisma.tokenUsuario.update({
        where: { id: tokenBd.id },
        data: { usadoEn: new Date() },
      });
    }
  }

  if (!valido) {
    throw new HttpError(400, 'El código de verificación es incorrecto o ha expirado.');
  }

  const claveHash = await hashClave(datos.nuevaClave);
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      claveHash,
      intentosFallidos: 0,
      bloqueadoHasta: null,
    },
  });

  return { mensaje: 'Contraseña actualizada correctamente.' };
}


