# Product

<!-- impeccable:product-schema 1 -->

## Platform

web (`React 19 + TypeScript + Vite 8 + Tailwind CSS v4`)

## Users

- **Visitante (sin sesión):** explora el catálogo público de convocatorias activas, filtra por modalidad/empresa y puede iniciar sesión o solicitar registro como candidato o empresa.
- **Candidato (`candidato` ↔ `CANDIDATO`):** persona en búsqueda de empleo. Explora convocatorias, adjunta su CV (PDF/DOCX/DOC) y documento de identidad, envía postulaciones, da seguimiento a cada etapa y mantiene su perfil curricular.
- **Recursos Humanos de una empresa (`rrhh` ↔ `RRHH`):** reclutadores afiliados a una empresa (`empresaId`). Publican y administran vacantes activas/inactivas, inspeccionan el ranking de postulantes por afinidad ML y factores explicativos XAI, toman decisiones humanas (`Preseleccionado`, `Entrevista`, `Contratado`, `Descartado`), gestionan la plantilla de colaboradores y calculan liquidaciones laborales.
- **Administrador de empresa (`admin` / `administrador` ↔ `ADMIN`):** gestiona el equipo de RRHH de su propia organización, visualiza métricas locales de afinidad y postulaciones de su empresa, supervisa colaboradores contratados y administra los datos corporativos.
- **Superadministrador de la plataforma (`superadmin` ↔ `SUPER_ADMIN`):** gobierna de forma global las empresas (aprobación, rechazo, suspensión, activación y alta administrativa), supervisa el directorio unificado de usuarios, consulta la trazabilidad operativa y administra el panel MLOps (métricas del clasificador, reentrenamiento y carga de datasets). *(Nota de auditoría: aunque conceptualmente este rol es el único autorizado para MLOps y datasets, el backend actual también permite temporalmente `Rol.ADMIN` en `/api/ml/metrics`, `/api/ml/train` y `/api/ml/upload-dataset`; ver sección de Seguridad en `README.md`.)*

Audiencia de evaluación inmediata: un jurado académico que la verá en una demostración. Después de la aprobación del jurado, la plataforma está pensada para lanzarse a empresas y reclutadores reales, así que debe verse lista para uso profesional, no como un prototipo.

## Product Purpose

Plataforma web multiempresa de reclutamiento y selección de personal con aprendizaje automático (**PlataformaML**). Cada empresa publica sus vacantes; los candidatos se postulan con su CV; un microservicio de Machine Learning calcula la afinidad entre el texto de la vacante y el del candidato y ordena a los postulantes. La decisión final siempre la toma una persona de RRHH.

Éxito del producto: que un reclutador encuentre rápido a los candidatos más afines con justificación auditable y que el candidato entienda en todo momento en qué estado se encuentra su postulación.

## Positioning

El ordenamiento de postulantes se basa únicamente en competencias, experiencia y afinidad técnica sin atributos demográficos sensibles, y cada puntaje se acompaña de sus factores explicativos (**XAI**). La IA recomienda; la persona decide.

- **Motor ML real en `ml-service` (FastAPI + scikit-learn):** preprocesamiento de texto en español, extracción de variables (similitud TF-IDF, cobertura de términos, coeficiente de Jaccard, términos compartidos, longitud del perfil y años de experiencia requeridos vs. declarados) y selección automática por validación cruzada agrupada por vacante entre **Regresión Logística**, **Random Forest** y **Red Neuronal (MLP)**. Según `ml-service/data/processed/metrics.json`, el modelo seleccionado vigente es `regresion_logistica` (con **88.5%** exactitud, **77.6%** F1 y **92.9%** ROC-AUC sobre `n_pairs = 360`; `264` entrenamiento / `96` prueba), aunque `backend/prisma/seed.ts` y `frontend/src/services/mockData.ts` conservan referencias heredadas a `RandomForest`.

## Operating Context

