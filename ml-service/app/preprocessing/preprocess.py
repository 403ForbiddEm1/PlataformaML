"""Limpieza de texto y extracción de datos básicos (hojas de vida y requisitos de vacantes)."""
import re
import unicodedata

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
]
_STOP = set(STOPWORDS_ES)


def clean_text(text: str) -> str:
    """Minúsculas, sin tildes, sin signos de puntuación y sin espacios repetidos."""
    if not text:
        return ""
    text = text.lower().strip()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^a-z0-9]+", " ", text)  # node.js -> node js
    return re.sub(r"\s+", " ", text).strip()


def tokens(text: str) -> set[str]:
    """Conjunto de términos relevantes (sin palabras vacías, números ni términos de 1 letra)."""
    return {t for t in clean_text(text).split() if len(t) > 1 and not t.isdigit() and t not in _STOP}


def extract_years(text: str) -> int:
    """Mayor cantidad de 'N años' que aparece en el texto (0 si no se menciona)."""
    found = re.findall(r"(\d{1,2})\s*anos?\b", clean_text(text))
    return max((int(n) for n in found), default=0)
