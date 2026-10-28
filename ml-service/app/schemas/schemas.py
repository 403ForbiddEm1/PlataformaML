from typing import Optional

from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    vacancy_text: str = Field(..., min_length=3, description="Requisitos de la vacante")
    candidate_text: str = Field(..., min_length=3, description="Resumen de la hoja de vida")


class CandidateIn(BaseModel):
    id: str
    text: str


class RankRequest(BaseModel):
    vacancy_text: str = Field(..., min_length=3)
    candidates: list[CandidateIn] = Field(..., min_length=1)


class PredictResponse(BaseModel):
    score: float = Field(..., description="Probabilidad de aptitud (0 a 100)")
    recommended: bool
    similarity: float = Field(..., description="Similitud de texto TF-IDF (0 a 100)")
    experience_ok: Optional[bool] = Field(None, description="Cumple la experiencia mínima; null si la vacante no la pide")
    matched_terms: list[str]


class ScoreOut(PredictResponse):
    id: str


class RankResponse(BaseModel):
    results: list[ScoreOut]


class ExtractResponse(BaseModel):
    filename: str
    characters: int = Field(..., description="Cantidad de caracteres del texto extraído")
    text: str
