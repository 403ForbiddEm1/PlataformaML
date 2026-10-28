"""Entrenamiento y comparación de clasificadores supervisados sobre pares vacante-candidato etiquetados.

Se comparan tres algoritmos con las mismas particiones y las mismas métricas:
regresión logística, random forest y red neuronal (perceptrón multicapa).
El modelo con mayor promedio de F1 en validación cruzada (solo con datos de entrenamiento) queda como modelo activo.

Uso:  python -m app.models.train
"""
import json

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score, roc_auc_score
from sklearn.model_selection import GroupKFold, GroupShuffleSplit
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app.config import DATA_RAW, METRICS_PATH, MODEL_PATH, RANDOM_STATE
from app.models.evaluation import best_cosine_threshold, compute_metrics
from app.preprocessing.features import FEATURE_NAMES, build_feature_matrix
from app.preprocessing.preprocess import STOPWORDS_ES, clean_text
from app.preprocessing.synthetic_data import generate

DEFAULT_MODEL = "regresion_logistica"
CV_FOLDS = 5


def _logreg():
    return Pipeline([("scale", StandardScaler()),
                     ("model", LogisticRegression(class_weight="balanced", max_iter=1000, random_state=RANDOM_STATE))])


def _forest():
    return RandomForestClassifier(n_estimators=200, min_samples_leaf=2, class_weight="balanced",
                                  random_state=RANDOM_STATE)


def _mlp():
    # scikit-learn no admite ponderación de clases en MLPClassifier: esta red se entrena sin ella.
    return Pipeline([("scale", StandardScaler()),
                     ("model", MLPClassifier(hidden_layer_sizes=(16,), max_iter=2000, random_state=RANDOM_STATE))])


CANDIDATES = {"regresion_logistica": _logreg, "random_forest": _forest, "red_neuronal": _mlp}


def make_classifier(name: str = DEFAULT_MODEL):
    return CANDIDATES[name]()


def build_vectorizer() -> TfidfVectorizer:
    return TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True, stop_words=STOPWORDS_ES)


def fit_vectorizer(train_df: pd.DataFrame) -> TfidfVectorizer:
    texts = pd.concat([train_df["vacancy_text"], train_df["candidate_text"]]).drop_duplicates()
    return build_vectorizer().fit([clean_text(t) for t in texts])


def fit_model(train_df: pd.DataFrame, name: str = DEFAULT_MODEL):
    """Ajusta el vectorizador TF-IDF y el clasificador indicado con los datos de entrenamiento."""
    vectorizer = fit_vectorizer(train_df)
    X = build_feature_matrix(vectorizer, train_df["vacancy_text"].tolist(), train_df["candidate_text"].tolist())
    clf = make_classifier(name).fit(X, train_df["label"])
    return vectorizer, clf


def predict_proba(vectorizer, clf, vacancies, candidates):
    return clf.predict_proba(build_feature_matrix(vectorizer, vacancies, candidates))[:, 1]


def _importance(name: str, clf):
    if name == "regresion_logistica":
        values = clf.named_steps["model"].coef_[0]
    elif name == "random_forest":
        values = clf.feature_importances_
    else:
        return None
    return {n: round(float(v), 3) for n, v in zip(FEATURE_NAMES, values)}


def _cv_scores(name: str, X: np.ndarray, y: np.ndarray, groups) -> dict:
    f1s, aucs = [], []
    for tr, va in GroupKFold(n_splits=CV_FOLDS).split(X, y, groups):
        clf = make_classifier(name).fit(X[tr], y[tr])
        proba = clf.predict_proba(X[va])[:, 1]
        f1s.append(f1_score(y[va], (proba >= 0.5).astype(int), zero_division=0))
        aucs.append(roc_auc_score(y[va], proba))
    return {"f1_mean": round(float(np.mean(f1s)), 3), "f1_std": round(float(np.std(f1s)), 3),
            "roc_auc_mean": round(float(np.mean(aucs)), 3)}


