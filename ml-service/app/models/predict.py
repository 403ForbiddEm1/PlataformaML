"""Probabilidad de aptitud de uno o varios candidatos frente a una vacante."""
from functools import lru_cache

import joblib

from app.config import MODEL_PATH, THRESHOLD
from app.models.train import train_and_save
from app.preprocessing.features import build_feature_matrix
from app.preprocessing.preprocess import clean_text, extract_years


@lru_cache(maxsize=1)
def get_model() -> dict:
    """Carga el modelo entrenado; si aún no existe, lo entrena."""
    if not MODEL_PATH.exists():
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

    v = vec.transform([clean_text(vacancy_text)])
    c = vec.transform([clean_text(t) for t in texts])
    names = vec.get_feature_names_out()
    required = extract_years(vacancy_text)

    results = []
    for i, (cid, text) in enumerate(candidates):
        contrib = c[i].multiply(v).tocoo()  # términos que más pesan en el parecido (explica el resultado)
        top = sorted(zip(contrib.data, contrib.col), reverse=True)[:top_terms]
        results.append({
            "id": cid,
            "score": round(float(proba[i]) * 100, 2),
            "recommended": bool(proba[i] >= THRESHOLD),
            "similarity": round(float(X[i, 0]) * 100, 2),
            "experience_ok": None if required == 0 else bool(extract_years(text) >= required),
            "matched_terms": [names[col] for _, col in top],
        })
    return sorted(results, key=lambda r: r["score"], reverse=True)
