# Plataforma web con algoritmos de aprendizaje automático para la optimización del proceso de reclutamiento y selección de personal

> **Universidad Dr. José Gregorio Hernández** — Facultad de Ingeniería — Análisis y Diseño de Sistemas
>
> Trimestre octubre–diciembre 2026

---

## 1. Descripción general

Plataforma web **multiempresa** que centraliza el proceso de reclutamiento y selección de personal e integra un microservicio de **aprendizaje automático supervisado** (TF-IDF + Regresión Logística, comparado frente a Random Forest y Red Neuronal) para extraer el texto de los currículos (PDF/DOCX), calcular el porcentaje de afinidad técnico-formativa de cada postulante y ordenar a los candidatos de mayor a menor compatibilidad con cada vacante.

- **Apoyo ético a la decisión (RNF03):** El modelo evalúa únicamente competencias técnicas, experiencia y formación académica, excluyendo variables demográficas sensibles (género, edad, fotografía, estado civil o dirección). La decisión final siempre corresponde al equipo de Talento Humano.
- **Roles del sistema:**
  - `SUPER_ADMIN`: Gobernanza de la plataforma (aprueba, rechaza, suspende o reactiva empresas, audita usuarios y gestiona/reentrena el modelo de ML).
  - `ADMIN` (Empresa): Administra el perfil de su empresa, invita y gestiona a su equipo de `RRHH`, personaliza plantillas de notificación y gestiona vacantes y postulantes.
  - `RRHH` (Empresa): Publica vacantes, evalúa el ranking de candidatos con explicabilidad del modelo ML, toma decisiones de cambio de etapa y se comunica por chat interno.
  - `CANDIDATO`: Explora vacantes ordenadas por afinidad con su perfil, se postula en línea adjuntando su CV y cédula, recibe notificaciones por correo/WhatsApp y conversa con las empresas a las que aplicó.

---

## 2. Arquitectura y despliegue

El **Backend** actúa como núcleo de seguridad: el Frontend nunca se conecta directamente a PostgreSQL ni directamente al microservicio de Python, sino que todas las peticiones pasan por el Backend.

```text
┌──────────────────────┐     HTTPS / JSON     ┌──────────────────────┐     HTTP / JSON      ┌──────────────────────┐
│       Frontend       │  ◄────────────────►  │       Backend        │  ◄────────────────►  │      ML Service      │
│  (React 19 + Vite)   │    :5173 ➔ :4000     │ (Node.js + Express)  │    :4000 ➔ :8000     │  (Python + FastAPI)  │
└──────────────────────┘                      └──────────┬───────────┘                      └──────────────────────┘
                                                         │ Prisma ORM v7
                                                         ▼
                                              ┌──────────────────────┐
                                              │     PostgreSQL       │
                                              │   (plataforma_db)    │
                                              └──────────────────────┘
```

| Componente | Tecnologías principales | Puerto local | Entorno de producción | Documentación |
| :--- | :--- | :---: | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS v4 | `5173` | **Vercel** | [`frontend/FRONTEND_ESPECIFICACION.md`](frontend/FRONTEND_ESPECIFICACION.md) |
| **Backend** | Node.js, Express 5, TypeScript, Prisma 7, Zod, JWT | `4000` | *En definición (servidor con salida SMTP habilitada)* | [`backend/BACKEND_ESPECIFICACION.md`](backend/BACKEND_ESPECIFICACION.md) |
| **ML Service** | Python 3.12, FastAPI, Uvicorn, scikit-learn, pandas, pypdf, python-docx | `8000` | **Render** | [`ml-service/README.md`](ml-service/README.md) |
| **Base de datos** | PostgreSQL 15+ | `5432` | **Neon** (Serverless Postgres) | [`docs/ESTRUCTURA.md`](docs/ESTRUCTURA.md) |

---

## 3. ¿Qué debes tener instalado en tu computadora para ejecutarlo en local?

Como las carpetas de dependencias (`node_modules/` en Node.js y `.venv/` en Python) no se suben al repositorio por su tamaño y porque se compilan según el sistema operativo de cada equipo, necesitas tener instalados estos **4 programas base** en tu ordenador:

