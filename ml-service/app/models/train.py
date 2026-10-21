"""Entrenamiento del clasificador supervisado (regresión logística) sobre pares etiquetados.

Uso:  python -m app.models.train
"""
import json

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app.config import DATA_RAW, METRICS_PATH, MODEL_PATH, RANDOM_STATE
from app.models.evaluation import best_cosine_threshold, compute_metrics
from app.preprocessing.features import FEATURE_NAMES, build_feature_matrix
from app.preprocessing.preprocess import STOPWORDS_ES, clean_text
from app.preprocessing.synthetic_data import generate


def build_vectorizer() -> TfidfVectorizer:
    return TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True, stop_words=STOPWORDS_ES)


def fit_model(train_df: pd.DataFrame):
    """Ajusta el vectorizador TF-IDF y el clasificador con los datos de entrenamiento."""
    texts = pd.concat([train_df["vacancy_text"], train_df["candidate_text"]]).drop_duplicates()
    vectorizer = build_vectorizer().fit([clean_text(t) for t in texts])
    X = build_feature_matrix(vectorizer, train_df["vacancy_text"].tolist(), train_df["candidate_text"].tolist())
    clf = Pipeline([
        ("scale", StandardScaler()),
        ("logreg", LogisticRegression(class_weight="balanced", max_iter=1000, random_state=RANDOM_STATE)),
    ])
    clf.fit(X, train_df["label"])
    return vectorizer, clf


def predict_proba(vectorizer, clf, vacancies, candidates):
    return clf.predict_proba(build_feature_matrix(vectorizer, vacancies, candidates))[:, 1]


def train_and_save(csv_path=DATA_RAW, model_path=MODEL_PATH) -> dict:
    if not csv_path.exists():
        generate(csv_path)
    df = pd.read_csv(csv_path)

    # División por vacante: ninguna vacante de prueba se usa para entrenar.
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=RANDOM_STATE)
    tr_idx, te_idx = next(splitter.split(df, df["label"], df["vacancy_id"]))
    train_df, test_df = df.iloc[tr_idx], df.iloc[te_idx]

    vectorizer, clf = fit_model(train_df)
    X_te = build_feature_matrix(vectorizer, test_df["vacancy_text"].tolist(), test_df["candidate_text"].tolist())
    proba = clf.predict_proba(X_te)[:, 1]
    model_metrics = compute_metrics(test_df["label"], (proba >= 0.5).astype(int), proba)

    # Línea base: solo similitud del coseno con un umbral elegido en entrenamiento.
    X_tr = build_feature_matrix(vectorizer, train_df["vacancy_text"].tolist(), train_df["candidate_text"].tolist())
    thr = best_cosine_threshold(X_tr[:, 0], train_df["label"])
    baseline = compute_metrics(test_df["label"], (X_te[:, 0] >= thr).astype(int), X_te[:, 0])
    baseline["threshold"] = round(thr, 3)

    coefs = clf.named_steps["logreg"].coef_[0]
    metrics = {
        "model": "TF-IDF + variables de ajuste + regresión logística",
        "n_pairs": int(len(df)), "n_train": int(len(train_df)), "n_test": int(len(test_df)),
        "test": model_metrics,
        "baseline_cosine": baseline,
        "feature_weights": {n: round(float(w), 3) for n, w in zip(FEATURE_NAMES, coefs)},
        "note": "Datos simulados: las métricas son ilustrativas.",
    }
    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"vectorizer": vectorizer, "classifier": clf, "metrics": metrics}, model_path)
    METRICS_PATH.parent.mkdir(parents=True, exist_ok=True)
    METRICS_PATH.write_text(json.dumps(metrics, indent=2, ensure_ascii=False), encoding="utf-8")
    return metrics


if __name__ == "__main__":
    m = train_and_save()
    print(json.dumps(m, indent=2, ensure_ascii=False))
