"""Genera un conjunto SIMULADO de pares vacante-candidato con etiqueta (1 = apto, 0 = no apto).

Los datos son inventados con reglas (no provienen de personas reales). Sirven para entrenar y
probar el flujo completo; con datos reales de decisiones de analistas el desempeño será distinto.

Qué varía (para que el modelo no dependa de un formato único):
  - 19 rubros distintos (tecnología, salud, contabilidad, derecho, construcción, educación, ventas, oficios...).
  - Hojas de vida CORTAS (1 frase), MEDIAS y LARGAS (60 a 110 palabras con relleno: estudios, cualidades, hobbies...).
    El largo del texto es independiente de la etiqueta: hay CV largos aptos y no aptos.
  - Años de experiencia escritos como "4 años", "cuatro años", "4+ años", "más de 4 años", o sin años (15 %).
  - Vacantes con distintos formatos, nombre de empresa, funciones y requisitos "deseables".
  - Habilidades escritas con variantes ("Postgres", "Node", "UCI"...), tomadas del diccionario de sinónimos.
  - Candidatos de otro rubro y de rubros vecinos (médico/enfermera, diseño/marketing...).

Regla de la etiqueta: apto si cumple al menos el 75 % de los requisitos de la vacante y la experiencia mínima
(si el candidato no dice cuántos años tiene, se le da el beneficio de la duda), más un 4 % de etiquetas invertidas.

Uso:  python -m app.preprocessing.synthetic_data
"""
import csv
import random

from app.config import DATA_RAW, RANDOM_STATE
from app.preprocessing.preprocess import prepare_text
from app.preprocessing.synonyms import SYNONYMS

