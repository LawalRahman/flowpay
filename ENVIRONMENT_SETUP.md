# Environment Setup

Complete environment setup guide for all deployment stages.

## Development Environment

### Prerequisites

```bash
# Node.js (via nvm)
nvm install 22.22.3
nvm use 22.22.3

# Package managers
npm install -g yarn@1.22.22
npm install -g pnpm@8.0.0

# Docker (optional but recommended)
docker --version
docker-compose --version

# PostgreSQL client
brew install postgresql
psql --version
```

### Local Setup

```bash
# Clone repository
git clone https://github.com/yourusername/flowpay-stellar.git
cd flowpay-stellar

# Install dependencies
yarn install

# Create .env file
cp .env.example .env.development

# Edit configuration
nano .env.development
```

### .env.development

```bash
# Server
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=flowpay_dev
DB_PASSWORD=dev-password
DATABASE_URL=postgresql://flowpay_dev:dev-password@localhost:5432/flowpay_dev

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=dev-secret-key-very-insecure-for-development-only

# Stellar
STELLAR_NETWORK=testnet
STELLAR_PUBLIC_KEY=YOUR_TESTNET_PUBLIC_KEY
STELLAR_SECRET_KEY=YOUR_TESTNET_SECRET_KEY

# Frontend
VITE_API_URL=http://localhost:3000
VITE_STELLAR_NETWORK=testnet

# Optional
DEBUG=flowpay:*
```

### Start Development

```bash
# Start PostgreSQL
docker run --name flowpay-postgres \
  -e POSTGRES_USER=flowpay_dev \
  -e POSTGRES_PASSWORD=dev-password \
  -e POSTGRES_DB=flowpay_dev \
  -p 5432:5432 \
  postgres:15-alpine

# Start Redis
docker run --name flowpay-redis \
  -p 6379:6379 \
  redis:7-alpine

# In terminal 1: Backend
yarn backend dev

# In terminal 2: Frontend
yarn frontend dev

# In terminal 3: Database migrations
yarn prisma migrate dev
```

## Staging Environment

### AWS Setup

```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier flowpay-staging \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password "STRONG_PASSWORD" \
  --allocated-storage 100 \
  --publicly-accessible false

# Create ElastiCache
aws elasticache create-cache-cluster \
  --cache-cluster-id flowpay-staging-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1
```

### .env.staging

```bash
# Server
NODE_ENV=staging
PORT=3000
LOG_LEVEL=info

# Database
DB_HOST=flowpay-staging.c5kmdvnm.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_USER=admin
DB_PASSWORD=STRONG_PASSWORD
DATABASE_URL=postgresql://admin:STRONG_PASSWORD@flowpay-staging.c5kmdvnm.us-east-1.rds.amazonaws.com:5432/flowpay

# Redis
REDIS_HOST=flowpay-staging-redis.xxxx.ng.0001.use1.cache.amazonaws.com
REDIS_PORT=6379

# JWT
JWT_SECRET=$(openssl rand -base64 32)

# Stellar
STELLAR_NETWORK=testnet
STELLAR_PUBLIC_KEY=STAGING_PUBLIC_KEY
STELLAR_SECRET_KEY=STAGING_SECRET_KEY

# Frontend
VITE_API_URL=https://api-staging.flowpay.stellar
VITE_STELLAR_NETWORK=testnet

# Monitoring
SENTRY_DSN=https://xxxx@sentry.io/xxx
DATADOG_API_KEY=xxx
```

### Deployment

```bash
# Build Docker images
docker build -t flowpay-backend:staging backend/
docker build -t flowpay-frontend:staging frontend/

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

docker tag flowpay-backend:staging 123456789.dkr.ecr.us-east-1.amazonaws.com/flowpay-backend:staging
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/flowpay-backend:staging

# Deploy with Kubernetes
kubectl apply -f k8s/staging/ -n flowpay-staging
kubectl set image deployment/backend backend=123456789.dkr.ecr.us-east-1.amazonaws.com/flowpay-backend:staging -n flowpay-staging
```

## Production Environment

### .env.production

