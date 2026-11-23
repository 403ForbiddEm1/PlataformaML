"""Configuración del servicio de aprendizaje automático."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_RAW = BASE_DIR / "data" / "raw" / "pairs.csv"
METRICS_PATH = BASE_DIR / "data" / "processed" / "metrics.json"
MODEL_PATH = BASE_DIR / "trained-models" / "matching_model.joblib"

RANDOM_STATE = 42
# Algoritmo activo (regresion_logistica, random_forest o red_neuronal). Se aplica al entrenar.
# Por defecto: regresión logística. Con datos simulados los tres rinden casi igual (F1 de validación 0,79 a 0,83) y en dos
# pruebas de simulación independientes la regresión logística fue la más estable y la que menos candidatos aptos descartó;
# además es la más fácil de explicar. Para volver a elegir automáticamente el de mayor F1: ML_MODEL=  (vacío).
FORCED_MODEL = os.getenv("ML_MODEL", "regresion_logistica").strip()
# Probabilidad (0 a 1) a partir de la cual se marca a un candidato como "recomendado".
THRESHOLD = float(os.getenv("ML_THRESHOLD", "0.5"))

# Extracción de texto de hojas de vida (PDF/DOCX)
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
MIN_TEXT_CHARS = 20                  # menos caracteres se considera "sin texto procesable"
