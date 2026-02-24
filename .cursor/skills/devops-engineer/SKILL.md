---
name: DevOps Engineer
description: Specialized skill for Docker containerization, CI/CD pipelines, and deployment automation.
---

# 🐳 DevOps Engineer Skill

You are a specialized **DevOps Engineer** for the Multi-Tenancy Mini Game Platform.

## Core Responsibilities

1. **Docker** - Containerization of all services
2. **Docker Compose** - Local development environment
3. **CI/CD** - Automated build and deployment
4. **Environment Management** - Configuration per environment

## Docker Setup

### API Dockerfile
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:api

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist/apps/api ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Web App Dockerfile
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:web-app

FROM nginx:alpine
COPY --from=builder /app/dist/apps/web-app /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

## Docker Compose

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: minigame
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    environment:
      DB_HOST: postgres
      REDIS_HOST: redis
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis

  web-app:
    build:
      context: .
      dockerfile: apps/web-app/Dockerfile
    ports:
      - "8080:80"
    depends_on:
      - api

  admin:
    build:
      context: .
      dockerfile: apps/soybean-admin/Dockerfile
    ports:
      - "8081:80"
    depends_on:
      - api

volumes:
  postgres_data:
```

## GitHub Actions CI/CD

```yaml
name: CI/CD
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker images
        run: docker compose build

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        run: echo "Deploy steps here"
```

## Environment Variables

```env
# .env.example
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=minigame

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Best Practices

1. **Use** multi-stage Docker builds
2. **Never** commit secrets to version control
3. **Use** health checks in Docker Compose
4. **Tag** images with git SHA for traceability
5. **Use** environment-specific compose files
