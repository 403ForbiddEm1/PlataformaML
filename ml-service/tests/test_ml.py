from fastapi.testclient import TestClient

from app.main import app
from app.preprocessing.preprocess import clean_text, extract_years

VACANCY = "Se busca desarrollador backend con mínimo 2 años de experiencia en Node.js, Express y PostgreSQL."
GOOD = "Desarrollador backend con 4 años de experiencia en Node.js, Express, PostgreSQL y Docker."
NO_EXP = "Desarrollador backend recién egresado con conocimientos en Node.js, Express y PostgreSQL."
BAD = "Enfermera con 5 años de experiencia en cuidados intensivos y atención al paciente."


def test_clean_text():
    assert clean_text("  Programación en Node.js, ¡SQL!  ") == "programacion en node js sql"
    assert clean_text("") == ""


def test_extract_years():
    assert extract_years("Mínimo 3 años de experiencia") == 3
    assert extract_years("recién egresado") == 0


def test_health():
    with TestClient(app) as client:
        assert client.get("/health").json() == {"status": "ok"}


def test_predict_good_vs_bad():
    with TestClient(app) as client:
        good = client.post("/predict", json={"vacancy_text": VACANCY, "candidate_text": GOOD}).json()
        bad = client.post("/predict", json={"vacancy_text": VACANCY, "candidate_text": BAD}).json()
    assert good["score"] > 50 > bad["score"]
    assert good["recommended"] is True and bad["recommended"] is False
    assert good["experience_ok"] is True
    assert "node" in " ".join(good["matched_terms"])


def test_experience_matters():
    with TestClient(app) as client:
        good = client.post("/predict", json={"vacancy_text": VACANCY, "candidate_text": GOOD}).json()
        junior = client.post("/predict", json={"vacancy_text": VACANCY, "candidate_text": NO_EXP}).json()
    assert junior["experience_ok"] is False
    assert good["score"] > junior["score"]


def test_rank_orders_by_score():
    body = {"vacancy_text": VACANCY, "candidates": [{"id": "a", "text": BAD}, {"id": "b", "text": GOOD}]}
    with TestClient(app) as client:
        res = client.post("/rank", json=body).json()["results"]
    assert [r["id"] for r in res] == ["b", "a"]


def test_metrics_and_quality():
    with TestClient(app) as client:
        m = client.get("/metrics").json()
    assert m["test"]["f1"] > m["baseline_cosine"]["f1"]  # el modelo supervisado supera a la línea base
    assert m["test"]["roc_auc"] > 0.8


def test_validation_error():
    with TestClient(app) as client:
        assert client.post("/predict", json={"vacancy_text": "x"}).status_code == 422


def test_sanity_checks_pass():
    from app.models.sanity_check import run_checks

    failed = [text for ok, text in run_checks() if not ok]
    assert not failed, failed


def test_comparison_includes_three_algorithms():
    with TestClient(app) as client:
        m = client.get("/metrics").json()
    assert set(m["comparison"]) == {"regresion_logistica", "random_forest", "red_neuronal"}
    assert m["selected_model"] in m["comparison"]
    for r in m["comparison"].values():
        assert r["test"]["f1"] > m["baseline_cosine"]["f1"]  # todos superan a la línea base
