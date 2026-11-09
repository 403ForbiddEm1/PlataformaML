# Especificación completa del backend

Qué hace cada archivo, qué recibe, qué devuelve, con quién se conecta y qué reglas de seguridad aplica. Pensado para construir el backend en orden y para que cualquier persona (o asistente) del equipo sepa exactamente qué se espera de cada pieza.

**Cómo leerlo:** cada archivo indica su estado: `EXISTE` (ya entregado), `VACÍO` (el archivo está creado pero sin código) o `NUEVO` (hay que crearlo). Las rutas de la API marcadas con *(front)* ya las llama el front actual; las demás son propuestas que hay que coordinar con quien lleva el frontend.

> **Regla de oro:** el backend nunca confía en lo que manda el navegador. Todo lo que define permisos (quién es el usuario, su rol, su empresa) sale del token y de la base de datos, jamás del cuerpo, los parámetros o los encabezados de la petición.

---

## 0. Convenciones generales

### 0.1 Formato de respuestas

| Caso | HTTP | Cuerpo |
|---|---|---|
| Éxito con datos | 200 / 201 | `{ "success": true, "data": ... }` |
| Éxito con mensaje | 200 | `{ "success": true, "data": ..., "message": "..." }` |
| Lista paginada | 200 | `{ "success": true, "data": { "items": [...], "total": 120, "page": 1, "limit": 20 } }` |
| Error | 4xx / 5xx | `{ "success": false, "error": "Mensaje legible" }` (más `detalles` en errores de validación) |

### 0.2 Códigos de estado

| Código | Cuándo |
|---|---|
| 400 | Datos inválidos (falla Zod) |
| 401 | Sin sesión, token inválido o vencido, credenciales incorrectas |
| 403 | Con sesión pero sin permiso (rol, empresa pendiente/suspendida, cuenta bloqueada) |
| 404 | No existe **o no pertenece a tu empresa** (se usa 404 y no 403 para no revelar que el registro existe) |
| 409 | Duplicado (correo ya registrado, ya te postulaste a esa vacante) |
| 413 | Archivo demasiado grande |
| 415 | Tipo de archivo no permitido |
| 429 | Demasiados intentos |
| 502 / 503 | Falla de un servicio externo (ML, correo, WhatsApp) |
| 500 | Error interno (en producción el mensaje es genérico) |

### 0.3 Traducción entre el front y la base (DTO / mappers)

El front usa nombres en inglés y textos legibles (`'En revisión'`, `mlScore` de 0 a 100); la base usa enums y nombres en español (`EN_REVISION`, `puntajeAfinidad` de 0 a 1). **Cada controlador devuelve datos pasando por un mapper**, nunca el objeto crudo de Prisma. Esto cumple tres funciones: traduce nombres, convierte escalas y **evita filtrar campos internos** (`claveHash`, `intentosFallidos`, `googleId`, rutas de archivos, etc.).

Carpeta `src/mappers/` (`NUEVO`): `user.mapper.ts`, `vacancy.mapper.ts`, `application.mapper.ts`, `candidate.mapper.ts`, `notification.mapper.ts`, `company.mapper.ts`. Cada uno exporta funciones `aDto(registro)` y, cuando aplica, `desdeDto(entrada)`.

### 0.4 Nombres y estilo

- Archivos en minúscula con guiones o punto (`auth.controller.ts`, `http-error.ts`).
- Textos de error en español, sin revelar detalles internos.
- Fechas en ISO 8601 (UTC).
- Teléfonos normalizados a formato internacional E.164 (`+584141234567`) antes de guardar.
- Identificadores: UUID.

### 0.5 Cadena de una petición (de afuera hacia adentro)

```
Navegador
  → app.ts: trust proxy → helmet → cors → body parser → límite general
    → routes/*.routes.ts: límite específico (login, registro...) 
      → autenticar (token → usuario real en BD)       [si la ruta es privada]
        → exigirRol(...)                              [si la ruta es por rol]
          → validate(schema Zod)                      [cuerpo, parámetros, query]
            → controller: traduce HTTP ↔ servicio, nada de lógica de negocio
              → service: reglas de negocio, transacciones
                → Prisma (base)  /  ml.service  /  email.service  /  whatsapp.service  /  storage.service
              ← el service devuelve datos
            ← el controller aplica el mapper y responde { success, data }
  ← si algo lanza error: error.middleware lo convierte en { success:false, error }
```

Reglas de esta cadena:

1. **Un controlador no toca Prisma directamente ni contiene reglas de negocio.** Recibe, valida, llama al servicio y responde.
2. **Un servicio no conoce `req` ni `res`.** Recibe parámetros simples (por ejemplo `actor`, `datos`) para poder reutilizarse desde un trabajo programado o desde otro servicio.
3. Cada función que modifica datos importantes **escribe en auditoría** (`audit.service`).
4. Los errores esperados se lanzan con `new HttpError(status, mensaje)`; Express 5 captura las promesas rechazadas y las manda a `error.middleware`.

---

## 1. Cambios al modelo de datos (`prisma/schema.prisma`)

El esquema v3 ya cubre usuarios, empresas, vacantes, postulaciones, ML, notificaciones y auditoría. Para lo que se definió después hay que **agregar** lo siguiente. Todo se hace en una migración nueva (`npx prisma migrate dev --name v4_chat_plantillas_desactivacion`). No se modifica lo que ya existe, salvo lo indicado.

### 1.1 Cambios en modelos existentes

| Modelo | Campo nuevo | Para qué |
|---|---|---|
| `Empresa` | `activaHasta DateTime?` | Fecha hasta la que el superadmin dejó activa la cuenta (caso "pago por tiempo"). Null = sin vencimiento |
| `Empresa` | `ultimaVacanteEn DateTime?` | Última vez que se creó o publicó una vacante; base de la desactivación automática a los 3 meses |
| `Empresa` | `desactivadaEn DateTime?` | Cuándo pasó a `SUSPENDIDA` |
| `Empresa` | `motivoDesactivacion` (enum `MotivoDesactivacion`: `INACTIVIDAD`, `VENCIMIENTO`, `MANUAL`) | Distingue desactivación automática de manual |
| `Empresa` | `latitud Float?`, `longitud Float?`, `direccion String?` | Ubicación de la empresa (filtro "más cerca") |
| `Empresa` | `correoVerificadoEn` no es necesario: se verifica en el `Usuario` ADMIN | — |
| `Usuario` | `fotoRuta String?` | Foto de perfil (ruta privada en almacenamiento, no URL pública) |
| `Usuario` | `consentimientoWhatsappEn DateTime?` | Fecha en que aceptó recibir WhatsApp. **Sin esto no se envía WhatsApp** |
| `Usuario` | `claveCambiadaEn DateTime?` | Tokens emitidos antes de esta fecha dejan de valer (cierre de sesiones al cambiar clave) |
| `PerfilCandidato` | `cedulaNumero String?` | Número de cédula (dato sensible, ver 8.4) |
| `PerfilCandidato` | `perfilVisible Boolean @default(false)` | El candidato decide si las empresas pueden descubrirlo (para ofertas directas, fase futura) |
| `Vacante` | `camposAdicionales Json?` | Preguntas extra que la empresa agrega al formulario |
| `Vacante` | `latitud`, `longitud`, `especializacion String?` | Filtros del listado público |
| `Postulacion` | `respuestasAdicionales Json?` | Respuestas a `camposAdicionales` |
| enum `EstadoNotificacion` | agregar `ENTREGADA`, `LEIDA` | El webhook de WhatsApp informa entrega y lectura; el front muestra Enviado / Entregado / Leído |
| enum `CanalNotificacion` | agregar `APP` | Notificaciones internas que ve el usuario en la plataforma |

### 1.2 Modelos nuevos

**`PlantillaNotificacion`** — textos de notificación por empresa y evento.

| Campo | Detalle |
|---|---|
| `id`, `creadoEn`, `actualizadoEn` | estándar |
| `empresaId String? @db.Uuid` | Null = plantilla predeterminada de la plataforma; con valor = versión editada por esa empresa |
| `evento` (enum `EventoNotificacion`) | `POSTULACION_RECIBIDA`, `EN_REVISION`, `PRESELECCIONADA`, `ENTREVISTA_1`, `ENTREVISTA_2`, `CONTRATADA`, `RECHAZADA`, `MENSAJE_NUEVO` |
| `canal` | `CORREO` o `WHATSAPP` o `APP` |
| `asunto String?`, `cuerpo String @db.Text` | Texto con variables `{{nombre}}`, `{{vacante}}`, `{{empresa}}`, `{{estado}}`, `{{enlace}}` |
| `version Int` | Número de versión |
| `estadoAprobacion` (enum: `NO_APLICA`, `PENDIENTE`, `APROBADA`, `RECHAZADA`) | Solo importa para WhatsApp (revisión de Meta). Correo y APP son `NO_APLICA` |
| `nombreExterno String?` | Nombre de la plantilla en Meta (ej. `estado_postulacion_v2`) |
| `activa Boolean` | Solo una versión activa por (empresaId, evento, canal) |
| `@@unique([empresaId, evento, canal, version])` | |

