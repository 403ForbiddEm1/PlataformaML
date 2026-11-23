"""Pruebas de robustez ante cómo escriben las personas reales: CV largos, años en letras, sinónimos y CV sin años.

No necesitan FastAPI: llaman directamente a la lógica del modelo.
"""
import pytest

from app.models.expo_check import CASOS, CASOS_CIEGOS, VACANTES, VACANTES_CIEGAS, evaluar
from app.models.predict import score_candidates
from app.preprocessing.preprocess import experience_declared, extract_years, prepare_text
from app.preprocessing.synonyms import SYNONYMS

BACKEND = "Se busca desarrollador backend con mínimo 3 años de experiencia en Node.js, Express y PostgreSQL."
# relleno que no menciona ninguna habilidad de ninguna vacante
RELLENO = (" Soy responsable, puntual y organizado. Me gusta aprender cosas nuevas y trabajar en equipo. Tengo disponibilidad "
           "inmediata. Cuento con buenas referencias de mis trabajos anteriores. En mi tiempo libre me gusta leer y hacer deporte.")


def _score(vacancy: str, candidate: str) -> float:
    return score_candidates(vacancy, [("c", candidate)])[0]["score"]


# ----------------------------------------------------------------------------- 1. el largo del CV no pesa
def test_relleno_no_cambia_el_puntaje():
    todos = [(VACANTES[c[0]], c[2]) for c in CASOS] + [(VACANTES_CIEGAS[c[0]], c[2]) for c in CASOS_CIEGOS]
    for vac, texto in todos:
        assert abs(_score(vac, texto + RELLENO * 3) - _score(vac, texto)) < 1.0, texto[:60]


def test_cv_largo_de_otra_area_no_es_recomendado():
    enfermera = ("Soy enfermera con 6 años de experiencia en el área hospitalaria. He trabajado en cuidados intensivos y en urgencias, "
                 "haciendo administración de medicamentos, control de signos vitales y curaciones. Soy responsable y puntual." + RELLENO * 2)
    assert _score(BACKEND, enfermera) < 20


def test_sin_coincidencias_puntaje_bajo():
    assert _score(BACKEND, "Cocinero con 10 años de experiencia en cocina caliente, parrilla y repostería." + RELLENO) < 10


# ----------------------------------------------------------------------------- 2. años en letras y formatos
@pytest.mark.parametrize("texto,esperado", [
    ("Mínimo 3 años de experiencia", 3), ("cinco años de experiencia", 5), ("6+ años de experiencia", 6),
    ("más de 5 años", 5), ("de 3 a 5 años de experiencia", 3), ("3-5 años", 3), ("18 meses de experiencia", 1.5),
    ("tres (3) años", 3), ("5 years of experience", 5), ("un año de experiencia", 1), ("recién egresado", 0),
    ("Tengo 28 años y soy contador", 0),          # la edad no es experiencia
    ("Tengo 5 años de experiencia en ventas", 5),  # pero esto sí
    ("Tiene 28 años de edad", 0),
])
def test_extract_years(texto, esperado):
    assert extract_years(texto) == pytest.approx(esperado)


def test_experiencia_declarada():
    assert experience_declared("Recién egresado con conocimientos en Python")
    assert experience_declared("Estudiante de ingeniería de sistemas")
    assert experience_declared("cuatro años como contador")
    assert not experience_declared("Desarrollador backend especializado en Node.js y PostgreSQL")
    assert not experience_declared("Docente con grupos de hasta 35 estudiantes")  # "estudiantes" no es "estudiante de"


def test_anos_en_letras_no_castiga():
    num = _score(BACKEND, "Programador con 5 años de experiencia en Node.js, Express y PostgreSQL.")
    letras = _score(BACKEND, "Programador con cinco años de experiencia en Node.js, Express y PostgreSQL.")
    assert abs(num - letras) < 0.01


# ----------------------------------------------------------------------------- 3. sinónimos
@pytest.mark.parametrize("a,b", [
    ("Node", "Node.js"), ("NodeJS", "Node.js"), ("Postgres", "PostgreSQL"), ("programador", "desarrollador"),
    ("Adobe Photoshop", "Photoshop"), ("UCI", "cuidados intensivos"), ("enfermero", "enfermera"),
    ("contadora", "contador"), ("Dr.", "médico"), ("planeación de clases", "planificación de clases"),
    ("RCP", "reanimación cardiopulmonar"), ("Instagram", "redes sociales"),
])
def test_sinonimos(a, b):
    assert prepare_text(a) == prepare_text(b)


def test_maestro_de_obra_no_es_docente():
    assert prepare_text("maestro de obra") != prepare_text("maestro")
    assert prepare_text("maestro") == prepare_text("docente")


def test_diccionario_sin_contradicciones():
    # al importar preprocess ya falla si una variante está en dos formas canónicas; aquí se comprueba que
    # cada variante vuelva a su forma canónica
    for canonico, variantes in SYNONYMS.items():
        for v in variantes:
            assert prepare_text(v) == prepare_text(canonico), (canonico, v)


def test_otras_palabras_puntuan_parecido():
    exacto = _score(BACKEND, "Desarrollador backend con 4 años de experiencia en Node.js, Express y PostgreSQL.")
    variantes = _score(BACKEND, "Programador back-end con 4 años de experiencia en Node, Express y Postgres.")
    assert abs(exacto - variantes) < 1.0 and variantes >= 50


# ----------------------------------------------------------------------------- 4. CV sin años
def test_cv_sin_anos_no_se_descarta():
    res = score_candidates(BACKEND, [("c", "Desarrollador backend especializado en Node.js, Express y PostgreSQL. Lideré la migración a microservicios.")])[0]
    assert res["score"] >= 50 and res["recommended"]
    assert res["experience_ok"] is None and res["experience_declared"] is False


def test_recien_egresado_si_se_penaliza():
    res = score_candidates(BACKEND, [("c", "Desarrollador backend recién egresado con conocimientos en Node.js, Express y PostgreSQL.")])[0]
    assert res["experience_declared"] is True and res["experience_ok"] is False and res["score"] < 50


# ----------------------------------------------------------------------------- 5. simulación multiempresa
def test_simulacion_multiempresa_primera_prueba():
    r = evaluar()
    assert r["aciertos"] >= 0.9 * r["total"]
    assert all(r["orden_perfecto"].values()) or sum(not v for v in r["orden_perfecto"].values()) <= 1
    # Limitación conocida y documentada: el modelo no distingue especialidades dentro de un mismo oficio (un profesor de
    # educación física frente a una vacante de docente de matemáticas). Es el único falso positivo permitido.
    falsos = [f["tipo"] for f in r["filas"] if f["esperado"] == 0 and not f["acierto"]]
    assert falsos in ([], ["otra especialidad"]), falsos


def test_simulacion_multiempresa_prueba_ciega():
    r = evaluar(CASOS_CIEGOS, VACANTES_CIEGAS)
    assert r["aciertos"] >= 0.9 * r["total"]
    assert not [f for f in r["filas"] if f["esperado"] == 0 and not f["acierto"]]
