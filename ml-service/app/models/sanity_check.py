"""Verificación rápida de que el modelo funciona de forma sensata.

Uso:  python -m app.models.sanity_check

Hace tres comprobaciones:
  1. Casos escritos a mano (candidatos claramente aptos o no aptos).
  2. Robustez: tildes y orden de los candidatos no deben cambiar el resultado.
  3. Prueba de etiquetas barajadas: si se entrena con etiquetas al azar, el modelo debe rendir como
     el azar (ROC-AUC cercano a 0.5). Así se comprueba que el modelo realmente aprende de los datos.
"""
import sys

import pandas as pd
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import GroupShuffleSplit

from app.config import DATA_RAW, RANDOM_STATE
from app.models.predict import score_candidates
from app.models.train import fit_model, predict_proba

BACKEND = "Se busca desarrollador backend con mínimo 2 años de experiencia en Node.js, Express y PostgreSQL."
CONTABLE = "Se requiere contador con 3 años de experiencia en contabilidad general, declaración de impuestos y nómina."
DISENO = "Se busca diseñador gráfico con 2 años de experiencia en Photoshop, Illustrator y branding."

GOOD_BACKEND = "Desarrollador backend con 4 años de experiencia en Node.js, Express, PostgreSQL y Docker."


def _score(vacancy: str, candidate: str) -> float:
    return score_candidates(vacancy, [("c", candidate)])[0]["score"]


def run_checks() -> list[tuple[bool, str]]:
    out = []

    def check(ok: bool, text: str):
        out.append((bool(ok), text))

    # 1. Casos claros
    s = _score(BACKEND, GOOD_BACKEND)
    check(s >= 50, f"Backend con las habilidades y la experiencia pedidas -> {s:.1f} (esperado: >= 50)")
    s = _score(BACKEND, "Enfermera con 5 años de experiencia en cuidados intensivos y atención al paciente.")
    check(s < 50, f"Enfermera frente a vacante de backend -> {s:.1f} (esperado: < 50)")
    s = _score(CONTABLE, "Contador con 5 años de experiencia en contabilidad general, impuestos y nómina de empresas medianas.")
    check(s >= 50, f"Contador que cumple lo pedido -> {s:.1f} (esperado: >= 50)")
    s = _score(DISENO, "Desarrollador backend con 6 años de experiencia en Node.js, Docker y MongoDB.")
    check(s < 50, f"Programador frente a vacante de diseño -> {s:.1f} (esperado: < 50)")
    junior = _score(BACKEND, "Desarrollador backend recién egresado con conocimientos en Node.js, Express y PostgreSQL.")
    check(junior < _score(BACKEND, GOOD_BACKEND),
          f"Mismas habilidades pero sin experiencia puntúa menos -> {junior:.1f} (esperado: menor que el caso con 4 años)")

    # 2. Robustez
    con = _score(BACKEND, GOOD_BACKEND)
    sin = _score(BACKEND, "DESARROLLADOR BACKEND CON 4 ANOS DE EXPERIENCIA EN NODE.JS, EXPRESS, POSTGRESQL Y DOCKER")
    check(abs(con - sin) < 0.01, f"Mayúsculas y tildes no cambian el resultado -> {con:.2f} vs {sin:.2f}")
    cands = [("a", "Enfermera con cuidados intensivos."), ("b", GOOD_BACKEND), ("c", "Contador con impuestos y nómina.")]
    a = {r["id"]: r["score"] for r in score_candidates(BACKEND, cands)}
    b = {r["id"]: r["score"] for r in score_candidates(BACKEND, list(reversed(cands)))}
    top = max(a, key=a.get)
    check(a == b and top == "b", f"El orden de entrada no altera los puntajes y el mejor candidato es el correcto -> mejor: {top}")

    # 3. Etiquetas barajadas: el modelo debe rendir como el azar
    df = pd.read_csv(DATA_RAW)
    tr, te = next(GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=RANDOM_STATE).split(df, df["label"], df["vacancy_id"]))
    train_df, test_df = df.iloc[tr].copy(), df.iloc[te]
    train_df["label"] = train_df["label"].sample(frac=1, random_state=RANDOM_STATE).values
    vec, clf = fit_model(train_df)
    proba = predict_proba(vec, clf, test_df["vacancy_text"].tolist(), test_df["candidate_text"].tolist())
    auc = roc_auc_score(test_df["label"], proba)
    check(auc < 0.7, f"Con etiquetas al azar el modelo no aprende (ROC-AUC {auc:.2f}; con azar se espera cerca de 0.5 y debe quedar bajo 0.7)")
    return out


if __name__ == "__main__":
    results = run_checks()
    for ok, text in results:
        print(("[OK]    " if ok else "[FALLO] ") + text)
    failed = sum(1 for ok, _ in results if not ok)
    print(f"\n{len(results) - failed} de {len(results)} comprobaciones correctas")
    sys.exit(1 if failed else 0)