FAMILIES = {
    "backend": {"roles": ["desarrollador backend", "programador backend", "ingeniero de software backend"],
                "orgs": ["La empresa de software Nexo", "Una startup de comercio electrónico"],
                "skills": ["Node.js", "Express", "PostgreSQL", "MySQL", "APIs REST", "Git", "Docker", "Python", "FastAPI", "MongoDB", "TypeScript", "pruebas unitarias"]},
    "frontend": {"roles": ["desarrollador frontend", "programador web", "desarrollador de interfaces"],
                 "orgs": ["La agencia digital Pixel", "Una empresa de tecnología financiera"],
                 "skills": ["React", "HTML", "CSS", "JavaScript", "TypeScript", "Tailwind", "Figma", "Git", "Vite", "accesibilidad web", "pruebas de componentes", "consumo de APIs"]},
    "datos": {"roles": ["analista de datos", "científico de datos junior", "analista de información"],
              "orgs": ["Una empresa de consultoría", "El área de inteligencia de negocios de un banco"],
              "skills": ["Python", "pandas", "SQL", "Power BI", "Excel avanzado", "estadística", "visualización de datos", "scikit-learn", "limpieza de datos", "dashboards", "Tableau", "reportes gerenciales"]},
    "contable": {"roles": ["contador", "analista contable", "asistente contable"],
                 "orgs": ["La firma contable Rivas", "Una empresa distribuidora"],
                 "skills": ["contabilidad general", "declaración de impuestos", "conciliaciones bancarias", "nómina", "facturación", "cuentas por pagar", "cuentas por cobrar", "estados financieros", "auditoría", "libros contables", "presupuestos", "Excel"]},
    "diseno": {"roles": ["diseñador gráfico", "diseñador visual", "creativo publicitario"],
               "orgs": ["La agencia de publicidad Creativa", "Una imprenta digital"],
               "skills": ["Photoshop", "Illustrator", "Figma", "branding", "identidad visual", "tipografía", "diagramación", "material publicitario", "redes sociales", "InDesign", "ilustración digital", "fotografía"]},
    "enfermeria": {"roles": ["enfermera", "licenciada en enfermería", "técnico en enfermería"],
                   "orgs": ["La Clínica Santa Lucía", "El Hospital San Rafael"],
                   "skills": ["cuidados intensivos", "atención al paciente", "administración de medicamentos", "signos vitales", "primeros auxilios", "curaciones", "emergencias", "control de infecciones", "historias clínicas", "triaje", "toma de muestras", "educación al paciente"]},
    "medicina": {"roles": ["médico general", "médico cirujano", "doctor en medicina"],
                 "orgs": ["La Clínica Santa Lucía", "El Centro de Salud Norte"],
                 "skills": ["consulta externa", "urgencias", "historias clínicas", "diagnóstico clínico", "prescripción de medicamentos", "RCP", "atención al paciente", "medicina preventiva", "vacunación", "control de pacientes crónicos", "interconsultas", "cirugía menor"]},
    "docencia": {"roles": ["docente", "profesor", "maestro de educación media"],
                 "orgs": ["El Colegio Nuevo Horizonte", "La Unidad Educativa San José"],
                 "skills": ["planificación de clases", "evaluación del aprendizaje", "manejo de grupos", "matemáticas", "recursos didácticos", "educación virtual", "tutorías", "elaboración de guías", "pedagogía", "comunicación con representantes", "material didáctico", "adaptación curricular"]},
    "derecho": {"roles": ["abogado", "abogada", "asesor legal"],
                "orgs": ["El bufete Pérez y Asociados", "La firma legal Andina"],
                "skills": ["derecho laboral", "derecho civil", "redacción de contratos", "litigio", "audiencias", "derecho mercantil", "asesoría legal", "trámites notariales", "derecho de familia", "cumplimiento normativo", "revisión de documentos legales", "conciliación"]},
    "construccion": {"roles": ["ingeniero civil", "ingeniera civil", "arquitecto residente de obra"],
                     "orgs": ["La constructora Andina", "Una empresa de obras viales"],
                     "skills": ["supervisión de obra", "presupuestos", "AutoCAD", "control de contratistas", "planos estructurales", "cómputos métricos", "seguridad industrial", "cronogramas de obra", "topografía", "Revit", "control de calidad de materiales", "liquidación de obra"]},
    "ventas": {"roles": ["vendedor", "asesor comercial", "ejecutivo de ventas"],
               "orgs": ["La tienda Central", "Distribuciones del Valle"],
               "skills": ["ventas", "atención al cliente", "negociación", "prospección de clientes", "cierre de ventas", "CRM", "seguimiento de clientes", "cumplimiento de metas", "ventas retail", "cotizaciones", "manejo de objeciones", "exhibición de productos"]},
    "logistica": {"roles": ["auxiliar de logística", "almacenista", "coordinador de bodega"],
                  "orgs": ["Logística Rápida", "La distribuidora Norte"],
                  "skills": ["inventario", "almacén", "montacargas", "despacho de mercancía", "recepción de mercancía", "picking", "control de stock", "rutas de distribución", "manejo de kardex", "embalaje", "inventarios cíclicos", "documentación de transporte"]},
    "marketing": {"roles": ["community manager", "analista de marketing digital", "especialista en marketing"],
                  "orgs": ["La agencia Pixel", "Marketing Plus"],
                  "skills": ["redes sociales", "SEO", "Google Ads", "campañas digitales", "email marketing", "analítica web", "creación de contenido", "Meta Ads", "copywriting", "estrategia de marca", "reportes de campañas", "Canva"]},
    "mecanica": {"roles": ["mecánico automotriz", "técnico mecánico", "jefe de taller"],
                 "orgs": ["El taller AutoPlus", "Servicio Automotriz del Sur"],
                 "skills": ["mecánica automotriz", "diagnóstico de fallas", "frenos y suspensión", "afinación de motores", "sistemas eléctricos del vehículo", "escáner automotriz", "cambio de aceite", "alineación y balanceo", "reparación de transmisiones", "mantenimiento preventivo", "soldadura", "lectura de manuales técnicos"]},
    "electricidad": {"roles": ["electricista", "técnico electricista", "instalador eléctrico"],
                     "orgs": ["Instalaciones Eléctricas Ruiz", "Una empresa de mantenimiento industrial"],
                     "skills": ["instalaciones eléctricas", "tableros eléctricos", "cableado", "mantenimiento preventivo", "lectura de planos eléctricos", "motores eléctricos", "iluminación", "puesta a tierra", "medición con multímetro", "normas de seguridad eléctrica", "automatización básica", "soldadura"]},
    "gastronomia": {"roles": ["cocinero", "chef de cocina", "ayudante de cocina"],
                    "orgs": ["El restaurante La Terraza", "El Hotel Plaza"],
                    "skills": ["cocina profesional", "manejo de alimentos", "inventario de cocina", "cocina internacional", "repostería", "control de costos de cocina", "preparación de menús", "higiene y manipulación", "cocina caliente", "parrilla", "atención de pedidos", "limpieza de cocina"]},
    "rrhh": {"roles": ["analista de recursos humanos", "asistente de talento humano", "reclutador"],
             "orgs": ["Una empresa de servicios", "El área de talento humano de una fábrica"],
             "skills": ["reclutamiento y selección", "entrevistas por competencias", "nómina", "contratación de personal", "capacitación", "clima laboral", "inducción de personal", "evaluación de desempeño", "legislación laboral", "bienestar laboral", "reportes de personal", "bases de datos de candidatos"]},
    "administrativo": {"roles": ["asistente administrativo", "auxiliar administrativo", "secretaria ejecutiva"],
                       "orgs": ["Una empresa de servicios", "La oficina central de una cadena de tiendas"],
                       "skills": ["atención al cliente", "archivo", "redacción de correspondencia", "Excel", "agenda", "manejo de caja", "inventario", "facturación", "organización de documentos", "Word", "coordinación de reuniones", "control de asistencia"]},
}
# rubros que comparten vocabulario o clientes: sirven de "casi iguales pero de otro oficio"
NEIGHBORS = {
    "medicina": ["enfermeria"], "enfermeria": ["medicina"], "backend": ["frontend", "datos"], "frontend": ["backend", "diseno"],
    "datos": ["backend", "contable"], "contable": ["administrativo", "rrhh"], "administrativo": ["contable", "ventas", "logistica"],
    "diseno": ["marketing", "frontend"], "marketing": ["diseno", "ventas"], "ventas": ["marketing", "administrativo"],
    "logistica": ["administrativo", "ventas"], "mecanica": ["electricidad"], "electricidad": ["mecanica", "construccion"],
    "construccion": ["electricidad"], "docencia": ["rrhh"], "rrhh": ["docencia", "administrativo"],
    "derecho": ["rrhh", "administrativo"], "gastronomia": ["logistica"],
}
GENERIC = ["trabajo en equipo", "comunicación efectiva", "organización del tiempo"]

