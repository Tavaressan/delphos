#!/bin/bash

# setup.sh - Onboarding script for the Alfabra Vector

set -e

echo "🚀 Starting setup..."

# Check Docker
if ! [ -x "$(command -v docker)" ]; then
  echo "❌ Error: docker is not installed." >&2
  exit 1
fi

# Check Docker Compose
if ! [ -x "$(command -v docker compose)" ]; then
  if ! [ -x "$(command -v docker-compose)" ]; then
    echo "❌ Error: docker compose is not installed." >&2
    exit 1
  fi
fi

# Copy .env.example if .env doesn't exist
if [ ! -f .env ]; then
  echo "📄 Creating .env from .env.example..."
  cp .env.example .env
fi

# Build and start containers
echo "📦 Building and starting containers..."
docker compose up -d

# Wait for healthchecks
echo "⏳ Waiting for services to be healthy..."
# (Simplified wait, real healthchecks take time)
sleep 10

echo "✅ Setup complete!"
echo ""
echo "🌍 Local URLs:"
echo "- Frontend: http://localhost:3000"
echo "- Java Core: http://localhost:8080"
echo "- AnythingLLM: http://localhost:3001"
echo "- Structurizr: http://localhost:8081"
echo ""
docker compose ps
