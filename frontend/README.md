# PlataformaML — Documentación Técnica y Auditoría del Frontend

> **Plataforma web con algoritmos de aprendizaje automático para la optimización del proceso de reclutamiento y selección de personal.**  
> **Documento actualizado al estado real del repositorio (tras `build 60` y ajustes en curso de interfaz).**  
> Todos los datos de código, endpoints, hallazgos de seguridad, métricas del modelo y usuarios registrados han sido verificados directamente sobre el código fuente (`frontend/`, `backend/`, `ml-service/`) y la base de datos PostgreSQL activa.

---

## Tabla de Contenido

1. [Base Técnica Integrada (React + TypeScript + Vite + Oxlint)](#1-base-técnica-integrada-react--typescript--vite--oxlint)
2. [Cómo Arranca la Página y Comandos de Ejecución](#2-cómo-arranca-la-página-y-comandos-de-ejecución)
3. [Tecnologías, Dependencias y Recursos Externos Utilizados](#3-tecnologías-dependencias-y-recursos-externos-utilizados)
4. [Cambios Recientes Realizados en el Frontend](#4-cambios-recientes-realizados-en-el-frontend)
5. [Arquitectura del Frontend](#5-arquitectura-del-frontend)
6. [Inventario Exacto de Pantallas, Subpantallas y Modales](#6-inventario-exacto-de-pantallas-subpantallas-y-modales)
7. [Roles y Estados Oficiales del Sistema](#7-roles-y-estados-oficiales-del-sistema)
8. [Peticiones HTTP del Frontend y Aviso de Inconsistencias](#8-peticiones-http-del-frontend-y-aviso-de-inconsistencias)
9. [Trazabilidad End-to-End (Frontend ↔ Backend ↔ PostgreSQL ↔ ML)](#9-trazabilidad-end-to-end-frontend--backend--postgresql--ml)
10. [Auditoría de Seguridad (Frontend y Contratos Backend / ML)](#10-auditoría-de-seguridad-frontend-y-contratos-backend--ml)
11. [Usuarios Registrados Actualmente en la Base de Datos](#11-usuarios-registrados-actualmente-en-la-base-de-datos)

---

## 1. Base Técnica Integrada (React + TypeScript + Vite + Oxlint)

El módulo `frontend/` conserva la base oficial de **React + TypeScript + Vite** con HMR (*Hot Module Replacement*) y reglas de análisis estático con **Oxlint**:

- **Plugins oficiales en el ecosistema Vite para React:**
  - `@vitejs/plugin-react` (utiliza **Oxc**): **plugin activo en este proyecto** (`vite.config.ts`, `@vitejs/plugin-react ^6.1.2`).
  - `@vitejs/plugin-react-swc` (utiliza **SWC**): alternativa oficial no instalada actualmente.
- **React Compiler:** no está habilitado en esta configuración para no impactar los tiempos de compilación en desarrollo ni build. Para activarlo en el futuro, consulta la [documentación de instalación de React Compiler](https://react.dev/learn/react-compiler/installation).
- **Configuración de Oxlint (`.oxlintrc.json`):**
  - Configuración **vigente en el archivo `.oxlintrc.json`**:
    ```json
    {
      "$schema": "./node_modules/oxlint/configuration_schema.json",
      "plugins": ["react", "typescript", "oxc"],
      "rules": {
        "react/rules-of-hooks": "error",
        "react/only-export-components": ["warn", { "allowConstantExport": true }]
      }
    }
    ```
  - **Ampliación recomendada para producción (con análisis por tipos):** instalar `oxlint-tsgolint` y añadir `"options": { "typeAware": true }` en `.oxlintrc.json`:
    ```json
    {
      "$schema": "./node_modules/oxlint/configuration_schema.json",
      "plugins": ["react", "typescript", "oxc"],
      "options": {
        "typeAware": true
      },
      "rules": {
        "react/rules-of-hooks": "error",
        "react/only-export-components": ["warn", { "allowConstantExport": true }]
      }
    }
    ```
  - Lista completa de reglas y categorías en la [documentación oficial de reglas de Oxlint](https://oxc.rs/docs/guide/usage/linter/rules).

---

## 2. Cómo Arranca la Página y Comandos de Ejecución

La aplicación completa funciona como **monorepo de tres servicios locales**:
1. **Microservicio ML (`ml-service/`):** Python + FastAPI en `http://127.0.0.1:8000` (`/predict`, `/rank`, `/extract`, `/metrics`, `/train`, `/health`).
2. **Backend REST (`backend/`):** Node.js + Express + Prisma + PostgreSQL en `http://localhost:4000/api`.
3. **Frontend SPA (`frontend/`):** Vite + React en `http://localhost:5173`.

> **Importante:** el navegador nunca consulta directamente a `ml-service` (`:8000`) ni a PostgreSQL; todas las operaciones reales pasan por `VITE_API_URL` (`http://localhost:4000/api`).

### 2.1 Variables de Entorno del Frontend (`frontend/.env`)

Basado en `frontend/.env.example`:

| Variable | Valor por defecto / ejemplo | Estado real en `frontend/src/` |
|---|---|---|
| `VITE_API_URL` | `http://localhost:4000/api` | **Leída activamente** en `src/services/api.ts` (usa fallback `'http://localhost:4000/api'` si no se define). |
| `VITE_ML_API_URL` | `http://localhost:8000` | Declarada en `.env.example`, **no leída** en `src/` (las peticiones ML pasan por el Backend `/api/ml/*`). |
| `VITE_USE_MOCK` | `false` | Declarada en `.env.example`, **no leída** en `src/` (los fallbacks locales se activan en bloques `catch`). |
| `VITE_GOOGLE_CLIENT_ID` | *(vacío)* | Declarada en `.env.example`, **no conectada** aún en `src/pages/Login/LoginPage.tsx` (solo existe `POST /api/auth/google` en backend). |

### 2.2 Arranque Paso a Paso del Entorno Completo

#### Paso 1 — Microservicio de Machine Learning (`ml-service/`)
```bash
cd ml-service
python -m venv .venv
source .venv/bin/activate          # En Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Opcional si no existe modelo entrenado (ya existe trained-models/matching_model.joblib):
python -m app.models.train
uvicorn app.main:app --reload
```
- Documentación interactiva disponible en `http://127.0.0.1:8000/docs`.
- Comandos de verificación ML: `pytest` (pruebas), `python -m app.models.evaluation` y `python -m app.models.sanity_check`.

#### Paso 2 — Base de Datos PostgreSQL y Backend (`backend/`)
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
# Opcional (solo en desarrollo para datos semilla):
npx prisma db seed
# Opcional para inspeccionar tablas visualmente en http://localhost:5555:
npx prisma studio

npm run dev
```
- Scripts de `backend/package.json`: `npm run dev` (`tsx watch src/server.ts`), `npm run build` (`tsc`), `npm run start` (`node dist/server.js`).

#### Paso 3 — Frontend (`frontend/`)
```bash
cd frontend
npm install
npm run dev
```
- La aplicación arranca en **`http://localhost:5173`** mostrando por defecto la vista `vacancies` (`VacanciesCatalogPage`).

### 2.3 Comandos Disponibles en `frontend/` y en la Raíz del Monorepo

| Ubicación | Comando | Ejecuta | Propósito |
|---|---|---|---|
| `frontend/` | `npm run dev` | `vite` | Inicia el servidor de desarrollo HMR en `:5173`. |
| `frontend/` | `npm run build` | `tsc -b && vite build` | Verifica tipos TypeScript y genera el bundle de producción en `frontend/dist/`. |
| `frontend/` | `npm run lint` | `oxlint` | Ejecuta las reglas configuradas en `.oxlintrc.json`. |
| `frontend/` | `npm run preview` | `vite preview` | Sirve localmente la compilación generada en `dist/`. |
| Raíz monorepo | `npm run dev:frontend` | `npm run dev --prefix frontend` | Levanta el frontend desde la raíz. |
| Raíz monorepo | `npm run dev:backend` | `npm run dev --prefix backend` | Levanta el backend desde la raíz. |
| Raíz monorepo | `npm run build` | `npm run build --prefix frontend && npm run build --prefix backend` | Compila frontend y backend secuencialmente (`build:1`, `build-1`, `build:2`, etc. hacen lo mismo). |

---

## 3. Tecnologías, Dependencias y Recursos Externos Utilizados

### 3.1 Stack de Dependencias (`frontend/package.json`)

**Dependencias de producción (`dependencies`):**

| Paquete | Versión | Uso real en el código |
|---|---|---|
| `react` | `^19.3.1` | Librería de interfaz y manejo de estado (`useState`, `useEffect`, `useContext`, `useRef`). |
| `react-dom` | `^19.3.1` | Montaje del árbol React en `#root` (`src/main.tsx`). |
| `lucide-react` | `^1.61.0` | Iconografía vectorial en navegación, carpetas, paneles y modales. |
| `canvas-confetti` | `^1.9.4` | Efecto visual de celebración al completar una postulación (`PublicApplicationPage.tsx:93`). |
| `clsx` | `^2.1.1` | Composición condicional de clases CSS (`cn` / utilidades). |
| `tailwind-merge` | `^3.7.0` | Fusión inteligente de utilidades Tailwind v4 sin colisiones. |
| `docx` | `^9.13.0` | Declarada en `package.json`, **sin importaciones activas en `frontend/src/`** (ver `SEG-09`). |

**Dependencias de desarrollo (`devDependencies`):**

| Paquete | Versión | Propósito |
|---|---|---|
| `vite` | `^8.3.4` | Empaquetador y servidor de desarrollo ESM. |
| `@vitejs/plugin-react` | `^6.1.2` | Integración React + Fast Refresh con Oxc (`vite.config.ts`). |
| `tailwindcss` | `^4.3.3` | Motor de estilos utilitarios Tailwind CSS v4. |
| `@tailwindcss/vite` | `^4.3.3` | Plugin oficial de Tailwind v4 para Vite. |
| `typescript` | `~6.0.3` | Compilador y verificación estática de tipos. |
| `oxlint` | `^1.88.0` | Linter de alto rendimiento basado en Oxc. |
| `@types/react` / `@types/react-dom` | `^19.3.0` | Definiciones de tipos para React 19. |
| `@types/node` | `^24.19.2` | Definiciones de tipos Node (usadas en `vite.config.ts`). |
| `@types/canvas-confetti` | `^1.9.0` | Definiciones de tipos para `canvas-confetti`. |

### 3.2 Servicios Externos, CDN y Recursos Fuera del Bundle

| Recurso / Servicio Externo | Origen / Ubicación | Cómo se utiliza y estado |
|---|---|---|
| **Google Fonts CDN** | `index.html` (`fonts.googleapis.com` y `fonts.gstatic.com`) | Carga externa vía `<link>` de las familias tipográficas **`Instrument Sans`**, **`JetBrains Mono`** y **`Manrope`**. *(Nota: `DESIGN.md` documenta `Public Sans` y `Source Serif 4`, pero `index.html` y `index.css` usan actualmente `Instrument Sans`, `Manrope` y `JetBrains Mono`.)* |
| **API Backend (Node / Express)** | `http://localhost:4000/api` (`VITE_API_URL`) | Fuente principal de autenticación JWT, vacantes, postulaciones, empresas, plantilla, notificaciones y puente hacia ML. |
| **Microservicio ML (FastAPI + scikit-learn)** | `http://localhost:8000` (vía Backend) | Motor de inferencia `regresion_logistica` (`88.5%` exactitud, `77.6%` F1, `92.9%` ROC-AUC sobre `360` pares en `metrics.json`) y extractor de CV (`/extract`). |
| **PostgreSQL + Prisma 7** | Gestionado por `backend/` (`@prisma/adapter-pg`) | Persistencia transaccional multi-empresa (`empresas`, `usuarios`, `vacantes`, `postulaciones`, etc.). |
| **Google OAuth 2.0 (`google-auth-library`)** | `backend/src/services/google.service.ts` y `VITE_GOOGLE_CLIENT_ID` | El backend expone `POST /api/auth/google` y `POST /api/auth/google/complete`; **el frontend aún no renderiza el botón/flujo Google OAuth**. |
| **SMTP / Nodemailer** | `backend/` (`nodemailer`) | Envío de verificación de correo, recuperación de contraseña y notificaciones; sin credenciales SMTP en entorno local opera en modo dev/auto-verificación de candidatos. |
| **WhatsApp / Canal de Alertas y Soporte** | `Footer.tsx:33`, `CandidateDashboardPage.tsx:620` y notificaciones | En la interfaz existen alertas informativas de soporte vía WhatsApp `+1 (809) 555-0199` y etiquetado de canal `'WhatsApp' \| 'Email'`. El envío real depende de webhooks/configuración en backend. |
| **Activos estáticos locales** | `public/` y `src/assets/` | **En uso:** `public/logo.png`, `public/images/hero-slide-{1..3}.jpg` (carrusel de vacantes), `public/images/login-workspace.jpg` / `public/login-bg.png` (fondo del login), `src/assets/brand/logo.png`. **Heredados sin uso:** `public/favicon.svg`, `public/icons.svg`, `src/assets/react.svg`, `src/assets/vite.svg`, `src/assets/hero.png`, `src/assets/tech-stack.png`. |

---

## 4. Cambios Recientes Realizados en el Frontend

Evolución verificada en el historial Git (`build 43` → `build 60`) y en las modificaciones locales actuales aún no confirmadas en commit:

### 4.1 Hitos Confirmados en Git

- **`d83f069` — `build 43` (2026-11-11):** Rediseño visual base (*"El Acta de Calificaciones"* y expedientes manila, manteniendo intactos backend y ML), incorporando `DESIGN.md`, `PRODUCT.md` inicial y ajustes de contraste en tarjetas y modales.
- **`adf3046` — `build 50` (2026-11-12):** Rediseño definitivo hacia estética dual **Alabastro (`#F1F2EC`) / Manila (`#EFE5D4`)** en modo claro y **Obsidiana (`#090A0C`) / Lima (`#C8FF45`) / Cobalto (`#4C6FFF`)** en modo oscuro con `AmbientBackground`.
- **`890ff31` — `build 51` (2026-11-12):** Ajuste responsivo y adaptación a distintos viewports en `Navbar`, `Footer`, `Modal`, `FileUploader` y los distintos dashboards.
- **`6c74a79` — `build 55` (2026-11-13):** Incorporación de glassmorfismo en `CandidateDashboardPage`, logotipo PNG (`BrandLogo.tsx` + `public/logo.png`), soporte de modo claro en `LoginPage` y carrusel hero automático de 3 imágenes (`hero-slide-1..3.jpg`) en `VacanciesCatalogPage`.
- **`6649e03` — `build 56` (2026-11-13):** Ajustes visuales en `CandidateDashboardPage.tsx` e `index.css` *(nota: este commit también purgó carpetas duplicadas heredadas fuera del árbol activo).*
- **`0051165` — `build 60 diseño retocado` (2026-11-13):**
  - Incorporación de `TiltGlassCard.tsx` (inclinación 3D sutil por puntero) y `HireCandidateModal.tsx` (contratación con sueldo base mensual).
  - Ampliación sustancial de `HRDashboardPage` (+1012/- líneas en diff), `GlobalAdminDashboardPage` (+966 líneas), `CompanyAdminDashboardPage`, `employees.service.ts` y `applications.service.ts` para gestión completa de plantilla, nómina, desvinculación/liquidaciones y analíticas concéntricas por empresa.

### 4.2 Cambios Activos Posteriores a `build 60` (Árbol de Trabajo Actual)

Verificado mediante `git diff HEAD` sobre `PlataformaML-main/frontend/`:

1. **Carpetas Manila con Profundidad 3D y Auto-Scroll Coordinado (`src/index.css`, `src/hooks/useFolderAutoScroll.ts`, `VacanciesCatalogPage.tsx`, `CandidateDashboardPage.tsx`):**
   - Clases CSS 3D `.manila-folder-perspective`, `.manila-folder-tab-3d`, `.manila-folder-body-3d` y `.manila-paper-sheet-3d`.
   - Nuevo hook `useFolderAutoScroll` (`stickyOffset` y `delayMs` configurables) que desplaza suavemente la pantalla para encuadrar la carpeta al abrirla o cerrarla, evitando saltos cuando otra carpeta de la misma fila horizontal ya está abierta.
2. **Rediseño del Login con Panel Diagonal Animado e Integración Inline (`src/pages/Login/LoginPage.tsx`, `src/index.css`):**
   - El contenedor de autenticación comparte bordes verticales y horizontales completos con la barra superior y el pie de página.
   - Borde animado mediante keyframes `@keyframes authBeamRotate` / `@keyframes authBorderFlow` (`.login-animated-perimeter`) y panel diagonal deslizante (`.login-overlay-shell`, `.login-overlay-inner`).
   - El registro como Candidato (`register-candidate`), alta de Empresa (`register-company`) y recuperación de contraseña (`isRecoverMode`) ahora ocurren **inline con animación lateral**, eliminando los modales previos del Login.
   - Tarjeta de telemetría interna con dos esquinas diagonales sin redondear e inclinación 3D mínima (`TiltGlassCard`).
3. **Renovación del Bloque de Perfil en Portal del Candidato (`CandidateDashboardPage.tsx`):**
   - Eliminación de íconos/textos decorativos redundantes en el resumen superior.
   - Nueva tarjeta de perfil compacta ajustada al alto de la gráfica circular adyacente, con cabecera curva/diagonal en paleta corporativa (`#090A0C → #2746C7 → #4C6FFF`), etiqueta `EXP-2026`, avatar editable y fila inferior con **Postulaciones totales**, **En proceso** y **Afinidad IA**.
4. **Corrección de Orientación Temporal en RRHH (`HRDashboardPage.tsx`):**
   - Se invirtió la dirección visual y matemática de la barra histórica de estadísticas en *Plantilla & Nómina* para que **`Más Pasado`** quede a la izquierda (`0%`, usando `(100 - timelineStep)`) y **`Tiempo Actual (Hoy)`** a la derecha (`100%`), además de limpiar elementos visuales sobrantes junto al control deslizante.

---

## 5. Arquitectura del Frontend

### 5.1 Patrón y Capas

El frontend sigue una arquitectura **SPA modular por capas sin enrutador de URL** (`react-router` no está instalado; toda la navegación ocurre mediante el estado React `currentView` en `src/App.tsx`):

```text
index.html (Google Fonts + #root)
  └── src/main.tsx
        └── src/App.tsx
              ├── ThemeProvider         (Tema claro/oscuro en localStorage['plataformaml_theme'])
              ├── ToastProvider         (Notificaciones flotantes globales)
              ├── AuthProvider          (Usuario actual, login, register, logout, fotos)
              └── MainApp               (Estado currentView, selectedVacancy, successData)
                    ├── AmbientBackground
                    ├── Pages           (src/pages/* — 8 pantallas activas + 1 legada)
                    ├── Components      (src/components/{ui,layout,ml,applications})
                    ├── Hooks           (src/hooks/useFolderAutoScroll.ts)
                    └── Services        (src/services/api.ts + 13 módulos de servicio + cvParser + mockData)
```

### 5.2 Estructura de Carpetas en `frontend/src/`

- **`src/types/index.ts`:** Contratos TypeScript de dominio (`UserRole`, `Empresa`, `User`, `ApplicationStatus`, `MLFactorBreakdown`, `ApplicationTimelineEvent`, `Application`, `Vacancy`, `CandidateProfile`, `NotificationItem`, `MLModelMetrics`, `ComparisonMetrics`, `TerminationDetails`, `Employee`).
- **`src/context/`:**
  - `ThemeContext.tsx`: gestiona clase `.dark` en `document.documentElement`, persistencia en `localStorage['plataformaml_theme']` y preferencia del sistema (`prefers-color-scheme`).
  - `AuthContext.tsx`: hidrata `user` al montar desde `authService.getCurrentUser()` (sin verificar contra `/auth/me`) y expone `login`, `register`, `logout`, `updateUserPhoto` y `switchRoleDemo` (método presente en contexto aunque no expuesto en botones de `Navbar.tsx`).
  - `ToastContext.tsx`: cola de mensajes de éxito, error o aviso.
- **`src/components/`:**
  - `layout/`: `Navbar.tsx` (barra superior con links según rol, conmutador de tema y botón único de logout), `Footer.tsx`, `AmbientBackground.tsx`.
  - `ui/`: `Button.tsx`, `Input.tsx`, `Badge.tsx`, `Modal.tsx`, `FileUploader.tsx`, `BrandLogo.tsx`, `ThemeToggle.tsx`, `TiltGlassCard.tsx`.
  - `ml/`: `MLScoreBadge.tsx`, `MLExplainabilityModal.tsx`.
  - `applications/`: `ApplicationDetailModal.tsx`, `HireCandidateModal.tsx`.
- **`src/services/`:**
  - `api.ts`: instancia `ApiClient` sobre `fetch`, inyección del header `Authorization: Bearer <localStorage['nexo_auth_token']>`, métodos JSON (`get`, `post`, `put`, `patch`, `delete`) y `FormData` (`upload`).
  - Servicios de dominio: `auth.service.ts`, `empresa.service.ts`, `admin.service.ts`, `company.service.ts`, `vacancies.service.ts`, `candidates.service.ts`, `applications.service.ts`, `employees.service.ts`, `notifications.service.ts`, `chat.service.ts`, `ml.service.ts`, `reports.service.ts`.
  - Utilidades locales: `cvParser.ts` (extracción heurística en cliente usando `file.text()` y regex) y `mockData.ts` (almacén y datos semilla en navegador).
- **`src/hooks/`:** `useFolderAutoScroll.ts`.

---

## 6. Inventario Exacto de Pantallas, Subpantallas y Modales

### 6.1 Pantallas de Nivel Superior (`src/pages/` y `src/App.tsx`)

En el código existen **8 pantallas activas enrutadas** (accesibles mediante **9 identificadores** de `currentView`, pues `global-admin-dashboard` y `admin-dashboard` evalúan el mismo bloque condicional) más **1 pantalla legada no enrutada** (`9` archivos en `src/pages/` en total):

| # | Identificador `currentView` | Componente / Archivo | Acceso / Rol | Descripción |
|---|---|---|---|---|
| 1 | `'vacancies'` *(por defecto)* | `VacanciesCatalogPage.tsx` | Público / todos | Catálogo público de vacantes con carrusel hero automático (3 slides), búsqueda, filtros por empresa y modalidad, y carpetas manila 3D con `useFolderAutoScroll`. |
| 2 | `'login'` | `LoginPage.tsx` | Público | Portal unificado de acceso con animación diagonal dividida e integración inline de registro (Candidato / Empresa) y recuperación de contraseña. |
| 3 | `'apply'` *(si `selectedVacancy`)* | `PublicApplicationPage.tsx` | Público / Candidato | Formulario de postulación a una vacante con carga de cédula y CV, análisis heurístico preliminar y confeti al enviar. |
| 4 | `'apply-success'` | `SuccessRegistrationPage.tsx` | Público / Candidato | Confirmación de envío de postulación con resumen y enlace hacia el portal del candidato o catálogo. |
| 5 | `'candidate-dashboard'` | `CandidateDashboardPage.tsx` | `candidato` *(sin bloqueo si `user === null`)* | Portal personal con sidebar fijo, resumen de postulaciones, gráfico circular de distribución, seguimiento de carpetas, perfil curricular editable y notificaciones. |
| 6 | `'hr-dashboard'` | `HRDashboardPage.tsx` | `rrhh` *(sin bloqueo si `user === null`)* | Mesa de selección para reclutadores: gestión de convocatorias, ranking ML, notas/estados XAI, contratación oficial, plantilla/nómina, línea temporal histórica y cálculo de liquidaciones. |
| 7 | `'company-admin-dashboard'` | `CompanyAdminDashboardPage.tsx` | `admin` / `administrador` | Panel corporativo aislado por empresa: métricas locales de IA, gestión de reclutadores RRHH y contratados, listado de postulantes y perfil de empresa. |
| 8 | `'global-admin-dashboard'` o `'admin-dashboard'` | `GlobalAdminDashboardPage.tsx` *(si `user?.role === 'superadmin'`)* / `CompanyAdminDashboardPage.tsx` *(cualquier otro caso)* | `superadmin` *(con fallback a empresa)* | Consola global multi-tenant: MLOps y entrenamiento scikit-learn, comparativa concéntrica por empresas, aprobación/suspensión de empresas y directorio global de usuarios. |
| 9 | *(Sin ruta en `App.tsx`)* | `AdminDashboardPage.tsx` | Legado / inactivo | Antiguo panel administrativo unificado (3 pestañas y 3 modales propios) conservado en disco pero sin referencias en `App.tsx`. |

> **Fallo de navegación detectado:** en `HRDashboardPage.tsx:774`, al hacer clic en el logotipo del encabezado se ejecuta `onNavigate('home')`, identificador no contemplado en `App.tsx` (deja el área de pantalla en blanco en vez de volver a `'vacancies'`).  
> **Nota sobre evolución planificada:** [`FRONTEND_ESPECIFICACION.md`](./FRONTEND_ESPECIFICACION.md) proyecta una arquitectura futura de **53 rutas URL** (`P1–P16`, `C1–C11`, `R1–R12`, `E1–E6`, `A1–A8`); la implementación actual corresponde a la arquitectura consolidada de 8 pantallas activas.

### 6.2 Subpantallas, Modos Inline, Pestañas y Subfiltros Activos

Contabilizando los modos internos con vista propia: **4 modos en `LoginPage` + 13 subpantallas/pestañas activas de dashboard** (**17 vistas internas** en total, o **18** si se incluye `'vacancies'` en la unión tipada `activeTab` de `CandidateDashboardPage`):

- **`LoginPage` (`authMode` + `isRecoverMode` — 4 modos inline sin modales):**
  1. Inicio de sesión estándar (`authMode = 'login'`, `isRecoverMode = false`).
  2. Recuperación de contraseña inline (`authMode = 'login'`, `isRecoverMode = true`).
  3. Registro de Candidato inline (`authMode = 'register-candidate'`, *Registro de Expediente Digital*).
  4. Registro de Empresa inline (`authMode = 'register-company'`, *Alta Corporativa Multi-Tenant*).
- **`CandidateDashboardPage` (`activeTab` — 3 subpantallas internas + enlace externo):**
  1. `applications` (*Mis Postulaciones*): con filtro por estado (`statusFilter`: `'todos'` o estados de postulación) y tarjetas manila 3D desplegables con `useFolderAutoScroll`.
  2. `profile` (*Mi perfil curricular* / *Expediente*): edición de título, biografía, ubicación, contacto, habilidades, formación y experiencia.
  3. `notifications` (*Notificaciones*): bandeja de avisos recibidos por correo/WhatsApp.
  *(Nota: el botón "Explorar vacantes" ejecuta `onNavigate('vacancies')` hacia la pantalla catálogo; el miembro `'vacancies'` en el tipo de `activeTab` no tiene bloque renderizado propio dentro del dashboard).*
- **`HRDashboardPage` (`activeTab` + vista contextual — 3 subpantallas):**
  1. `candidates` (*Convocatorias & Ranking IA*): listado de vacantes con subfiltro segmentado `vacancyStatusTab` (`'activas' | 'inactivas' | 'todas'`) y buscador.
  2. `candidates` con `selectedVacancyForRanking !== null` (*Ranking: `<título>`*): subvista contextual con ordenamiento ML por afinidad, filtro de estado, búsqueda y acciones XAI/contratación.
  3. `employees` (*Plantilla & Nómina*): control de colaboradores afiliados con subfiltro `employeeStatusFilter` (`'all' | 'Activo' | 'Despedido'`) y línea temporal interactiva (*Más Pasado* izquierda → *Tiempo Actual (Hoy)* derecha).
- **`CompanyAdminDashboardPage` (`activeTab` — 4 pestañas):**
  1. `metrics` (*Métricas Locales de IA*).
  2. `team` (*Recursos Humanos Afiliados*): incluye subfiltro `teamSubTab` (`'all' | 'rrhh' | 'hired'`: *Todos*, *RRHH*, *Contratados*).
  3. `candidates` (*Candidatos de la Empresa*).
  4. `profile` (*Datos de la Empresa*).
- **`GlobalAdminDashboardPage` (`activeTab` en carrusel horizontal — 3 pestañas):**
  1. `mlops` (*MLOps & Entrenamiento de IA*): métricas scikit-learn, comparativa IA vs filtro manual y acordeones expandibles por empresa con gráfico concéntrico de 3 capas (Postulaciones, RRHH, Contratados).
  2. `companies` (*Directorio de Empresas*): tarjetas de organizaciones con acciones de aprobación, suspensión o reactivación y alta de nuevas empresas.
  3. `directory` (*Usuarios Registrados*): tabla global con búsqueda por texto, filtro por rol y filtro por empresa (`selectedCompanyFilter`).

### 6.3 Modales del Sistema

Existen **13 modales activos** (**3** componentes reutilizables + **10** modales locales en páginas), además de **3** modales heredados en la vista legada `AdminDashboardPage.tsx`:

| Tipo | Componente / Ubicación | Título visible / Propósito | Pantallas que lo abren |
|---|---|---|---|
| Compartido | `ApplicationDetailModal.tsx` | Expediente completo, línea de tiempo y notas de RRHH | `CandidateDashboardPage`, `HRDashboardPage` |
| Compartido | `MLExplainabilityModal.tsx` | Explicabilidad Algorítmica XAI (factores, skills coincidentes y faltantes) | `CandidateDashboardPage`, `HRDashboardPage` |
| Compartido | `HireCandidateModal.tsx` | Confirmación de contratación oficial y asignación de salario base mensual (`RD$`) | `HRDashboardPage` |
| Local | `CandidateDashboardPage.tsx` | *Actualizar CV & Reanálisis con IA* (`isReanalyzeModalOpen`) | `CandidateDashboardPage` |
| Local | `CandidateDashboardPage.tsx` | *Actualizar Foto de Perfil* (`isPhotoModalOpen`) | `CandidateDashboardPage` |
| Local *(overlay custom)* | `HRDashboardPage.tsx` | *Dossier Manila: Crear Nueva Vacante* (`isCreateVacancyOpen`) | `HRDashboardPage` |
| Local | `HRDashboardPage.tsx` | *Formalización de Despido y Cuadre de Liquidación Laboral* (`isDismissModalOpen`) | `HRDashboardPage` |
| Local | `HRDashboardPage.tsx` | *Expediente de Despido y Cuadre de Liquidación* (`isSettlementModalOpen`) | `HRDashboardPage` |
| Local | `CompanyAdminDashboardPage.tsx` | *Registrar Reclutador de RRHH · `<Empresa>`* (`isNewHROpen`) | `CompanyAdminDashboardPage` |
| Local | `CompanyAdminDashboardPage.tsx` | *Confirmar Desvinculación de Colaborador* (`deleteTarget`) | `CompanyAdminDashboardPage` |
| Local | `GlobalAdminDashboardPage.tsx` | *Alta Administrativa de Empresa (Multi-Tenant)* (`isNewCompanyOpen`) | `GlobalAdminDashboardPage` |
| Local | `GlobalAdminDashboardPage.tsx` | *Alimentar Pipeline de Entrenamiento con Nuevo Dataset* (`isUploadOpen`) | `GlobalAdminDashboardPage` |
| Local | `GlobalAdminDashboardPage.tsx` | *Eliminar Usuario del Sistema* (`isDeleteUserModalOpen`) | `GlobalAdminDashboardPage` |
| Legado | `AdminDashboardPage.tsx` *(3 modales)* | *Cargar Dataset de Entrenamiento*, *Afiliar Nueva Empresa*, *Registrar Reclutador de Recursos Humanos* | No enrutada en `App.tsx` |

---

## 7. Roles y Estados Oficiales del Sistema

### 7.1 Roles de Usuario (`UserRole` ↔ Prisma `Rol`)

| Rol Frontend (`src/types/index.ts`) | Rol Backend (`prisma/schema.prisma`) | Alcance Multi-Tenant | Capacidades principales |
|---|---|---|---|
| *(Sin sesión)* | — | Público | Navega catálogo de vacantes, se postula a una vacante (`PublicApplicationPage`) o solicita registro. |
| `'candidato'` | `CANDIDATO` | Sin empresa (`empresaId: null`) | Gestiona su perfil curricular y CV, consulta sus postulaciones, timeline de etapas, afinidad XAI y notificaciones. |
| `'rrhh'` | `RRHH` | Vinculado a una `empresaId` | Publica/pausa vacantes de su empresa, revisa ranking ML, cambia estado de candidatos, contrata personal, gestiona nómina y calcula liquidaciones. |
| `'admin'` / `'administrador'` | `ADMIN` | Vinculado a una `empresaId` | Invita/gestiona miembros RRHH de su empresa, supervisa contratados, métricas locales de IA, candidatos y datos corporativos. *(Nota: en backend actualmente tiene acceso indebido a `/api/ml/*`; ver `SEG-05`.)* |
| `'superadmin'` | `SUPER_ADMIN` | Global (`empresaId: null`) | Aprueba, suspende, reactiva y da de alta empresas; consulta directorio global de usuarios y administra MLOps/reentrenamiento global. |

### 7.2 Estados de Entidades (Frontend ↔ Backend Prisma)

| Entidad | Valores en Frontend (`types/index.ts` / UI) | Valores en Backend (`schema.prisma`) | Observaciones de sincronización |
|---|---|---|---|
| **Postulación** | `'Recibida'`, `'En revisión'`, `'Preseleccionado'`, `'Entrevista'`, `'Descartado'`, `'Contratado'` | `EstadoPostulacion`: `RECIBIDA`, `EN_REVISION`, `PRESELECCIONADA`, `ENTREVISTA`, `RECHAZADA`, `CONTRATADA` | El backend traduce estados entre etiquetas legibles y enums de Prisma en `selection.controller.ts`. |
| **Empresa** | `activa: boolean` + `estado?: string` | `EstadoEmpresa`: `PENDIENTE_APROBACION`, `ACTIVA`, `SUSPENDIDA`, `RECHAZADA` *(+ `MotivoDesactivacion`: `INACTIVIDAD`, `VENCIMIENTO`, `MANUAL`)* | Solo empresas `ACTIVA` pueden operar normalmente con su personal RRHH/Admin. |
| **Vacante** | `'Abierta'`, `'Pausada'`, `'Cerrada'` | `EstadoVacante`: `BORRADOR`, `ABIERTA`, `PAUSADA`, `CERRADA` | `BORRADOR` existe en PostgreSQL/Prisma, pero el catálogo e interfaces de frontend trabajan con `Abierta`, `Pausada` y `Cerrada`. |
| **Colaborador (`Employee`)** | `'Activo'`, `'Despedido'` | Derivado de usuario/postulación contratada + estado en memoria/localStorage | Al formalizar despido guarda `terminationDetails` (preaviso, cesantía, vacaciones, regalía y liquidación total). |
| **Notificación** | `NotificationItem['status']`: `'Enviado'`, `'Entregado'`, `'Leído'` | `EstadoNotificacion`: `PENDIENTE`, `PROCESANDO`, `ENVIADA`, `ENTREGADA`, `LEIDA`, `FALLIDA` | El tipo TypeScript del frontend omite `PENDIENTE`, `PROCESANDO` y `FALLIDA`. |

---

## 8. Peticiones HTTP del Frontend y Aviso de Inconsistencias

Todas las peticiones pasan por `ApiClient` (`src/services/api.ts`) hacia `VITE_API_URL` (`http://localhost:4000/api`) adjuntando `Authorization: Bearer <token>` cuando existe `localStorage['nexo_auth_token']`.

| Servicio Frontend | Método y Endpoint Solicitado | Payload / Parámetros | Estado frente al Backend (`backend/src/app.ts` + `routes/`) |
|---|---|---|---|
| `auth.service.ts` | `POST /auth/login` | `{ email, password }` | **OK** — Retorna JWT y usuario. *(En `catch` hace bypass local; ver `SEG-01`.)* |
| `auth.service.ts` | `POST /auth/register` | `{ tipo: 'CANDIDATO', email, password, nombre, telefono? }` | **OK** — Registra candidato público. |
| `auth.service.ts` | `POST /auth/recover-password` | `{ email }` | **OK** — Dispara token de recuperación. |
| `auth.service.ts` | `POST /company/members/invite` | `{ email, nombre }` *(en `registerHRUser`)* | **PARCIAL / INSEGURO** — Guarda clave plana local antes y silencia errores del POST. |
| `auth.service.ts` | `GET /admin/users` | — | **OK solo `SUPER_ADMIN`** — Devuelve `403` para cualquier otro rol. |
| `auth.service.ts` | `DELETE /admin/users/:userId` | — | **CONTRATO INEXISTENTE** — La ruta no existe en `admin.routes.ts`; siempre cae al `catch` y borra solo localmente. |
| `empresa.service.ts` | `GET /admin/companies` | — | **CONFLICTO DE ROL** — Solo permite `SUPER_ADMIN` (`admin.routes.ts`). Cuando `VacanciesCatalogPage.tsx` (pública) la llama, recibe `401/403` y cae a `[]`. |
| `empresa.service.ts` | `POST /auth/register` | `{ tipo: 'EMPRESA', ... }` | **OK** — Crea empresa en estado `PENDIENTE_APROBACION` + su usuario `ADMIN`. |
| `empresa.service.ts` | `POST /admin/companies/:id/{approve,reject,activate,deactivate}` | `{ motivo }` | **OK** — Coincide con `admin.routes.ts`. |
| `admin.service.ts` | `PATCH /admin/companies/:id/{approve,reject,deactivate,activate}` | `{ motivoRechazo }` / `{ motivoDesactivacion }` | **CONTRATO ROTO** — Usa `PATCH` en vez de `POST` y envía campos distintos a `{ motivo }` (Zod `.strict()` en `admin.routes.ts:36,43` lo rechaza). *(Nota: el dashboard actual consume `empresa.service.ts`, no este módulo.)* |
| `company.service.ts` | `GET /company`, `PUT /company`, `POST /company/invitations`, `PATCH /company/members/:id` | Varios | **CONTRATO ROTO** — `company.routes.ts` expone `/company/me`, `/company/members/invite` y `/company/members/:id/status`; además espera `{ miembros, invitacionesPendientes }` cuando el controlador devuelve un `Array`. |
| `chat.service.ts` | `GET /chat/conversations`, `POST /chat/conversations/:id/messages`, `PATCH /chat/conversations/:id/read` | `{ cuerpo }` | **CONTRATO ROTO** — `app.ts:67` monta `chatRouter` en **`/api/conversations`** (sin prefijo `/chat`) y el backend espera `{ contenido }` en lugar de `{ cuerpo }`. |
| `vacancies.service.ts` | `GET /vacancies`, `GET /vacancies/:id`, `POST /vacancies`, `PUT /vacancies/:id` | Filtros / datos de vacante | **OK** *(con fallback silencioso a `mockStore` ante error).* |
| `candidates.service.ts` | `GET /candidates/me`, `PUT /candidates/me` | Perfil, educación, experiencia, habilidades | **OK** *(con cache local `nexo_candidate_profile_*`). Los endpoints backend `POST /candidates/me/documents`, `PUT /candidates/me/photo` y `GET /candidates/documents/:id` no están conectados todavía.* |
| `applications.service.ts` | `GET /applications`, `GET /applications/:id`, `POST /applications`, `PATCH /applications/:id/status` | `multipart/form-data` (`vacancyId`, `email`, `firstName`, `lastName`, `phone`, `idCard`, `cv`) en `POST`; estado/nota en `PATCH` | **OK** — Nota: cuando el frontend pasa `?email=...`, el backend lo **ignora intencionalmente** y filtra según `req.user` (`selection.controller.ts:140`). |
| `employees.service.ts` | `GET /company/members`, `PATCH /company/members/:id/status` | `{ activo }` | **OK** para miembros RRHH de la empresa. |
| `employees.service.ts` | `DELETE /company/members/:id` | — | **CONTRATO INEXISTENTE** — No existe en `company.routes.ts`; cae al `catch` y elimina solo del almacenamiento local. |
| `ml.service.ts` | `GET /ml/metrics`, `POST /ml/train`, `POST /ml/upload-dataset` | `FormData` campo `dataset` en upload | **OK con fallo de permisos en backend** — Permite `ADMIN` además de `SUPER_ADMIN` (`SEG-05`). |
| `notifications.service.ts` | `GET /notifications`, `POST /notifications/send` | Destinatario, canal, mensaje | **OK** para consulta/envío autenticado. |
| `reports.service.ts` | `GET /reports/comparison` | — | **OK** — Métricas comparativas IA vs filtrado manual. |

---

## 9. Trazabilidad End-to-End (Frontend ↔ Backend ↔ PostgreSQL ↔ ML)

| Flujo de Negocio | Punto de Origen (Frontend) | Transporte / API Backend | Persistencia / Motor Externo | Trazabilidad / Evidencia Generada |
|---|---|---|---|---|
| **1. Catálogo y Postulación Pública / Candidato** | `VacanciesCatalogPage` → `PublicApplicationPage` (`FileUploader` + `cvParser.ts`) → `SuccessRegistrationPage` | `applicationsService.create` → `POST /api/applications` (`multipart/form-data`) | `multer` + validación mágica → `ml-service /extract` y `/predict` → PostgreSQL (`Postulacion`, `Documento`, `PrediccionML`, `HistorialPostulacion`) | Genera `timeline` inicial (`Recibida`), guarda `cvFileName`, calcula `mlScore` + `mlBreakdown` (o fallback heurístico local si el servidor falla). |
| **2. Seguimiento y Perfil del Candidato** | `CandidateDashboardPage` (`applications`, `profile`, `notifications`) + `ApplicationDetailModal` + `MLExplainabilityModal` | `GET /api/applications`, `GET/PUT /api/candidates/me`, `GET /api/notifications` | PostgreSQL (`PerfilCandidato`, `Educacion`, `Experiencia`, `Notificacion`) | Visualiza distribución porcentual en donut SVG, etapas auditables en `timeline`, factores XAI (`skillsMatch`, `experienceMatch`, `educationMatch`) y avisos. Foto de perfil y actualización de CV aún guardan copia en `localStorage`. |
| **3. Selección, Ranking XAI y Contratación** | `HRDashboardPage` (`candidates`) → `MLExplainabilityModal` → `ApplicationDetailModal` → `HireCandidateModal` | `GET /api/vacancies`, `POST/PUT /api/vacancies`, `GET /api/applications?vacancyId=...`, `PATCH /api/applications/:id/status`, `POST /api/notifications/send` | PostgreSQL (`Vacante`, `Postulacion`, `HistorialPostulacion`, `Notificacion`) + `ml-service /rank` | Toda transición humana queda registrada en `timeline` con `actor` y `timestamp`. Al contratar, `HireCandidateModal` captura sueldo mensual y registra términos contractuales en `employees.service.ts` (`localStorage['nexo_hired_contract_terms']` por falta de entidad nómina dedicada en backend). |
| **4. Plantilla, Línea Temporal y Liquidación Laboral** | `HRDashboardPage` (`employees`) + modales de Despido y Liquidación | `GET /api/company/members`, `PATCH /api/company/members/:id/status` + persistencia local de contratados/liquidaciones | PostgreSQL (`Usuario`) + `localStorage` (`nexo_employees_db`, `nexo_hired_contract_terms`) | Muestra evolución temporal (`Más Pasado → Tiempo Actual`), calcula preaviso/cesantía/vacaciones/regalía (`÷ 23.83`) y emite expediente histórico de liquidación (`terminationDetails`). |
| **5. Administración Corporativa (Multi-Tenant)** | `CompanyAdminDashboardPage` (`metrics`, `team`, `candidates`, `profile`) | `GET /api/company/members`, `POST /api/company/members/invite`, `GET /api/vacancies`, `GET /api/applications` | PostgreSQL filtrado por `empresaId` del JWT | Supervisa equipo RRHH, contratados e indicadores de afinidad de la empresa sin cruzar datos de otros tenants. *(La desvinculación/eliminación física usa `DELETE` inexistente en backend; ver matriz HTTP.)* |
| **6. Gobernanza Global y MLOps** | `GlobalAdminDashboardPage` (`mlops`, `companies`, `directory`) | `GET /api/ml/metrics`, `POST /api/ml/train`, `POST /api/ml/upload-dataset`, `GET /api/admin/companies`, `POST /api/admin/companies/:id/*`, `GET /api/admin/users` | PostgreSQL + `ml-service` (`/metrics`, `/train`, `pairs.csv`) | Aprueba/suspende/reactiva empresas, calcula comparativas concéntricas contra el total de plataforma y reentrena el clasificador scikit-learn con historial de exactitud/pérdida. |

---

## 10. Auditoría de Seguridad (Frontend y Contratos Backend / ML)

Análisis estático y de contratos realizado sobre `frontend/src/*`, `backend/src/*` y `ml-service/app/*`.

### 10.1 Hallazgos Críticos, Altos, Medios y Bajos

| ID | Severidad | Ubicación Exacta | Vulnerabilidad / Fallo | Riesgo e Impacto | Remediación Recomendada |
|---|---|---|---|---|---|
| **SEG-01** | **CRÍTICA** | `frontend/src/services/auth.service.ts:65-77, 153-169, 481-491`; `GlobalAdminDashboardPage.tsx:104`; `empresa.service.ts:118` | **Contraseñas en texto plano y bypass local de autenticación:** `registerHRUser` guarda contraseñas sin hash dentro de `localStorage['nexo_local_credentials']` (con fallback `'Password123!'`); `normalizeUser` sobrescribe el rol del servidor usando cache local; `login` ante error de red/backend valida contra `localStorage` y fabrica un token falso (`local-jwt-token-${local.user.id}`). Además, `GlobalAdminDashboardPage.tsx:104` pre-inicializa `newCompPassword` con `'empresa2026*'`. | Exposición directa de credenciales en navegador (XSS, extensiones o acceso físico), suplantación de sesión sin backend y escalación local. | Eliminar por completo `nexo_local_credentials`, el bypass de `login` ante errores del servidor y los valores prellenados de contraseña en UI; delegar todo registro e inicio de sesión exclusivamente a JWT emitidos por Backend. |
| **SEG-02** | **ALTA** | `frontend/src/services/auth.service.ts:36-38` | **Escalación de rol en cliente por subcadena `"superadmin"`:** `normalizeRole` asigna `role = 'superadmin'` a cualquier cuenta cuyo `email`/`correo` contenga la subcadena `'superadmin'`. | Si se crea o usa un correo de candidato como `mi.superadmin@correo.com`, la interfaz desbloquea las pantallas administrativas globales (aunque las llamadas reales al backend sigan bloqueadas por JWT). | Usar estrictamente el enum `rol` devuelto y verificado por el servidor (`GET /api/auth/me`) sin inferencias por correo electrónico. |
| **SEG-03** | **ALTA** | `frontend/src/services/api.ts:18, 26-36, 82`; `AuthContext.tsx:24, 120-127`; `candidates.service.ts:16, 63, 117`; `employees.service.ts:15, 62-77` | **JWT y PII en `localStorage` sin validación de sesión ni manejo de `401`:** El token (`nexo_auth_token`), perfiles (`nexo_current_user`, `nexo_candidate_profile_*`), fotos (`nexo_user_photo_*`) y salarios (`nexo_hired_contract_terms`) persisten en `localStorage`. Al arrancar, `AuthContext` confía ciegamente en `nexo_current_user` sin consultar `GET /api/auth/me`, y `ApiClient` no invalida la sesión ante respuestas `401`. | Cualquier XSS permite exfiltrar el Bearer JWT; tokens revocados o expirados mantienen la UI autenticada hasta que falla cada acción individual. | Migrar la sesión a cookies `HttpOnly; Secure; SameSite`, validar la sesión al montar con `GET /api/auth/me` y limpiar sesión/redirigir a `'login'` ante `401` global. |
| **SEG-04** | **ALTA** | `frontend/src/App.tsx:81-102`; `GlobalAdminDashboardPage.tsx:54-62`; `HRDashboardPage.tsx`; `CompanyAdminDashboardPage.tsx`; `CandidateDashboardPage.tsx`; `AuthContext.tsx:57-111` | **Guardias de vista incompletos en cliente y helper `switchRoleDemo`:** `App.tsx` solo comprueba `user?.role === 'superadmin'` en la rama de `global-admin-dashboard`; si `user` es `null`, permite montar `HRDashboardPage`, `CompanyAdminDashboardPage`, `CandidateDashboardPage` e incluso `GlobalAdminDashboardPage` (`if (user && user.role !== 'superadmin')` deja pasar `user === null`). `switchRoleDemo` sigue definido en `AuthContext` aunque no está enlazado en `Navbar`. | Exposición visual de interfaces internas y datos cacheados/mock en el navegador cuando no hay sesión válida. | Centralizar un componente `<RoleGuard allowedRoles={...}>` que redirija a `'login'` si `!user` o si el rol no corresponde, y retirar `switchRoleDemo` en compilaciones de producción. |
| **SEG-05** | **ALTA (Backend / ML)** | `backend/src/routes/ml.routes.ts:10, 14-20`; `backend/src/controllers/ml.controller.ts:278-283`; `ml-service/app/{main.py,api/routes.py}` | **Privilegios excesivos de `Rol.ADMIN` sobre MLOps y ausencia de auth en FastAPI:** `ml.routes.ts` permite a `Rol.ADMIN` (administrador de una empresa privada) acceder a `GET /api/ml/metrics`, `POST /api/ml/train` y `POST /api/ml/upload-dataset`, y `uploadDataset` sobrescribe el archivo global `ml-service/data/raw/pairs.csv`. Además, `POST /api/ml/extract` carece de rate limit dedicado y **FastAPI (`ml-service`) no valida `ML_API_KEY`** pese a que `backend/src/config/env.ts:13` lo configura. | Cualquier administrador de empresa puede alterar el modelo global de ML para todos los demás tenants (envenenamiento de datos/modelo), o un proceso interno con acceso a `:8000` puede invocar FastAPI sin secreto. | Restringir `/api/ml/metrics`, `/api/ml/train` y `/api/ml/upload-dataset` exclusivamente a `Rol.SUPER_ADMIN`, aplicar límite de tasa específico a `/api/ml/extract` y exigir verificación por header `X-API-Key` en todos los endpoints de `ml-service`. |
| **SEG-06** | **MEDIA** | `applications.service.ts:158-160, 178-185, 365-451, 479-554`; `vacancies.service.ts:71-92, 158-172, 203-224`; `candidates.service.ts:66-103, 120-128`; `employees.service.ts:193-195, 326-351, 365-371` | **Fallbacks silenciosos a `mockStore` y puntajes `Math.random()`:** Ante cualquier error HTTP (incluidos `401/403/500`), varios servicios capturan el error y simulan éxito guardando en navegador o asignando `mlScore` aleatorio (72–96%). | Oculta fallos reales de red, permisos o persistencia haciendo creer al usuario que postuló, creó vacantes, actualizó estados o eliminó cuentas cuando nada se guardó en PostgreSQL. | Propagar los errores reales al sistema de notificaciones (`ToastContext`) y mostrar puntajes sintéticos únicamente si un modo demo explícito estuviera activado en desarrollo. |
| **SEG-07** | **MEDIA** | `backend/src/middlewares/upload.middleware.ts:55, 58, 89-90`; `backend/src/validators/candidate.validator.ts:4-33`; `frontend/src/services/cvParser.ts:34` | **Validación débil de archivos cargados, esquemas y lectura de CV:** En backend, `detectarTipo` acepta cualquier archivo ZIP (`50 4B 03 04`) como `.docx` y cualquier archivo sin bytes nulos `0x00` con extensión `.csv` como dataset válido; `updateCandidateProfileSchema` no usa `.strict()` ni límites `.max()` en arreglos/cadenas. En frontend, `cvParser.ts` lee binarios PDF/DOCX con `file.text()` sin usar `POST /api/ml/extract`. | Riesgo de carga de ZIP/CSV malformados, payloads sobredimensionados en perfil y extracción defectuosa de datos curriculares en el cliente. | Validar estructura interna OOXML (`word/document.xml`) y cabeceras CSV estrictas en backend, añadir `.strict()` y `.max()` en Zod, y conectar `cvParser.ts` / carga de documentos con `POST /api/ml/extract`. |
| **SEG-08** | **MEDIA** | `backend/src/services/auth.service.ts:62, 76`; `backend/src/routes/admin.routes.ts:64-65`; `backend/src/controllers/admin.controller.ts:103-106` | **Auto-verificación implícita de correo y ruta residual de invitaciones:** Cuando falta `SMTP_HOST`, los candidatos quedan verificados automáticamente sin requerimiento simétrico en empresas; `POST /api/admin/invitations` autoriza `Rol.SUPER_ADMIN` en middleware pero luego falla si `!user.empresaId`. | Cuentas de candidato activas sin validación real de propiedad del correo fuera de producción controlada, y endpoint inconsistente en administración. | Exigir `SMTP_HOST` en producción para todos los flujos o un flag explícito de entorno dev; alinear roles permitidos en `admin.routes.ts`. |
| **SEG-09** | **BAJA** | `frontend/package.json`; `src/pages/AdminDashboard/AdminDashboardPage.tsx`; `src/assets/*`; `public/*` | **Código y dependencias residuales sin uso activo:** Librería `docx ^9.13.0` instalada sin referencias en `src/`, pantalla legada `AdminDashboardPage.tsx` (910 líneas) desconectada de `App.tsx` e íconos/imágenes plantilla (`react.svg`, `vite.svg`, `hero.png`, `tech-stack.png`). | Incremento innecesario del tamaño del árbol de dependencias y riesgo de confusión durante mantenimientos o auditorías. | Desinstalar `docx` si no se generarán actas `.docx` en cliente, archivar o eliminar `AdminDashboardPage.tsx` y depurar activos no utilizados. |

### 10.2 Controles Positivos Verificados en Código

- **Cero inyección DOM peligrosa en Frontend:** búsqueda exhaustiva en `frontend/src/` confirmó **0 usos** de `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `eval()` y `window.open`.
- **Endurecimiento del Backend:** `helmet()`, `cors({ origin: env.FRONTEND_URL })`, limitación de tasa segmentada en `rate-limit.middleware.ts` (global 300/15min, auth 10/15min, recuperación 5/h, chat 30/min), invalidación de JWT tras `claveCambiadaEn`, `exigirCorreoVerificado`, filtro estricto multi-tenant por `empresaId` / `req.user.id` en `selection.controller.ts:140` ignorando `?email=`, y validación Google OAuth restringida a creación de `CANDIDATO`.

---

## 11. Usuarios Registrados Actualmente en la Base de Datos

Consulta ejecutada en vivo sobre la base de datos **PostgreSQL** conectada al backend (sin incluir contraseñas ni hashes por seguridad). Actualmente existen **1 empresa activa** y **8 usuarios registrados** (**0 reclutadores `RRHH`** registrados aún en la BD).

### 11.1 Empresa Activa en PostgreSQL

| Nombre | Estado | ID | RIF / Identificación | Sector | Correo Corporativo | Sitio Web | Creada | Aprobada |
|---|---|---|---|---|---|---|---|---|
| **Comercio1** | `ACTIVA` | `216a6d23-fc76-4e8c-aafb-0f879d35ede6` | `J-12345678-9` | Comercio y Servicios | `kayros360g@gmail.com` | `https://google.com` | `2026-11-10T09:47:18.836Z` | `2026-11-10T16:37:59.684Z` |

### 11.2 Tabla de Usuarios Registrados (PostgreSQL en Vivo — 8 Usuarios)

| # | Nombre Completo | Correo Electrónico | Rol BD (`Frontend`) | Empresa Afiliada | Activo / Verificado | Último Acceso (UTC) | Función Principal en la Plataforma |
|---|---|---|---|---|---|---|---|
| 1 | **Super Admin** | `superadmin@plataforma.test` | `SUPER_ADMIN` (`superadmin`) | Ecosistema Global (`null`) | Sí / Sí | `2026-11-14T02:06:20.090Z` | Gobernanza global de la plataforma: aprueba, suspende, reactiva y registra empresas; supervisa el directorio global de usuarios; administra el panel MLOps (métricas, dataset y reentrenamiento) y auditoría. |
| 2 | **Kayros Empresa** | `kayros360g@gmail.com` | `ADMIN` (`admin`) | `Comercio1` (`ACTIVA`) | Sí / **No** | `2026-11-14T01:33:52.291Z` | Administrador corporativo de `Comercio1`: invita y supervisa reclutadores de RRHH, revisa candidatos contratados, consulta métricas locales de IA de su empresa y gestiona los datos corporativos. |
| 3 | **Carlos Higuera** | `ltpxsan@gmail.com` | `CANDIDATO` (`candidato`) | N/A (`null`) | Sí / Sí | `2026-11-14T09:34:21.830Z` | Candidato activo en portal (cuenta utilizada en pruebas recientes de expediente): postula a vacantes, consulta estado/etapas, factores XAI, notificaciones y perfil curricular. |
| 4 | **Willyrex** | `willyrex@gmail.com` | `CANDIDATO` (`candidato`) | N/A (`null`) | Sí / Sí | `2026-11-14T01:36:29.358Z` | Candidato: explora convocatorias, carga CV/cédula, realiza postulaciones y hace seguimiento de expediente. |
| 5 | **Santiago Higuera** | `santaigo_higuera7@hotmail.com` | `CANDIDATO` (`candidato`) | N/A (`null`) | Sí / Sí | `2026-11-10T19:00:39.823Z` | Candidato: explora vacantes, envía postulaciones y gestiona su historial curricular y notificaciones. |
| 6 | **Santiago Higuera** | `santiago_higuera7@hotmail.com` | `CANDIDATO` (`candidato`) | N/A (`null`) | Sí / Sí | *Nunca* | Candidato registrado con capacidades de postulación y consulta de estado. |
| 7 | **Carlos Montiel** | `carlos@gmail.com` | `CANDIDATO` (`candidato`) | N/A (`null`) | Sí / Sí | *Nunca* | Candidato registrado para exploración y postulación a convocatorias. |
| 8 | **kelvin medina** | `kelvinmedina@gmail.com` | `CANDIDATO` (`candidato`) | N/A (`null`) | Sí / Sí | *Nunca* | Candidato registrado para exploración y postulación a convocatorias. |

### 11.3 Nota sobre Cuentas Semilla / Mock Definidas en Código (No Activas en PostgreSQL)

No deben confundirse los usuarios reales listados arriba con las cuentas ficticias de demostración o limpieza definidas únicamente en el código fuente:
- **En `frontend/src/services/mockData.ts` y `AuthContext.tsx` (`switchRoleDemo`):** `superadmin@plataformaml.com`, `valeria.mendoza@correo.com`, `carlos.rrhh@nexo.com`, `sofia.admin@nexo.com`.
- **En `backend/prisma/seed.ts` (lista de limpieza / desarrollo):** `admin@technova.test`, `rrhh@technova.test`, `maria@candidato.test`, `admin@andina.test`, `admin@plataformaml.com`.
- **Estado actual de rol `RRHH`:** aunque la lógica y los paneles contemplan cuentas `RRHH`, **en este momento no hay ningún usuario con rol `RRHH` creado en PostgreSQL** (deben invitarse o registrarse desde el panel de `Kayros Empresa` para pruebas completas de selección y nómina en `HRDashboardPage`).