CV_FILLERS = [
    "Soy responsable, puntual y organizado.", "Me gusta aprender cosas nuevas y trabajar en equipo.",
    "Tengo disponibilidad inmediata.", "Cuento con buenas referencias de mis trabajos anteriores.",
    "En mi tiempo libre me gusta leer, hacer deporte y cocinar.", "Tengo nivel intermedio de inglés.",
    "He participado en cursos y talleres de actualización profesional.", "Busco crecer profesionalmente en una empresa estable.",
    "Resido en la ciudad y cuento con transporte propio.", "Puedo presentar certificados y cartas de recomendación.",
    "Tengo licencia de conducir al día.", "Estoy abierto a trabajar en horarios rotativos.",
    "Comprometido y con ganas de aprender.", "Participé en proyectos universitarios y de voluntariado.",
    "Tengo disponibilidad para viajar.", "Me considero una persona proactiva y con buena actitud.",
]
CV_SHORT_EXTRAS = ["", "", "", "Con capacidad de trabajo en equipo.", "Comprometido y con ganas de aprender.", "Disponibilidad inmediata."]
VAC_FILLERS = [
    "Ofrecemos buen ambiente laboral y estabilidad.", "Horario de lunes a viernes.", "Contrato a término indefinido.",
    "Se valora la puntualidad y el compromiso.", "Enviar hoja de vida al correo de la empresa.",
    "Incorporación inmediata.", "Salario acorde a la experiencia y beneficios de ley.", "Capacitación inicial a cargo de la empresa.",
]
DUTIES = ["Funciones: apoyar al equipo, elaborar reportes semanales y coordinar con otras áreas.",
          "Funciones: cumplir las tareas asignadas por la jefatura y mantener informado al equipo.",
          "Responsabilidades: organizar su trabajo diario, cumplir plazos y respetar las normas internas."]
