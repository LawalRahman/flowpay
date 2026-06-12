# Caching Strategy

Advanced caching strategies for FlowPay performance optimization.

## Overview

Strategic caching reduces database load, improves response times, and enhances user experience.

## Redis Setup

### Configuration

```typescript
import { Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/redis';

@Module({
  imports: [
    RedisModule.forRoot({
      config: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: 0,
        retryStrategy: (times: number) => Math.min(times * 50, 2000)
      }
    })
  ]
})
export class CacheModule {}
```

## Cache Decorators

### Basic Caching

```typescript
import { Injectable } from '@nestjs/common';
import { RedisService } from '@nestjs-modules/redis';

@Injectable()
export class CacheService {
  constructor(private redisService: RedisService) {}

  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) return cached;

    const value = await fn();
    await this.set(key, value, ttl);
    return value;
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redisService.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    await this.redisService.setex(key, ttl, JSON.stringify(value));
  }

  async invalidate(key: string): Promise<void> {
    await this.redisService.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redisService.keys(pattern);
    if (keys.length > 0) {
      await this.redisService.del(...keys);
    }
  }
}
```

### Custom Decorator

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export function Cacheable(ttl: number = 3600) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const cacheKey = `${propertyKey}:${JSON.stringify(args)}`;
      const cached = await this.cacheService.get(cacheKey);

      if (cached) return cached;

      const result = await originalMethod.apply(this, args);
      await this.cacheService.set(cacheKey, result, ttl);

      return result;
    };

    return descriptor;
  };
}
```

## Payment Caching

### User Payments Cache

```typescript
@Injectable()
export class PaymentsService {
  private readonly PAYMENTS_TTL = 300; // 5 minutes
  private readonly USER_PAYMENTS_PATTERN = 'user:*:payments';

  constructor(private cacheService: CacheService) {}

  async getUserPayments(userId: string) {
    const cacheKey = `user:${userId}:payments`;

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchUserPaymentsFromDb(userId),
      this.PAYMENTS_TTL
    );
  }

  async invalidateUserPaymentsCache(userId: string): Promise<void> {
    await this.cacheService.invalidate(`user:${userId}:payments`);
  }

  private async fetchUserPaymentsFromDb(userId: string) {
    // Database query
  }
}
```

### Payment Status Cache

```typescript
@Cacheable(3600) // 1 hour
async getPaymentStatus(paymentId: string) {
  return this.prisma.payment.findUnique({
    where: { id: paymentId }
  });
}
```

## Transaction Caching

### Transaction List

```typescript
@Injectable()
export class TransactionsService {
  private readonly TRANSACTIONS_TTL = 600;

  async getUserTransactions(
    userId: string,
    page: number = 1,
    limit: number = 20
  ) {
    const cacheKey = `user:${userId}:transactions:${page}:${limit}`;

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchTransactions(userId, page, limit),
      this.TRANSACTIONS_TTL
    );
  }

  async invalidateTransactionCache(userId: string) {
    await this.cacheService.invalidatePattern(`user:${userId}:transactions:*`);
  }

  private async fetchTransactions(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    return this.prisma.transaction.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });
  }
}
```

## Workflow Caching

### Active Workflows

```typescript
@Injectable()
export class WorkflowsService {
  private readonly WORKFLOWS_TTL = 1800; // 30 minutes

  async getActiveWorkflows(userId: string) {
    const cacheKey = `user:${userId}:workflows:active`;

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.db.workflows.findMany({
        where: { userId, status: 'active' }
      }),
      this.WORKFLOWS_TTL
    );
  }

  async updateWorkflow(workflowId: string, updates: any) {
    const workflow = await this.db.workflows.update({
      where: { id: workflowId },
      data: updates
    });

    // Invalidate related caches
    await this.cacheService.invalidatePattern(
      `user:*:workflows:*`
    );

    return workflow;
  }
}
```

## Stellar Data Caching

### Account Information

```typescript
@Injectable()
export class StellarService {
  private readonly ACCOUNT_TTL = 300;

