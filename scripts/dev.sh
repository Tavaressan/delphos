#!/bin/bash

# dev.sh - Development script

echo "🛠️ Starting environment in dev mode..."
docker compose up --build $1
