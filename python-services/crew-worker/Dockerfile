# syntax=docker/dockerfile:1
FROM python:3.11-slim
WORKDIR /app
# Instala a partir do lockfile (versões exatas) em vez do requirements.txt: as
# restrições abertas das dependências diretas faziam o resolvedor do pip entrar
# em backtracking e o build não terminava. Ver requirements.txt para como
# regenerar o lock.
COPY requirements.lock .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.lock
COPY src ./src
CMD ["python", "src/main.py"]