  async getAccountInfo(publicKey: string) {
    const cacheKey = `stellar:account:${publicKey}`;

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.stellar.accounts().accountId(publicKey).call(),
      this.ACCOUNT_TTL
    );
  }

  async getAccountBalance(publicKey: string) {
    const account = await this.getAccountInfo(publicKey);
    return account.balances;
  }
}
```

### Transaction History

```typescript
async getTransactionHistory(publicKey: string, limit: number = 50) {
  const cacheKey = `stellar:transactions:${publicKey}:${limit}`;

  return this.cacheService.getOrSet(
    cacheKey,
    () => this.stellar
      .transactions()
      .forAccount(publicKey)
      .limit(limit)
      .order('desc')
      .call(),
    300 // 5 minutes
  );
}
```

## Cache Invalidation Patterns

### Event-Based Invalidation

```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class PaymentEventListener {
  constructor(
    private cacheService: CacheService,
    private eventEmitter: EventEmitter2
  ) {}

  @OnEvent('payment.completed')
  async handlePaymentCompleted(payload: PaymentCompletedEvent) {
    // Invalidate payment-related caches
    await this.cacheService.invalidate(
      `user:${payload.userId}:payments`
    );
    await this.cacheService.invalidatePattern(
      `payment:${payload.paymentId}:*`
    );
  }

  @OnEvent('workflow.updated')
  async handleWorkflowUpdated(payload: WorkflowUpdatedEvent) {
    await this.cacheService.invalidate(
      `workflow:${payload.workflowId}`
    );
    await this.cacheService.invalidatePattern(
      `user:${payload.userId}:workflows:*`
    );
  }
}
```

## Cache Warming

### Pre-populate Cache

```typescript
@Injectable()
export class CacheWarmingService implements OnModuleInit {
  constructor(private cacheService: CacheService) {}

  async onModuleInit() {
    await this.warmUpCommonCaches();
  }

  private async warmUpCommonCaches() {
    // Pre-cache frequently accessed data
    const popularUsers = await this.db.users.findMany({
      where: { isActive: true },
      take: 100,
      orderBy: { activityScore: 'desc' }
    });

    for (const user of popularUsers) {
      await this.cacheService.set(
        `user:${user.id}:profile`,
        user,
        3600
      );
    }
  }
}
```

## Multi-Layer Caching

### Application + Redis

```typescript
@Injectable()
export class MultiLayerCacheService {
  private appCache = new Map<string, { value: any; expiry: number }>();

  constructor(private redisService: CacheService) {}

  async get<T>(key: string): Promise<T | null> {
    // Check application cache first
    const appCached = this.appCache.get(key);
    if (appCached && appCached.expiry > Date.now()) {
      return appCached.value;
    }

    // Check Redis
    const redisCached = await this.redisService.get<T>(key);
    if (redisCached) {
      // Populate app cache
      this.appCache.set(key, {
        value: redisCached,
        expiry: Date.now() + 60000 // 1 minute
      });
      return redisCached;
    }

    return null;
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    this.appCache.set(key, {
      value,
      expiry: Date.now() + Math.min(ttl * 1000, 60000)
    });
    await this.redisService.set(key, value, ttl);
  }
}
```

## Best Practices

✅ **Do:**
- Set appropriate TTLs
- Invalidate on data changes
- Monitor cache hit rates
- Warm up critical caches
- Use cache-aside pattern
- Implement fallback logic
- Log cache misses

❌ **Don't:**
- Cache sensitive data
- Forget cache invalidation
- Use indefinite TTLs
- Cache without monitoring
- Ignore cache size
- Cache without fallback
- Over-cache everything

## Monitoring

```typescript
@Injectable()
export class CacheMonitoringService {
  async getMetrics() {
    return {
      memory_usage: await this.getMemoryUsage(),
      hit_rate: await this.calculateHitRate(),
      miss_rate: await this.calculateMissRate(),
      evictions: await this.getEvictions()
    };
  }
}
```

## Resources

- [Redis](https://redis.io/)
- [NestJS Caching](https://docs.nestjs.com/techniques/caching)
- [Cache Patterns](https://codeahoy.com/2017/08/11/caching-strategies-and-patterns/)