| Programa | Versión requerida | ¿Para qué sirve en el proyecto? | Cómo verificar si ya lo tienes |
| :--- | :--- | :--- | :--- |
| **1. Node.js** (incluye `npm`) | **≥ 20 LTS** (20 o 22+) | Ejecutar el **Backend** (Express/Prisma) y el **Frontend** (React/Vite). | `node --version` y `npm --version` |
| **2. Python** (incluye `pip`) | **3.10 a 3.12** (recomendado **3.12**) | Ejecutar el microservicio de **Machine Learning** (`ml-service`). | `py --version` o `python --version` |
| **3. PostgreSQL** | **≥ 15** | Base de datos relacional local (o bien usar cadena de conexión a **Neon**). | `psql --version` (o abrir *pgAdmin 4*) |
| **4. Git** | **≥ 2.40** | Clonar el repositorio y gestionar ramas/commits. | `git --version` |

### Instalación rápida de programas en Windows (con `winget` en PowerShell)
Si te falta alguno de los programas anteriores en Windows, puedes instalarlos desde PowerShell con:

```powershell
# Instalar Node.js LTS
winget install OpenJS.NodeJS.LTS

# Instalar Python 3.12
winget install Python.Python.3.12

# Instalar PostgreSQL 16 (opcional si usas Neon en la nube)
winget install PostgreSQL.PostgreSQL.16

# Instalar Git
winget install Git.Git
```
*(Nota en Windows: Si el comando `python` abre la Microsoft Store a pesar de haber instalado Python, utiliza el lanzador oficial `py -3.12` o desactiva el alias de `python.exe` en **Configuración > Aplicaciones > Configuración avanzada de aplicaciones > Alias de ejecución de aplicaciones**).*

---

## 4. Guía de instalación paso a paso en local

Abre una terminal en la raíz del proyecto (`PlataformaML`) y configura cada uno de los 3 módulos:

### Paso 1 · Preparar la Base de Datos y el Backend (`:4000`)

1. Asegúrate de contar con una base de datos PostgreSQL activa (local o en **Neon**).
2. Entra a la carpeta `backend` e instala sus paquetes de Node.js (descarga `node_modules` a partir de `backend/package.json`):
   ```powershell
   cd backend
   npm install
   ```
3. Crea tu archivo `.env` local copiando la plantilla `.env.example` y completa tus variables privadas (nunca subas el archivo `.env` al repositorio):
   ```powershell
   copy .env.example .env
   ```
4. Genera el cliente de Prisma, aplica las migraciones y (opcionalmente en desarrollo) ejecuta la semilla de datos:
   ```powershell
   npx prisma generate
   npx prisma migrate deploy
   npx prisma db seed
   ```

---

### Paso 2 · Preparar el Microservicio de Machine Learning (`:8000`)

El servicio de ML está en Python dentro de `ml-service/` y necesita su propio **entorno virtual (`.venv`)** donde se descargan las librerías listadas en [`ml-service/requirements.txt`](ml-service/requirements.txt) (`fastapi`, `uvicorn`, `scikit-learn`, `pandas`, `joblib`, `pydantic`, `pypdf`, `python-docx`, `pytest`, `httpx`).

1. Entra a la carpeta `ml-service` y crea el entorno virtual `.venv`:
   ```powershell
   cd ../ml-service
   py -3.12 -m venv .venv
   ```
   *(En Linux/macOS: `python3 -m venv .venv`)*
2. Instala todas las dependencias de Python dentro del entorno virtual:
   ```powershell
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   ```
   *(En Linux/macOS: `./.venv/bin/pip install -r requirements.txt`)*
3. Crea el archivo `.env` local a partir de `.env.example`:
   ```powershell
   copy .env.example .env
   ```
4. Entrena y genera el modelo inicial (`trained-models/matching_model.joblib` y `data/processed/metrics.json`):
   ```powershell
   .\.venv\Scripts\python.exe -m app.models.train
   ```

