"""Métricas del clasificador y comparación con una línea base.

Uso:  python -m app.models.evaluation        (muestra las métricas guardadas y una validación cruzada)
"""
import json

import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import GroupKFold

from app.config import DATA_RAW, METRICS_PATH


def compute_metrics(y_true, y_pred, y_proba=None) -> dict:
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    out = {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 3),
        "precision": round(float(precision_score(y_true, y_pred, zero_division=0)), 3),
        "recall": round(float(recall_score(y_true, y_pred, zero_division=0)), 3),
        "f1": round(float(f1_score(y_true, y_pred, zero_division=0)), 3),
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
    }
    if y_proba is not None and len(set(y_true)) == 2:
        out["roc_auc"] = round(float(roc_auc_score(y_true, y_proba)), 3)
    return out


def best_cosine_threshold(cosine, y_true) -> float:
    """Línea base sin aprendizaje supervisado: umbral sobre la similitud, elegido en entrenamiento."""
    grid = np.linspace(0.02, 0.8, 40)
    return float(max(grid, key=lambda t: f1_score(y_true, (cosine >= t).astype(int), zero_division=0)))


def cross_validate(n_splits: int = 5, csv_path=DATA_RAW) -> dict:
    """Validación cruzada agrupada por vacante (ninguna vacante aparece en entrenamiento y prueba a la vez)."""
    from app.models.train import fit_model, predict_proba

    df = pd.read_csv(csv_path)
    f1s, aucs = [], []
    for tr, te in GroupKFold(n_splits=n_splits).split(df, df["label"], df["vacancy_id"]):
        vec, clf = fit_model(df.iloc[tr])
        test = df.iloc[te]
        proba = predict_proba(vec, clf, test["vacancy_text"].tolist(), test["candidate_text"].tolist())
        f1s.append(f1_score(test["label"], (proba >= 0.5).astype(int), zero_division=0))
        aucs.append(roc_auc_score(test["label"], proba))
    return {"folds": n_splits, "f1_mean": round(float(np.mean(f1s)), 3), "f1_std": round(float(np.std(f1s)), 3),
            "roc_auc_mean": round(float(np.mean(aucs)), 3)}


if __name__ == "__main__":
    if METRICS_PATH.exists():
        print(json.dumps(json.loads(METRICS_PATH.read_text()), indent=2, ensure_ascii=False))
    else:
        print("Aún no hay métricas: ejecuta  python -m app.models.train")
    print("Validación cruzada:", json.dumps(cross_validate(), indent=2))