**Regla de selección al enviar:** (1) buscar la plantilla de la empresa para ese evento y canal; (2) si es de WhatsApp, tomar solo la de mayor versión con `estadoAprobacion = APROBADA`; (3) si la empresa no tiene, usar la predeterminada (`empresaId = null`); (4) si ninguna está aprobada, no enviar por ese canal y registrar el motivo.

**`Conversacion`** — un hilo de chat entre un candidato y una empresa.

| Campo | Detalle |
|---|---|
| `id` | UUID |
| `empresaId`, `candidatoId` | Participantes |
| `postulacionId String? @unique` | Hilo ligado a una postulación (única forma de iniciar chat en esta fase) |
| `ultimoMensajeEn DateTime` | Para ordenar la bandeja |
| `cerradaEn DateTime?` | Hilo cerrado: se puede leer pero no escribir |
| `@@index([empresaId, ultimoMensajeEn])`, `@@index([candidatoId, ultimoMensajeEn])` | |

**`Mensaje`** — un mensaje dentro del hilo.

| Campo | Detalle |
|---|---|
| `id`, `conversacionId` | Hilo |
| `autorId` | Usuario que lo escribió (candidato o un miembro de la empresa; así se sabe **qué persona de RRHH** respondió) |
| `contenido String @db.Text` | Máximo 2000 caracteres (validado en Zod) |
| `leidoEn DateTime?` | Marca de lectura del destinatario |
| `creadoEn` | |
| `@@index([conversacionId, creadoEn])` | |

**Fase futura (no ahora):** `OfertaDirecta` (empresa → candidato, con estados enviada / aceptada / rechazada / en espera). Se deja fuera hasta que el núcleo funcione.

### 1.3 Regla `CHECK` pendiente

Migración manual, una sola vez (ya documentada en el README): `usuarios_empresa_segun_rol`. Garantiza que SUPER_ADMIN y CANDIDATO no tengan empresa y que ADMIN y RRHH sí.

### 1.4 Efectos en el seed (`prisma/seed.ts`)

Después de la migración, el seed debe además crear: las plantillas predeterminadas (`empresaId = null`) para cada evento y canal, con `estadoAprobacion = NO_APLICA` para correo y APP, y `PENDIENTE` o `APROBADA` (según corresponda) para WhatsApp; una conversación de ejemplo; y `ultimaVacanteEn` en la empresa activa. Sigue prohibido en producción.

---

## 2. Configuración y utilidades base

### 2.1 `prisma.config.ts` — `EXISTE` (según tu árbol)
- Dice a Prisma dónde está el schema, dónde van las migraciones, cuál es el comando del seed (`tsx prisma/seed.ts`) y de dónde leer la URL de la base (`DATABASE_URL`).
- Conexión: lo lee el CLI de Prisma (`generate`, `migrate`, `db seed`). No lo importa el servidor.

### 2.2 `src/config/env.ts` — `EXISTE` (ampliar)
Valida variables al arrancar y detiene el servidor si algo falta. Variables actuales: `NODE_ENV`, `PORT`, `FRONTEND_URL`, `DATABASE_URL`, `JWT_SECRET` (mín. 32 caracteres y rechaza valores de ejemplo), `JWT_EXPIRES_IN`, `ML_SERVICE_URL`, `ML_API_KEY`.

Variables nuevas a agregar (todas validadas con Zod):

