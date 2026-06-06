# Deployment Guide

## Frontend Deployment

### Vercel

Vercel provides the easiest deployment for React + Vite apps.

**Steps:**

1. Push code to GitHub
2. Connect repository to Vercel at https://vercel.com/new
3. Select `frontend` as root directory
4. Add environment variables:
   - `VITE_API_URL`: Production backend URL
   - `VITE_STELLAR_NETWORK`: testnet or public
5. Deploy

### Netlify

Alternative to Vercel:

```bash
npm run build
# Upload dist/ folder to Netlify
```

Or use Netlify CLI:

```bash
npm install -g netlify-cli
netlify deploy --prod --dir dist
```

---

## Backend Deployment

### Railway

Railway provides managed Node.js hosting.

**Steps:**

1. Push code to GitHub
2. Create new project at https://railway.app
3. Connect GitHub repository
4. Select `backend` as root directory
5. Add environment variables:
   - `DATABASE_URL`: PostgreSQL URL
   - `JWT_SECRET`: Strong secret key
   - `STELLAR_SECRET_KEY`: Your Stellar key
   - `STELLAR_NETWORK`: testnet or public
   - `NODE_ENV`: production
6. Deploy

### Render

Alternative backend hosting:

```bash
# Create render.yaml in project root
```

---

## Database Deployment

### Neon (PostgreSQL)

Neon provides serverless PostgreSQL.

**Steps:**

1. Create account at https://neon.tech
2. Create new project
3. Get connection string: `postgresql://...`
4. Update `DATABASE_URL` in backend deployment

### Cloud Options

- **AWS RDS**: Managed PostgreSQL
- **DigitalOcean**: VPS with PostgreSQL
- **Azure Database**: Azure PostgreSQL service
- **Google Cloud**: Cloud SQL for PostgreSQL

---

## Smart Contracts Deployment

### Testnet Deployment

```bash
# Build contracts
cd contracts
cargo build --target wasm32-unknown-unknown --release

# Deploy with Soroban CLI
soroban contract deploy \
  --network testnet \
  --source <your-account-keypair> \
  --wasm target/wasm32-unknown-unknown/release/payment_pool.wasm
```

### Mainnet Deployment

```bash
# Same command with different network
soroban contract deploy \
  --network public \
  --source <your-account-keypair> \
  --wasm target/wasm32-unknown-unknown/release/payment_pool.wasm
```

---

## Environment Variables

### Frontend (.env.production)

```
VITE_API_URL=https://api.example.com
VITE_STELLAR_NETWORK=testnet
VITE_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
```

### Backend (.env.production)

```
NODE_ENV=production
API_PORT=3001
DATABASE_URL=postgresql://user:pass@host/flowpay
JWT_SECRET=<strong-secret-key>
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_SECRET_KEY=<your-secret-key>
```

---

## DNS & Domain Setup

### 1. Register Domain

Register at GoDaddy, Namecheap, or your preferred registrar.

### 2. Point DNS Records

**Frontend (Vercel):**
```
CNAME flowpay.example.com vercel.app
```

**Backend (Railway):**
```
CNAME api.example.com <railway-domain>
```

### 3. SSL Certificates

Most platforms provide automatic SSL:
- Vercel: Automatic
- Railway: Automatic
- Custom: Use Let's Encrypt (certbot)

---

## Monitoring & Logging

### Application Monitoring

- **Sentry** for error tracking
- **New Relic** for performance monitoring
- **Loggly** for centralized logging

### Add to Backend

```bash
npm install @sentry/node
```

### Database Monitoring

- Monitor connection pool usage
- Set up automated backups
- Configure query performance logging

---

## Security Checklist

- [ ] Environment variables secured (never commit .env)
- [ ] Database backups configured
- [ ] SSL/TLS certificates installed
- [ ] Rate limiting enabled on API
- [ ] CORS configured correctly
- [ ] Secret key rotated periodically
- [ ] Dependency vulnerabilities scanned
- [ ] Smart contracts audited (before mainnet)

---

## Rollback Procedure

### Frontend (Vercel)

```
Vercel Dashboard > Deployments > Select Previous Version > Rollback
```

### Backend (Railway)

```
Railway Dashboard > Select Previous Deployment
```

### Database

Keep automated backups enabled for point-in-time recovery.

---

## Performance Optimization

### Frontend

```bash
npm run build
# Check bundle size
npm run build -- --analyze
```

### Backend

- Enable caching
- Use connection pooling
- Implement rate limiting
- Monitor memory usage

### Database

- Create indexes on frequently queried columns
- Monitor query performance
- Archive old transactions
- Regular VACUUM/ANALYZE

---

## Scaling Strategy

### Phase 1: Initial Launch
- Single backend instance
- Managed database (Neon)
- CDN for frontend

### Phase 2: Growth
- Backend load balancing
- Database read replicas
- Redis caching layer

### Phase 3: Enterprise
- Kubernetes orchestration
- Multi-region deployment
- Advanced monitoring/logging
