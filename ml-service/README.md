# ml-service

Servicio de aprendizaje automático (Python + FastAPI) de la plataforma de reclutamiento y selección de personal.
Es un **clasificador supervisado**: dado el texto de una vacante y el de un candidato, devuelve la
**probabilidad de que el candidato sea apto**.

## Cómo funciona

1. **Preprocesamiento** (`preprocessing/preprocess.py`): minúsculas, sin tildes ni signos, sin palabras vacías, y
   **diccionario de sinónimos** (`preprocessing/synonyms.py`: "Node" = "Node.js", "Postgres" = "PostgreSQL", "programador" =
   "desarrollador", "UCI" = "cuidados intensivos"... con términos de tecnología, salud, contabilidad, educación, derecho,
   construcción, ventas y oficios). Los **años** se leen como "5 años", "cinco años", "5+ años", "más de 5 años", "3 a 5 años"
   (toma 3), "18 meses" y "5 years"; la edad ("tengo 28 años") no cuenta.
2. **Variables** (`preprocessing/features.py`), 8 en total y **ninguna depende de cuán largo es el CV**: cobertura de los
   términos de la vacante, cobertura ponderada por rareza de los términos (`idf_coverage`), términos en común, años del
   candidato, años pedidos, diferencia de años, si cumple la experiencia y si el candidato no declaró su experiencia
   (`exp_unknown`). La similitud del coseno se calcula solo para mostrarla (`similarity`) y como línea base.
3. **Entrenamiento y comparación** (`models/train.py`): se entrenan y comparan tres algoritmos de scikit-learn con las
   mismas particiones y las mismas métricas: **regresión logística**, **random forest** y **red neuronal** (perceptrón
   multicapa), con pares vacante-candidato etiquetados (1 = apto, 0 = no apto). La división entrenamiento/prueba es
   **por vacante**, para evitar fuga de información. El modelo activo se elige con el mayor promedio de F1 en validación
   cruzada **usando solo los datos de entrenamiento**; el conjunto de prueba no interviene en la elección. El
   algoritmo activo por defecto es la regresión logística (`ML_MODEL=regresion_logistica`, ver `config.py`): con datos
   simulados los tres rinden casi igual y fue la más estable en las pruebas de simulación. Con `ML_MODEL=` (vacío) se elige
   automáticamente el de mayor F1; `metrics.json` registra cuál ganó por F1 (`best_by_criterion`) y por qué se eligió otro.
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
pytest                                # pruebas automáticas (deben pasar todas)
python -m app.models.train            # entrena y guarda las métricas
python -m app.models.evaluation       # métricas + validación cruzada
python -m app.models.sanity_check     # casos claros, robustez y prueba de etiquetas barajadas
python -m app.models.expo_check       # simulación multiempresa: 7 vacantes, 57 candidatos escritos a mano
python -m app.models.expo_check --ciega   # segunda simulación, otros rubros (46 candidatos)
```
Si cambias el código de variables o el diccionario, reentrena (`python -m app.models.train`). Un modelo guardado con
variables distintas se reentrena solo al arrancar.

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

En la respuesta, `experience_ok` es `null` si la vacante no pide años **o** si el candidato no dijo cuánta experiencia
tiene; `experience_declared` (nuevo, `true`/`false`) indica si la declaró. Un CV sin años no se descarta: se le da el
beneficio de la duda y la interfaz puede avisarle al reclutador que revise ese dato.

**GET /metrics** — métricas del último entrenamiento y comparación de los tres algoritmos. **POST /train** — reentrena y devuelve las métricas.
**GET /health** — `{ "status": "ok" }`

## Limitaciones (decirlas en el informe)

- `data/raw/pairs.csv` es **simulado**: 1.800 pares generados con reglas (19 rubros; cumplir al menos el 75 % de los
  requisitos y la experiencia mínima, con 4 % de etiquetas invertidas como ruido). El modelo aprende esas reglas, así que las
  métricas son **ilustrativas** y no demuestran desempeño real. Con etiquetas reales (decisiones de analistas sobre
  postulaciones autorizadas y anonimizadas) los resultados serán distintos.
- Las pruebas `expo_check` son pocos casos escritos a mano: orientativas, no una medida exacta.
- El diccionario de sinónimos cubre los rubros listados; una palabra que no esté (o con errores de ortografía) se compara
  como palabra exacta. Hay que ampliarlo cuando entren empresas de rubros nuevos.
- No distingue **especialidades dentro de un mismo oficio** (por ejemplo, profesor de educación física frente a una vacante
  de docente de matemáticas) ni entiende la gravedad de un requisito sobre otro.
- Los años se leen solo si están escritos como duración ("5 años", "cinco años"). No calcula experiencia a partir de
  fechas ("2018-2023").
- Es una ayuda para **ordenar** candidatos: la decisión final la toma el reclutador.
