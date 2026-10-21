from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes import router
from app.models.predict import get_model


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_model()  # carga (o entrena) el modelo al arrancar
    yield


app = FastAPI(
    title="Servicio de ML - Plataforma de reclutamiento",
    description="Clasificación supervisada (regresión logística) de la aptitud de candidatos para una vacante.",
    version="2.0.0",
    lifespan=lifespan,
)
app.include_router(router)
