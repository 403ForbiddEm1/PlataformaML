"""Variables numéricas que describen qué tan bien encaja un candidato con una vacante."""
import numpy as np

from app.preprocessing.preprocess import clean_text, extract_years, tokens

FEATURE_NAMES = [
    "cosine",             # similitud TF-IDF entre vacante y candidato
    "coverage",           # fracción de términos de la vacante que el candidato menciona
    "jaccard",            # solapamiento de términos entre ambos textos
    "shared_terms",       # cantidad de términos en común (log)
    "cand_len",           # extensión del perfil del candidato (log)
    "cand_years",         # años de experiencia declarados por el candidato
    "req_years",          # años de experiencia que pide la vacante
    "years_gap",          # años del candidato menos los requeridos
    "meets_experience",   # 1 si cumple la experiencia mínima (o si la vacante no la pide)
]


def build_feature_matrix(vectorizer, vacancies: list[str], candidates: list[str]) -> np.ndarray:
    v = vectorizer.transform([clean_text(t) for t in vacancies])
    c = vectorizer.transform([clean_text(t) for t in candidates])
    cosine = np.asarray(v.multiply(c).sum(axis=1)).ravel()  # filas ya normalizadas (L2)

    rows = []
    for i, (vac, cand) in enumerate(zip(vacancies, candidates)):
        tv, tc = tokens(vac), tokens(cand)
        shared = len(tv & tc)
        union = len(tv | tc)
        cy, ry = extract_years(cand), extract_years(vac)
        rows.append([
            cosine[i],
            shared / len(tv) if tv else 0.0,
            shared / union if union else 0.0,
            np.log1p(shared),
            np.log1p(len(tc)),
            cy,
            ry,
            cy - ry,
            1.0 if cy >= ry else 0.0,
        ])
    return np.array(rows, dtype=float)
