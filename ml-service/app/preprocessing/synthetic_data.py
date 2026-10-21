"""Genera un conjunto SIMULADO de pares vacante-candidato con etiqueta (1 = apto, 0 = no apto).

Los datos son inventados con reglas (no provienen de personas reales). Sirven para entrenar y
probar el flujo completo; con datos reales de decisiones de analistas el desempeño será distinto.

Uso:  python -m app.preprocessing.synthetic_data
"""
import csv
import random

from app.config import DATA_RAW, RANDOM_STATE

FAMILIES = {
    "backend": {"roles": ["desarrollador backend", "programador backend", "ingeniero de software backend"],
                "skills": ["Node.js", "Express", "PostgreSQL", "MySQL", "APIs REST", "Git", "Docker", "Python", "FastAPI", "MongoDB", "TypeScript", "pruebas unitarias"]},
    "frontend": {"roles": ["desarrollador frontend", "programador web", "desarrollador de interfaces"],
                 "skills": ["React", "HTML", "CSS", "JavaScript", "TypeScript", "Tailwind", "Figma", "Git", "Vite", "accesibilidad web", "pruebas de componentes", "consumo de APIs"]},
    "datos": {"roles": ["analista de datos", "científico de datos junior", "analista de información"],
              "skills": ["Python", "pandas", "SQL", "Power BI", "Excel avanzado", "estadística", "visualización de datos", "scikit-learn", "limpieza de datos", "dashboards", "Tableau", "reportes gerenciales"]},
    "contable": {"roles": ["contador", "analista contable", "asistente contable"],
                 "skills": ["contabilidad general", "declaración de impuestos", "conciliaciones bancarias", "nómina", "facturación", "cuentas por pagar", "cuentas por cobrar", "estados financieros", "auditoría", "libros contables", "presupuestos", "Excel"]},
    "diseno": {"roles": ["diseñador gráfico", "diseñador visual", "creativo publicitario"],
               "skills": ["Photoshop", "Illustrator", "Figma", "branding", "identidad visual", "tipografía", "diagramación", "material publicitario", "redes sociales", "InDesign", "ilustración digital", "fotografía"]},
    "enfermeria": {"roles": ["enfermera", "licenciada en enfermería", "técnico en enfermería"],
                   "skills": ["cuidados intensivos", "atención al paciente", "administración de medicamentos", "signos vitales", "primeros auxilios", "curaciones", "emergencias", "control de infecciones", "historias clínicas", "triaje", "toma de muestras", "educación al paciente"]},
    "docencia": {"roles": ["docente", "profesor", "maestro de educación media"],
                 "skills": ["planificación de clases", "evaluación del aprendizaje", "manejo de grupos", "matemáticas", "recursos didácticos", "educación virtual", "tutorías", "elaboración de guías", "pedagogía", "comunicación con representantes", "material didáctico", "adaptación curricular"]},
    "soporte": {"roles": ["técnico de soporte", "analista de soporte técnico", "administrador de redes"],
                "skills": ["redes LAN", "soporte a usuarios", "mantenimiento de equipos", "Windows Server", "Linux", "configuración de routers", "seguridad informática", "help desk", "cableado estructurado", "virtualización", "respaldos", "diagnóstico de fallas"]},
    "administrativo": {"roles": ["asistente administrativo", "auxiliar administrativo", "secretaria ejecutiva"],
                       "skills": ["atención al cliente", "archivo", "redacción de correspondencia", "Excel", "agenda", "manejo de caja", "inventario", "facturación", "organización de documentos", "Word", "coordinación de reuniones", "control de asistencia"]},
}
GENERIC = ["trabajo en equipo", "comunicación efectiva", "organización del tiempo"]
EXTRAS = ["", "", "Con capacidad de trabajo en equipo.", "Comprometido y con ganas de aprender.", "Disponibilidad inmediata.", "Participó en proyectos universitarios."]
NOISE = 0.05  # probabilidad de invertir una etiqueta (simula desacuerdo entre evaluadores)


def _join(items):
    return items[0] if len(items) == 1 else ", ".join(items[:-1]) + " y " + items[-1]


def _vacancy(rng, fam):
    role = rng.choice(FAMILIES[fam]["roles"])
    req = rng.sample(FAMILIES[fam]["skills"], 4)
    years = rng.choice([0, 1, 2, 3, 5])
    intro = rng.choice(["Se busca", "Se requiere", "Se necesita", "Buscamos"])
    exp = f"mínimo {years} años de experiencia en" if years else "experiencia en"
    return f"{intro} {role} con {exp} {_join(req)}.", req, years


def _candidate(rng, fam, req, n_req=None, other=None):
    """n_req: cuántos requisitos de la vacante cumple (misma familia). other: familia distinta."""
    if other:
        pool = rng.sample(FAMILIES[other]["skills"], rng.randint(3, 5)) + rng.sample(GENERIC, rng.randint(0, 2))
        role = rng.choice(FAMILIES[other]["roles"])
    else:
        chosen = rng.sample(req, n_req)
        rest = [s for s in FAMILIES[fam]["skills"] if s not in req]
        pool = chosen + rng.sample(rest, rng.randint(1, 3))
        role = rng.choice(FAMILIES[fam]["roles"])
    rng.shuffle(pool)
    years = rng.choice([0, 1, 2, 3, 4, 6, 8, 10])
    base = f"{role.capitalize()} con {years} años de experiencia en {_join(pool)}." if years else \
        f"{role.capitalize()} recién egresado con conocimientos en {_join(pool)}."
    return f"{base} {rng.choice(EXTRAS)}".strip(), years


def generate(path=DATA_RAW, vacancies_per_family=5, seed=RANDOM_STATE) -> int:
    rng = random.Random(seed)
    rows, vid = [], 0
    for fam in FAMILIES:
        for _ in range(vacancies_per_family):
            vid += 1
            vtext, req, req_years = _vacancy(rng, fam)
            specs = [("same", n) for n in rng.choices([4, 3, 2, 1, 0], weights=[3, 3, 2, 2, 1], k=6)]
            others = rng.sample([f for f in FAMILIES if f != fam], 2)
            specs += [("other", o) for o in others]
            for kind, val in specs:
                if kind == "same":
                    ctext, years = _candidate(rng, fam, req, n_req=val)
                    label = int(val >= 3 and years >= req_years)
                else:
                    ctext, years = _candidate(rng, fam, req, other=val)
                    label = 0
                if rng.random() < NOISE:
                    label = 1 - label
                rows.append([vid, vtext, ctext, label])
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["vacancy_id", "vacancy_text", "candidate_text", "label"])
        w.writerows(rows)
    return len(rows)


if __name__ == "__main__":
    print(f"{generate()} pares simulados escritos en {DATA_RAW}")
