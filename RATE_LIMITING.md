# Rate Limiting Strategy

Complete guide to rate limiting and throttling in FlowPay.

## Rate Limiting Tiers

### Anonymous Users

```
5 requests per minute per IP
```

### Authenticated Users (Free)

```
100 requests per minute per user
```

### Payment Operations

```
10 payment submissions per minute per user
5 drip creations per minute per user
20 workflow triggers per minute per user
```

### Admin Users

```
1000 requests per minute per user
```

## Implementation

### Express Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from 'redis';

const redisClient = redis.createClient();

// Generic rate limiter
const limiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate-limit:',
  }),
  windowMs: 60 * 1000,  // 1 minute
  max: 100,              // 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
});

// Strict limiter for auth
const authLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate-limit:auth:',
  }),
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // 5 attempts
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again in 15 minutes',
});

// Payments limiter
const paymentLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate-limit:payments:',
  }),
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => `${req.user.id}:payments`,
  message: 'Payment rate limit exceeded',
});

// Apply limiters
app.use('/api/', limiter);
app.post('/auth/login', authLimiter, authController.login);
app.post('/api/payments', paymentLimiter, paymentsController.create);
```

### User-Based Rate Limiting

```typescript
async function getUserRateLimit(userId: string): Promise<RateLimit> {
  const user = await userService.findById(userId);
  
  // Different limits based on plan
  const limits = {
    free: { requests: 100, payments: 10 },
    pro: { requests: 1000, payments: 100 },
    enterprise: { requests: -1, payments: -1 }, // Unlimited
  };
  
  return limits[user.plan];
}

// Custom middleware
app.use('/api/', async (req, res, next) => {
  if (!req.user) {
    return next(); // Use IP-based limit
  }
  
  const limit = await getUserRateLimit(req.user.id);
  const remaining = await getRemaining(req.user.id);
  
  if (remaining < 0) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: 60,
    });
  }
  
  res.setHeader('X-RateLimit-Limit', limit.requests);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + 60);
  
  next();
});
```

## Rate Limit Headers

```
X-RateLimit-Limit: 100         # Max requests in window
X-RateLimit-Remaining: 95      # Remaining in current window
X-RateLimit-Reset: 1704067860  # Unix timestamp of reset
```

## Retry-After Header

```
Retry-After: 60  # Seconds until next request allowed
```

## Quota Management

### Track Usage

```typescript
async function incrementQuota(userId: string, operation: string) {
  const key = `quota:${userId}:${operation}`;
  const count = await redis.incr(key);
  
  // Set expiry on first increment
  if (count === 1) {
    await redis.expire(key, 60); // 1 minute window
  }
  
  return count;
}

// Check before operation
async function checkQuota(userId: string, operation: string, limit: number) {
  const count = await redis.get(`quota:${userId}:${operation}`);
  
  if (count && parseInt(count) >= limit) {
    throw new RateLimitError(60);
  }
  
  return true;
}

// Usage
async function createPayment(userId: string, data: PaymentData) {
  await checkQuota(userId, 'payments', 10);
  
  const payment = await paymentService.create(userId, data);
  
  await incrementQuota(userId, 'payments');
  
  return payment;
}
```

## Sliding Window

```typescript
async function getSlidingWindowCount(userId: string, operation: string) {
  const key = `usage:${userId}:${operation}`;
  const now = Date.now();
  const windowStart = now - 60 * 1000; // Last 60 seconds
  
  // Remove old entries
  await redis.zremrangebyscore(key, 0, windowStart);
  
  // Get remaining entries
  const count = await redis.zcard(key);
  
  return count;
}

async function trackRequest(userId: string, operation: string) {
  const key = `usage:${userId}:${operation}`;
  
  // Add timestamp to sorted set
  await redis.zadd(key, Date.now(), uuid.v4());
  
  // Set expiry
  await redis.expire(key, 60);
}
```

## Progressive Rate Limiting

```typescript
async function applyProgressiveLimit(userId: string) {
  const violationCount = await redis.incr(`violations:${userId}`);
  
  const limits = {
    1: { windowMs: 60 * 1000, max: 50 },          // 1st violation: stricter
    2: { windowMs: 5 * 60 * 1000, max: 20 },      // 2nd violation: even stricter
    3: { windowMs: 60 * 60 * 1000, max: 10 },     // 3rd violation: very strict
    4: null, // Permanent ban
  };
  
  const limit = limits[Math.min(violationCount, 4)];
  
  if (!limit) {
    // Permanently ban user
    await userService.ban(userId, 'Rate limit violations');
  }
  
  return limit;
}
```

## Handling Rate Limit Errors

### Client-Side

```typescript
async function retryWithBackoff(fn: () => Promise<any>) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) {
        const retryAfter = parseInt(error.headers['retry-after']) || 60;
        console.log(`Rate limited. Retrying in ${retryAfter}s`);
        
        await new Promise(resolve => 
          setTimeout(resolve, retryAfter * 1000)
        );
      } else {
        throw error;
      }
    }
  }
}

// Usage
const payment = await retryWithBackoff(() => 
  api.createPayment(paymentData)
);
```

## Monitoring

### Track Rate Limit Events

```typescript
async function logRateLimitEvent(req: Request) {
  await events.log({
    type: 'rate_limit_exceeded',
    userId: req.user?.id,
    ip: req.ip,
    endpoint: req.path,
    method: req.method,
    timestamp: new Date(),
  });
  
  // Alert on excessive violations
  const violations = await events.count({
    type: 'rate_limit_exceeded',
    userId: req.user?.id,
    since: new Date(Date.now() - 3600000), // Last hour
  });
  
  if (violations > 10) {
    await alertService.send({
      level: 'warning',
      message: `User ${req.user?.id} exceeded rate limit ${violations} times`,
    });
  }
}
```

## Best Practices

### ✅ Do

- Use rate limiting for all public endpoints
- Track rates per user AND per IP
- Return clear Retry-After headers
- Log rate limit violations
- Alert on suspicious patterns
- Adjust limits based on plan tier

### ❌ Don't

- Permanently ban users without appeal
- Use overly aggressive limits
- Change limits without notification
- Rate limit health checks
- Rate limit admin endpoints

## Rate Limit Configuration

| Endpoint | Limit | Window | Applies To |
|----------|-------|--------|-----------|
| /auth/login | 5 | 15 min | IP |
| /auth/register | 3 | 24 hr | IP |
| /api/payments | 10 | 1 min | User |
| /api/drips | 5 | 1 min | User |
| /api/workflows | 20 | 1 min | User |
| /health | Unlimited | - | All |

## Quotas vs Rate Limits

**Rate Limits:** How fast you can make requests
- Example: 100 requests per minute

**Quotas:** Total usage per period
- Example: 1000 API calls per month

Combine both for effective usage management.
