# Estructura del Monorepo

> **Plataforma web con algoritmos de aprendizaje automático para la optimización del proceso de reclutamiento y selección de personal.**
>
> Universidad Dr. José Gregorio Hernández — Facultad de Ingeniería — Análisis y Diseño de Sistemas — Trimestre octubre–diciembre 2026.

---

## Vista general

El proyecto es un **monorepo** gestionado con Git y alojado en GitHub. Contiene cuatro carpetas principales, cada una con su responsabilidad bien definida, más los archivos de configuración en la raíz.

```
plataforma-reclutamiento-ml/
├── frontend/            → Interfaz de usuario (React)
├── backend/             → API REST, lógica de negocio y base de datos (Node.js + Express)
├── ml-service/          → Servicio de Machine Learning (Python + FastAPI)
├── docs/                → Documentación del proyecto (diagramas, manuales)
└── (archivos de raíz)   → Configuración general del monorepo
```

---

## Estructura detallada

### `frontend/` — React + TypeScript + Vite (Tailwind CSS)

Contiene las pantallas, los componentes visuales y las llamadas a la API.

```
frontend/
├── public/                          # Recursos estáticos (favicon, imágenes)
└── src/
    ├── assets/                      # Imágenes, íconos y recursos del proyecto
    ├── components/
    │   ├── ui/                      # Componentes genéricos reutilizables (botones, inputs, modals)
    │   ├── layout/                  # Layout general (navbar, sidebar, footer)
    │   ├── candidates/              # Componentes específicos de candidatos
    │   ├── vacancies/               # Componentes específicos de vacantes
    │   └── dashboard/               # Componentes del panel principal
    ├── context/                     # Contextos de React (autenticación, tema, etc.)
    ├── pages/
    │   ├── Login/                   # Pantalla de inicio de sesión
    │   ├── Dashboard/               # Panel principal por rol
    │   ├── Candidates/              # Gestión y visualización de candidatos
    │   ├── Vacancies/               # Gestión de vacantes
    │   └── Selection/               # Proceso de selección y postulaciones
    ├── services/
    │   └── api.ts                   # Cliente HTTP centralizado (llamadas al backend)
    ├── types/                       # Definiciones de tipos TypeScript
    ├── App.tsx                      # Componente raíz con enrutamiento
    ├── App.css                      # Estilos globales de la aplicación
    ├── index.css                    # Estilos base (Tailwind / resets)
    └── main.tsx                     # Punto de entrada de React
Configuración:
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tsconfig.app.json
    ├── tsconfig.node.json
    ├── postcss.config.json
    ├── .env                         # Variables de entorno locales (NO va al repo)
    └── .env.example                 # Plantilla de variables de entorno
```

---

### `backend/` — Node.js + Express + TypeScript + Prisma

Controla los usuarios, las vacantes, las postulaciones, la base de datos y las integraciones con correo, WhatsApp y ML.

