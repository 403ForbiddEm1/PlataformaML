"""Probabilidad de aptitud de uno o varios candidatos frente a una vacante."""
from functools import lru_cache

import joblib

from app.config import MODEL_PATH, THRESHOLD
from app.models.train import train_and_save
from app.preprocessing.features import FEATURE_NAMES, build_feature_matrix, cosine_similarity
from app.preprocessing.preprocess import experience_declared, extract_years, prepare_text


@lru_cache(maxsize=1)
def get_model() -> dict:
    """Carga el modelo entrenado; si aún no existe, o fue guardado con otras variables, lo entrena de nuevo."""
    if MODEL_PATH.exists():
        bundle = joblib.load(MODEL_PATH)
        if bundle.get("metrics", {}).get("feature_names") == FEATURE_NAMES:
            return bundle
    train_and_save()
    return joblib.load(MODEL_PATH)


def reload_model() -> None:
    get_model.cache_clear()


def score_candidates(vacancy_text: str, candidates: list[tuple[str, str]], top_terms: int = 5) -> list[dict]:
    """candidates: lista de (id, texto). Devuelve la lista ordenada de mayor a menor probabilidad."""
    bundle = get_model()
    vec, clf = bundle["vectorizer"], bundle["classifier"]
    texts = [t for _, t in candidates]

    X = build_feature_matrix(vec, [vacancy_text] * len(texts), texts)
    proba = clf.predict_proba(X)[:, 1]
    cosine = cosine_similarity(vec, [vacancy_text] * len(texts), texts)

    v = vec.transform([prepare_text(vacancy_text)])
    c = vec.transform([prepare_text(t) for t in texts])
    names = vec.get_feature_names_out()
    required = extract_years(vacancy_text)

    results = []
    for i, (cid, text) in enumerate(candidates):
        declared = experience_declared(text)
        contrib = c[i].multiply(v).tocoo()  # términos que más pesan en el parecido (explica el resultado)
        top = sorted(zip(contrib.data, contrib.col), reverse=True)[:top_terms]
        results.append({
            "id": cid,
            "score": round(float(proba[i]) * 100, 2),
            "recommended": bool(proba[i] >= THRESHOLD),
            "similarity": round(float(cosine[i]) * 100, 2),
            # None si la vacante no pide años o si el candidato no declaró su experiencia (ver experience_declared)
            "experience_ok": None if required == 0 or not declared else bool(extract_years(text) >= required),
            "experience_declared": declared,
            "matched_terms": [names[col] for _, col in top],
        })
    return sorted(results, key=lambda r: r["score"], reverse=True)
