# Performance Optimization Guide

Guide to optimizing FlowPay for performance and scalability.

## Performance Targets

| Metric | Target |
|--------|--------|
| API Response Time (p50) | < 100ms |
| API Response Time (p95) | < 500ms |
| Page Load Time | < 3s |
| Time to Interactive | < 5s |
| Database Query Time | < 50ms |

## Frontend Optimization

### Code Splitting

```typescript
// Dynamic imports for route-based code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Workflows = lazy(() => import('./pages/Workflows'));

<Suspense fallback={<Loading />}>
  <Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/workflows" element={<Workflows />} />
  </Routes>
</Suspense>
```

### Bundle Analysis

```bash
# Analyze bundle size
npm run build -- --analyze

# Identify large dependencies
npx webpack-bundle-analyzer dist/bundle.js
```

### Caching Strategy

```typescript
// Service Worker for offline support
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

// React Query caching
const { data } = useQuery(
  'payments',
  () => api.getPayments(),
  {
    staleTime: 5 * 60 * 1000,     // 5 minutes
    cacheTime: 10 * 60 * 1000,    // 10 minutes
  }
);
```

### Image Optimization

```html
<!-- WebP with fallback -->
<picture>
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Dashboard" />
</picture>

<!-- Responsive images -->
<img 
  src="dashboard-small.jpg"
  srcset="dashboard-medium.jpg 768px, dashboard-large.jpg 1920px"
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

## Backend Optimization

### Database Query Optimization

```typescript
// ✅ Good: Select only needed fields
const payments = await db.query(
  'SELECT id, amount, status FROM payments WHERE userId = $1',
  [userId]
);

// ❌ Bad: Select all fields
const payments = await db.query(
  'SELECT * FROM payments WHERE userId = $1',
  [userId]
);

// ✅ Good: Add indexes
CREATE INDEX idx_payments_userId_status ON payments(userId, status);

// ✅ Good: Use pagination
const payments = await db.query(
  'SELECT * FROM payments WHERE userId = $1 LIMIT $2 OFFSET $3',
  [userId, 20, 0]
);
```

### Connection Pooling

```typescript
// src/database/connection.ts
const pool = new Pool({
  max: 20,                    // Max connections
  idleTimeoutMillis: 30000,   // Close idle connections
  connectionTimeoutMillis: 2000,
});
```

### Caching Strategy

```typescript
// Cache frequently accessed data
import Redis from 'ioredis';

const redis = new Redis();

async function getPayments(userId: string) {
  const cacheKey = `payments:${userId}`;
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Fetch from database
  const payments = await db.query(
    'SELECT * FROM payments WHERE userId = $1',
    [userId]
  );
  
  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(payments));
  
  return payments;
}
```

### Async Processing

```typescript
// Use job queue for heavy operations
import Bull from 'bull';

const paymentQueue = new Bull('payments');

// Queue a job
paymentQueue.add(
  { paymentId: '123' },
  { delay: 1000, attempts: 3 }
);

// Process jobs
paymentQueue.process(async (job) => {
  const { paymentId } = job.data;
  await processPayment(paymentId);
});
```

## API Optimization

### Response Compression

```typescript
// app.module.ts
import * as compression from 'compression';

app.use(compression());  // Compress responses
```

### Rate Limiting

```typescript
// Prevent abuse and control load
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 requests per window
  keyGenerator: (req) => req.user.id, // Per user
});

app.use('/api/', limiter);
```

### Pagination

```typescript
// Implement cursor-based pagination
app.get('/payments', async (req, res) => {
  const limit = Math.min(req.query.limit || 20, 100);
  const cursor = req.query.cursor || 0;
  
  const payments = await db.query(
    'SELECT * FROM payments WHERE userId = $1 AND id > $2 LIMIT $3',
    [req.user.id, cursor, limit + 1]
  );
  
  const hasMore = payments.length > limit;
  
  res.json({
    data: payments.slice(0, limit),
    nextCursor: hasMore ? payments[limit].id : null,
  });
});
```

## Monitoring & Profiling

### Performance Metrics

```typescript
// Track performance
const start = Date.now();

const result = await expensiveOperation();

const duration = Date.now() - start;
logger.info(`Operation completed in ${duration}ms`);

// Alert if slow
if (duration > 1000) {
  metrics.slowQuery.increment();
}
```

### APM Integration

```typescript
// Instrument with New Relic or Datadog
import newrelic from 'newrelic';

newrelic.instrumentLoadedModule('pg', new newrelic.instrumentations.Postgres());

const result = await expensiveQuery();
// Automatically tracked
```

## Scaling Strategy

### Horizontal Scaling

```yaml
# Kubernetes deployment with auto-scaling
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: flowpay-api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: flowpay-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Vertical Scaling

```
Increase per-instance resources:
CPU: 1 core → 2 cores
Memory: 1GB → 2GB
```

### Database Optimization

```sql
-- Monitor slow queries
SET log_min_duration_statement = 1000;  -- Log queries > 1s

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM payments WHERE userId = $1;

-- Vacuum and analyze
VACUUM ANALYZE payments;
```

## Benchmarking

```bash
# Load test with Artillery
npm install -g artillery

artillery quick --count 100 --num 1000 https://api.flowpay.dev/api/v1/payments

# Benchmark frontend
npm run build:analyze
npm run lighthouse  # Chrome Lighthouse

# Database benchmarking
npm run bench:db
```

## Performance Checklist

- [ ] Frontend: Code splitting implemented
- [ ] Frontend: Images optimized
- [ ] Frontend: Caching configured
- [ ] Backend: Database indexes created
- [ ] Backend: Query results cached
- [ ] Backend: Connection pooling enabled
- [ ] API: Response compression enabled
- [ ] API: Rate limiting configured
- [ ] API: Pagination implemented
- [ ] Monitoring: APM integrated
- [ ] Scaling: Auto-scaling configured
- [ ] Tests: Performance tests passing
