#!/bin/bash

# dev.sh - Development script

if command -v pre-commit &> /dev/null; then
  pre-commit install
fi

echo "🛠️ Starting environment in dev mode..."
# --force-recreate: env_file (.env) só é lido na criação do container — sem esta flag,
# editar o .env e rodar `up` de novo não recria containers já existentes com as vars
# antigas congeladas (issue #389).
docker compose up --build --force-recreate $1
