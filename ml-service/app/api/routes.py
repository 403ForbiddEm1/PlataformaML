import json

from fastapi import APIRouter, HTTPException

from app.config import METRICS_PATH
from app.models.predict import reload_model, score_candidates
from app.models.train import train_and_save
from app.schemas.schemas import PredictRequest, PredictResponse, RankRequest, RankResponse

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok"}


@router.post("/predict", response_model=PredictResponse)
def predict(body: PredictRequest):
    """Probabilidad de que un candidato sea apto para una vacante."""
    result = score_candidates(body.vacancy_text, [("candidate", body.candidate_text)])[0]
    result.pop("id")
    return PredictResponse(**result)


@router.post("/rank", response_model=RankResponse)
def rank(body: RankRequest):
    """Ordena varios candidatos de mayor a menor probabilidad de aptitud."""
    pairs = [(c.id, c.text) for c in body.candidates]
    return RankResponse(results=score_candidates(body.vacancy_text, pairs))


@router.get("/metrics")
def metrics():
    """Métricas del último entrenamiento."""
    if not METRICS_PATH.exists():
        raise HTTPException(404, "Aún no hay métricas: entrena el modelo con POST /train")
    return json.loads(METRICS_PATH.read_text(encoding="utf-8"))


@router.post("/train")
def train():
    """Reentrena el modelo con data/raw/pairs.csv y devuelve las métricas."""
    result = train_and_save()
    reload_model()
    return result
