#!/bin/bash
# MiniGame Production Startup Script

set -e

echo "🎮 Starting MiniGame Platform..."

# Load production environment
export $(cat .env.production | grep -v '^#' | xargs)

# Build and start all services
echo "📦 Building Docker images..."
docker compose -f docker-compose.prod.yml build

echo "🚀 Starting services..."
docker compose -f docker-compose.prod.yml up -d

echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🔍 Checking service status..."
docker compose -f docker-compose.prod.yml ps

echo ""
echo "✅ MiniGame Platform is running!"
echo ""
echo "📍 URLs:"
echo "   API:    https://api.xseo.me"
echo "   Admin:  https://admin.xseo.me"
echo "   Game:   https://game.xseo.me"
echo ""
echo "📋 Useful commands:"
echo "   View logs:    docker compose -f docker-compose.prod.yml logs -f"
echo "   Stop:         docker compose -f docker-compose.prod.yml down"
echo "   Restart:      docker compose -f docker-compose.prod.yml restart"