```bash
# Server
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn

# Database (Aurora PostgreSQL)
DB_HOST=flowpay-prod.xxxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_USER=admin
DB_PASSWORD=STRONG_PRODUCTION_PASSWORD
DATABASE_URL=postgresql://admin:STRONG_PRODUCTION_PASSWORD@flowpay-prod-cluster.cluster-xxxxx.us-east-1.rds.amazonaws.com:5432/flowpay_prod

# Redis (ElastiCache Multi-AZ)
REDIS_HOST=flowpay-prod-redis.xxxxx.ng.0001.use1.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=REDIS_AUTH_TOKEN

# JWT (must be extremely secure)
JWT_SECRET=$(openssl rand -base64 64)
JWT_EXPIRATION=86400

# Stellar (Mainnet keys - stored in AWS Secrets Manager)
STELLAR_NETWORK=public
STELLAR_PUBLIC_KEY=PRODUCTION_PUBLIC_KEY
STELLAR_SECRET_KEY=PRODUCTION_SECRET_KEY_FROM_SECRETS_MANAGER

# Frontend
VITE_API_URL=https://api.flowpay.stellar
VITE_STELLAR_NETWORK=public

# CDN
CDN_URL=https://cdn.flowpay.stellar

# Monitoring & Logging
SENTRY_DSN=https://prod@sentry.io/prod-project
DATADOG_API_KEY=prod-datadog-key
LOG_AGGREGATION_ENDPOINT=https://logs.prod.flowpay.stellar

# Security
CORS_ORIGINS=https://flowpay.stellar,https://www.flowpay.stellar
SSL_CERT_PATH=/etc/ssl/certs/flowpay.crt
SSL_KEY_PATH=/etc/ssl/private/flowpay.key
```

### Production Checklist

```bash
# 1. Database Backups
aws rds create-db-snapshot \
  --db-instance-identifier flowpay-prod \
  --db-snapshot-identifier flowpay-prod-$(date +%Y%m%d-%H%M%S)

# 2. Enable Multi-AZ
aws rds modify-db-instance \
  --db-instance-identifier flowpay-prod \
  --multi-az

# 3. Enable automated backups
aws rds modify-db-instance \
  --db-instance-identifier flowpay-prod \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00"

# 4. Enable encryption
aws rds modify-db-instance \
  --db-instance-identifier flowpay-prod \
  --storage-encrypted

# 5. Enable monitoring
aws rds modify-db-instance \
  --db-instance-identifier flowpay-prod \
  --enable-cloudwatch-logs-exports postgresql

# 6. Set up CloudWatch alarms
aws cloudwatch put-metric-alarm \
  --alarm-name flowpay-prod-high-cpu \
  --alarm-actions arn:aws:sns:us-east-1:123456789:alerts \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold
```

### Secrets Management

```bash
# Store secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name flowpay/production/jwt-secret \
  --secret-string $(openssl rand -base64 64)

aws secretsmanager create-secret \
  --name flowpay/production/stellar-secret-key \
  --secret-string "STELLAR_SECRET_KEY"

aws secretsmanager create-secret \
  --name flowpay/production/database-password \
  --secret-string "DB_PASSWORD"

# Retrieve secrets
aws secretsmanager get-secret-value \
  --secret-id flowpay/production/jwt-secret \
  --query SecretString \
  --output text
```

### Kubernetes Production Setup

```bash
# Create namespace
kubectl create namespace flowpay-prod

# Create secrets from AWS Secrets Manager
kubectl create secret generic flowpay-secrets \
  --from-literal=jwt-secret="$(aws secretsmanager get-secret-value --secret-id flowpay/production/jwt-secret --query SecretString --output text)" \
  -n flowpay-prod

# Deploy
kubectl apply -f k8s/production/ -n flowpay-prod

# Verify deployment
kubectl get pods -n flowpay-prod
kubectl get svc -n flowpay-prod

# Check logs
kubectl logs -f deployment/backend -n flowpay-prod
```

## Environment Variables Reference

| Variable | Development | Staging | Production | Required |
|----------|-------------|---------|------------|----------|
| NODE_ENV | development | staging | production | ✅ |
| PORT | 3000 | 3000 | 3000 | ✅ |
| LOG_LEVEL | debug | info | warn | ✅ |
| DATABASE_URL | local | RDS | Aurora | ✅ |
| REDIS_HOST | localhost | ElastiCache | ElastiCache | ✅ |
| JWT_SECRET | dev-secret | random | random-64-char | ✅ |
| STELLAR_NETWORK | testnet | testnet | public | ✅ |
| SENTRY_DSN | optional | ✅ | ✅ | - |
| DATADOG_API_KEY | optional | ✅ | ✅ | - |

## Secrets Best Practices

✅ **Do:**
- Use AWS Secrets Manager
- Rotate secrets regularly
- Use strong passwords (>32 chars)
- Never commit secrets
- Use different secrets per environment
- Audit secret access
- Use IAM roles for access

❌ **Don't:**
- Commit .env files
- Use default passwords
- Share secrets via email
- Log secrets
- Use weak passwords
- Hardcode values
- Reuse production secrets

## Deployment Commands

```bash
# Development
yarn dev

# Staging
docker-compose -f docker-compose.staging.yml up
kubectl apply -f k8s/staging/

# Production
kubectl apply -f k8s/production/
kubectl rollout status deployment/backend -n flowpay-prod
```

## Resources

- [AWS Best Practices](https://aws.amazon.com/architecture/best-practices/)
- [Kubernetes Production Guidelines](https://kubernetes.io/docs/concepts/configuration/overview/)
- [Environment Variables](https://12factor.net/config)