| Variable | Uso |
|---|---|
| `GOOGLE_CLIENT_ID` | Verificar tokens de Google |
| `EMAIL_PROVIDER` (`resend`, `brevo`, `smtp`) y `EMAIL_FROM` | Proveedor y remitente (dirección de la plataforma) |
| `RESEND_API_KEY` o `BREVO_API_KEY` o `SMTP_HOST/PORT/USER/PASS` | Credenciales del proveedor elegido |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION` | Enviar mensajes por la Cloud API |
| `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` | Verificar la firma y el registro del webhook |
| `STORAGE_DIR` (y credenciales del almacenamiento externo cuando exista) | Dónde se guardan archivos |
| `APP_NAME` (opcional) | Nombre de la app en textos; si falta se usa el nombre de la empresa |
| `APP_URL` | Base de los enlaces que viajan en correos (verificación, recuperación, invitación) |

**Conexiones:** lo importan todos los archivos que necesitan configuración (`app.ts`, `server.ts`, `jwt.ts`, `ml.service.ts`, `email.service.ts`, `whatsapp.service.ts`, `storage.service.ts`, `google.service.ts`).

### 2.3 `src/config/database.ts` — `EXISTE`
- Crea **una sola** instancia de `PrismaClient` con el adaptador de PostgreSQL y la guarda en `globalThis` en desarrollo para que el hot-reload no abra conexiones nuevas cada vez.
- Importa `PrismaClient` de `@prisma/client` (todo en minúscula).
- **Conexiones:** todos los `*.service.ts` y el middleware `auth.middleware.ts` la importan. Los controladores **no**.

### 2.4 `src/types/express.d.ts` — `EXISTE`
Añade `req.user = { id, rol, empresaId }` al tipo `Request`. Lo escribe `autenticar` y lo leen controladores y `exigirRol`.

### 2.5 `src/types/index.ts` — `VACÍO`
Tipos compartidos: `Actor` (`{ id, rol, empresaId }`, lo que reciben los servicios en lugar de `req`), `PaginacionQuery`, `ResultadoPaginado<T>`.

### 2.6 `src/utils/http-error.ts` — `EXISTE`
Clase `HttpError(status, message)`. La lanzan servicios y middlewares; la captura `error.middleware`.

### 2.7 `src/utils/jwt.ts` — `EXISTE`
- `firmarToken(usuarioId)`: firma `{ sub }` con `JWT_SECRET` y `JWT_EXPIRES_IN`. **El rol no va en el token.**
- `verificarToken(token)`: valida firma y vencimiento; devuelve `{ sub }`.
- **Mejora pendiente:** incluir `iat` y compararlo con `claveCambiadaEn` en `autenticar` (cierra sesiones viejas tras cambio de clave).
- **Conexiones:** `auth.service` (firma al iniciar sesión) y `auth.middleware` (verifica).

### 2.8 `src/utils/password.ts` — `NUEVO`
- `hashClave(clave)`: bcrypt con costo 12.
- `compararClave(clave, hash)`.
- `CLAVE_FALSA_HASH`: hash precalculado para comparar cuando el correo no existe (así el tiempo de respuesta no revela si el correo está registrado).
- `validarFortaleza(clave)`: mínimo 8 caracteres, al menos una letra y un número (misma regla que el front).

### 2.9 `src/utils/tokens.ts` — `NUEVO`
- `generarTokenPlano()`: 32 bytes aleatorios en hexadecimal (`crypto.randomBytes`). **Solo viaja por correo.**
- `hashToken(token)`: SHA-256. **Esto es lo único que se guarda en base** (`tokenHash`).
- Vigencias: verificación de correo 24 h, recuperación de clave 1 h, invitación 72 h.
- **Conexiones:** `auth.service` (crea y consume `TokenUsuario`) y `company.service` (invitaciones).

### 2.10 `src/utils/telefono.ts` — `NUEVO`
Normaliza y valida números a E.164. Se usa al registrar, al actualizar perfil y antes de enviar WhatsApp.

### 2.11 `src/utils/paginacion.ts` — `NUEVO`
Convierte `?page=&limit=` en `skip/take` con tope de `limit` (máximo 100) y arma la respuesta `{ items, total, page, limit }`.

### 2.12 `src/utils/plantilla.ts` — `NUEVO`
`renderizar(texto, variables)`: reemplaza `{{nombre}}`, `{{vacante}}`, etc. Las variables desconocidas se dejan vacías y el valor se escapa para HTML en el correo (evita inyección de HTML desde un nombre malicioso).

---

## 3. Middlewares (`src/middlewares/`)

### 3.1 `auth.middleware.ts` — `EXISTE`
**`autenticar(req, res, next)`**
1. Lee `Authorization: Bearer <token>`; si falta, 401.
2. Verifica el token; si falla, 401 "Sesión inválida o vencida".
3. Lee al usuario de la base **en cada petición** (id, rol, activo, empresaId, estado de su empresa).
4. Si no existe o `activo = false`, 401.
5. Si tiene empresa y su estado no es `ACTIVA`, 403 con mensaje según estado (pendiente de aprobación, suspendida, rechazada).
6. Si `activaHasta` ya venció, trata a la empresa como suspendida (y programa la actualización del estado).
7. Escribe `req.user = { id, rol, empresaId }` y continúa.

**`exigirRol(...roles)`**: si `req.user.rol` no está en la lista, 403 "Acceso denegado".

**`autenticarOpcional`** (`NUEVO`): igual que `autenticar` pero no falla si no hay token; para rutas públicas que cambian su respuesta si hay sesión (el listado de vacantes).

**Conexiones:** va delante de toda ruta privada. Usa `database.ts` y `jwt.ts`.

### 3.2 `error.middleware.ts` — `EXISTE`
- `noEncontrado`: convierte cualquier ruta desconocida en 404.
- `manejarErrores`: traduce `HttpError`, errores de Zod (400 con `detalles`), errores conocidos de Prisma (`P2002` → 409, `P2025` → 404) y cualquier otro (500, mensaje genérico en producción; el detalle solo va a la consola).
- Va **al final** de `app.ts`. **Nunca** se imprimen en el log contraseñas, tokens ni cuerpos completos.

### 3.3 `validate.middleware.ts` — `NUEVO`
`validate({ body?, params?, query? })` recibe esquemas Zod y los ejecuta sobre la petición. Si pasan, reemplaza `req.body/params/query` por los datos ya limpios (así los controladores solo ven campos permitidos). Los esquemas usan `.strict()` para **rechazar campos desconocidos**: un atacante no puede colar `rol: "SUPER_ADMIN"` ni `empresaId` en un registro.

### 3.4 `upload.middleware.ts` — `VACÍO`
Configura `multer`:
- Almacenamiento en memoria o en carpeta temporal (nunca dentro de una ruta pública).
- Límites: CV y cédula 5 MB, foto 2 MB, dataset de ML 10 MB.
- Filtro por tipo **y verificación del contenido real** (primeros bytes del archivo), no solo del `Content-Type` que declara el navegador.
- Tipos permitidos: CV `pdf/docx`; cédula `pdf/jpg/png`; foto `jpg/png/webp`; dataset `csv`.
- El nombre original del archivo **nunca** se usa para guardar (se reemplaza por un UUID), para evitar rutas maliciosas.
- Errores: 413 (tamaño), 415 (tipo).

### 3.5 `rate-limit.middleware.ts` — `NUEVO`
Limitadores específicos con `express-rate-limit`:
- `limiteAutenticacion`: 10 intentos por 15 minutos por IP en `/auth/login`, `/auth/google`, `/auth/register`.
- `limiteRecuperacion`: 5 por hora en recuperar clave y reenviar verificación.
- `limiteMensajes`: 30 por minuto por usuario en el chat.
- **Requisito en `app.ts`:** `app.set('trust proxy', 1)` cuando esté detrás de Render. Sin esto todas las peticiones parecen venir de la misma IP y el límite bloquea a todos a la vez.

---

## 4. Validadores (`src/validators/`)
Un archivo por módulo, con esquemas Zod `.strict()`. Cada campo con tipo, largo máximo y formato.

| Archivo | Esquemas |
|---|---|
| `auth.validator.ts` `NUEVO` | `registroCandidato`, `registroEmpresa`, `login`, `google`, `completarPerfilGoogle`, `recuperarClave`, `restablecerClave`, `aceptarInvitacion`, `verificarCorreo` |
| `candidate.validator.ts` `VACÍO` | `actualizarPerfil` (incluye `educacion[]` y `experiencia[]`), `subirDocumento` |
| `vacancy.validator.ts` `VACÍO` | `crearVacante`, `actualizarVacante`, `cambiarEstadoVacante`, `filtrosVacantes` |
| `application.validator.ts` `NUEVO` | `postular`, `cambiarEstadoPostulacion`, `filtrosPostulaciones` |
| `company.validator.ts` `NUEVO` | `actualizarEmpresa`, `invitarMiembro`, `editarPlantilla` |
| `admin.validator.ts` `NUEVO` | `rechazarEmpresa`, `activarEmpresa` (con `activaHasta` opcional), `desactivarEmpresa`, `filtrosEmpresas` |
| `chat.validator.ts` `NUEVO` | `enviarMensaje` (1–2000 caracteres), `filtrosMensajes` |
| `ml.validator.ts` `NUEVO` | `entrenar` |

**Qué NUNCA acepta un esquema público:** `rol`, `empresaId`, `estado`, `activo`, `claveHash`, `intentosFallidos`, `correoVerificadoEn`.

---

## 5. Servicios (`src/services/`) — donde vive la lógica de negocio

Un servicio recibe un `actor` (`{ id, rol, empresaId }`) y datos ya validados. Nunca recibe `req` ni `res`.

### 5.1 `audit.service.ts` — `NUEVO` (el archivo existe vacío en tu árbol)
- `registrar({ accion, entidad, entidadId, actor?, empresaId?, detalle?, ip? })` inserta una fila en `registro_auditoria`.
- **Solo inserta.** No hay función para editar ni borrar. Recomendado: en la base, quitar permisos `UPDATE` y `DELETE` sobre esa tabla al usuario de la aplicación.
- Si el evento es crítico (cambio de estado, aprobación de empresa), se registra **dentro de la misma transacción** que el cambio, para que no exista uno sin el otro. Si es informativo (login fallido), se registra aparte y un fallo de auditoría **no** rompe la petición.
- `listar(actor, filtros)`: ADMIN y RRHH ven solo su empresa; SUPER_ADMIN ve todo. Filtros: fecha desde/hasta, acción, usuario, entidad. Paginado.
- **Catálogo de acciones:** `LOGIN_EXITOSO`, `LOGIN_FALLIDO`, `CUENTA_BLOQUEADA`, `REGISTRO_CANDIDATO`, `EMPRESA_REGISTRADA`, `EMPRESA_APROBADA`, `EMPRESA_RECHAZADA`, `EMPRESA_SUSPENDIDA`, `EMPRESA_ACTIVADA`, `EMPRESA_DESACTIVADA_AUTO`, `MIEMBRO_INVITADO`, `MIEMBRO_ACTIVADO`, `MIEMBRO_DESACTIVADO`, `VACANTE_CREADA`, `VACANTE_EDITADA`, `VACANTE_ESTADO_CAMBIADO`, `POSTULACION_CREADA`, `CAMBIO_ESTADO_POSTULACION`, `DOCUMENTO_CEDULA_CONSULTADA`, `PLANTILLA_EDITADA`, `ML_ENTRENADO`, `DATASET_SUBIDO`, `CLAVE_RESTABLECIDA`.
- **Conexiones:** lo llaman prácticamente todos los demás servicios. Lo lee `audit` (ruta de historial).

### 5.2 `auth.service.ts` — `NUEVO`

**`registrarCandidato(datos)`**
1. Normaliza el correo (minúsculas, sin espacios) y el teléfono (E.164).
2. Verifica que no exista un usuario con ese correo → si existe, 409 "Ya existe una cuenta con ese correo".
3. Exige `aceptaTerminos = true`; guarda `aceptoTerminosEn = now`.
4. Si acepta WhatsApp, guarda `consentimientoWhatsappEn = now`.
5. Hash de la clave (`hashClave`).
6. Transacción: crea `Usuario` (rol `CANDIDATO`, `empresaId` null **fijado por el servidor**) + `PerfilCandidato` vacío.
7. Crea `TokenUsuario` de tipo `VERIFICACION_CORREO` (guarda solo el hash) y manda el correo con el enlace.
8. Registra `REGISTRO_CANDIDATO`.
9. Devuelve 201 con mensaje "Revisa tu correo". **No devuelve token**: la sesión se inicia con `login`, después de verificar.

**`registrarEmpresa(datos)`**
1. Mismas validaciones de correo, clave y términos para el administrador.
2. Verifica que no exista otra empresa con la misma `identificacionFiscal` o el mismo nombre → 409.
3. Detecta si el correo es de un dominio gratuito (gmail, hotmail, yahoo, outlook...). **No bloquea**: marca `correoCorporativo: false` en el detalle de auditoría para que el superadmin lo vea al aprobar.
4. Transacción: crea `Empresa` (`estado = PENDIENTE_APROBACION`) y `Usuario` (rol `ADMIN`, `empresaId` de esa empresa). El rol y el estado **los fija el servidor**.
5. Token de verificación de correo + correo.
6. Registra `EMPRESA_REGISTRADA`; avisa por correo a los SUPER_ADMIN ("empresa nueva pendiente").
7. Devuelve 201 "Tu empresa quedó pendiente de aprobación".

**`login({ correo, clave })`** — un solo endpoint para todos los roles
1. Normaliza el correo y busca al usuario con su empresa.
2. Si no existe: compara la clave contra `CLAVE_FALSA_HASH` (mismo tiempo de respuesta) y responde 401 "Credenciales inválidas".
3. Si `bloqueadoHasta` está en el futuro: 403 "Cuenta bloqueada temporalmente" (sin decir cuánto falta con exactitud) y registra el intento.
4. Si `claveHash` es null (cuenta solo-Google): 401 con el **mismo** mensaje genérico (no revela que la cuenta existe).
5. Compara la clave. Si falla: `intentosFallidos + 1`; al llegar a 5, `bloqueadoHasta = ahora + 15 min` y se registra `CUENTA_BLOQUEADA`; responde 401 genérico y registra `LOGIN_FALLIDO`.
6. Si es correcta pero `activo = false`: 403 "Cuenta desactivada".
7. Si el usuario tiene empresa, revisa su estado: pendiente → 403 "Tu empresa está pendiente de aprobación"; rechazada o suspendida → 403 con el motivo visible; `activaHasta` vencido → igual que suspendida.
8. Si el correo no está verificado: se permite iniciar sesión, pero la respuesta incluye `correoVerificado: false` y las acciones sensibles (postular, publicar vacante) exigen verificación.
9. Éxito: `intentosFallidos = 0`, `bloqueadoHasta = null`, `ultimoAccesoEn = now`, registra `LOGIN_EXITOSO`.
10. Devuelve `{ user, token }`. **El backend decide qué rol es**: el front no envía ni elige rol; redirige según `user.rol`.

**`verificarCorreo(token)`**: hashea el token, busca `TokenUsuario` vigente, sin usar, tipo `VERIFICACION_CORREO`; marca `usadoEn` y `correoVerificadoEn`. Token inválido o vencido → 400.

**`solicitarRecuperacion(correo)`**: **siempre responde lo mismo** ("si el correo existe, enviamos instrucciones"), exista o no, para no revelar qué correos están registrados. Si existe y tiene clave, crea un token de 1 hora y envía el correo.

**`restablecerClave({ token, nuevaClave })`**: valida token y fortaleza; en una transacción actualiza `claveHash`, `claveCambiadaEn = now`, reinicia `intentosFallidos` y marca el token como usado; invalida otros tokens de recuperación pendientes; registra `CLAVE_RESTABLECIDA`.

**`aceptarInvitacion({ token, clave, datos })`**: valida la invitación (vigente, sin usar), crea el `Usuario` con el `rol` y `empresaId` **que vienen de la invitación**, no del cuerpo; marca `usadaEn`; correo ya verificado (el enlace llegó a ese correo).

**`obtenerPerfilSesion(actor)`** (`GET /auth/me`): devuelve el usuario y, si tiene, su empresa.

### 5.3 `google.service.ts` — `NUEVO`
**`iniciarConGoogle(idToken)`**
1. Verifica el token con `google-auth-library` (`OAuth2Client.verifyIdToken`) usando `GOOGLE_CLIENT_ID` como audiencia. Si falla, 401.
2. Exige `email_verified = true`.
3. Busca por `googleId` (`sub`). Si existe, inicia sesión igual que el login (mismas comprobaciones de activo, empresa, bloqueo).
4. Si no, busca por correo:
   - Si existe un usuario con ese correo (ya verificado): vincula `googleId` y entra.
   - Si no existe: crea un `CANDIDATO` **incompleto** (sin `aceptoTerminosEn`, sin teléfono), `claveHash = null`, correo verificado. Responde `{ requiereCompletarPerfil: true, tokenTemporal }`.
5. **Nunca crea ADMIN ni RRHH por Google.**

**`completarPerfilGoogle(actor, { telefono, cedula, aceptaTerminos })`**: exige `aceptaTerminos`, guarda `aceptoTerminosEn`; hasta que no lo haga, las rutas protegidas devuelven 403 "Completa tu perfil".

### 5.4 `email.service.ts` — `VACÍO`
- **Una sola función de envío:** `enviarCorreo({ para, asunto, html, texto, replyTo? })`. Por debajo usa el proveedor elegido en `EMAIL_PROVIDER`. Cambiar de proveedor no toca nada más.
- **Importante:** el plan gratuito de Render bloquea los puertos SMTP; en el despliegue se usa un proveedor por API HTTP (Resend, Brevo, SendGrid) o un plan de pago.
- El remitente (`From`) es siempre el de la plataforma (`EMAIL_FROM`); el correo de la empresa va en `Reply-To`. Así no falla la autenticación del dominio (SPF/DKIM).
- Funciones de alto nivel: `enviarVerificacion`, `enviarRecuperacion`, `enviarInvitacion`, `enviarNotificacionPostulacion`.
- Todo texto con datos de usuarios se **escapa** antes de insertarlo en el HTML.
- Los enlaces se construyen con `APP_URL`, nunca con datos de la petición.
- Un fallo de correo se registra y se reintenta por la cola; **no** rompe el flujo principal (por ejemplo, la postulación se guarda aunque el correo falle).

### 5.5 `whatsapp.service.ts` — `VACÍO`
- `enviarPlantilla({ para, nombrePlantilla, idioma, variables })`: hace `POST` a la Cloud API de Meta (`graph.facebook.com/<version>/<WHATSAPP_PHONE_NUMBER_ID>/messages`) con el token y tipo `template`. Solo plantillas aprobadas.
- Antes de enviar verifica: el usuario tiene `consentimientoWhatsappEn`, el teléfono es válido (E.164) y existe plantilla aprobada. Si falta algo, **no envía** y deja el motivo en `registroError`.
- Se envía **desde el número único de la plataforma**; el nombre de la empresa viaja como variable.
- `procesarWebhook(payload)`: actualiza el estado de cada `Notificacion` (enviada → entregada → leída, o fallida) usando el id del mensaje de Meta; y actualiza `estadoAprobacion` de las plantillas con el evento `message_template_status_update`.
- `crearPlantilla(...)`: envía una plantilla nueva a revisión de Meta (con otro nombre/versión, nunca editando la aprobada).
- **Conexiones:** la llama `notification.service` (worker) y la ruta del webhook.

### 5.6 `template.service.ts` — `NUEVO`
- `obtenerParaEnvio({ empresaId, evento, canal })`: aplica la regla de selección de la sección 1.2.
- `listarDeEmpresa(actor)`: devuelve, por evento y canal, el texto vigente (el de la empresa o el predeterminado) y, en WhatsApp, el estado de aprobación.
- `editar(actor, { evento, canal, asunto, cuerpo })`:
  - **Correo / APP:** guarda una nueva versión de la empresa y queda activa **al instante**.
  - **WhatsApp:** guarda una nueva versión con `estadoAprobacion = PENDIENTE`, la envía a Meta con otro nombre y **sigue usando la versión anterior hasta que Meta apruebe**. En WhatsApp la empresa solo puede editar las variables y partes permitidas.
  - Registra `PLANTILLA_EDITADA`.
- `restaurarPredeterminada(actor, evento, canal)`: desactiva la versión propia.
- **Conexiones:** la usan `notification.service` y `company.controller`.

### 5.7 `notification.service.ts` — `NUEVO` (cola + envío)
Usa el patrón "bandeja de salida": **crear** la notificación y **enviarla** son pasos separados, para que un fallo de correo o WhatsApp nunca rompa la acción principal.

**`encolar({ evento, postulacionId, usuarioId, empresaId, variables, canales })`**
1. Por cada canal solicitado, obtiene la plantilla (`template.service`) y la renderiza con las variables.
2. Crea una fila `Notificacion` en estado `PENDIENTE` por canal.
3. Se llama **dentro de la misma transacción** del cambio de estado, para que no haya cambio sin notificación ni notificación sin cambio.
4. Siempre crea la notificación `APP` (para la campana de la plataforma).

**Procesador (worker)** — se ejecuta cada minuto y al arrancar el servidor:
1. Toma notificaciones `PENDIENTE` con `proximoIntentoEn <= ahora` y las marca `PROCESANDO` con `bloqueadaEn` (evita que dos ejecuciones envíen la misma).
2. Las envía por su canal.
3. Éxito → `ENVIADA`, `enviadaEn`. Fallo → `intentos + 1`, `proximoIntentoEn` con espera creciente (1, 5, 15 minutos); al llegar a `maxIntentos` → `FALLIDA` con `registroError`.
4. Las notificaciones `PROCESANDO` con `bloqueadaEn` muy antigua (el servidor se durmió a mitad) vuelven a `PENDIENTE`.
5. Un fallo en un canal **no detiene los otros**.

**`listar(actor)`** (`GET /notifications`): candidato ve las suyas; ADMIN y RRHH ven las de su empresa.
**`enviarManual(actor, datos)`** (`POST /notifications/send`): permite a RRHH enviar un aviso puntual a un candidato de **su** empresa (valida que la postulación sea de su empresa).

### 5.8 `storage.service.ts` — `VACÍO`
- `guardar({ buffer, tipo, nombreOriginal, mime })`: genera un nombre con UUID, escribe en una carpeta **privada** (fuera de `public` y **nunca** servida como estática) y devuelve la ruta interna. En producción el destino es un almacenamiento externo (el disco de Render se borra en cada reinicio).
- `leer(ruta)`: devuelve el archivo para que el controlador lo entregue por un endpoint autenticado.
- `eliminar(ruta)`: para fotos reemplazadas. Los CV y cédulas **no se borran**: se marcan `vigente = false`.
- Nunca construye rutas con texto del usuario.

### 5.9 `ml.service.ts` — `VACÍO`
**`predecir(postulacionId)`**
1. Carga la postulación con el perfil del candidato y la vacante.
2. Arma el payload: del candidato `aniosExperiencia`, `nivelEducativo`, `habilidades`; de la vacante `habilidadesRequeridas`, `aniosExperienciaMinimos`, `nivelEducativoMinimo`. **No se envía nada personal ajeno al cargo** (nombre, cédula, edad, género, nacionalidad, foto).
3. `POST ${ML_SERVICE_URL}/predict` con el encabezado de clave de servicio (`ML_API_KEY`) y un tiempo de espera largo (el servicio gratuito puede tardar en despertar).
4. Valida la respuesta con Zod (`affinityScore` entre 0 y 1, etc.). Si no cumple, se descarta.
5. Guarda `PrediccionML` con `puntajeAfinidad`, `esApto`, `versionModelo`, `modeloId` (el modelo activo), `datosEntrada` (copia de lo enviado) y `datosCrudosPrediccion` (el desglose: `experienceMatch`, `educationMatch`, `skillsMatch`, `matchingSkills`, `missingSkills`, `keyFactors`, `explanation`, `fairnessChecked`).
6. Si el ML falla o está dormido: **la postulación ya está guardada**; queda sin predicción y un trabajo de reintento la completa después.

**`reintentarPendientes()`**: busca postulaciones sin predicción y las procesa (máximo N por ejecución).
**`obtenerMetricas()`** (`GET /ml/metrics`): lee el modelo activo (`ModeloML.metricas`).
**`entrenar(actor)`** (`POST /ml/train`): solo SUPER_ADMIN; pide el entrenamiento al ml-service (responde rápido con estado "en proceso" si tarda); al terminar guarda un `ModeloML` nuevo y lo marca activo; registra `ML_ENTRENADO`.
**`subirDataset(actor, archivo)`** (`POST /ml/upload-dataset`): solo SUPER_ADMIN; valida el CSV, crea `ConjuntoDatos` con el total de filas y lo entrega al ml-service.

> **Pendiente:** el contrato exacto (ruta y forma del JSON de `/predict`, `/train`, `/metrics`) hay que confirmarlo leyendo `ml-service/app/api/routes.py` y `schemas/`.

### 5.10 `candidate.service.ts` — `NUEVO`
- `obtenerPerfil(actor)`: perfil + educación + experiencia + documentos vigentes.
- `actualizarPerfil(actor, datos)`: en transacción, actualiza datos del perfil y **reemplaza** las listas de educación y experiencia. Recalcula `aniosExperiencia` (a partir de la experiencia) y `nivelEducativo` (el más alto de la educación). Normaliza el teléfono. La cédula (`cedulaNumero`) solo se guarda, nunca se devuelve a terceros.
- `subirDocumento(actor, { tipo, archivo })`: valida tipo y contenido, guarda con `storage.service`, marca el documento anterior del mismo tipo como `vigente = false` y crea el nuevo como vigente. Si es CV, extrae el texto y lo guarda en `textoExtraido`.
- `subirFoto(actor, archivo)`: reemplaza `fotoRuta` y borra la anterior.
- `obtenerDocumentoPropio(actor, id)`: solo si el documento pertenece al perfil del actor.

### 5.11 `vacancy.service.ts` — `NUEVO`
- `listarPublicas(filtros, actor?)`:
  - Sin sesión o candidato: solo `estado = ABIERTA` **y** `empresa.estado = ACTIVA` **y** (`cierraEn` null o futura).
  - ADMIN y RRHH: las de **su empresa** en cualquier estado (borrador, pausada...).
  - Filtros: texto, especialización/carrera, experiencia (con/sin), modalidad, empresa, ubicación; paginado.
  - Si hay un candidato con sesión, puede ordenarse por afinidad (fase posterior).
- `obtener(id, actor?)`: la pública requiere ABIERTA + empresa ACTIVA; si no, 404.
- `crear(actor, datos)`: `empresaId` y `creadaPorId` salen de `actor`, **no del cuerpo**. Si se crea ya publicada, `publicadaEn = now`. Actualiza `Empresa.ultimaVacanteEn = now` (reinicia el reloj de los 3 meses). Registra `VACANTE_CREADA`.
- `actualizar(actor, id, datos)`: busca con `{ id, empresaId: actor.empresaId }`; si no aparece, 404. Registra `VACANTE_EDITADA` con valor anterior y nuevo.
- `cambiarEstado(actor, id, estado)`: abrir (fija `publicadaEn`, actualiza `ultimaVacanteEn`), pausar, cerrar. Registra `VACANTE_ESTADO_CAMBIADO`.
- No existe borrado físico: se **cierra**.

### 5.12 `application.service.ts` — `NUEVO`
**`postular(actor, { vacanteId, respuestasAdicionales, cvNuevo? })`**
1. Verifica que el actor sea `CANDIDATO`, con correo verificado y términos aceptados.
2. Carga la vacante: debe estar `ABIERTA` y su empresa `ACTIVA` → si no, 404.
3. Verifica que no exista ya una postulación de ese candidato a esa vacante → 409 "Ya te postulaste a esta vacante".
4. Si el candidato mandó un CV nuevo, lo guarda como documento vigente; si no, usa el CV vigente del perfil; si no tiene ninguno, 400 "Falta el currículo".
5. Exige que tenga cédula cargada si la empresa lo requiere.
6. Valida `respuestasAdicionales` contra `vacante.camposAdicionales`.
7. Transacción: crea `Postulacion` (`empresaId` **tomado de la vacante**, no de la petición), `curriculoId` y `cedulaId` (las versiones vigentes en ese momento), el primer `HistorialEstadoPostulacion` (`estadoNuevo = RECIBIDA`), una `Conversacion` ligada, y encola `POSTULACION_RECIBIDA` (correo, WhatsApp si hay consentimiento, APP).
8. **Después de confirmar la transacción**, llama a `ml.service.predecir(postulacionId)` sin bloquear la respuesta si el ML tarda.
9. Registra `POSTULACION_CREADA`.
10. Devuelve la postulación mapeada.

**`listar(actor, filtros)`**
- CANDIDATO: solo `candidatoId = actor.id`.
- ADMIN/RRHH: solo `empresaId = actor.empresaId`; filtros `vacancyId`, `estado`; orden por afinidad (`prediccionML.puntajeAfinidad` descendente) o fecha. Incluye el puntaje y quién hizo el último cambio.
- Nunca se aceptan `empresaId` ni `candidatoId` desde la query.

**`obtener(actor, id)`**: mismas reglas de pertenencia; incluye el historial completo (quién cambió qué y cuándo, con nombre de la persona), el desglose del ML y las notificaciones enviadas.

**`cambiarEstado(actor, id, { estado, nota, notificar })`** (solo ADMIN/RRHH)
1. Busca con `{ id, empresaId: actor.empresaId }`; si no aparece, 404.
2. Valida la transición permitida (por ejemplo, no se vuelve de `CONTRATADA` a `RECIBIDA`).
3. Transacción: actualiza `estado`; crea `HistorialEstadoPostulacion` con `estadoAnterior`, `estadoNuevo`, `nota` y `cambiadoPorId = actor.id`; si `notificar`, encola la notificación del evento correspondiente; registra `CAMBIO_ESTADO_POSTULACION`.
4. Mapa de estados → eventos: `EN_REVISION`, `PRESELECCIONADA`, `ENTREVISTA` (primera o segunda según el historial), `RECHAZADA`, `CONTRATADA`.

**`entregarDocumento(actor, postulacionId, tipo)`**: solo ADMIN/RRHH de la empresa de la postulación. Entrega el CV o la **cédula** que el candidato asoció a esa postulación y **registra `DOCUMENTO_CEDULA_CONSULTADA`** con quién y cuándo.

### 5.13 `company.service.ts` — `NUEVO` (ADMIN y RRHH de una empresa)
- `obtenerEmpresa(actor)` / `actualizarEmpresa(actor, datos)`: datos de su propia empresa (solo ADMIN edita).
- `listarMiembros(actor)`: ADMIN ve todos los miembros de su empresa (rol, activo, último acceso).
- `invitarMiembro(actor, { correo, nombre, apellido, rol })`: solo ADMIN. El rol solo puede ser `RRHH` (o `ADMIN` adicional). Crea `Invitacion` con token (se guarda el hash), vigencia 72 h, y envía el correo. **El admin nunca define la contraseña de otra persona**: quien recibe la invitación la crea. Registra `MIEMBRO_INVITADO`.
- `cambiarEstadoMiembro(actor, usuarioId, activo)`: solo ADMIN; busca el miembro con `{ id, empresaId: actor.empresaId }`; **desactiva, no borra** (soft delete). No puede desactivarse a sí mismo ni dejar la empresa sin ningún ADMIN activo. Registra `MIEMBRO_ACTIVADO` / `MIEMBRO_DESACTIVADO`.
- `dashboard(actor)`: resumen de la empresa (ver `report.service`).
- Plantillas de notificación: delega en `template.service`.

### 5.14 `admin.service.ts` — `NUEVO` (solo SUPER_ADMIN)
- `listarEmpresas(filtros)`: cada empresa con estado, **cantidad de ADMIN y de RRHH**, **cantidad de vacantes**, `ultimaVacanteEn`, `activaHasta`, fecha de registro.
- `detalleEmpresa(id)`: datos de la empresa, miembros, historial de vacantes y movimientos recientes.
- `aprobar(actor, id)`: solo desde `PENDIENTE_APROBACION`; `estado = ACTIVA`, `aprobadaEn`, `aprobadaPorId`; `ultimaVacanteEn = now` (para no desactivarla al instante); correo al admin de la empresa; `EMPRESA_APROBADA`.
- `rechazar(actor, id, motivo)`: `RECHAZADA` + `motivoRechazo` obligatorio; correo; `EMPRESA_RECHAZADA`.
- `desactivar(actor, id, { motivo, activaHasta? })`: `SUSPENDIDA`, `desactivadaEn`, `motivoDesactivacion = MANUAL`; las vacantes dejan de verse de inmediato (los listados filtran por empresa ACTIVA) y los miembros ya no pueden iniciar sesión; los datos **no se borran**; `EMPRESA_SUSPENDIDA`.
- `activar(actor, id, { activaHasta? })`: `ACTIVA`, limpia `desactivadaEn`, fija `activaHasta` si se indicó ("tiempo de desactivación"), `ultimaVacanteEn = now`; `EMPRESA_ACTIVADA`.
- `fijarVencimiento(actor, id, activaHasta)`: cambia solo el plazo (caso pago por tiempo).
- `listarUsuarios(filtros)` y `auditoria(filtros)`: vista global.

### 5.15 `chat.service.ts` — `NUEVO`
- **Quién puede iniciar un chat:** solo existe uno cuando hay una `Postulacion` entre el candidato y la empresa (se crea al postular). No se puede escribir a candidatos con los que no hay relación (evita spam y protege la privacidad).
- `listarConversaciones(actor)`: candidato ve las suyas; ADMIN/RRHH ven las de su empresa (cualquier miembro puede leer y responder). Con último mensaje y conteo de no leídos.
- `listarMensajes(actor, conversacionId, { despues? })`: verifica pertenencia; `despues` permite consultar solo mensajes nuevos (el front consulta cada pocos segundos; WebSocket queda para una fase posterior).
- `enviarMensaje(actor, conversacionId, contenido)`: verifica pertenencia y que la conversación no esté cerrada; valida largo; crea `Mensaje` con `autorId`; actualiza `ultimoMensajeEn`; encola una notificación `MENSAJE_NUEVO` para el otro lado (APP siempre, correo si lleva tiempo sin leer).
- `marcarLeidos(actor, conversacionId)`: marca `leidoEn` solo en mensajes del otro participante.
- **Regla de contenido:** el backend **no interpreta** HTML; el front lo muestra como texto plano.

### 5.16 `report.service.ts` — `NUEVO`
- `dashboardEmpresa(actor)`: conteo de vacantes por estado, postulaciones por estado, promedio de afinidad, últimas postulaciones, últimos movimientos (de auditoría), cantidad de miembros activos.
- `dashboardAdmin()` (SUPER_ADMIN): empresas por estado, empresas por vencer, altas recientes, entrenamiento de ML vigente.
- `comparativo(actor)` (`GET /reports/comparison`): "antes" sale de `LineaBaseProceso`; "después" se calcula con datos reales (tiempo entre `postuladaEn` y el primer cambio de estado en `HistorialEstadoPostulacion`; porcentaje de postulaciones `esApto` que RRHH llevó a preselección o más). **Definición de "precisión" para el comparativo: por acordar con el equipo y documentar en la tesis.**

---

## 6. Rutas y controladores

Cada módulo tiene un archivo de rutas (define URL, método, protecciones y validación) y un controlador (traduce HTTP a servicio). El controlador siempre: (1) toma lo validado de `req`, (2) arma el `actor` desde `req.user`, (3) llama al servicio, (4) aplica el mapper, (5) responde `{ success, data }`.

Todas las rutas se montan bajo `/api` desde `app.ts`.

### 6.1 `health.routes.ts` — `EXISTE`
| Método y ruta | Acceso | Qué hace |
|---|---|---|
| `GET /api/health` | Público | Responde `{ success:true, data:{ status:'ok' } }`. Sirve para saber si el servicio despertó (arranque en frío) |

### 6.2 `auth.routes.ts` + `auth.controller.ts` — `VACÍO`
Todas llevan `limiteAutenticacion` o `limiteRecuperacion` y `validate(...)`.

| Método y ruta | Acceso | Servicio | Respuesta |
|---|---|---|---|
| `POST /auth/register` *(front)* | Público | `registrarCandidato` o `registrarEmpresa`, según el campo `tipo` (`CANDIDATO` o `EMPRESA`). Es lo único que el registro público puede crear | 201 con mensaje |
| `POST /auth/login` *(front)* | Público | `login` | `{ user, token }` |
| `POST /auth/google` | Público | `iniciarConGoogle` | `{ user, token }` o `{ requiereCompletarPerfil, tokenTemporal }` |
| `POST /auth/google/complete` | Sesión temporal de Google | `completarPerfilGoogle` | `{ user, token }` |
| `GET /auth/me` | Sesión | `obtenerPerfilSesion` | usuario + empresa |
| `POST /auth/verify-email` | Público | `verificarCorreo` | mensaje |
| `POST /auth/resend-verification` | Sesión | reenvía el enlace | mensaje |
| `POST /auth/recover-password` *(front)* | Público | `solicitarRecuperacion` | mensaje siempre igual |
| `POST /auth/reset-password` | Público | `restablecerClave` | mensaje |
| `POST /auth/accept-invitation` | Público (con token) | `aceptarInvitacion` | `{ user, token }` |

**No hay `/auth/logout` en el servidor:** el token es sin estado; el front lo borra. Limitación documentada: un token robado vale hasta que venza (por eso dura 1 hora y se compara con `claveCambiadaEn`).

### 6.3 `candidates.routes.ts` + `candidates.controller.ts` — `VACÍO`
Todas: `autenticar` + `exigirRol(CANDIDATO)`.

| Método y ruta | Qué hace |
|---|---|
| `GET /candidates/me` *(front)* | Perfil completo del candidato con sesión |
| `PUT /candidates/me` *(front)* | Actualiza datos, educación, experiencia, habilidades, idiomas y visibilidad |
| `POST /candidates/me/documents` | Sube CV o cédula (`multipart`, campo `tipo`). Reemplaza el vigente |
| `GET /candidates/me/documents/:id` | Descarga un documento **propio** (el servidor lo entrega, no hay URL pública) |
| `PUT /candidates/me/photo` | Sube la foto de perfil |
| `GET /candidates/me/applications` | Atajo a sus postulaciones (opcional; el front hoy usa `/applications`) |

### 6.4 `vacancies.routes.ts` + `vacancies.controller.ts` — `VACÍO`

| Método y ruta | Acceso | Qué hace |
|---|---|---|
| `GET /vacancies` *(front)* | `autenticarOpcional` | Listado con filtros y paginación. Público: solo abiertas de empresas activas. ADMIN/RRHH: todas las de su empresa |
| `GET /vacancies/:id` *(front)* | `autenticarOpcional` | Detalle (misma regla de visibilidad) |
| `POST /vacancies` *(front)* | ADMIN, RRHH | Crea vacante en su empresa |
| `PUT /vacancies/:id` *(front)* | ADMIN, RRHH | Edita |
| `PATCH /vacancies/:id/status` | ADMIN, RRHH | Abre, pausa o cierra |

El filtro `empresaId` en el listado público es un **filtro de búsqueda** (ver vacantes de esa empresa), no un permiso.

### 6.5 `selection.routes.ts` + `selection.controller.ts` — `VACÍO` (postulaciones)

| Método y ruta | Acceso | Qué hace |
|---|---|---|
| `POST /applications` *(front, hoy como formulario)* | CANDIDATO | `postular`. `multipart` si lleva CV nuevo |
| `GET /applications` *(front)* | Sesión | `listar`. Filtros `vacancyId`, `estado`, `orden`. El front viejo enviaba `?email=`: **se ignora**, el servidor usa la sesión |
| `GET /applications/:id` *(front)* | Sesión | `obtener` (con pertenencia) |
| `PATCH /applications/:id/status` *(front)* | ADMIN, RRHH | `cambiarEstado` |
| `GET /applications/:id/documents/:tipo` | ADMIN, RRHH | `entregarDocumento` (CV o cédula, con auditoría) |

### 6.6 `ml.routes.ts` + `ml.controller.ts` — `VACÍO`

| Método y ruta | Acceso | Qué hace |
|---|---|---|
| `GET /ml/metrics` *(front)* | SUPER_ADMIN | Métricas del modelo activo |
| `POST /ml/train` *(front)* | SUPER_ADMIN | Pide entrenamiento |
| `POST /ml/upload-dataset` *(front)* | SUPER_ADMIN | Sube el CSV de entrenamiento |

Sin ruta de predicción para el navegador: **la predicción solo la llama el backend internamente**.

### 6.7 `notifications.routes.ts` + controlador — `VACÍO`

| Método y ruta | Acceso | Qué hace |
|---|---|---|
| `GET /notifications` *(front)* | Sesión | Lista las que le corresponden |
| `POST /notifications/send` *(front)* | ADMIN, RRHH | Envío manual a un candidato de su empresa |
| `PATCH /notifications/:id/read` | Sesión | Marca una notificación APP como leída |
| `GET /webhooks/whatsapp` | Público (Meta) | Verificación del webhook (ver sección 7.3) |
| `POST /webhooks/whatsapp` | Público (Meta), **firma obligatoria** | Estados de entrega/lectura y estado de plantillas |

### 6.8 `company.routes.ts` + controlador — `NUEVO` (ADMIN y RRHH)

| Método y ruta | Acceso | Qué hace |
|---|---|---|
| `GET /company/me` | ADMIN, RRHH | Datos de la empresa |
| `PUT /company/me` | ADMIN | Edita datos y ubicación |
| `GET /company/dashboard` | ADMIN, RRHH | Resumen para el panel |
| `GET /company/members` | ADMIN | Lista de RRHH y admins |
| `POST /company/members/invite` | ADMIN | Invita (formulario: correo, nombre, apellido, rol) |
| `PATCH /company/members/:id/status` | ADMIN | Activa o desactiva (soft delete) |
| `GET /company/notification-templates` | ADMIN, RRHH | Textos vigentes y su estado |
| `PUT /company/notification-templates` | ADMIN, RRHH | Edita un texto (correo/APP inmediato; WhatsApp con revisión) |
| `DELETE /company/notification-templates/:evento/:canal` | ADMIN, RRHH | Vuelve al predeterminado |
| `GET /audit` | ADMIN, RRHH | Historial de **su empresa**, filtrable. Solo lectura: no existen rutas para editarlo ni borrarlo |

### 6.9 `admin.routes.ts` + controlador — `NUEVO` (SUPER_ADMIN)

| Método y ruta | Qué hace |
|---|---|
| `GET /admin/companies` | Lista con estado, cantidad de admins, RRHH y vacantes |
| `GET /admin/companies/:id` | Detalle e historial de vacantes |
| `POST /admin/companies/:id/approve` | Aprueba una empresa pendiente |
| `POST /admin/companies/:id/reject` | Rechaza con motivo |
| `POST /admin/companies/:id/deactivate` | Desactiva (opcional: plazo) |
| `POST /admin/companies/:id/activate` | Activa (opcional: `activaHasta`) |
| `PUT /admin/companies/:id/expiration` | Cambia solo el plazo de vigencia |
| `GET /admin/users` | Usuarios de toda la plataforma |
| `GET /admin/audit` | Auditoría global |
| `GET /admin/dashboard` | Panel del superadmin |

### 6.10 `chat.routes.ts` + controlador — `NUEVO`

| Método y ruta | Acceso | Qué hace |
|---|---|---|
| `GET /conversations` | Sesión | Bandeja (con no leídos) |
| `GET /conversations/:id/messages?after=` | Sesión | Mensajes (o solo los nuevos) |
| `POST /conversations/:id/messages` | Sesión (`limiteMensajes`) | Envía un mensaje |
| `PATCH /conversations/:id/read` | Sesión | Marca como leídos |

### 6.11 `reports.routes.ts` + controlador — `VACÍO`

| Método y ruta | Acceso | Qué hace |
|---|---|---|
| `GET /reports/comparison` *(front)* | ADMIN, RRHH (su empresa); SUPER_ADMIN (con `?empresaId=`) | Comparativo antes/después |

---

## 7. Trabajos en segundo plano y webhooks

Viven en `src/jobs/` (`NUEVO`) y los arranca `server.ts` después de abrir el puerto.

### 7.1 `jobs/notificaciones.job.ts`
Cada minuto y al iniciar: llama al procesador de `notification.service` (sección 5.7).

### 7.2 `jobs/empresas.job.ts` — desactivación automática
Cada día y al iniciar el servidor:
1. Busca empresas `ACTIVA` que cumplan alguna de estas condiciones:
   - `activaHasta` ya pasó → motivo `VENCIMIENTO`.
   - `ultimaVacanteEn` es anterior a hace 3 meses (o es nula y `aprobadaEn` es anterior a hace 3 meses) → motivo `INACTIVIDAD`.
2. Pasa cada una a `SUSPENDIDA`, con `desactivadaEn` y `motivoDesactivacion`.
3. Registra `EMPRESA_DESACTIVADA_AUTO` y avisa por correo al ADMIN de la empresa.
4. Como el servicio gratuito duerme, **además** `autenticar` revisa `activaHasta` en cada petición: aunque el trabajo no haya corrido, la empresa vencida no entra.

Efecto de estar `SUSPENDIDA`: sus vacantes desaparecen del listado público, sus miembros no pueden iniciar sesión, no se pierden datos. El superadmin la reactiva desde su panel.

### 7.3 Webhook de WhatsApp (`POST /webhooks/whatsapp`)
1. Esta ruta usa el **cuerpo crudo** (sin parsear) para poder calcular la firma.
2. Calcula `HMAC-SHA256` del cuerpo con `WHATSAPP_APP_SECRET` y lo compara con el encabezado `X-Hub-Signature-256` usando comparación de tiempo constante. **Si no coincide: 401 y no se procesa nada.**
3. Responde `200` de inmediato (Meta reintenta si tarda) y procesa después.
4. Eventos: estado de mensajes (enviado, entregado, leído, fallido) → actualiza `Notificacion`; cambio de estado de plantilla → actualiza `PlantillaNotificacion.estadoAprobacion`.
5. `GET /webhooks/whatsapp`: responde el `hub.challenge` solo si `hub.verify_token` coincide con `WHATSAPP_VERIFY_TOKEN`.

### 7.4 `jobs/ml.job.ts`
Cada 5 minutos: `ml.service.reintentarPendientes()` completa las predicciones de postulaciones que quedaron sin puntaje porque el servicio de ML estaba dormido.

### 7.5 `jobs/limpieza.job.ts`
Diario: elimina `TokenUsuario` e `Invitacion` vencidos hace más de 7 días.

---

## 8. Flujos completos de extremo a extremo

### 8.1 Registro de una empresa
1. Front → `POST /auth/register` (`tipo: EMPRESA`) → ruta `limiteAutenticacion` → `validate` (rechaza campos como `rol`).
2. `auth.controller` → `auth.service.registrarEmpresa`.
3. Transacción: crea `Empresa(PENDIENTE_APROBACION)` + `Usuario(ADMIN)`.
4. `email.service` → correo de verificación; correo a SUPER_ADMIN.
5. `audit.service` → `EMPRESA_REGISTRADA`.
6. Respuesta 201. El admin intenta entrar → 403 "pendiente de aprobación".
7. SUPER_ADMIN → `POST /admin/companies/:id/approve` → `ACTIVA` + correo + auditoría.
8. Ahora el admin entra y publica vacantes.

### 8.2 Registro de un candidato por formulario o por Google
- **Formulario:** `POST /auth/register` → usuario + perfil vacío → correo de verificación → `login`.
- **Google:** `POST /auth/google` → verificación del token → si es nuevo, cuenta incompleta → `POST /auth/google/complete` (teléfono, cédula, términos, consentimiento de WhatsApp) → sesión activa.

### 8.3 El admin agrega a un RRHH
1. `POST /company/members/invite` (ADMIN) → crea `Invitacion` (solo el hash del token) → correo con enlace.
2. El invitado abre el enlace → `POST /auth/accept-invitation` con nombre y clave → se crea el `Usuario(RRHH)` con la empresa de la invitación.
3. Para quitarlo: `PATCH /company/members/:id/status { activo:false }` → no puede iniciar sesión; su historial permanece.

### 8.4 Publicar una vacante
1. `POST /vacancies` (ADMIN o RRHH) → `empresaId` del token → crea la vacante, actualiza `ultimaVacanteEn`, audita.
2. Aparece en el listado público solo si está `ABIERTA` y la empresa `ACTIVA`.

### 8.5 Postularse (con ML)
1. `POST /applications` (CANDIDATO) → valida vacante abierta, no duplicado, documentos.
2. Transacción: postulación + historial `RECIBIDA` + conversación + notificaciones encoladas.
3. Respuesta 201 inmediata.
4. `ml.service.predecir` → `ml-service /predict` con clave de servicio → guarda `PrediccionML`.
5. El worker envía correo y WhatsApp (si hay consentimiento y plantilla aprobada).
6. RRHH ve la lista ordenada por afinidad.

### 8.6 RRHH cambia el estado (entrevista, contratación, rechazo)
1. `PATCH /applications/:id/status` → busca por `{ id, empresaId }`.
2. Transacción: cambia estado, guarda historial con **quién** lo hizo, encola notificación, audita.
3. El worker envía correo (texto editado por la empresa) y WhatsApp (plantilla aprobada, con variables).
4. El candidato ve la notificación en la plataforma (canal APP) y puede responder por el chat.

### 8.7 Una empresa se desactiva sola
1. `empresas.job` detecta 3 meses sin vacantes o `activaHasta` vencido.
2. `SUSPENDIDA` + auditoría + correo al admin.
3. Sus vacantes desaparecen del listado y sus usuarios no entran.
4. SUPER_ADMIN la reactiva (`/admin/companies/:id/activate`), con o sin nuevo plazo.

### 8.8 Chat
1. Existe una conversación por postulación (creada al postular).
2. Cualquier miembro de la empresa o el candidato escribe → `POST /conversations/:id/messages` → verifica pertenencia → guarda con `autorId` → encola aviso.
3. El otro lado consulta `GET /conversations/:id/messages?after=` cada pocos segundos.

---

## 9. Matriz de permisos

| Acción | Público | CANDIDATO | RRHH | ADMIN | SUPER_ADMIN |
|---|:-:|:-:|:-:|:-:|:-:|
| Ver vacantes abiertas de empresas activas | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver vacantes propias en cualquier estado | — | — | ✅ | ✅ | ✅ (global) |
| Crear / editar / cerrar vacantes | — | — | ✅ | ✅ | — |
| Postularse | — | ✅ | — | — | — |
| Ver sus propias postulaciones | — | ✅ | — | — | — |
| Ver postulaciones de su empresa y afinidad | — | — | ✅ | ✅ | — |
| Cambiar estado de postulación | — | — | ✅ | ✅ | — |
| Ver cédula del candidato (con auditoría) | — | — | ✅ (su empresa) | ✅ (su empresa) | — |
| Chat con el candidato / con la empresa | — | ✅ | ✅ | ✅ | — |
| Editar plantillas de notificación | — | — | ✅ | ✅ | — |
| Ver historial de auditoría | — | — | ✅ (su empresa) | ✅ (su empresa) | ✅ (global) |
| Invitar / activar / desactivar RRHH | — | — | — | ✅ | — |
| Aprobar, rechazar, activar, desactivar empresas | — | — | — | — | ✅ |
| Entrenar el modelo, subir dataset, ver métricas | — | — | — | — | ✅ |
| Ver comparativo antes/después | — | — | ✅ (su empresa) | ✅ (su empresa) | ✅ |

---

## 10. Seguridad: lista de verificación por capa

**Entrada**
- [ ] Todo endpoint valida con Zod `.strict()` (cuerpo, parámetros y query).
- [ ] Ningún esquema público acepta `rol`, `empresaId`, `estado`, `activo` ni campos de seguridad.
- [ ] Límite de tamaño de JSON (1 MB) y de archivos por tipo.
- [ ] Verificación del contenido real de los archivos, no solo la extensión.
- [ ] Teléfonos y correos normalizados antes de guardar.

**Autenticación**
- [ ] `JWT_SECRET` aleatorio de 32+ caracteres; los valores de ejemplo se rechazan al arrancar.
- [ ] Contraseñas con bcrypt (costo 12); nunca en logs ni en respuestas.
- [ ] Respuesta de login idéntica para correo inexistente o clave incorrecta.
- [ ] Bloqueo tras 5 intentos fallidos durante 15 minutos.
- [ ] Tokens de verificación, recuperación e invitación: aleatorios, con vencimiento, de un solo uso, **guardados solo como hash**.
- [ ] Rol y empresa se leen de la base en cada petición; cambiar la clave invalida sesiones anteriores.
- [ ] Google: se verifica firma, audiencia (`GOOGLE_CLIENT_ID`) y `email_verified`. Nunca crea ADMIN ni RRHH.

**Autorización y aislamiento entre empresas**
- [ ] Rutas privadas protegidas con `autenticar` y, si corresponde, `exigirRol`.
- [ ] Toda consulta de ADMIN/RRHH incluye `empresaId = req.user.empresaId`.
- [ ] Registros de otra empresa responden 404 (no 403).
- [ ] El candidato solo accede a lo suyo (`candidatoId = req.user.id`).
- [ ] Empresas `PENDIENTE`, `SUSPENDIDA` o `RECHAZADA` no inician sesión ni muestran vacantes.
- [ ] Último ADMIN de una empresa no puede desactivarse.

**Datos sensibles**
- [ ] Cédula y CV en almacenamiento privado, entregados solo por endpoint autenticado y a la empresa correspondiente, con registro de consulta.
- [ ] Ningún mapper devuelve `claveHash`, `googleId`, `intentosFallidos`, `bloqueadoHasta` ni rutas internas.
- [ ] Al ML solo viajan variables relacionadas con el cargo.
- [ ] Los candidatos no son visibles para las empresas sin su consentimiento (`perfilVisible`).

**Servicios externos**
- [ ] ML: clave de servicio; el navegador nunca lo llama; respuesta validada con Zod.
- [ ] WhatsApp: no se envía sin consentimiento; webhook con firma verificada y comparación de tiempo constante.
- [ ] Correo: remitente de la plataforma, textos escapados, enlaces desde `APP_URL`.

**Configuración y operación**
- [ ] `helmet`, CORS solo al `FRONTEND_URL`, `trust proxy` configurado, límites por ruta.
- [ ] Errores genéricos en producción; sin trazas ni secretos en respuestas o logs.
- [ ] Auditoría solo-inserción de acciones críticas.
- [ ] `.env` y `uploads/` fuera de Git; seed prohibido en producción.

---

## 11. Orden de construcción y criterio de "terminado"

| Etapa | Qué se construye | Se considera terminada cuando |
|---|---|---|
| 0 | Base (hecha) + `rate-limit`, `validate`, `trust proxy`, mappers y utilidades | `GET /api/health` responde y los middlewares tienen pruebas básicas |
| 1 | Migración v4 + seed actualizado | `prisma migrate dev` y `db seed` corren sin errores |
| 2 | **Auth completo** (registro, login, Google, verificación, recuperación, invitaciones) | El front puede registrar, iniciar sesión y recuperar clave contra el backend real |
| 3 | `admin` (aprobar empresas) + `company` (miembros) + `audit.service` | El flujo empresa → aprobación → invitar RRHH funciona |
| 4 | Vacantes + filtros públicos | Se publica una vacante y solo se ve si la empresa está activa |
| 5 | Perfil del candidato + `storage.service` + uploads | CV, cédula y foto se suben y se entregan solo a quien corresponde |
| 6 | Postulaciones + historial + `ml.service` | Se postula y aparece el porcentaje de afinidad; el ML dormido no bloquea |
| 7 | Notificaciones (cola, correo, plantillas, WhatsApp, webhook) | Un cambio de estado envía correo y WhatsApp con reintentos |
| 8 | Chat | Candidato y empresa intercambian mensajes por postulación |
| 9 | Desactivación automática + reportes + comparativo | Una empresa sin vacantes se suspende sola y se ve el comparativo |
| 10 | Pruebas (funcionales, integración, seguridad) con la tabla OWASP del Capítulo III | Cada fila de la Tabla 3.8 tiene resultado |

---

## 12. Decisiones abiertas

1. **Contrato del ML:** confirmar ruta y JSON de `/predict`, `/train` y `/metrics` leyendo `ml-service`.
2. **Definición de "precisión" en el comparativo** y cómo se medirá la línea base manual.
3. **Almacenamiento real de archivos en producción** (el disco de Render no persiste).
4. **Proveedor de correo** (Resend, Brevo, SendGrid o plan de pago con SMTP).
5. **Plantillas de WhatsApp:** textos finales de cada evento y quién las envía a revisión de Meta (con antelación a la demo).
6. **Correo no verificado:** si puede iniciar sesión (propuesto) o no.
7. **Chat en tiempo real:** consulta periódica ahora; WebSocket después.
8. **Ofertas directas y ubicación "más cerca":** fase posterior, con consentimiento y sin exponer cédula.
9. **Coordinar con el front:** `tipo` en el registro, rutas nuevas (`/company`, `/admin`, `/conversations`) y que deje de enviar `?email=` en postulaciones.