- Interfaz en español. Contexto regional del Caribe y Venezuela: montos de nómina y liquidación expresados en `RD$`, cálculos de prestaciones de referencia del Código de Trabajo dominicano (`÷ 23.83`) y ubicaciones/identificaciones corporativas como RIF (`J-...`) y República Dominicana.
- **Puertos de ejecución locales:** Frontend en `:5173` (Vite), Backend REST en `:4000` (`/api`) y Microservicio ML en `:8000` (`/predict`, `/rank`, `/extract`, `/metrics`, `/train`, `/health`).
- **Flujo del candidato:** catálogo público de convocatorias (`vacancies`) → acceso único o registro inline (`login`) → postulación con CV (`apply`) → confirmación (`apply-success`) → seguimiento de expediente, donut de distribución, perfil curricular y notificaciones (`candidate-dashboard`).
- **Flujo de RRHH:** convocatorias activas/inactivas (`hr-dashboard`, pestaña *Convocatorias & Ranking IA*) → ranking por vacante → expediente del postulante y explicabilidad XAI → decisión y contratación oficial (`HireCandidateModal`) → *Plantilla & Nómina* con línea temporal histórica (`Más Pasado` a la izquierda → `Tiempo Actual (Hoy)` a la derecha) → desvinculación y cuadre de liquidación.
- **Flujo corporativo y gobernanza:** panel de empresa (`company-admin-dashboard`) para `admin`/`administrador` y consola global (`global-admin-dashboard`) para `superadmin`. En la base de datos PostgreSQL activa operan actualmente **8 usuarios** registrados (`1 SUPER_ADMIN`, `1 ADMIN` de la empresa activa `Comercio1`, y `6 CANDIDATO`).
- **Multiempresa (multi-tenant):** cada usuario de `RRHH` y `ADMIN` opera aislado sobre su `empresaId`, regla que aplica estrictamente el Backend mediante token JWT y consulta en PostgreSQL.

## Capabilities and Constraints

- **Stack existente en `frontend/`:** React `^19.3.1`, TypeScript `~6.0.3`, Vite `^8.3.4`, Tailwind CSS `^4.3.3` (`@tailwindcss/vite`), `lucide-react` `^1.61.0`, `canvas-confetti` `^1.9.4`, `clsx` `^2.1.1`, `tailwind-merge` `^3.7.0`, y `oxlint` `^1.88.0`. La librería `docx` (`^9.13.0`) figura declarada en `package.json` pero sin importaciones activas en `src/`.
- **Enrutamiento actual:** navegación por estado `currentView` en `src/App.tsx` con **9 identificadores de vista** (`vacancies`, `login`, `apply`, `apply-success`, `candidate-dashboard`, `hr-dashboard`, `global-admin-dashboard`, `admin-dashboard`, `company-admin-dashboard`) que renderizan **8 pantallas activas** (`VacanciesCatalogPage`, `LoginPage`, `PublicApplicationPage`, `SuccessRegistrationPage`, `CandidateDashboardPage`, `HRDashboardPage`, `CompanyAdminDashboardPage` y `GlobalAdminDashboardPage`), más `AdminDashboardPage.tsx` conservado como componente legado no enrutado (`9` archivos en `src/pages/`) y una especificación proyectada de 53 rutas URL en `FRONTEND_ESPECIFICACION.md`.
- **Evolución visual reciente (`build 50` → `build 60` + ajustes recientes):**
  - Sistema visual dual en modo claro (Alabastro `#F1F2EC` / Manila `#EFE5D4`) y modo oscuro (Obsidiana `#090A0C` / Lima `#C8FF45` / Cobalto `#4C6FFF`) con conmutador en `ThemeContext`.
  - Fondo ambiental vectorial animado (`AmbientBackground`), tarjetas glassmórficas con inclinación 3D sutil (`TiltGlassCard`), carrusel hero en catálogo y carpetas manila con profundidad 3D y desplazamiento automático coordinado (`useFolderAutoScroll`).
  - Rediseño del `LoginPage` con contenedor dividido diagonal animado e integración inline del registro de candidato/empresa y recuperación de clave sin modales emergentes.
  - Rediseño del encabezado y tarjeta de perfil en `CandidateDashboardPage` (cabecera diagonal en paleta corporativa + conteo de postulaciones totales, en proceso y afinidad IA promedio junto al gráfico circular).
  - Corrección de orientación en la línea temporal estadística de `HRDashboardPage` (`Más Pasado` a la izquierda y `Tiempo Actual (Hoy)` a la derecha).
