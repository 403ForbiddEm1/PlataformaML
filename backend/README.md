# Backend — Guía de instalación y arranque

> **Plataforma web con algoritmos de aprendizaje automático para la optimización del proceso de reclutamiento y selección de personal.**
>
> Este documento explica, paso a paso, cómo preparar el entorno, instalar dependencias, crear la base de datos, ejecutar las migraciones, poblar datos de demostración y levantar el servidor de desarrollo.

---

## Índice

1. [Requisitos previos](#1-requisitos-previos)
2. [Clonar el repositorio](#2-clonar-el-repositorio)
3. [Instalar dependencias](#3-instalar-dependencias)
4. [Configurar variables de entorno](#4-configurar-variables-de-entorno)
5. [Crear la base de datos en PostgreSQL](#5-crear-la-base-de-datos-en-postgresql)
6. [Generar el cliente de Prisma](#6-generar-el-cliente-de-prisma)
7. [Ejecutar las migraciones](#7-ejecutar-las-migraciones)
8. [Poblar la base con datos de demostración (seed)](#8-poblar-la-base-con-datos-de-demostración-seed)
9. [Levantar el servidor de desarrollo](#9-levantar-el-servidor-de-desarrollo)
10. [Verificar que todo funciona](#10-verificar-que-todo-funciona)
11. [Scripts disponibles](#11-scripts-disponibles)
12. [Estructura de carpetas](#12-estructura-de-carpetas)
13. [Variables de entorno (referencia completa)](#13-variables-de-entorno-referencia-completa)
14. [Usuarios de demostración](#14-usuarios-de-demostración)
15. [Solución de problemas frecuentes](#15-solución-de-problemas-frecuentes)

---

## 1. Requisitos previos

Instala estas herramientas **antes** de continuar. Se indica la versión mínima probada.

| Herramienta | Versión mínima | Para qué se usa | Cómo verificar |
|---|---|---|---|
| **Node.js** | 20 LTS o superior | Entorno de ejecución del backend | `node -v` |
| **npm** | 10+ (viene con Node) | Gestor de paquetes | `npm -v` |
| **PostgreSQL** | 15+ | Base de datos relacional | `psql --version` |
| **Git** | 2.40+ | Control de versiones | `git --version` |

### Instalación rápida

#### Node.js

Descarga el instalador LTS desde <https://nodejs.org>. En Windows, ejecuta el `.msi` y marca la opción "Add to PATH".

#### PostgreSQL

Descarga desde <https://www.postgresql.org/download/>. Durante la instalación:

- Recuerda la contraseña que pongas al usuario `postgres`, la vas a necesitar.
- Deja el puerto por defecto **5432**.
- Asegúrate de que **pgAdmin** o **SQL Shell (psql)** quede instalado.

> **Alternativa cloud (Neon):** Si prefieres no instalar PostgreSQL local, puedes crear una base de datos gratuita en <https://neon.tech> y usar la cadena de conexión que te proporciona.

---

## 2. Clonar el repositorio

```bash
git clone https://github.com/TU-USUARIO/PlataformaML.git
cd PlataformaML
```

> El proyecto es un **monorepo**. El backend está en la carpeta `backend/`.

---

## 3. Instalar dependencias

```bash
cd backend
npm install
```

Esto instala todas las dependencias de `package.json` y genera el cliente de Prisma automáticamente (script `postinstall`).

### Dependencias principales

| Paquete | Propósito |
|---|---|
| `express` v5 | Framework HTTP |
| `cors` | Control de origen cruzado |
| `helmet` | Cabeceras de seguridad |
| `express-rate-limit` | Límite de peticiones |
| `bcryptjs` | Hash de contraseñas |
| `jsonwebtoken` | Tokens JWT |
| `zod` | Validación de datos |
| `dotenv` | Variables de entorno |
| `@prisma/client` + `prisma` | ORM y migraciones |
| `@prisma/adapter-pg` + `pg` | Driver PostgreSQL nativo |
| `multer` | Subida de archivos |
| `tsx` | Ejecutar TypeScript directamente (dev) |

---

## 4. Configurar variables de entorno

1. Copia el archivo de ejemplo:

```bash
copy .env.example .env
```

> En Linux/Mac: `cp .env.example .env`

2. Abre `.env` con tu editor y completa los valores:

```env
# ── Base de datos ──────────────────────────────────────────────
# Si PostgreSQL es local:
DATABASE_URL="postgresql://postgres:TU_CONTRASEÑA@localhost:5432/plataforma_db?schema=public"

# Si usas Neon (cloud):
# DATABASE_URL="postgresql://usuario:clave@host.neon.tech/plataforma_db?sslmode=require"

# ── Servidor ───────────────────────────────────────────────────
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:5173

# ── Autenticación ─────────────────────────────────────────────
# Genera un secreto aleatorio de al menos 32 caracteres.
# Puedes usar: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=CAMBIAME_pon_un_string_aleatorio_de_al_menos_32_caracteres
JWT_EXPIRES_IN=1h

# ── Servicio de ML ─────────────────────────────────────────────
ML_SERVICE_URL=http://localhost:8000
ML_API_KEY=clave_servicio_ml_local
```

> **⚠ IMPORTANTE:** El archivo `.env` contiene secretos. **Nunca** lo subas al repositorio (ya está en `.gitignore`).

---

## 5. Crear la base de datos en PostgreSQL

### Opción A: Usando pgAdmin

1. Abre **pgAdmin**.
2. Conéctate al servidor local (usuario `postgres`).
3. Haz clic derecho en "Databases" → "Create" → "Database".
4. Nombre: `plataforma_db` → **Save**.

### Opción B: Usando la terminal (psql)

```bash
psql -U postgres
```

Dentro de psql:

```sql
CREATE DATABASE plataforma_db;
\q
```

### Opción C: Usando Neon (cloud)

No necesitas crear la base manualmente; ya viene creada. Solo copia la cadena de conexión en tu `.env`.

---

## 6. Generar el cliente de Prisma

```bash
npx prisma generate
```

Esto lee `prisma/schema.prisma` y genera el cliente tipado en `node_modules/@prisma/client`. **Ejecútalo cada vez que modifiques el schema.**

---

## 7. Ejecutar las migraciones

```bash
npx prisma migrate dev
```

Esto:

- Lee el schema y compara con la base de datos.
- Crea las tablas (`empresas`, `usuarios`, `vacantes`, `postulaciones`, etc.).
- Guarda un registro de cada migración en `prisma/migrations/`.
- Si la base está vacía, te pedirá un nombre para la migración (ej.: `init`).

> **Nota:** Si ya hay migraciones previas en la carpeta, Prisma las aplica automáticamente.

**Verificar** que las tablas se crearon:

```bash
npx prisma studio
```

Se abre una interfaz web en `http://localhost:5555` donde puedes navegar las tablas.

---

## 8. Poblar la base con datos de demostración (seed)

```bash
npx prisma db seed
```

Esto ejecuta `prisma/seed.ts`, que crea:

- 1 Super Administrador
- 2 Empresas (1 activa, 1 pendiente de aprobación)
- 1 Admin + 1 RRHH para la empresa activa
- 1 Candidato con perfil completo (educación, experiencia, documentos)
- 1 Vacante abierta
- 1 Postulación con predicción de ML, historial y notificación
- 1 Modelo de ML con métricas de demostración
- 1 Registro de auditoría

> **⚠ El seed es solo para desarrollo.** No se ejecuta en producción (tiene una validación que lo impide).

---

## 9. Levantar el servidor de desarrollo

```bash
npm run dev
```

Verás en la terminal:

```
API escuchando en http://localhost:4000/api
```

El servidor se reinicia automáticamente al guardar cualquier archivo `.ts` (hot-reload con `tsx watch`).

---

## 10. Verificar que todo funciona

Abre tu navegador o usa `curl`:

```bash
curl http://localhost:4000/api/health
```

Respuesta esperada:

```json
{
  "success": true,
  "data": {
    "status": "ok"
  }
}
```

Si ves esto, ¡el backend está corriendo correctamente! 🎉

---

## 11. Scripts disponibles

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta el servidor con hot-reload (`tsx watch`) |
| `npm run build` | Compila TypeScript a JavaScript (`dist/`) |
| `npx prisma generate` | Regenera el cliente de Prisma |
| `npx prisma migrate dev` | Aplica migraciones pendientes (desarrollo) |
| `npx prisma migrate deploy` | Aplica migraciones (producción, sin interactivo) |
| `npx prisma db seed` | Ejecuta el seed de demostración |
| `npx prisma studio` | Abre el explorador visual de la base |
| `npx prisma db push` | Sincroniza el schema sin crear migración (prototipado) |
| `npx prisma migrate reset` | **Borra toda la base**, reaplica migraciones y re-seed |

---

## 12. Estructura de carpetas

```
backend/
├── prisma/
│   ├── migrations/              # Migraciones generadas por Prisma
│   ├── schema.prisma            # Esquema de la base de datos (v3)
│   └── seed.ts                  # Datos de demostración
├── prisma.config.ts             # Configuración de Prisma (seed command, datasource)
├── src/
│   ├── config/
│   │   ├── database.ts          # Instancia global de PrismaClient
│   │   └── env.ts               # Validación de variables de entorno (Zod)
│   ├── controllers/
│   │   ├── auth.controller.ts        # (por construir)
│   │   ├── candidates.controller.ts  # (por construir)
│   │   ├── vacancies.controller.ts   # (por construir)
│   │   └── selection.controller.ts   # (por construir)
│   ├── middlewares/
│   │   ├── auth.middleware.ts   # autenticar() y exigirRol()
│   │   ├── error.middleware.ts  # Manejo global de errores (HttpError, Zod, Prisma)
│   │   └── upload.middleware.ts # Configuración de multer (por construir)
│   ├── routes/
│   │   ├── health.routes.ts     # GET /api/health
│   │   ├── auth.routes.ts            # (por construir)
│   │   ├── candidates.routes.ts      # (por construir)
│   │   ├── vacancies.routes.ts       # (por construir)
│   │   └── selection.routes.ts       # (por construir)
│   ├── services/
│   │   ├── email.service.ts     # Envío de correo con Nodemailer (por construir)
│   │   ├── whatsapp.service.ts  # WhatsApp Cloud API (por construir)
│   │   ├── ml.service.ts        # Integración con el servicio de ML (por construir)
│   │   └── storage.service.ts   # Almacenamiento de archivos (por construir)
│   ├── validators/
│   │   ├── candidate.validator.ts   # Schemas de Zod (por construir)
│   │   └── vacancy.validator.ts     # Schemas de Zod (por construir)
│   ├── types/
│   │   ├── express.d.ts         # Extensión de Request con req.user
│   │   └── index.ts             # Tipos compartidos
│   ├── utils/
│   │   ├── http error.ts        # Clase HttpError
│   │   └── jwt.ts               # firmarToken() y verificarToken()
│   ├── app.ts                   # Configuración de Express (middlewares, rutas)
│   └── server.ts                # Punto de entrada (listen + shutdown)
├── uploads/                     # Almacenamiento local temporal de archivos
├── .env                         # Variables de entorno (NO va al repo)
├── .env.example                 # Plantilla de variables de entorno
├── .gitignore
├── package.json
├── package-lock.json
└── tsconfig.json
```

---

## 13. Variables de entorno (referencia completa)

| Variable | Obligatoria | Valor por defecto | Descripción |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | Cadena de conexión a PostgreSQL |
| `NODE_ENV` | No | `development` | Entorno: `development`, `test` o `production` |
| `PORT` | No | `4000` | Puerto del servidor HTTP |
| `FRONTEND_URL` | No | `http://localhost:5173` | Origen permitido por CORS |
| `JWT_SECRET` | ✅ | — | Secreto para firmar tokens (mín. 32 caracteres) |
| `JWT_EXPIRES_IN` | No | `1h` | Duración del token (ej.: `1h`, `30m`, `7d`) |
| `ML_SERVICE_URL` | No | `http://localhost:8000` | URL del servicio de ML (FastAPI) |
| `ML_API_KEY` | ✅ | — | Clave de servicio para autenticar llamadas al ML |

---

## 14. Usuarios de demostración

Después de ejecutar el seed, puedes iniciar sesión con estas cuentas:

| Rol | Correo | Contraseña | Empresa |
|---|---|---|---|
| `SUPER_ADMIN` | `superadmin@plataforma.test` | `Password123!` | — (sin empresa) |
| `ADMIN` | `admin@technova.test` | `Password123!` | TechNova C.A. (Activa) |
| `RRHH` | `rrhh@technova.test` | `Password123!` | TechNova C.A. (Activa) |
| `CANDIDATO` | `maria@candidato.test` | `Password123!` | — (sin empresa) |
| `ADMIN` | `admin@andina.test` | `Password123!` | Distribuidora Andina (Pendiente) |

> **Contraseña para todos:** `Password123!`

---

## 15. Solución de problemas frecuentes

### ❌ `DATABASE_URL es obligatoria`

No se encontró la variable. Verifica que:
1. Existe el archivo `.env` en `backend/`.
2. La línea `DATABASE_URL=...` no tiene espacios alrededor del `=`.
3. El archivo no tiene sintaxis de TypeScript (debe ser texto plano con `CLAVE=valor`).

### ❌ `JWT_SECRET debe tener al menos 32 caracteres`

Genera un secreto y pégalo en `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### ❌ `Error: P1001 - Can't reach database server`

PostgreSQL no está corriendo o los datos de conexión son incorrectos. Verifica:
1. Que el servicio de PostgreSQL esté activo.
2. Que el puerto sea el correcto (por defecto `5432`).
3. Que la contraseña en `DATABASE_URL` coincida con la del usuario `postgres`.

### ❌ `Error: P1003 - Database does not exist`

No se creó la base de datos. Créala con:

```bash
psql -U postgres -c "CREATE DATABASE plataforma_db;"
```

### ❌ `prisma generate` falla o no encuentra el schema

Asegúrate de estar dentro de la carpeta `backend/`:

```bash
cd backend
npx prisma generate
```

### ❌ Puerto 4000 ya está en uso

Otra instancia del servidor (u otra aplicación) está usando el puerto. Opciones:

1. Cierra la otra instancia.
2. Cambia `PORT=4001` en `.env`.

### ❌ `Cannot find module '@prisma/client'`

Ejecuta:

```bash
npx prisma generate
```

### ❌ El seed no funciona / muestra errores de constraint

Puede que ya existan datos parciales. Resetea la base:

```bash
npx prisma migrate reset
```

> ⚠ Esto **borra toda la base**, reaplica las migraciones y vuelve a ejecutar el seed.

---

## Resumen rápido (TL;DR)

```bash
cd backend
npm install
# Copia .env.example → .env y completa los valores
copy .env.example .env
# Crea la base de datos (si es local)
psql -U postgres -c "CREATE DATABASE plataforma_db;"
# Migraciones + seed
npx prisma generate
npx prisma migrate dev
npx prisma db seed
# ¡Arranca!
npm run dev
```