NOISE = 0.04  # probabilidad de invertir una etiqueta (simula desacuerdo entre evaluadores)
UNKNOWN_YEARS = 0.15  # fracción de candidatos que no escribe cuántos años de experiencia tiene

_NUM = {1: "un", 2: "dos", 3: "tres", 4: "cuatro", 5: "cinco", 6: "seis", 8: "ocho", 10: "diez", 12: "doce", 15: "quince"}
_VARIANTS = {prepare_text(k): [k, *v] for k, v in SYNONYMS.items()}


def _join(items):
    return items[0] if len(items) == 1 else ", ".join(items[:-1]) + " y " + items[-1]


def _surface(rng, text, p):
    """Con probabilidad p escribe la habilidad con una variante (p. ej. 'PostgreSQL' -> 'Postgres')."""
    variants = _VARIANTS.get(prepare_text(text))
    return rng.choice(variants) if variants and rng.random() < p else text


def _years_word(n):
    return _NUM.get(n, str(n))


def _years_unit(n):
    return "año" if n == 1 else "años"


def _vac_exp(rng, years):
    if not years:
        return rng.choice(["experiencia", "experiencia previa", "conocimientos"])
    u = _years_unit(years)
    return rng.choice([f"mínimo {years} {u} de experiencia", f"{years}+ {u} de experiencia", f"más de {years} {u} de experiencia",
                       f"{_years_word(years)} {u} de experiencia", f"al menos {years} {u} de experiencia",
                       f"experiencia mínima de {years} {u}", f"de {years} a {years + 2} años de experiencia"])


def _vacancy(rng, fam):
    f = FAMILIES[fam]
    role = _surface(rng, rng.choice(f["roles"]), 0.1)
    n_req = rng.choice([3, 4, 4, 5])
    req = rng.sample(f["skills"], n_req)
    desirable = rng.sample([s for s in f["skills"] if s not in req], rng.choice([0, 0, 1, 2]))
    years = rng.choice([0, 1, 2, 2, 3, 3, 5, 5, 8])
    exp = _vac_exp(rng, years)
    shown = [_surface(rng, s, 0.15) for s in req]
    org = rng.choice(f["orgs"])
    des = f" Deseable {_join([_surface(rng, s, 0.15) for s in desirable])}." if desirable else ""
    style = rng.choice(["corta", "corta", "empresa", "ficha", "larga"])
    if style == "corta":
        text = f"{rng.choice(['Se busca', 'Se requiere', 'Se necesita', 'Buscamos'])} {role} con {exp} en {_join(shown)}.{des}"
    elif style == "empresa":
        text = f"{org} busca {role}. Requisitos: {exp} en {_join(shown)}.{des} {rng.choice(VAC_FILLERS)}"
    elif style == "ficha":
        text = f"Vacante: {role}. Se requiere {exp} y manejo de {_join(shown)}.{des} {rng.choice(VAC_FILLERS)}"
    else:
        text = (f"{org} busca {role}. {rng.choice(DUTIES)} Requisitos: {exp} en {_join(shown)}.{des} "
                f"{' '.join(rng.sample(VAC_FILLERS, 2))}")
    return text, req, years


def _cand_years_phrase(rng, years):
    u = _years_unit(years)
    return rng.choice([f"{years} {u} de experiencia", f"{years} {u} de experiencia", f"{years}+ {u} de experiencia",
                       f"{_years_word(years)} {u} de experiencia", f"más de {years} {u} de experiencia", f"{years} {u} trabajando"])


