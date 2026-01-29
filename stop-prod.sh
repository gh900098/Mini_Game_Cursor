#!/bin/bash
# MiniGame Production Stop Script

echo "🛑 Stopping MiniGame Platform..."

docker compose -f docker-compose.prod.yml down

echo "✅ All services stopped."
