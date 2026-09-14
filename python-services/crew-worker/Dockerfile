# syntax=docker/dockerfile:1
FROM python:3.14-slim
WORKDIR /app
# Instala a partir do lock totalmente pinado, não do requirements.txt: com as
# faixas abertas (crewai>=1.0.0, litellm, google-cloud-aiplatform>=1.60.0) o
# resolver do pip entra em backtracking patológico e chega a abortar com
# ResolutionTooDeep após ~69 min (run 31840315330, job 94895665829). Com todas
# as versões fixadas não há espaço de busca a percorrer.
# Regenerar após qualquer mudança em requirements.txt:
#   uv pip compile requirements.txt --python-version 3.11 \
#     --python-platform linux --no-header -o requirements.lock.txt
COPY requirements.lock.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.lock.txt
COPY src ./src
CMD ["python", "src/main.py"]
