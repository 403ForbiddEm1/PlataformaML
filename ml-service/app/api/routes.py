import json

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import MAX_UPLOAD_BYTES, METRICS_PATH
from app.models.predict import reload_model, score_candidates
from app.models.train import train_and_save
from app.preprocessing.extract import ExtractionError, extract_text
from app.schemas.schemas import ExtractResponse, PredictRequest, PredictResponse, RankRequest, RankResponse

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


@router.post("/extract", response_model=ExtractResponse)
async def extract(file: UploadFile = File(...)):
    """Extrae el texto de una hoja de vida o vacante en PDF o DOCX. Rechaza formatos no soportados y documentos sin texto."""
    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "El archivo supera el tamaño máximo permitido (10 MB)")
    try:
        text = extract_text(file.filename or "", content)
    except ExtractionError as exc:
        raise HTTPException(exc.status_code, exc.message)
    return ExtractResponse(filename=file.filename or "", characters=len(text), text=text)
