// src/services/telegram.service.ts
// Integración de Telegram por Empresa (Cuentas reales de empresa vía MTProto / GramJS):
// - Cada empresa vincula su propia cuenta real de Telegram (con su foto, nombre y número/@usuario).
// - La sesión (StringSession) se guarda en PostgreSQL (Neon) asociada a empresaId para que persista en Render.
// - Cuando cualquier RRHH o ADMIN de esa empresa escribe en el chat web, el mensaje sale desde
//   el Telegram propio de esa empresa directo al número (+58...) o @usuario del candidato con la firma:
//   "<Mensaje>\n\n- <Nombre y Apellido> (<Recursos Humanos / Administrador>)"
// - Cuando el candidato responde al Telegram de esa empresa, el listener lo inserta en el chat web.
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage, type NewMessageEvent } from 'telegram/events';
import { prisma } from '../config/database';
import { CanalNotificacion, EstadoNotificacion, Rol } from '@prisma/client';
import { HttpError } from '../utils/http-error';

// Clientes activos en memoria por empresaId
const clientesPorEmpresa = new Map<string, TelegramClient>();

// Flujos de vinculación en curso (entre send-code y verify-code) por empresaId
const vinculacionPendiente = new Map<
  string,
  {
    client: TelegramClient;
    telefono: string;
    phoneCodeHash: string;
  }
>();

function obtenerCredencialesApi(): { apiId: number; apiHash: string } | null {
  const rawId = process.env.TELEGRAM_API_ID?.trim();
  const apiHash = process.env.TELEGRAM_API_HASH?.trim();
  const apiId = rawId ? Number(rawId) : NaN;
  if (!apiId || Number.isNaN(apiId) || !apiHash) return null;
  return { apiId, apiHash };
}

export function etiquetaRolEmpresa(rol: Rol): string {
  switch (rol) {
    case Rol.ADMIN:
      return 'Administrador';
    case Rol.RRHH:
      return 'Recursos Humanos';
    case Rol.SUPER_ADMIN:
      return 'Administración de Plataforma';
    default:
      return 'Candidato';
  }
}

function normalizarDestinoCandidato(telefonoRaw?: string | null): string | null {
  if (!telefonoRaw) return null;
  const limpio = telefonoRaw.trim();
  if (!limpio) return null;
  // Si el candidato puso su @usuario de Telegram
  if (limpio.startsWith('@')) return limpio;
  if (/^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(limpio)) return `@${limpio}`;
  // Si es número telefónico, normalizar a formato internacional +58...
  const soloDigitos = limpio.replace(/[^0-9+]/g, '');
  if (!soloDigitos) return null;
  if (soloDigitos.startsWith('+')) return soloDigitos;
  if (soloDigitos.startsWith('04')) return `+58${soloDigitos.slice(1)}`;
  if (soloDigitos.startsWith('58') && soloDigitos.length >= 12) return `+${soloDigitos}`;
  return `+${soloDigitos}`;
}

/**
 * Registra el listener en el cliente de una empresa para que cuando un candidato
 * responda al chat de Telegram de la empresa, el mensaje aparezca automáticamente en el chat de la web.
 */
function registrarListenerMensajesEntrantes(empresaId: string, client: TelegramClient) {
  client.addEventHandler(async (event: NewMessageEvent) => {
    try {
      const msg = event.message;
      if (!msg || !msg.isPrivate) return;
      const texto = (msg.message || '').trim();
      if (!texto) return;

      // Ignorar mensajes salientes automáticos firmados por la plataforma o códigos de seguridad
      if (
        texto.startsWith('🔐 PlataformaML') ||
        /\n\n-\s+.+\((Administrador|Recursos Humanos|Administración de Plataforma)\)$/.test(texto)
      ) {
        return;
      }

      const sender: any = await msg.getSender().catch(() => null);
      const senderPhone = sender?.phone ? `+${String(sender.phone).replace(/[^0-9]/g, '')}` : null;
      const senderUsername = sender?.username ? `@${String(sender.username).toLowerCase()}` : null;

      // Si es un mensaje saliente (msg.out), solo procesarlo si el usuario escribió en sus "Mensajes Guardados" (mismo número empresa y candidato)
      if (msg.out) {
        const peerUserId = (msg.peerId as any)?.userId;
        const senderId = sender?.id;
        if (!peerUserId || !senderId || String(peerUserId) !== String(senderId)) {
          return;
        }
      }

      // Buscar qué candidato que se postuló a esta empresa coincide por teléfono o @usuario
      const conversacionesAbiertas = await prisma.conversacion.findMany({
        where: { empresaId, cerradaEn: null },
        include: {
          candidato: { select: { id: true, telefono: true } },
        },
        orderBy: { ultimoMensajeEn: 'desc' },
      });

      const convCoincidente = conversacionesAbiertas.find((c) => {
        const dest = normalizarDestinoCandidato(c.candidato.telefono);
        if (!dest) return false;
        if (senderPhone && dest.replace(/[^0-9]/g, '').endsWith(senderPhone.replace(/[^0-9]/g, '').slice(-9))) {
          return true;
        }
        if (senderUsername && dest.toLowerCase() === senderUsername) {
          return true;
        }
        return false;
      });

      if (!convCoincidente) return;

      const ahora = new Date();
      await prisma.$transaction([
        prisma.mensaje.create({
          data: {
            conversacionId: convCoincidente.id,
            autorId: convCoincidente.candidatoId,
            contenido: texto.slice(0, 2000),
          },
        }),
        prisma.conversacion.update({
          where: { id: convCoincidente.id },
          data: { ultimoMensajeEn: ahora },
        }),
      ]);
    } catch (err: any) {
      console.warn(`[TELEGRAM_EMPRESA_${empresaId}] Error procesando mensaje entrante:`, err?.message);
    }
  }, new NewMessage({}));
}