- **Estados oficiales del dominio:**
  - **Postulación (`ApplicationStatus` / `EstadoPostulacion`):** `Recibida` (`RECIBIDA`), `En revisión` (`EN_REVISION`), `Preseleccionado` (`PRESELECCIONADA`), `Entrevista` (`ENTREVISTA`), `Contratado` (`CONTRATADA`), `Descartado` (`RECHAZADA`).
  - **Empresa (`EstadoEmpresa`):** `PENDIENTE_APROBACION`, `ACTIVA`, `SUSPENDIDA`, `RECHAZADA`.
  - **Vacante (`Vacancy['status']` / `EstadoVacante`):** `Abierta` (`ABIERTA`), `Pausada` (`PAUSADA`), `Cerrada` (`CERRADA`) y `BORRADOR` (solo esquema/backend).
  - **Colaborador (`Employee['status']`):** `Activo`, `Despedido`.
  - **Notificación (`NotificationItem['status']` / `EstadoNotificacion`):** en frontend `Enviado`, `Entregado`, `Leído`; en backend Prisma `PENDIENTE`, `PROCESANDO`, `ENVIADA`, `ENTREGADA`, `LEIDA`, `FALLIDA`.
- **Restricciones y brechas detectadas:**
  - La extracción estructurada de CV en frontend (`src/services/cvParser.ts`) opera de forma heurística en cliente mediante `file.text()` y expresiones regulares sin invocar aún `POST /api/ml/extract`, lo cual limita la lectura real de PDFs/DOCX binarios desde navegador.
  - El análisis de código e integración identificó hallazgos de seguridad e inconsistencias de contrato HTTP relevantes (almacenamiento de credenciales en texto plano y fallbacks locales en `localStorage`, promoción de rol en cliente por subcadena `"superadmin"`, discrepancias de rutas/métodos en `chat.service.ts`, `company.service.ts` y `admin.service.ts`, ausencia de verificación de `ML_API_KEY` en `ml-service` y permisos excesivos de `Rol.ADMIN` sobre rutas `/api/ml/*` en backend). El detalle técnico completo, matriz de peticiones, usuarios activos, trazabilidad y plan de remediación viven en [`README.md`](./README.md).

## Brand Commitments

- Nombre visible de la plataforma: **PlataformaML**.
- Se conserva la metáfora de **expedientes en carpetas** (estilo carpeta manila con relieve 3D) en el portal del candidato, modales documentales y catálogo de convocatorias.
- Tono: profesional, sobrio, humano; sin aspecto de plantilla genérica (ver reglas en [`FRONTEND_ESPECIFICACION.md`](./FRONTEND_ESPECIFICACION.md) y [`DESIGN.md`](./DESIGN.md)).

## Evidence on Hand

- Datos reales provienen de la API Backend (`src/services/*.ts` vía `api.ts` hacia `/api`) y PostgreSQL, con `VITE_USE_MOCK=false` configurado por defecto.
- No hay testimonios, logos de clientes ni casos de éxito comerciales inventados.
- Las métricas del modelo de ML provienen de `/api/ml/metrics` (`ml-service/data/processed/metrics.json`); cuando el backend no responde, ciertos servicios aplican respaldos locales en `localStorage` (`mockData.ts`), comportamiento documentado como brecha de integridad y seguridad a corregir en [`README.md`](./README.md).
- Activos existentes en `src/assets/` (`brand/logo.png`, `hero.png`, `tech-stack.png`, `react.svg`, `vite.svg`) y `public/` (`logo.png`, `favicon.svg`, `icons.svg`, `login-bg.png`, `images/hero-slide-{1..3}.jpg`, `images/login-workspace.jpg`).

## Product Principles

1. La persona decide, la IA recomienda: la interfaz nunca presenta un puntaje como veredicto.
2. Transparencia: todo puntaje de afinidad debe poder explicarse con sus factores.
3. Cada rol ve solo lo que le corresponde; la separación entre empresas debe ser verificada siempre en el servidor, nunca únicamente en el navegador.
4. El estado de una postulación siempre es legible para el candidato y queda trazado en historial.
5. Credibilidad ante un jurado y ante empresas reales: cero simulación silenciosa de operaciones críticas y cero credenciales expuestas en el cliente.
