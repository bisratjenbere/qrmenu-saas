#!/bin/bash
set -euo pipefail

echo "🚀 Starting deployment..."

# 1. Pull new images
echo "📥 Pulling latest Docker images..."
docker compose -f docker-compose.prod.yml pull

# 2. Run database migrations in a temporary container
echo "🔄 Running database migrations..."
docker compose -f docker-compose.prod.yml run --rm \
  --entrypoint "" \
  api npx prisma migrate deploy

# 3. Start/update services
echo "⚡ Starting services..."
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# 4. Cleanup old images to free up space
echo "🧹 Cleaning up old Docker images..."
docker image prune -f

echo "🎉 Deployment successful!"
