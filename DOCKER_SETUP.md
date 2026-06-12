# Docker & Containerization

Complete Docker setup for FlowPay microservices.

## Overview

Containerization ensures consistent environments across development, staging, and production.

## Backend Dockerfile

```dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Build application
COPY backend ./backend
COPY tsconfig.json ./
RUN yarn backend build

# Production image
FROM node:22-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

# Copy built application
COPY --from=builder /app/backend/dist ./dist

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health/live', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3000

USER node

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

## Frontend Dockerfile

```dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY frontend ./frontend
COPY tsconfig.json ./
RUN yarn frontend build

# Nginx serving
FROM nginx:alpine

COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

## Nginx Configuration

```nginx
# nginx.conf
user nginx;
worker_processes auto;

events {
  worker_connections 1024;
}

http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;

  sendfile on;
  keepalive_timeout 65;
  gzip on;

  upstream backend {
    server backend:3000;
  }

  server {
    listen 80;
    server_name _;

    # Frontend
    location / {
      root /usr/share/nginx/html;
      try_files $uri /index.html;
    }

    # API proxy
    location /api {
      proxy_pass http://backend;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
      access_log off;
      return 200 "healthy\n";
      add_header Content-Type text/plain;
    }
  }
}
```

## Docker Compose

```yaml
# docker-compose.yml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: flowpay
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/flowpay
      REDIS_HOST: redis
      REDIS_PORT: 6379
      JWT_SECRET: ${JWT_SECRET}
      STELLAR_NETWORK: testnet
      STELLAR_PUBLIC_KEY: ${STELLAR_PUBLIC_KEY}
      STELLAR_SECRET_KEY: ${STELLAR_SECRET_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend/src:/app/backend/src
    command: yarn backend dev

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    ports:
      - "80:80"
    environment:
      VITE_API_URL: http://backend:3000
    depends_on:
      - backend
    volumes:
      - ./frontend/src:/app/frontend/src
```

## Environment Configuration

```bash
# .env.docker
NODE_ENV=development
PORT=3000

# Database
DB_HOST=postgres
DB_PORT=5432
DB_USER=flowpay
DB_PASSWORD=dev-password
DATABASE_URL=postgresql://flowpay:dev-password@postgres:5432/flowpay

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-dev-secret-key-here

# Stellar
STELLAR_NETWORK=testnet
STELLAR_PUBLIC_KEY=your-test-public-key
STELLAR_SECRET_KEY=your-test-secret-key

# Frontend
VITE_API_URL=http://localhost:3000
```

## Building Images

```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build backend

# Build with no cache
docker-compose build --no-cache

# Push to registry
docker tag flowpay-backend:latest your-registry/flowpay-backend:latest
docker push your-registry/flowpay-backend:latest
```

## Running Containers

```bash
# Start services
docker-compose up

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend

# Stop services
docker-compose stop

# Remove all containers and volumes
docker-compose down -v
```

## Multi-Stage Build

### Optimized Backend Build

```dockerfile
# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --only=prod && \
    yarn cache clean

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY backend ./backend
COPY tsconfig.json ./
RUN yarn backend build

# Stage 3: Runtime
FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./dist
EXPOSE 3000
USER node
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

## Image Optimization

```bash
# Check image size
docker images | grep flowpay

# Build with buildkit (faster, better caching)
DOCKER_BUILDKIT=1 docker build -f backend/Dockerfile -t flowpay-backend .

# Use .dockerignore to reduce context size
```

## Security Best Practices

```dockerfile
# Don't run as root
USER node

# Use specific versions
FROM node:22.0.0-alpine

# Multi-stage to reduce final image size
# Use Alpine for smaller images
# Scan for vulnerabilities
```

## Docker Networking

```yaml
networks:
  flowpay-network:
    driver: bridge

services:
  backend:
    networks:
      - flowpay-network
  postgres:
    networks:
      - flowpay-network
```

## Volume Management

```yaml
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  app_node_modules:
    driver: local
```

## Resource Limits

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

## Restart Policies

```yaml
services:
  backend:
    restart_policy:
      condition: on-failure
      delay: 5s
      max_attempts: 5
      window: 120s
```

## Best Practices

✅ **Do:**
- Use multi-stage builds
- Minimize image layers
- Use Alpine for smaller images
- Set resource limits
- Use health checks
- Use specific versions
- Run non-root users
- Scan for vulnerabilities

❌ **Don't:**
- Run as root in production
- Use latest tags
- Commit large files
- Expose secrets in images
- Ignore vulnerabilities
- Use huge base images

## References

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Docker Security](https://docs.docker.com/engine/security/)
