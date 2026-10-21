"""Configuración del servicio de aprendizaje automático."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_RAW = BASE_DIR / "data" / "raw" / "pairs.csv"
METRICS_PATH = BASE_DIR / "data" / "processed" / "metrics.json"
MODEL_PATH = BASE_DIR / "trained-models" / "matching_model.joblib"

RANDOM_STATE = 42
# Probabilidad (0 a 1) a partir de la cual se marca a un candidato como "recomendado".
THRESHOLD = float(os.getenv("ML_THRESHOLD", "0.5"))
