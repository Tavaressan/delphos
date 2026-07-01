#!/bin/bash

# dev.sh - Development script

if command -v pre-commit &> /dev/null; then
  pre-commit install
fi

echo "🛠️ Starting environment in dev mode..."
docker compose up --build $1
