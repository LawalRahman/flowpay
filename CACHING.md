# Caching Strategy

Comprehensive caching guide for FlowPay.

## Cache Hierarchy

```
L1: Application Memory (Redis)
L2: HTTP Cache Headers
L3: Browser Cache
```

## Cache Types

### Application Cache (Redis)

```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

// Simple set/get
await redis.set('user:123', JSON.stringify(userData), 'EX', 3600);
const cached = await redis.get('user:123');

// Pattern-based deletion
await redis.del(await redis.keys('user:*'));
```

### HTTP Cache Headers

```typescript
// Cacheable response
res.set('Cache-Control', 'public, max-age=3600');
res.set('ETag', '"12345"');

// Non-cacheable response
res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
```

## Caching Patterns

### Cache-Aside

```typescript
async function getUserWithCache(userId: string) {
  // 1. Try cache
  const cached = await redis.get(`user:${userId}`);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. Cache miss - fetch from database
  const user = await db.users.findById(userId);

  // 3. Store in cache
  await redis.set(`user:${userId}`, JSON.stringify(user), 'EX', 3600);

  return user;
}
```

### Write-Through

```typescript
async function updateUser(userId: string, data: any) {
  // 1. Update database
  const user = await db.users.update(userId, data);

  // 2. Update cache
  await redis.set(`user:${userId}`, JSON.stringify(user), 'EX', 3600);

  return user;
}
```

### Write-Behind

```typescript
async function queueUserUpdate(userId: string, data: any) {
  // 1. Update cache immediately
  await redis.set(`user:${userId}`, JSON.stringify(data), 'EX', 3600);

  // 2. Queue database update
  await queue.add({
    type: 'update-user',
    userId,
    data,
  });

  return data;
}

// Background worker
async function processQueuedUpdates() {
  const job = await queue.get();
  if (job.type === 'update-user') {
    await db.users.update(job.userId, job.data);
  }
}
```

## Cache Invalidation

### Time-Based (TTL)

```typescript
// Cache for 1 hour
await redis.set('data:key', value, 'EX', 3600);
```

### Event-Based

```typescript
// On user update, invalidate cache
async function updateUser(userId: string, data: any) {
  const user = await db.users.update(userId, data);
  
  // Invalidate cache
  await redis.del(`user:${userId}`);
  
  // Emit event
  eventBus.emit('user:updated', { userId, user });
  
  return user;
}

// Listen for events
eventBus.on('user:updated', ({ userId }) => {
  redis.del(`user:${userId}`);
});
```

### Manual Invalidation

```typescript
// Invalidate specific key
await redis.del('user:123');

// Invalidate pattern
await redis.del(await redis.keys('user:*'));
```

## Cacheable Data

### ✅ Cache These

- User profiles (TTL: 1 hour)
- Payment history (TTL: 15 minutes)
- Drip configurations (TTL: 24 hours)
- Workflow templates (TTL: 24 hours)
- Currency rates (TTL: 5 minutes)
- Feature flags (TTL: 10 minutes)

### ❌ Don't Cache These

- Real-time balances
- Sensitive data (passwords, keys)
- Volatile state
- Large objects (> 1MB)

## Cache Stamped

```typescript
// Prevent thundering herd
async function getWithStamp(key: string, fetcher: () => Promise<any>) {
  const stampKey = `${key}:stamp`;
  
  // Check if another process is already fetching
  const lockKey = `${key}:lock`;
  const hasLock = await redis.set(lockKey, '1', 'NX', 'EX', 30);

  if (!hasLock) {
    // Wait for other process
    let retries = 0;
    while (retries < 10) {
      const result = await redis.get(key);
      if (result) return JSON.parse(result);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }
  }

  // Fetch data
  const data = await fetcher();

  // Store with timestamp
  await redis.set(key, JSON.stringify(data), 'EX', 3600);
  await redis.del(lockKey);

  return data;
}
```

## Cache Warming

```typescript
async function warmCache() {
  // Pre-populate frequently accessed data
  const templates = await db.templates.findAll();
  
  for (const template of templates) {
    await redis.set(
      `template:${template.id}`,
      JSON.stringify(template),
      'EX',
      86400
    );
  }

  logger.info('Cache warmed', { count: templates.length });
}

// Run on startup
await warmCache();
```

## Cache Monitoring

```typescript
// Monitor cache hits/misses
let hits = 0;
let misses = 0;

async function getCachedUser(userId: string) {
  const cached = await redis.get(`user:${userId}`);
  
  if (cached) {
    hits++;
    return JSON.parse(cached);
  } else {
    misses++;
    const user = await db.users.findById(userId);
    await redis.set(`user:${userId}`, JSON.stringify(user), 'EX', 3600);
    return user;
  }
}

// Report stats
function getCacheStats() {
  const total = hits + misses;
  const hitRate = total > 0 ? (hits / total) * 100 : 0;
  
  return { hits, misses, hitRate: hitRate.toFixed(2) + '%' };
}
```

## Distributed Cache

### Redis Cluster

```typescript
const redis = new Redis.Cluster([
  { host: 'node1', port: 6379 },
  { host: 'node2', port: 6379 },
  { host: 'node3', port: 6379 },
], {
  redisOptions: {
    password: process.env.REDIS_PASSWORD,
  },
});
```

### Cache Replication

```typescript
// Multi-primary replication
await Promise.all([
  redisPrimary1.set(key, value),
  redisPrimary2.set(key, value),
]);
```

## Cache Efficiency

### Compression

```typescript
import { compress, decompress } from 'snappy';

// Compress before caching
const compressed = await compress(JSON.stringify(largeData));
await redis.set(key, compressed, 'EX', 3600);

// Decompress when retrieving
const compressed = await redis.get(key);
const data = JSON.parse(await decompress(compressed));
```

### Partial Caching

```typescript
// Cache only needed fields
const cached = {
  id: user.id,
  name: user.name,
  email: user.email,
};

await redis.set(`user:${userId}`, JSON.stringify(cached), 'EX', 3600);
```

## Cache Configuration

| Data | TTL | Size | Strategy |
|------|-----|------|----------|
| Users | 1h | Small | Cache-Aside |
| Payments | 15m | Medium | Cache-Aside |
| Workflows | 24h | Small | Write-Through |
| Templates | 24h | Medium | Cache-Warming |
| Sessions | 24h | Small | Write-Through |

## Best Practices

- [ ] Set appropriate TTLs based on data freshness requirements
- [ ] Implement cache invalidation strategies
- [ ] Monitor cache hit rates (aim for > 80%)
- [ ] Use consistent hashing for distributed caches
- [ ] Implement cache stamping to prevent thundering herd
- [ ] Compress large cached objects
- [ ] Test cache failure scenarios
- [ ] Document what's cached and why