def _candidate(rng, fam, req, n_req=None, other=None):
    """n_req: cuántos requisitos de la vacante cumple (misma familia). other: familia distinta.
    Devuelve (texto, años declarados o None si no los escribe, cantidad de requisitos cumplidos)."""
    if other:
        for _ in range(8):  # que de casualidad no cumpla casi todos los requisitos de la vacante
            pool = rng.sample(FAMILIES[other]["skills"], rng.randint(3, 6))
            if sum(prepare_text(s) in {prepare_text(r) for r in req} for s in pool) < 0.75 * len(req):
                break
        pool += rng.sample(GENERIC, rng.randint(0, 2))
        role_fam = other
        matched = len({prepare_text(s) for s in pool} & {prepare_text(r) for r in req})
    else:
        chosen = rng.sample(req, n_req)
        rest = [s for s in FAMILIES[fam]["skills"] if s not in req]
        pool = chosen + rng.sample(rest, rng.randint(1, 3))
        role_fam, matched = fam, n_req
    rng.shuffle(pool)
    role = _surface(rng, rng.choice(FAMILIES[role_fam]["roles"]), 0.1)
    skills = [_surface(rng, s, 0.35) for s in pool]

    r = rng.random()
    if r < UNKNOWN_YEARS:
        years = None
    else:
        years = rng.choice([0, 0, 1, 2, 2, 3, 3, 4, 5, 6, 8, 10, 12, 15])
    style = rng.choices(["corto", "medio", "largo"], weights=[45, 30, 25])[0]

    if years is None:
        yp = rng.choice(["con experiencia", "especializado", "con trayectoria"])
        years_sentence = ""
    elif years == 0:
        yp = rng.choice(["recién egresado", "sin experiencia laboral", "recién graduado"])
        years_sentence = rng.choice(["Estoy buscando mi primer empleo.", "Sin experiencia laboral previa."])
    else:
        yp = f"con {_cand_years_phrase(rng, years)}"
        years_sentence = f"Llevo {_years_word(years)} {_years_unit(years)} en el sector." if rng.random() < 0.3 else ""

    if style == "corto":
        text = f"{role.capitalize()} {yp} en {_join(skills)}. {rng.choice(CV_SHORT_EXTRAS)}"
    elif style == "medio":
        text = (f"{role.capitalize()} {yp}. Manejo {_join(skills)}. {years_sentence} {rng.choice(CV_FILLERS)} "
                f"{rng.choice(CV_SHORT_EXTRAS)}")
    else:
        sentences = [f"Soy {role} {yp}.", rng.choice(["Trabajo con", "Mi experiencia incluye", "Manejo con soltura", "Me especializo en"]) + f" {_join(skills)}.",
                     years_sentence]
        if rng.random() < 0.35:  # menciona algo de otro rubro sin que cambie su aptitud
            side = rng.choice([f for f in FAMILIES if f != fam and f != other]) if other is None else fam
            sentences.append(f"También tengo nociones de {_join(rng.sample(FAMILIES[side]['skills'], 2))}.")
        if rng.random() < 0.5:
            sentences.append(rng.choice(["Realicé cursos y talleres de actualización.", "Tengo estudios técnicos y universitarios en el área."]))
        fill = rng.sample(CV_FILLERS, rng.randint(3, 6))
        rng.shuffle(fill)
        text = " ".join([s for s in sentences if s] + fill)
    return " ".join(text.split()), years, matched


def generate(path=DATA_RAW, vacancies_per_family=10, seed=RANDOM_STATE) -> int:
    rng = random.Random(seed)
    rows, vid = [], 0
    for fam in FAMILIES:
        for _ in range(vacancies_per_family):
            vid += 1
            vtext, req, req_years = _vacancy(rng, fam)
            L = len(req)
            ks = list(range(L + 1))
            weights = [1 + 2 * (k >= 0.75 * L) + (k >= 0.5 * L) for k in ks]
            specs = [("same", k) for k in rng.choices(ks, weights=weights, k=7)]
            specs += [("other", rng.choice(NEIGHBORS.get(fam) or [f for f in FAMILIES if f != fam]))]
            specs += [("other", o) for o in rng.sample([f for f in FAMILIES if f != fam], 2)]
            for kind, val in specs:
                if kind == "same":
                    ctext, years, matched = _candidate(rng, fam, req, n_req=val)
                    exp_ok = years is None or years >= req_years
                    label = int(matched >= 0.75 * L and exp_ok)
                else:
                    ctext, years, matched = _candidate(rng, fam, req, other=val)
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
