"""Variables numéricas que describen qué tan bien encaja un candidato con una vacante.

Principio de diseño: ninguna variable depende de cuánto texto tiene el candidato, solo de si menciona
lo que pide la vacante. Antes se usaba la extensión del perfil ("cand_len") y la similitud del coseno y el
solapamiento (Jaccard), que se diluyen o se inflan según el largo del CV: un CV largo de otra área recibía un
puntaje alto porque el modelo nunca había visto textos así. Ahora, agregar relleno irrelevante a un CV no cambia el
puntaje (hay una prueba automática que lo comprueba). El coseno se sigue calculando, pero solo para mostrarlo
(campo "similarity") y para la línea base; no entra al modelo.
"""
import numpy as np

from app.preprocessing.preprocess import experience_declared, extract_years, prepare_text, tokens

FEATURE_NAMES = [
    "coverage",           # fracción de términos de la vacante que el candidato menciona
    "idf_coverage",       # igual, pero cada término pesa según su rareza (los términos específicos pesan más que los comunes)
    "shared_terms",       # cantidad de términos en común (log)
    "exp_unknown",        # 1 si la vacante pide años y el candidato no dice cuánta experiencia tiene
    "cand_years",         # años de experiencia declarados por el candidato (máx. 15; 0 si no los declaró)
    "req_years",          # años de experiencia que pide la vacante (máx. 15)
    "years_gap",          # años del candidato menos los requeridos, entre -10 y 10 (0 si no los declaró)
    "meets_experience",   # 1 si cumple la experiencia mínima, si la vacante no la pide o si no declaró años (beneficio de la duda)
]

# Sentido común impuesto a los modelos de árboles: más coincidencia con la vacante o más holgura de experiencia
# nunca debe bajar el puntaje (+1); el resto de variables queda libre (0). Sin esto, el random forest memoriza
# etiquetas ruidosas y le da puntajes altos a candidatos sin ninguna coincidencia.
MONOTONIC = {"coverage": 1, "idf_coverage": 1, "shared_terms": 1, "exp_unknown": 0, "cand_years": 0,
             "req_years": 0, "years_gap": 1, "meets_experience": 1}
MONOTONIC_CST = [MONOTONIC[n] for n in FEATURE_NAMES]

YEARS_CAP = 15.0


def cosine_similarity(vectorizer, vacancies: list[str], candidates: list[str]) -> np.ndarray:
    """Similitud del coseno TF-IDF entre cada vacante y su candidato (0 a 1). Solo informativa: no es entrada del modelo."""
    v = vectorizer.transform([prepare_text(t) for t in vacancies])
    c = vectorizer.transform([prepare_text(t) for t in candidates])
    return np.asarray(v.multiply(c).sum(axis=1)).ravel()  # filas ya normalizadas (L2)


def experience_features(vacancy: str, candidate: str) -> tuple[float, float, float, float, float]:
    """(exp_unknown, cand_years, req_years, years_gap, meets_experience)."""
    ry = min(extract_years(vacancy), YEARS_CAP)
    declared = experience_declared(candidate)
    cy = min(extract_years(candidate), YEARS_CAP) if declared else 0.0
    unknown = 1.0 if (ry > 0 and not declared) else 0.0
    gap = float(np.clip(cy - ry, -10, 10)) if declared else 0.0
    meets = 1.0 if (ry == 0 or not declared or cy >= ry) else 0.0
    return unknown, cy, ry, gap, meets


def build_feature_matrix(vectorizer, vacancies: list[str], candidates: list[str]) -> np.ndarray:
    vocab, idf = vectorizer.vocabulary_, vectorizer.idf_
    max_idf = float(idf.max())

    def weight(term: str) -> float:  # un término que el modelo nunca vio es raro: pesa lo máximo
        return float(idf[vocab[term]]) if term in vocab else max_idf

    rows = []
    for vac, cand in zip(vacancies, candidates):
        tv, tc = tokens(vac), tokens(cand)
        shared = tv & tc
        total_w = sum(weight(t) for t in tv)
        unknown, cy, ry, gap, meets = experience_features(vac, cand)
        rows.append([
            len(shared) / len(tv) if tv else 0.0,
            sum(weight(t) for t in shared) / total_w if total_w else 0.0,
            np.log1p(len(shared)),
            unknown,
            cy,
            ry,
            gap,
            meets,
        ])
    return np.array(rows, dtype=float)
