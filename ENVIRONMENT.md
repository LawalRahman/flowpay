# Environment Configuration Guide

Comprehensive guide to configuring FlowPay for different environments.

## Environment Variables

### Shared Variables (All Environments)

```bash
# Application
APP_NAME=FlowPay
APP_VERSION=0.1.0

# Server
NODE_ENV=production|development|test
LOG_LEVEL=info|debug|warn|error

# Stellar Network
STELLAR_NETWORK=testnet|public
STELLAR_SERVER_URL=https://horizon-testnet.stellar.org
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org:443
```

### Backend Variables

```bash
# Server Configuration
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/flowpay
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT=30000

# JWT
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRATION=24h
JWT_ALGORITHM=HS256

# API
API_VERSION=v1
API_PREFIX=/api
CORS_ORIGIN=http://localhost:5173,https://flowpay.dev

# Stellar
STELLAR_ACCOUNT_SECRET=SXX... # Only for backend service account
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# Email
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=noreply@flowpay.dev
MAIL_PASSWORD=your-app-password

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
LOG_PATH=/var/log/flowpay

# Cache (Optional)
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend Variables

```bash
# API Configuration
VITE_API_URL=http://localhost:3000
VITE_API_TIMEOUT=30000

# Application
VITE_APP_NAME=FlowPay
VITE_APP_VERSION=0.1.0

# Environment
VITE_ENV=development|staging|production

# Stellar
VITE_STELLAR_NETWORK=testnet|public

# Features
VITE_FEATURE_STREAMING_PAYMENTS=true|false
VITE_FEATURE_DRIP_WORKFLOWS=true|false
VITE_FEATURE_ADVANCED_ANALYTICS=true|false

# Analytics
VITE_GTAG_ID=G_...

# Debug
VITE_DEBUG=true|false
```

## Environment Profiles

### Development Environment

**.env.development.local:**
```bash
NODE_ENV=development
LOG_LEVEL=debug
DATABASE_URL=sqlite:./flowpay.db
JWT_SECRET=dev-secret-key
STELLAR_NETWORK=testnet
MAIL_HOST=localhost
MAIL_PORT=1025
```

**Purpose:** Local development with hot reload
**Database:** SQLite (file-based)
**Stellar:** Testnet
**Email:** Mailhog (local SMTP)

### Staging Environment

**.env.staging:**
```bash
NODE_ENV=production
LOG_LEVEL=info
DATABASE_URL=postgresql://user:pass@db.staging.internal:5432/flowpay
JWT_SECRET=staging-secret-key-strong
STELLAR_NETWORK=testnet
MAIL_HOST=smtp.staging.internal
DATABASE_POOL_SIZE=10
```

**Purpose:** Pre-production testing and validation
**Database:** PostgreSQL (managed)
**Stellar:** Testnet
**Email:** Real SMTP server

### Production Environment

**.env.production:**
```bash
NODE_ENV=production
LOG_LEVEL=warn
DATABASE_URL=postgresql://prod_user:$PROD_PASSWORD@db.production.internal:5432/flowpay
JWT_SECRET=$JWT_SECRET_PROD # From secrets manager
STELLAR_NETWORK=public
MAIL_HOST=smtp.sendgrid.net
DATABASE_POOL_SIZE=40
SENTRY_DSN=$SENTRY_DSN_PROD
```

**Purpose:** Production deployment
**Database:** PostgreSQL (replicated)
**Stellar:** Public network
**Email:** SendGrid or similar service

## Configuration Best Practices

### Secret Management

```bash
# ✅ Use environment variables
STRIPE_API_KEY=$STRIPE_API_KEY

# ❌ Never commit secrets
# STRIPE_API_KEY=sk_live_...

# ✅ Use secrets manager (AWS Secrets Manager, HashiCorp Vault)
DATABASE_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id prod/database-password)

# ✅ Use service accounts for API keys
STELLAR_ACCOUNT=SA... # Service account, not user account
```

### Configuration Validation

```bash
# Create .env.example with all required variables
cp .env.example .env.development.local

# Validate configuration on startup
node scripts/validate-config.js
```

### Database Configuration

```bash
# Development - SQLite
DATABASE_URL=sqlite:./data/flowpay.db

# Staging/Production - PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/database
# Connection pooling
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
DATABASE_IDLE_TIMEOUT=900000
DATABASE_STATEMENT_TIMEOUT=30000
```

## Runtime Configuration

### Logging Configuration

```javascript
// src/config/logger.ts
const logConfig = {
  development: {
    level: 'debug',
    format: 'pretty',
    colorize: true,
  },
  production: {
    level: 'warn',
    format: 'json',
    colorize: false,
    sentry: true,
  },
};
```

### Feature Flags

```typescript
// src/config/features.ts
export const features = {
  streamingPayments: process.env.FEATURE_STREAMING === 'true',
  dripWorkflows: process.env.FEATURE_DRIPS === 'true',
  advancedAnalytics: process.env.FEATURE_ANALYTICS === 'true',
  betaFeatures: process.env.NODE_ENV !== 'production',
};
```

### CORS Configuration

```typescript
// src/config/cors.ts
export const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
```

## Environment-Specific Startup

### Development Startup

```bash
# Hot reload with debugging
PORT=3000 npm run dev

# With database reset
npm run db:reset && npm run dev

# With seed data
npm run db:seed && npm run dev
```

### Production Startup

```bash
# Health checks before startup
npm run health-check

# Run migrations
npm run db:migrate

# Start application
npm start

# With graceful shutdown
NODE_ENV=production npm start
```

## Configuration Files Hierarchy

```
1. .env.production            # Environment-specific (gitignored)
2. .env.production.local      # Local overrides (gitignored)
3. .env                       # Defaults (committed)
4. config/default.json        # Default config
```

## Troubleshooting Configuration

### Common Issues

```bash
# Config not loading
Error: Missing required environment variable DATABASE_URL

Solution:
1. Check .env file exists
2. Verify variable name spelling
3. Ensure file is loaded before app start

# Wrong environment being used
console.log(process.env.NODE_ENV) // undefined

Solution:
NODE_ENV=production npm start
```

## Configuration Loading Order

1. Load `.env` file (default values)
2. Load environment-specific file (`.env.${NODE_ENV}`)
3. Load local overrides (`.env.local`, `.env.${NODE_ENV}.local`)
4. Load runtime environment variables
5. Validate required variables
6. Log loaded configuration (redact secrets)
