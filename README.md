# Plataforma web con algoritmos de aprendizaje automático para la optimización del proceso de reclutamiento y selección de personal

> **Universidad Dr. José Gregorio Hernández** — Facultad de Ingeniería — Análisis y Diseño de Sistemas
>
> Trimestre octubre–diciembre 2026

---

## Descripción

Plataforma web **multiempresa** que centraliza el proceso de reclutamiento y selección de personal y usa un algoritmo de **aprendizaje automático** (regresión logística) para filtrar y ordenar candidatos según su afinidad con cada vacante.

La plataforma es una herramienta de **apoyo a la decisión**: la lista ordenada es una sugerencia; la decisión final siempre es del personal de talento humano.

---

## Arquitectura

```
┌─────────────┐     HTTPS/JSON      ┌─────────────┐     HTTP/JSON      ┌─────────────┐
│  Frontend   │  ← ─ ─ ─ ─ ─ ─ →   │   Backend   │  ← ─ ─ ─ ─ ─ →   │ ML Service  │
│  (React)    │   :5173 → :4000     │  (Express)  │   :4000 → :8000   │  (FastAPI)  │
└─────────────┘                     └──────┬──────┘                     └─────────────┘
                                           │ Prisma
                                           ▼
                                    ┌─────────────┐
                                    │ PostgreSQL  │
                                    └─────────────┘
```

| Componente | Tecnología | Puerto |
|---|---|---|
| Frontend | React + TypeScript + Vite + Tailwind CSS | 5173 |
| Backend | Node.js + Express + TypeScript + Prisma | 4000 |
| ML Service | Python + FastAPI + scikit-learn + pandas | 8000 |
| Base de datos | PostgreSQL (Neon en producción) | 5432 |

---

## Estructura del monorepo

```
PlataformaML/
├── frontend/       → Interfaz de usuario
├── backend/        → API REST, lógica de negocio, base de datos
├── ml-service/     → Modelo de ML (entrenamiento + predicción)
├── docs/           → Documentación (UML, arquitectura, manuales)
└── (archivos raíz) → Configuración del monorepo
```

Más detalle en [`docs/ESTRUCTURA.md`](docs/ESTRUCTURA.md).

---

## Inicio rápido

### Requisitos

- **Node.js** ≥ 20 LTS
- **Python** ≥ 3.10
- **PostgreSQL** ≥ 15
- **Git** ≥ 2.40

### Backend

```bash
cd backend
npm install
# Copia y completa las variables de entorno:
copy .env.example .env
# Crea la base de datos y ejecuta migraciones:
npx prisma generate
npx prisma migrate dev
npx prisma db seed
# Levanta el servidor:
npm run dev
```

Guía completa en [`backend/README.md`](backend/README.md).

### Frontend

```bash
cd frontend
npm install
# Copia y completa las variables de entorno:
copy .env.example .env
npm run dev
```

### ML Service

```bash
cd ml-service
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
# Copia y completa las variables de entorno:
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

---

## Equipo

| Nombre | C.I. |
|---|---|
| Díaz Acosta María José | 34.105.779 |
| Higuera González Santiago | 32.699.066 |
| Ramírez Carvajal Emiliangely María | 32.577.915 |

**Tutor:** M.Sc. Luis Manuel Soto García (0009-0007-4842-3028)

---

## Licencia

Proyecto académico — uso educativo.