def train_and_save(csv_path=DATA_RAW, model_path=MODEL_PATH) -> dict:
    if not csv_path.exists():
        generate(csv_path)
    df = pd.read_csv(csv_path)

    # División por vacante: ninguna vacante de prueba se usa para entrenar.
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=RANDOM_STATE)
    tr_idx, te_idx = next(splitter.split(df, df["label"], df["vacancy_id"]))
    train_df, test_df = df.iloc[tr_idx], df.iloc[te_idx]

    vectorizer = fit_vectorizer(train_df)
    X_tr = build_feature_matrix(vectorizer, train_df["vacancy_text"].tolist(), train_df["candidate_text"].tolist())
    X_te = build_feature_matrix(vectorizer, test_df["vacancy_text"].tolist(), test_df["candidate_text"].tolist())
    y_tr, y_te = train_df["label"].to_numpy(), test_df["label"].to_numpy()

    comparison, fitted = {}, {}
    for name in CANDIDATES:
        cv = _cv_scores(name, X_tr, y_tr, train_df["vacancy_id"].to_numpy())
        clf = make_classifier(name).fit(X_tr, y_tr)
        proba = clf.predict_proba(X_te)[:, 1]
        comparison[name] = {
            "cv_train": cv,
            "test": compute_metrics(y_te, (proba >= 0.5).astype(int), proba),
            "feature_importance": _importance(name, clf),
        }
        fitted[name] = clf

    # Selección con datos de entrenamiento únicamente (la prueba no interviene en la elección).
    selected = max(comparison, key=lambda n: (comparison[n]["cv_train"]["f1_mean"], comparison[n]["cv_train"]["roc_auc_mean"]))

    thr = best_cosine_threshold(X_tr[:, 0], y_tr)
    baseline = compute_metrics(y_te, (X_te[:, 0] >= thr).astype(int), X_te[:, 0])
    baseline["threshold"] = round(thr, 3)

    metrics = {
        "model": f"TF-IDF + variables de ajuste + {selected}",
        "selected_model": selected,
        "selection_criterion": "mayor promedio de F1 en validación cruzada agrupada por vacante (solo datos de entrenamiento)",
        "n_pairs": int(len(df)), "n_train": int(len(train_df)), "n_test": int(len(test_df)),
        "test": comparison[selected]["test"],
        "comparison": comparison,
        "baseline_cosine": baseline,
        "note": "Datos simulados: las métricas son ilustrativas.",
    }
    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"vectorizer": vectorizer, "classifier": fitted[selected], "model_name": selected, "metrics": metrics}, model_path)
    METRICS_PATH.parent.mkdir(parents=True, exist_ok=True)
    METRICS_PATH.write_text(json.dumps(metrics, indent=2, ensure_ascii=False), encoding="utf-8")
    return metrics


if __name__ == "__main__":
    m = train_and_save()
    print(f"Modelo seleccionado: {m['selected_model']}  ({m['selection_criterion']})\n")
    for name, r in m["comparison"].items():
        t, cv = r["test"], r["cv_train"]
        print(f"{name:20s} CV(F1 {cv['f1_mean']:.3f} ± {cv['f1_std']:.3f}, AUC {cv['roc_auc_mean']:.3f}) | "
              f"prueba: exactitud {t['accuracy']:.3f} precisión {t['precision']:.3f} "
              f"exhaustividad {t['recall']:.3f} F1 {t['f1']:.3f} AUC {t['roc_auc']:.3f}")
    b = m["baseline_cosine"]
    print(f"{'linea_base_coseno':20s} {'':32s} | prueba: exactitud {b['accuracy']:.3f} precisión {b['precision']:.3f} "
          f"exhaustividad {b['recall']:.3f} F1 {b['f1']:.3f} AUC {b['roc_auc']:.3f}")