export const telegramService = {
  /**
   * Obtiene o restaura desde PostgreSQL (Neon) el cliente de Telegram propio de una empresa
   */
  async obtenerClienteEmpresa(
    empresaId?: string | null,
    opciones: { respaldoGlobal?: boolean } = {},
  ): Promise<TelegramClient | null> {
    const creds = obtenerCredencialesApi();
    if (!creds) return null;

    // Aislamiento por empresa: los mensajes de chat solo salen de la cuenta de Telegram de ESA empresa.
    // Solo los códigos de seguridad de la plataforma (respaldoGlobal) pueden usar la última sesión conectada.
    let registro = empresaId
      ? await prisma.registroAuditoria
          .findFirst({
            where: { empresaId, accion: 'EMPRESA_TELEGRAM_SESION' },
            orderBy: { creadoEn: 'desc' },
          })
          .catch(() => null)
      : null;

    if (!registro && opciones.respaldoGlobal) {
      registro = await prisma.registroAuditoria
        .findFirst({
          where: { accion: 'EMPRESA_TELEGRAM_SESION' },
          orderBy: { creadoEn: 'desc' },
        })
        .catch(() => null);
    }

    const sessionStr = (registro?.detalle as any)?.sessionString as string | undefined;
    if (!registro || !sessionStr) return null;

    const cacheKey = registro.empresaId || 'global';
    const enMemoria = clientesPorEmpresa.get(cacheKey);
    if (enMemoria && enMemoria.connected) {
      return enMemoria;
    }

    try {
      const client = new TelegramClient(new StringSession(sessionStr), creds.apiId, creds.apiHash, {
        connectionRetries: 3,
      });
      await client.connect();
      registrarListenerMensajesEntrantes(cacheKey, client);
      clientesPorEmpresa.set(cacheKey, client);
      return client;
    } catch (err: any) {
      console.warn(`[TELEGRAM] No se pudo reconectar la sesión de Telegram (${cacheKey}):`, err?.message);
      return null;
    }
  },

  /**
   * Paso 1 para que el ADMIN de una empresa vincule el Telegram propio de su empresa:
   * Envía el código de inicio de sesión al número de Telegram de la empresa.
   */
  async solicitarCodigoVinculacionEmpresa(empresaId: string, telefonoEmpresa: string) {
    const creds = obtenerCredencialesApi();
    if (!creds) {
      throw new HttpError(
        400,
        'Falta configurar TELEGRAM_API_ID y TELEGRAM_API_HASH en el servidor (https://my.telegram.org).',
      );
    }

    const telefonoLimpio = normalizarDestinoCandidato(telefonoEmpresa);
    if (!telefonoLimpio || !telefonoLimpio.startsWith('+')) {
      throw new HttpError(400, 'Ingresa el número de Telegram de la empresa con código de país (ej. +584121234567)');
    }

    const client = new TelegramClient(new StringSession(''), creds.apiId, creds.apiHash, {
      connectionRetries: 3,
    });
    await client.connect();

    const result = await client.sendCode(
      { apiId: creds.apiId, apiHash: creds.apiHash },
      telefonoLimpio,
    );

    vinculacionPendiente.set(empresaId, {
      client,
      telefono: telefonoLimpio,
      phoneCodeHash: result.phoneCodeHash,
    });

    return {
      mensaje: `Se envió un código de verificación a la app de Telegram del número ${telefonoLimpio}.`,
      telefono: telefonoLimpio,
    };
  },

  /**
   * Paso 2: Confirma el código recibido en el Telegram de la empresa y guarda la sesión en Neon PostgreSQL.
   */
  async confirmarCodigoVinculacionEmpresa(
    empresaId: string,
    usuarioAdminId: string,
    codigo: string,
    password2FA?: string,
  ) {
    const pendiente = vinculacionPendiente.get(empresaId);
    if (!pendiente) {
      throw new HttpError(400, 'No hay una solicitud de código activa para esta empresa. Solicita el código primero.');
    }

    const { client, telefono, phoneCodeHash } = pendiente;

    try {
      await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: telefono,
          phoneCodeHash,
          phoneCode: codigo.trim(),
        }),
      );
    } catch (err: any) {
      if (err?.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        if (!password2FA) {
          throw new HttpError(400, 'Esta cuenta de Telegram tiene verificación en 2 pasos. Ingresa también tu clave 2FA.');
        }
        await client.signInWithPassword(
          obtenerCredencialesApi()!,
          {
            password: async () => password2FA,
            onError: (e) => {
              throw e;
            },
          },
        );
      } else {
        throw new HttpError(400, `Código de Telegram inválido o expirado (${err?.errorMessage || err?.message})`);
      }
    }

    const me: any = await client.getMe();
    const sessionString = (client.session as StringSession).save();

    const empresaExistente = await prisma.empresa
      .findUnique({ where: { id: empresaId }, select: { id: true } })
      .catch(() => null);

    await prisma.registroAuditoria.create({
      data: {
        usuarioId: usuarioAdminId || null,
        empresaId: empresaExistente?.id ?? null,
        accion: 'EMPRESA_TELEGRAM_SESION',
        entidad: empresaExistente ? 'Empresa' : 'Usuario',
        entidadId: empresaId,
        detalle: {
          sessionString,
          telefono,
          username: me?.username ? `@${me.username}` : null,
          nombreCuenta: `${me?.firstName || ''} ${me?.lastName || ''}`.trim(),
          vinculadoEn: new Date().toISOString(),
        },
      },
    });

    if (usuarioAdminId) {
      await prisma.usuario
        .update({
          where: { id: usuarioAdminId },
          data: {
            telefono,
            consentimientoWhatsappEn: new Date(),
          },
        })
        .catch(() => {});
    }

    vinculacionPendiente.delete(empresaId);
    registrarListenerMensajesEntrantes(empresaExistente?.id || 'global', client);
    clientesPorEmpresa.set(empresaExistente?.id || 'global', client);

    return {
      conectado: true,
      telefono,
      username: me?.username ? `@${me.username}` : null,
      nombreCuenta: `${me?.firstName || ''} ${me?.lastName || ''}`.trim(),
    };
  },

  /**
   * Consulta el estado del chat de Telegram propio de la empresa
   */
  async obtenerEstadoTelegramEmpresa(empresaId: string) {
    const registro = await prisma.registroAuditoria
      .findFirst({
        where: {
          empresaId,
          accion: 'EMPRESA_TELEGRAM_SESION',
        },
        orderBy: { creadoEn: 'desc' },
      })
      .catch(() => null);

    const detalle = (registro?.detalle as any) || null;
    if (!detalle?.sessionString) {
      return {
        conectado: false,
        apiConfigurada: Boolean(obtenerCredencialesApi()),
        telefono: null,
        username: null,
        nombreCuenta: null,
      };
    }

    return {
      conectado: true,
      apiConfigurada: Boolean(obtenerCredencialesApi()),
      telefono: detalle.telefono || null,
      username: detalle.username || null,
      nombreCuenta: detalle.nombreCuenta || null,
      vinculadoEn: detalle.vinculadoEn || null,
    };
  },

  /**
   * Envía un mensaje desde la cuenta de Telegram propia de la empresa al número (+58...) o @usuario del candidato
   */
  async sendDirect(options: {
    empresaId?: string | null;
    usuarioId?: string | null;
    toFallback?: string | null;
    message: string;
    respaldoGlobal?: boolean;
  }): Promise<{ success: boolean; externalId?: string; error?: string }> {
    let destino = normalizarDestinoCandidato(options.toFallback);

    if (!destino && options.usuarioId) {
      const u = await prisma.usuario
        .findUnique({
          where: { id: options.usuarioId },
          select: { telefono: true },
        })
        .catch(() => null);
      destino = normalizarDestinoCandidato(u?.telefono);
    }

    const client = await this.obtenerClienteEmpresa(options.empresaId, {
      respaldoGlobal: options.respaldoGlobal,
    });

    if (!client) {
      console.log(
        `[TELEGRAM_NO_CONECTADO] (Empresa ${options.empresaId ?? 'global'} -> Candidato ${destino ?? 'sin-numero'}): No hay sesión MTProto activa.`,
      );
      return {
        success: false,
        error: 'Aún no hay una sesión de Telegram conectada en la plataforma.',
      };
    }

    if (!destino) {
      return { success: false, error: 'El candidato no tiene número de teléfono ni @usuario de Telegram registrado' };
    }

    try {
      // Verificar si el número destino es el mismo número de la cuenta de Telegram conectada (empresa y candidato comparten número)
      let entidadDestino: any = destino;
      const me: any = await client.getMe().catch(() => null);
      const meDigits = me?.phone ? String(me.phone).replace(/[^0-9]/g, '') : '';
      const destDigits = destino.replace(/[^0-9]/g, '');

      if (meDigits && destDigits && destDigits.slice(-9) === meDigits.slice(-9)) {
        // Mismo número en empresa y candidato -> entregar en el chat personal ("Mensajes Guardados" / "me") de ese Telegram
        entidadDestino = 'me';
      } else if (destino.startsWith('+')) {
        const importRes: any = await client
          .invoke(
            new Api.contacts.ImportContacts({
              contacts: [
                new Api.InputPhoneContact({
                  clientId: BigInt(Date.now()) as any,
                  phone: destino.replace(/^\+/, ''),
                  firstName: 'Candidato',
                  lastName: 'PlataformaML',
                }),
              ],
            }),
          )
          .catch(() => null);

        if (importRes?.users?.[0]) {
          entidadDestino = importRes.users[0];
        } else {
          const resolved = await client.getEntity(destino).catch(() => null);
          if (resolved) entidadDestino = resolved;
        }
      }

      const sent: any = await client.sendMessage(entidadDestino, {
        message: options.message,
      });

      return {
        success: true,
        externalId: sent?.id ? String(sent.id) : undefined,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'No se pudo entregar el mensaje por Telegram',
      };
    }
  },

  /**
   * Envía al Telegram del candidato el mensaje escrito por RRHH o ADMIN en el chat de la web,
   * desde el Telegram propio de esa empresa y con la firma al pie:
   *
   * <Mensaje>
   *
   * - <Nombre del RRHH o Admin> (<Rol>)
   */
  async enviarMensajeChatFirmado(params: {
    candidatoId: string;
    candidatoTelefono?: string | null;
    contenido: string;
    autorNombreCompleto: string;
    autorRol: Rol;
    empresaNombre: string;
    vacanteTitulo: string;
    conversacionId: string;
    empresaId: string;
    postulacionId?: string | null;
  }): Promise<{ success: boolean; externalId?: string }> {
    const rolLegible = etiquetaRolEmpresa(params.autorRol);
    const mensajeFirmado = `${params.contenido.trim()}\n\n- ${params.autorNombreCompleto} (${rolLegible})`;

    const res = await this.sendDirect({
      empresaId: params.empresaId,
      usuarioId: params.candidatoId,
      toFallback: params.candidatoTelefono,
      message: mensajeFirmado,
    });

    await prisma.notificacion
      .create({
        data: {
          usuarioId: params.candidatoId,
          empresaId: params.empresaId,
          postulacionId: params.postulacionId ?? null,
          canal: CanalNotificacion.WHATSAPP,
          tipo: 'MENSAJE_DIRECTO_TELEGRAM',
          destinatario: params.candidatoTelefono || `candidato:${params.candidatoId}`,
          asunto: `Mensaje de ${params.autorNombreCompleto}`,
          mensaje: mensajeFirmado,
          estado: res.success ? EstadoNotificacion.ENVIADA : EstadoNotificacion.FALLIDA,
          enviadaEn: res.success ? new Date() : null,
          idExterno: res.externalId ?? null,
          registroError: res.error ?? null,
        },
      })
      .catch(() => {});

    return { success: res.success, externalId: res.externalId };
  },

  /**
   * Al arrancar el servidor (local o Render), reconecta automáticamente las sesiones
   * de Telegram de todas las empresas activas guardadas en Neon PostgreSQL.
   */
  async iniciarPolling(): Promise<void> {
    if (!obtenerCredencialesApi()) return;
    try {
      const empresasConSesion = await prisma.registroAuditoria.findMany({
        where: { accion: 'EMPRESA_TELEGRAM_SESION' },
        distinct: ['empresaId'],
        select: { empresaId: true },
      });

      for (const r of empresasConSesion) {
        if (r.empresaId) {
          await this.obtenerClienteEmpresa(r.empresaId);
        }
      }
    } catch {
      // ignorar si aún no hay sesiones
    }
  },

  detenerPolling(): void {
    for (const client of clientesPorEmpresa.values()) {
      client.disconnect().catch(() => {});
    }
    clientesPorEmpresa.clear();
  },

  async obtenerInfoBot() {
    return {
      online: Boolean(obtenerCredencialesApi()),
      username: null,
      linkBase: null,
    };
  },

  async obtenerChatIdUsuario(_usuarioId?: string | null, destinatarioFallback?: string | null) {
    return normalizarDestinoCandidato(destinatarioFallback);
  },

  async procesarUpdateTelegram(_update: any): Promise<void> {
    // Manejado por los listeners MTProto de cada empresa
  },
};
