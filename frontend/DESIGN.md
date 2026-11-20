# Sistema de Diseño Visual — PlataformaML

## 1. Dirección y Concepto ("El Acta de Calificaciones" / Expediente Institucional)
- **Referencia de Semilla:** `seed:84bfd359ab560804`
- **Tesis Visual:** PlataformaML combina la autoridad documental de un **expediente físico en carpeta manila** (`.neu-manila-surface`, pestañas superiores troqueladas y hojas interiores de papel bond `#FCFBF8`) con la precisión tabular de una **mesa de evaluación algorítmica auditable (XAI)**.
- **Anti-Patrones Eliminados:** Sin resplandores de neón (`0_0_14px_rgba(16,185,129,0.45)`), sin sombras de bloque caricaturescas de 4px (`0_4px_0_#9e5a07`), y sin neumáticos borrosos. Todos los bordes son arquitectónicos de `1px solid` con iluminación especular superior (`inset 0 1px 0`).

## 2. Tipografía y Jerarquía Numérica
- **UI & Encabezados (`--font-sans`):** `Public Sans` / `Instrument Sans` — geometría institucional clara para formularios, tablas y paneles de control.
- **Acentos Editoriales (`--font-serif`):** `Source Serif 4` — utilizado en dictámenes cualitativos de explicabilidad del modelo.
- **Datos Tabulares, Códigos y Puntajes (`--font-mono`):** `JetBrains Mono` con `font-variant-numeric: tabular-nums` obligatorio en porcentajes de afinidad (`0–100%`), identificadores (`EXP-`, `RIF`), fechas y montos de nómina/liquidación (`RD$`).

## 3. Paleta de Superficies y Semántica (Modo Claro y Oscuro)
### Modo Claro (Papel de Archivo y Kraft Manila)
- **Lienzo Base (`--surface-canvas`):** `#F6F5F0` (Alabastro cálido)
- **Hoja Interior Bond (`--surface-paper`):** `#FCFBF8` con borde `#DED7C8`
- **Carpeta Manila (`--surface-manila`):** `#EFE5D4` con pestaña `#E5D6BE` y borde `#C8B496`
- **Acento Institucional Primario:** `#0B5D46` (Esmeralda profundo de archivo)

### Modo Oscuro (Pizarra Obsidiana de Alta Legibilidad)
- **Lienzo Base (`--surface-canvas`):** `#0B0F17`
- **Hoja Interior (`--surface-paper`):** `#111622` con borde `#232D42`
- **Carpeta Manila Oscura (`--surface-manila`):** `#1E1914` con pestaña `#29211A` y borde `#46372B`
- **Acento Primario:** `#10B981`

## 4. Reglas de Navegación y Posicionamiento
- **Portal del Candidato (`CandidateDashboardPage`):** Navegación lateral izquierda con botón **Cerrar sesión** fijo en la parte inferior del viewport (`sticky bottom-0`) y sin duplicado en la barra superior.
- **Paneles con Barra Superior (`Navbar`, `HRDashboardPage`, `CompanyAdminDashboardPage`, `GlobalAdminDashboardPage`):** Botón **Cerrar sesión** ubicado siempre en el extremo derecho del encabezado superior.
