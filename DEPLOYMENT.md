# Deployment Guide

Complete deployment instructions for FlowPay to production environments.

## Deployment Strategies

### Blue-Green Deployment

Maintain two identical production environments:

```
┌─────────────────────────────────────────┐
│         Load Balancer                   │
└─────────────────────────────────────────┘
         ↗ (50% traffic)    ↘ (50% traffic)
    ┌─────────────┐      ┌─────────────┐
    │  Blue (v1)  │      │ Green (v2)  │
    │ Production  │      │ Staging     │
    └─────────────┘      └─────────────┘
```

1. Deploy to Green environment
2. Run smoke tests
3. Switch traffic to Green
4. Blue becomes new staging

### Rolling Deployment

Deploy gradually across multiple instances:

```
Instance 1: v1 → v2 (complete)
Instance 2: v1 → v2 (deploying)
Instance 3: v1 (waiting)

Then:
Instance 1: v2 ✓
Instance 2: v2 ✓
Instance 3: v1 → v2 (deploying)
```

## Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Database migrations tested
- [ ] Performance benchmarks acceptable
- [ ] Security scan passed
- [ ] Dependencies up-to-date
- [ ] Changelog updated
- [ ] Documentation updated
- [ ] Rollback plan prepared

## Deployment Process

### Step 1: Prepare Release

```bash
# Verify current version
npm version

# Update version numbers
npm version patch|minor|major

# Generate changelog
npm run changelog

# Commit version bump
git commit -m "chore(release): v1.0.1"
git tag v1.0.1
git push origin main --tags
```

### Step 2: Build Artifacts

```bash
# Build frontend
cd frontend && npm run build

# Build backend
cd backend && npm run build

# Create Docker images
docker build -t flowpay-api:v1.0.1 -f backend/Dockerfile ./backend
docker build -t flowpay-web:v1.0.1 -f frontend/Dockerfile ./frontend

# Push to registry
docker push myregistry.azurecr.io/flowpay-api:v1.0.1
docker push myregistry.azurecr.io/flowpay-web:v1.0.1
```

### Step 3: Database Migration

```bash
# Test migration locally
npm run db:migrate:test

# Run migration on staging
npm run db:migrate -- --env staging

# Verify migration
npm run db:verify -- --env staging

# Run on production
npm run db:migrate -- --env production
```

### Step 4: Deploy to Staging

```bash
# Update deployment manifest
kubectl set image deployment/flowpay-api \
  flowpay-api=myregistry.azurecr.io/flowpay-api:v1.0.1 \
  --namespace staging

# Wait for rollout
kubectl rollout status deployment/flowpay-api -n staging

# Run integration tests
npm run test:e2e -- --env staging

# Monitor logs
kubectl logs -f deployment/flowpay-api -n staging
```

### Step 5: Promote to Production

```bash
# Create deployment for production
kubectl set image deployment/flowpay-api \
  flowpay-api=myregistry.azurecr.io/flowpay-api:v1.0.1 \
  --namespace production

# Verify rollout
kubectl rollout status deployment/flowpay-api -n production

# Health check
curl https://api.flowpay.dev/health

# Smoke tests
npm run test:smoke -- --env production
```

## Monitoring Post-Deployment

### Metrics to Monitor

```
- Response time (p50, p95, p99)
- Error rate
- CPU usage
- Memory usage
- Database connections
- Active user sessions
```

### Alerting

```
Warning:
- Error rate > 1%
- Response time p99 > 500ms
- Memory usage > 80%

Critical:
- Error rate > 5%
- Service unavailable
- Database connection pool exhausted
```

## Rollback Procedures

### Immediate Rollback (Error within 5 minutes)

```bash
# Revert to previous version
kubectl rollout undo deployment/flowpay-api -n production

# Verify rollback
kubectl get pods -n production

# Check logs
kubectl logs -f deployment/flowpay-api -n production
```

### Database Rollback (if needed)

```bash
# Revert to previous migration
npm run db:rollback -- --env production --steps 1

# Verify data integrity
npm run db:verify -- --env production
```

### Full Rollback (Major issues)

1. Switch traffic to previous version
2. Restore database from backup
3. Clear caches
4. Notify stakeholders
5. Create incident report

## Deployment Environments

### Staging Environment

**Purpose:** Pre-production validation
**Frequency:** On every pull request merge
**Downtime:** Acceptable for testing
**Database:** Copy of production (anonymized)

```yaml
# staging-values.yaml
replicas: 2
environment: staging
stellarNetwork: testnet
```

### Production Environment

**Purpose:** Live user traffic
**Frequency:** On-demand releases
**Downtime:** Zero-downtime deployments
**Database:** Live production data

```yaml
# production-values.yaml
replicas: 3
environment: production
stellarNetwork: public
```

## Infrastructure as Code

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flowpay-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: flowpay-api
  template:
    metadata:
      labels:
        app: flowpay-api
    spec:
      containers:
      - name: api
        image: myregistry.azurecr.io/flowpay-api:v1.0.1
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: flowpay-secrets
              key: database-url
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
```

## Secrets Management

### Store secrets in vault:

```bash
# Azure Key Vault
az keyvault secret set --vault-name flowpay-prod \
  --name database-password --value $DB_PASSWORD

# Reference in deployment
kubectl create secret generic flowpay-secrets \
  --from-literal=database-url=$DATABASE_URL
```

## Post-Deployment Verification

```bash
# 1. Check API health
curl https://api.flowpay.dev/health

# 2. Run smoke tests
npm run test:smoke

# 3. Verify database connectivity
npm run db:verify

# 4. Check payment endpoints
curl -H "Authorization: Bearer $TEST_TOKEN" \
  https://api.flowpay.dev/api/v1/payments

# 5. Monitor error logs
kubectl logs -f deployment/flowpay-api -n production
```

## Automated CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    tags: ['v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build and test
        run: npm run build && npm run test
      
      - name: Build Docker image
        run: docker build -t flowpay-api:${{ github.ref }} .
      
      - name: Push to registry
        run: docker push myregistry.azurecr.io/flowpay-api:${{ github.ref }}
      
      - name: Deploy to production
        run: kubectl set image deployment/flowpay-api flowpay-api=myregistry.azurecr.io/flowpay-api:${{ github.ref }}
```

## Deployment Calendar

| Environment | Frequency | Owner | Window |
|------------|-----------|-------|--------|
| Staging | Per PR | DevOps | Anytime |
| Production | Weekly | Release Manager | Tuesday 2-4 AM UTC |

## Support & Incident Response

**Deployment Issues:**
- Slack: #deployments
- PagerDuty: Escalation
- Runbook: /docs/runbooks/deployment-issues.md

**Post-mortem:**
- Create after significant incidents
- Include root cause analysis
- Document preventive measures