> **Nota para el editor (VS Code):** Si al abrir `ml-service/app/api/routes.py` el editor subraya `fastapi` con el aviso `Cannot find module 'fastapi'`, presiona `Ctrl + Shift + P` ➔ **`Python: Select Interpreter`** y selecciona el intérprete creado en `.\ml-service\.venv\Scripts\python.exe`.

---

### Paso 3 · Preparar el Frontend (`:5173`)

1. Entra a la carpeta `frontend` e instala sus paquetes (descarga `node_modules` a partir de `frontend/package.json`):
   ```powershell
   cd ../frontend
   npm install
   ```
2. Crea tu archivo `.env` local a partir de `.env.example`:
   ```powershell
   copy .env.example .env
   ```

---

## 5. Cómo encender los 3 servicios en local

Abre **3 terminales** (una para cada servicio):

**Terminal 1 — ML Service (Puerto `8000`):**
```powershell
cd ml-service
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- Documentación interactiva Swagger del ML: http://127.0.0.1:8000/docs

**Terminal 2 — Backend API (Puerto `4000`):**
```powershell
cd backend
npm run dev
```
- Health check de la API: http://localhost:4000/api/health

**Terminal 3 — Frontend Web (Puerto `5173`):**
```powershell
cd frontend
npm run dev
```
- Aplicación web en el navegador: http://localhost:5173

*(Nota: Si en algún momento trabajas solo con el Backend y el Frontend sin encender la Terminal 1 de Python, el Backend sigue funcionando leyendo `ml-service/data/processed/metrics.json` como respaldo).*

---

## 6. Estructura del monorepo

```text
PlataformaML/
├── backend/
│   ├── BACKEND_ESPECIFICACION.md    → Especificación técnica completa del Backend (arquitectura, rutas, seguridad)
│   ├── prisma/
│   │   ├── schema.prisma            → Esquema de base de datos v4 (15 modelos y relaciones)
│   │   ├── migrations/              → Historial de migraciones SQL de PostgreSQL
│   │   └── seed.ts                  → Semilla idempotente de datos para entorno de desarrollo
│   └── src/                         → Controladores, servicios, middlewares, validadores Zod, jobs y utilidades
├── frontend/
│   ├── FRONTEND_ESPECIFICACION.md   → Especificación exhaustiva de las 53 pantallas por rol y sistema de diseño UI/UX
│   └── src/
│       ├── services/                → 11 servicios HTTP conectados al backend (auth, vacancies, applications, ml, chat, etc.)
│       ├── pages/                   → Vistas de la aplicación
│       ├── components/              → Componentes reutilizables de interfaz
│       └── context/                 → Estado global de sesión (AuthContext) y notificaciones (ToastContext)
├── ml-service/
│   ├── README.md                    → Explicación del clasificador supervisado, variables TF-IDF y validación cruzada
│   ├── requirements.txt             → Dependencias de Python (FastAPI, scikit-learn, pandas, pypdf, python-docx)
│   ├── app/
│   │   ├── api/routes.py            → Endpoints: /health, /predict, /rank, /extract, /metrics, /train
│   │   ├── models/                  → Entrenamiento (train.py), predicción (predict.py) y evaluación (evaluation.py)
│   │   └── preprocessing/           → Extracción PDF/DOCX (extract.py), limpieza (preprocess.py) y matriz de características
│   └── data/                        → Dataset de pares (raw/pairs.csv) y métricas (processed/metrics.json)
└── docs/
    ├── ESTRUCTURA.md                → Guía de arquitectura general del monorepo
    └── er_*.mermaid                 → Diagramas Entidad-Relación del modelo de datos
```

---

## 7. Equipo de desarrollo

| Nombre | C.I. |
| :--- | :--- |
| Díaz Acosta María José | 34.105.779 |
| Higuera González Santiago | 32.699.066 |
| Ramírez Carvajal Emiliangely María | 32.577.915 |

**Tutor:** M.Sc. Luis Manuel Soto García (0009-0007-4842-3028)

---

## Licencia

Proyecto académico — uso educativo.