```
backend/
├── prisma/
│   ├── migrations/                  # Migraciones generadas por Prisma
│   │   ├── 20261021191511_init/
│   │   ├── 20261021204742_agregar_modelos_ml_y_auditoria/
│   │   ├── 20261028001827_seguridad_cuenta_v3/
│   │   └── migration_lock.toml
│   ├── schema.prisma                # Esquema de la base de datos (v3)
│   └── seed.ts                      # Datos de demostración
├── prisma.config.ts                 # Configuración de Prisma (seed, datasource)
├── src/
│   ├── config/
│   │   ├── database.ts              # Instancia global de PrismaClient ✅
│   │   └── env.ts                   # Validación de variables de entorno (Zod) ✅
│   ├── controllers/
│   │   ├── auth.controller.ts       # Autenticación, login, registro, recuperación ✅
│   │   ├── candidates.controller.ts # Perfil del candidato, educación, experiencia, documentos ✅
│   │   ├── vacancies.controller.ts  # Gestión de vacantes y filtrado por empresa ✅
│   │   ├── selection.controller.ts  # Postulaciones, afinidad ML, cambio de estado y trazabilidad ✅
│   │   ├── notifications.controller.ts # Consulta y envío de notificaciones ✅
│   │   ├── reports.controller.ts    # Métricas comparativas antes y después de la plataforma ✅
│   │   ├── ml.controller.ts         # Métricas ML, reentrenamiento y carga de datasets ✅
│   │   └── admin.controller.ts      # Aprobación de empresas, auditoría e invitaciones ✅
│   ├── middlewares/
│   │   ├── auth.middleware.ts       # autenticar(), autenticarOpcional() y exigirRol() ✅
│   │   ├── error.middleware.ts      # Manejo global de errores y 404 ✅
│   │   └── upload.middleware.ts     # Multer (subida segura de CV, cédula y datasets) ✅
│   ├── routes/
│   │   ├── health.routes.ts         # GET /api/health ✅
│   │   ├── auth.routes.ts           # /api/auth (login, register, me, recover, reset) ✅
│   │   ├── vacancies.routes.ts      # /api/vacancies (CRUD + permisos por rol) ✅
│   │   ├── candidates.routes.ts     # /api/candidates (/me, /documents/:id) ✅
│   │   ├── selection.routes.ts      # /api/applications (postulaciones + PATCH /status) ✅
│   │   ├── notifications.routes.ts  # /api/notifications (historial + POST /send) ✅
│   │   ├── reports.routes.ts        # /api/reports (/comparison) ✅
│   │   ├── ml.routes.ts             # /api/ml (/metrics, /train, /upload-dataset) ✅
│   │   └── admin.routes.ts          # /api/admin (/companies, /audit, /invitations) ✅
│   ├── services/
│   │   ├── email.service.ts         # Envío SMTP con Nodemailer y fallback dev ✅
│   │   ├── whatsapp.service.ts      # WhatsApp Cloud API (Meta) y fallback dev ✅
│   │   ├── ml.service.ts            # Integración backend ↔ FastAPI con cálculo de desglose ✅
│   │   ├── storage.service.ts       # Almacenamiento seguro en disco y prevención path traversal ✅
│   │   └── audit.service.ts         # Registro en tabla registro_auditoria ✅
│   ├── validators/
│   │   ├── auth.validator.ts        # Schemas Zod para autenticación ✅
│   │   ├── candidate.validator.ts   # Schemas Zod para perfil de candidatos ✅
│   │   ├── vacancy.validator.ts     # Schemas Zod para vacantes ✅
│   │   ├── selection.validator.ts   # Schemas Zod para postulaciones y cambios de estado ✅
│   │   └── notification.validator.ts # Schemas Zod para notificaciones ✅
│   ├── types/
│   │   ├── express.d.ts             # Extensión de Express.Request (req.user) ✅
│   │   └── index.ts                 # Tipos compartidos y mapeos DTO Prisma ↔ Frontend ✅
│   ├── utils/
│   │   ├── http-error.ts            # Clase HttpError ✅
│   │   └── jwt.ts                   # firmarToken() y verificarToken() ✅
│   ├── app.ts                       # Configuración y montaje de Express ✅
│   └── server.ts                    # Punto de entrada (listen + graceful shutdown) ✅
├── uploads/                         # Almacenamiento local seguro
├── .env                             # Variables de entorno (NO va al repo)
├── .env.example                     # Plantilla de variables
├── .gitignore
├── package.json
├── package-lock.json
└── tsconfig.json
```

**Leyenda:** ✅ = construido y funcional.

---

### `ml-service/` — Python + FastAPI + pandas + scikit-learn

Prepara los datos, entrena y evalúa el modelo, y ofrece predicciones al backend mediante API REST.

```
ml-service/
├── app/
│   ├── api/
│   │   └── routes.py                # Endpoints de la API (/predict, /train, /health)
│   ├── schemas/                     # Modelos Pydantic de entrada/salida
│   ├── preprocessing/
│   │   └── preprocess.py            # Limpieza, codificación y normalización de datos
│   ├── models/
│   │   ├── train.py                 # Entrenamiento del modelo
│   │   ├── predict.py               # Generación de predicciones
│   │   └── evaluation.py            # Métricas (precisión, F1, AUC-ROC)
│   ├── config.py                    # Configuración del servicio
│   └── main.py                      # Punto de entrada FastAPI
├── tests/                           # Pruebas del servicio
├── data/
│   ├── raw/                         # Datos crudos de entrenamiento
│   └── processed/                   # Datos preprocesados
├── trained-models/                  # Modelos serializados (.pkl, .joblib)
├── requirements.txt                 # Dependencias de Python
└── .env.example                     # Plantilla de variables de entorno
```

---

### `docs/` — Documentación del proyecto

Guarda los diagramas UML, la documentación de arquitectura y los manuales.

```
docs/
├── uml/                             # Diagramas UML (casos de uso, clases, secuencia)
├── arquitectura/                    # Documentación de la arquitectura del sistema
├── base-de-datos/                   # Diagramas ER y documentación del esquema
└── manuales/                        # Manuales de usuario y de instalación
```

