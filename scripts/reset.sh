#!/bin/bash

# reset.sh - Full reset of the environment

echo "⚠️ Resetting environment (removing volumes and images)..."
docker compose down -v --rmi all
echo "✨ Environment reset."
