"""Limpieza de texto y extracción de datos básicos (hojas de vida y requisitos de vacantes)."""
import re
import unicodedata

from app.preprocessing.synonyms import SYNONYMS

# Palabras vacías frecuentes en español (sin tildes, porque el texto se normaliza antes).
STOPWORDS_ES = [
    "a", "al", "algo", "ante", "con", "como", "contra", "cual", "cuando", "de", "del", "desde",
    "donde", "durante", "e", "el", "ella", "ellos", "en", "entre", "era", "es", "esa", "ese",
    "eso", "esta", "este", "esto", "fue", "ha", "han", "hasta", "la", "las", "le", "les", "lo",
    "los", "mas", "mi", "mis", "muy", "ni", "no", "nos", "o", "para", "pero", "por", "que",
    "se", "sea", "ser", "si", "sin", "sobre", "son", "su", "sus", "tambien", "tiene", "un",
    "una", "uno", "unos", "unas", "y", "ya", "busca", "buscamos", "requiere", "solicita",
    "necesita", "necesitamos", "anos", "ano", "experiencia", "deseable", "conocimiento",
    "conocimientos", "manejo", "dominio", "minimo",
    # añadidas: palabras de relleno frecuentes en hojas de vida largas y en avisos de empleo
    "years", "year", "yrs", "meses", "mes", "tengo", "soy", "he", "me", "gusta", "tambien", "ademas",
    "cuento", "puedo", "tiempo", "libre", "persona", "empresa", "requisitos", "vacante", "funciones",
]
_STOP = set(STOPWORDS_ES)


def _strip_accents(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in text if not unicodedata.combining(ch))


def clean_text(text: str) -> str:
    """Minúsculas, sin tildes, sin signos de puntuación y sin espacios repetidos."""
    if not text:
        return ""
    text = _strip_accents(text.lower().strip())
    text = re.sub(r"[^a-z0-9]+", " ", text)  # node.js -> node js
    return re.sub(r"\s+", " ", text).strip()


# ----------------------------------------------------------------------------- sinónimos
def _gender(text: str) -> str:
    """Femenino -> masculino en los oficios terminados en -dora / -tora (contadora -> contador)."""
    return " ".join(t[:-1] if len(t) > 5 and t.endswith(("dora", "tora")) else t for t in text.split())


def _compile_synonyms():
    mapping: dict[str, str] = {}
    for canonical, variants in SYNONYMS.items():
        target = _gender(clean_text(canonical))
        for form in (canonical, *variants):
            key = _gender(clean_text(form))
            if key and mapping.setdefault(key, target) != target:
                raise ValueError(f"La variante '{form}' está en dos formas canónicas distintas")
    keys = sorted(mapping, key=lambda k: (-len(k), k))  # primero las frases largas
    pattern = re.compile(r"(?<![a-z0-9])(" + "|".join(re.escape(k) for k in keys) + r")(?![a-z0-9])")
    return mapping, pattern


_SYN_MAP, _SYN_RE = _compile_synonyms()


def prepare_text(text: str) -> str:
    """Texto limpio + sinónimos unificados: 'Node', 'NodeJS' y 'Node.js' pasan a ser el mismo término."""
    return _SYN_RE.sub(lambda m: _SYN_MAP[m.group(1)], _gender(clean_text(text)))


def tokens(text: str) -> set[str]:
    """Conjunto de términos relevantes (sin palabras vacías, números ni términos de 1 letra)."""
    return {t for t in prepare_text(text).split() if len(t) > 1 and not t.isdigit() and t not in _STOP}


# ----------------------------------------------------------------------------- años de experiencia
_NUM_WORDS = {
    "un": 1, "uno": 1, "una": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5, "seis": 6, "siete": 7, "ocho": 8,
    "nueve": 9, "diez": 10, "once": 11, "doce": 12, "trece": 13, "catorce": 14, "quince": 15, "dieciseis": 16,
    "diecisiete": 17, "dieciocho": 18, "diecinueve": 19, "veinte": 20, "veinticinco": 25, "treinta": 30,
}
_NUM_ALT = "|".join(sorted(_NUM_WORDS, key=len, reverse=True))
_YEARS = r"(?:anos?|years?|yrs?)"
_MONTHS = r"(?:meses|mes|months?)"
MAX_YEARS = 40  # por encima de esto casi seguro no es experiencia (edad, año calendario mal leído, etc.)

# "recién egresado", "sin experiencia", "estudiante de ...", "practicante": experiencia cero declarada
_JUNIOR_RE = re.compile(
    r"\b(?:recien (?:egresad|graduad|titulad)\w*|sin experiencia|primer empleo|primera experiencia|"
    r"practicante|pasante|estudiante de|aun estudiando)\b"
)


def _years_text(text: str) -> str:
    t = _strip_accents((text or "").lower()).replace("–", "-").replace("—", "-")
    # la edad no es experiencia: "tengo 28 años", "28 años de edad", "edad: 28 años"
    t = re.sub(r"\btengo\s+\d{1,2}\s*anos?\b(?!\s+(?:de\s+)?(?:experiencia|trabaj|en\b|como|dedic|ejerc))", " ", t)
    t = re.sub(r"\b\d{1,2}\s*anos?\s+de\s+edad\b", " ", t)
    t = re.sub(r"\bedad\s*:?\s*\d{1,2}\s*anos?\b", " ", t)
    # rangos ("3-5 años", "3 a 5 años"): se toma el mínimo, que es lo que realmente se exige o se garantiza
    t = re.sub(rf"\b(\d{{1,2}})\s*(?:-|a|al|hasta|to)\s*\d{{1,2}}\s*({_YEARS})\b", r"\1 \2", t)
    t = re.sub(r"[^a-z0-9]+", " ", t)  # "5+ años" -> "5 anos"
    # números en letras -> dígitos ("cinco años" -> "5 anos"; "seis meses" -> "6 meses")
    return re.sub(rf"\b({_NUM_ALT})\s+(?=(?:{_YEARS}|{_MONTHS})\b)", lambda m: f"{_NUM_WORDS[m.group(1)]} ", t)


def extract_years(text: str) -> float:
    """Mayor cantidad de años de experiencia que aparece en el texto (0 si no se menciona).

    Reconoce "5 años", "cinco años", "5+ años", "más de 5 años", "3 a 5 años" (toma 3), "18 meses" (1,5)
    y "5 years"; ignora la edad ("tengo 28 años")."""
    t = _years_text(text)
    values = [float(n) for n in re.findall(rf"\b(\d{{1,2}})\s*{_YEARS}\b", t)]
    values += [int(n) / 12 for n in re.findall(rf"\b(\d{{1,3}})\s*{_MONTHS}\b", t)]
    values = [v for v in values if v <= MAX_YEARS]
    return max(values, default=0.0)


def experience_declared(text: str) -> bool:
    """True si el texto dice cuánta experiencia tiene (años) o declara que no tiene (recién egresado, estudiante...)."""
    return extract_years(text) > 0 or bool(_JUNIOR_RE.search(clean_text(text)))
