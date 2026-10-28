# ml-service

Servicio de aprendizaje automático (Python + FastAPI) de la plataforma de reclutamiento y selección de personal.
Es un **clasificador supervisado**: dado el texto de una vacante y el de un candidato, devuelve la
**probabilidad de que el candidato sea apto**.

## Cómo funciona

1. **Preprocesamiento** (`preprocessing/preprocess.py`): minúsculas, sin tildes ni signos, sin palabras vacías.
2. **Variables** (`preprocessing/features.py`): similitud TF-IDF, cobertura de los términos de la vacante,
   solapamiento (Jaccard), términos en común, extensión del perfil y **años de experiencia** (declarados vs. requeridos).
3. **Entrenamiento y comparación** (`models/train.py`): se entrenan y comparan tres algoritmos de scikit-learn con las
   mismas particiones y las mismas métricas: **regresión logística**, **random forest** y **red neuronal** (perceptrón
   multicapa), con pares vacante-candidato etiquetados (1 = apto, 0 = no apto). La división entrenamiento/prueba es
   **por vacante**, para evitar fuga de información. El modelo activo se elige con el mayor promedio de F1 en validación
   cruzada **usando solo los datos de entrenamiento**; el conjunto de prueba no interviene en la elección.
4. **Evaluación** (`models/evaluation.py`): exactitud, precisión, exhaustividad, F1, ROC-AUC y matriz de confusión de
   cada algoritmo, comparados con una **línea base** que solo usa la similitud del coseno. También hay validación
   cruzada agrupada por vacante para los tres algoritmos.
5. **Predicción** (`models/predict.py`): probabilidad (0 a 100), recomendación según un umbral y los términos
   que más pesaron en el resultado.

## Puesta en marcha

```bash
cd ml-service
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

python -m app.models.train         # entrena y guarda trained-models/matching_model.joblib + data/processed/metrics.json
python -m app.models.evaluation    # muestra métricas y validación cruzada
uvicorn app.main:app --reload      # http://127.0.0.1:8000/docs
pytest                             # pruebas
```
Si no existe `data/raw/pairs.csv`, se genera con `python -m app.preprocessing.synthetic_data`.

## Cómo comprobar que funciona

```bash
pytest                                # pruebas automáticas (deben pasar todas: 14)
python -m app.models.train            # entrena y guarda las métricas
python -m app.models.evaluation       # métricas + validación cruzada
python -m app.models.sanity_check     # casos claros, robustez y prueba de etiquetas barajadas
```

Para mejorar el modelo: agrega filas a `data/raw/pairs.csv` (columnas `vacancy_id`, `vacancy_text`,
`candidate_text`, `label`; usa un `vacancy_id` nuevo por cada vacante nueva) y vuelve a entrenar.
Después compara las métricas con las anteriores.

## Contrato de la API (para el backend)

**POST /predict**
```json
{ "vacancy_text": "Se busca desarrollador backend con mínimo 2 años de experiencia en Node.js, Express y PostgreSQL.",
  "candidate_text": "Desarrollador backend con 4 años de experiencia en Node.js, Express, PostgreSQL y Docker." }
```
Respuesta:
```json
{ "score": 94.88, "recommended": true, "similarity": 88.22, "experience_ok": true,
  "matched_terms": ["js express", "backend node", "desarrollador backend", "postgresql", "node js"] }
```
- `score`: probabilidad de aptitud (0 a 100). `recommended`: `score >= umbral` (por defecto 50).
- `similarity`: similitud de texto TF-IDF (0 a 100). `experience_ok`: `null` si la vacante no pide años.

**POST /rank** — varios candidatos para una vacante, ordenados de mayor a menor `score`
```json
{ "vacancy_text": "...", "candidates": [ { "id": "12", "text": "..." }, { "id": "13", "text": "..." } ] }
```
Respuesta: `{ "results": [ { "id": "12", "score": 94.88, "recommended": true, ... }, ... ] }`

**POST /extract** — recibe un archivo PDF o DOCX (campo `file`, multipart) y devuelve su texto: `{ "filename": "cv.pdf", "characters": 812, "text": "..." }`. Responde 415 si el formato no es PDF/DOCX y 422 si el documento no tiene texto procesable (por ejemplo, un escaneo).

**GET /metrics** — métricas del último entrenamiento y comparación de los tres algoritmos. **POST /train** — reentrena y devuelve las métricas.
**GET /health** — `{ "status": "ok" }`

## Limitaciones (decirlas en el informe)

- `data/raw/pairs.csv` es **simulado**: 360 pares generados con reglas (cumplir al menos 3 de 4 requisitos y la
  experiencia mínima, con 5 % de etiquetas invertidas como ruido). El modelo aprende esas reglas, así que las
  métricas son **ilustrativas** y no demuestran desempeño real. Con etiquetas reales (decisiones de analistas
  sobre postulaciones autorizadas y anonimizadas) los resultados serán distintos.
- La experiencia se detecta con el patrón "N años"; no entiende "tres años" escrito con letras.
- Las variables comparan **palabras**: no reconocen sinónimos (por ejemplo "programador" y "desarrollador").
- El servicio apoya la decisión; la selección final la toma una persona. Conviene revisar sesgos antes de usarlo
  con datos reales, y no incluir variables sensibles (género, edad, etc.).

## Notas sobre la comparación de algoritmos

- La red neuronal (`MLPClassifier`) no admite ponderación de clases en scikit-learn, por lo que se entrena sin ella;
  la regresión logística y el random forest sí usan ponderación balanceada.
- Para elegir el modelo, el vectorizador TF-IDF se ajusta una sola vez con todo el conjunto de entrenamiento; la
  validación cruzada de `evaluation.py` lo reajusta en cada partición.
- Con datos simulados las diferencias entre algoritmos son pequeñas y pueden cambiar con otros datos.