---

### Archivos de la raíz

```
plataforma-reclutamiento-ml/
├── .gitignore                       # Patrones de exclusión globales
├── .env.example                     # Plantilla de variables de entorno globales
├── README.md                        # Documentación general del proyecto
└── package.json                     # (opcional) scripts de conveniencia del monorepo
```

---

## ¿Por qué esta estructura?

| Carpeta | Responsabilidad | Tecnología |
|---|---|---|
| `frontend/` | Pantallas, componentes visuales y llamadas a la API | React + TypeScript + Vite + Tailwind CSS |
| `backend/` | Autenticación, control de acceso, validación, reglas de negocio, base de datos, integraciones | Node.js + Express + TypeScript + Prisma |
| `ml-service/` | Preprocesamiento, entrenamiento, evaluación y predicción del modelo | Python + FastAPI + pandas + scikit-learn |
| `docs/` | Diagramas UML, documentación de arquitectura y manuales | Archivos Markdown, imágenes, PDF |

### Principios de diseño

1. **Monorepo con separación de responsabilidades:** Cada carpeta es un proyecto independiente con su propio `package.json` o `requirements.txt`, pero todo vive en un solo repositorio para facilitar el control de versiones.

2. **Arquitectura por capas (cliente-servidor):** El frontend se comunica con el backend por API REST; el backend se comunica con el servicio de ML también por API REST. El frontend **nunca** llama directamente al servicio de ML.

3. **Comunicación por API REST sobre HTTPS con JSON:** Todos los componentes se comunican con JSON. Las respuestas del backend siguen el formato `{ success, data }`.

4. **Git como herramienta de control de versiones:** Todo el monorepo se sube a GitHub con ramas de trabajo (`feature/`, `fix/`, `refactor/`), pull requests y revisiones de código.

---

## Comunicación entre componentes

```
┌─────────────┐     HTTPS/JSON      ┌─────────────┐     HTTP/JSON      ┌─────────────┐
│             │  ← ─ ─ ─ ─ ─ ─ →   │             │  ← ─ ─ ─ ─ ─ →   │             │
│  Frontend   │   VITE_API_URL      │   Backend   │   ML_SERVICE_URL   │ ML Service  │
│  (React)    │   :5173 → :4000     │  (Express)  │   :4000 → :8000   │  (FastAPI)  │
│             │                     │             │                     │             │
└─────────────┘                     └──────┬──────┘                     └─────────────┘
                                           │
                                           │ Prisma
                                           ▼
                                    ┌─────────────┐
                                    │ PostgreSQL  │
                                    │  (Neon)     │
                                    └─────────────┘
```

- **Frontend → Backend:** `VITE_API_URL = http://localhost:4000/api`
- **Backend → ML:** `ML_SERVICE_URL = http://localhost:8000` (autenticado con `ML_API_KEY`)
- **Backend → BD:** `DATABASE_URL` (Prisma + PostgreSQL)
- **Backend → Correo:** SMTP vía Nodemailer
- **Backend → WhatsApp:** WhatsApp Cloud API (Meta)

---

## Estado actual de implementación

| Pieza | Estado |
|---|---|
| Esquema de Prisma v3 (18 modelos, 12 enums) | ✅ Definido |
| Migraciones (3 aplicadas) | ✅ Aplicadas |
| Seed de demostración | ✅ Funcional |
| Base del servidor (app, env, middlewares, health) | ✅ Creada |
| Middleware de autenticación y roles | ✅ Creado |
| Utilidades (HttpError, JWT) | ✅ Creadas |
| Módulo de auth (registro, login, sesión, recuperación) | ✅ Completo |
| Módulo de vacantes (CRUD + estados + aislamiento multiempresa) | ✅ Completo |
| Módulo de candidatos (perfil + documentos protegidos) | ✅ Completo |
| Módulo de postulaciones (aplicar + estados + historial trazable) | ✅ Completo |
| Integración backend ↔ ML (`ml.service.ts` + fallback) | ✅ Completo |
| Notificaciones (correo SMTP + WhatsApp Cloud API) | ✅ Completo |
| Panel del super admin (empresas, auditoría, invitaciones) | ✅ Completo |
| Reportes comparativos (antes vs después de la plataforma) | ✅ Completo |
| Servicio de ML (FastAPI) | ✅ Hecho por otra parte del equipo |
| Frontend (React) | ✅ Hecho por otra parte del equipo |
| Pruebas funcionales, seguridad y rendimiento | ⏳ Pendientes |

