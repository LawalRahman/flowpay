# Performance Tuning

Advanced performance optimization strategies for FlowPay.

## Overview

Systematic performance tuning ensures FlowPay handles high transaction volumes efficiently.

## Database Optimization

### Query Optimization

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_payments_user_id_created_at ON payments(user_id, created_at DESC);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_workflows_status ON workflows(status);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20;

-- Identify missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE attname NOT LIKE '%id'
ORDER BY abs(correlation) DESC;
```

### Connection Pooling

```typescript
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false,
      logging: process.env.LOG_LEVEL === 'debug',
      pool: {
        max: 20,
        min: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }
    })
  ]
})
export class DatabaseModule {}
```

### Lazy Loading

```typescript
@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToMany(() => Payment, payment => payment.user, { lazy: true })
  payments: Promise<Payment[]>;

  @OneToMany(() => Workflow, workflow => workflow.user, { lazy: true })
  workflows: Promise<Workflow[]>;
}

// Usage
const user = await userRepository.findOne(userId);
const payments = await user.payments; // Loaded on demand
```

## API Optimization

### Response Compression

```typescript
import * as compression from 'compression';

app.use(compression({
  level: 6,
  threshold: 10 * 1024 // 10KB
}));
```

### Pagination

```typescript
@Get()
async list(
  @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number
) {
  const skip = (page - 1) * limit;
  
  const [data, total] = await Promise.all([
    this.repository.find({ skip, take: limit }),
    this.repository.count()
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}
```

### Select Only Required Fields

```typescript
@Get(':id')
async getPayment(@Param('id') id: string) {
  // Only select necessary fields
  return this.paymentRepository.findOne(id, {
    select: ['id', 'amount', 'status', 'createdAt']
  });
}
```

## Frontend Optimization

### Bundle Size

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'stellar': ['stellar-sdk'],
          'ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
        }
      }
    },
    terserOptions: {
      compress: {
        drop_console: true
      }
    }
  }
});
```

### Code Splitting

```typescript
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Payments = lazy(() => import('./pages/Payments'));

export function Router() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/payments" element={<Payments />} />
      </Routes>
    </Suspense>
  );
}
```

### Image Optimization

```tsx
// Use Next-gen formats
<picture>
  <source srcSet="image.webp" type="image/webp" />
  <img src="image.png" alt="Description" loading="lazy" />
</picture>

// Lazy load images
function LazyImage({ src, alt }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let observer: IntersectionObserver;

    if (imageRef && imageSrc === null) {
      observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              setImageSrc(src);
              observer.unobserve(imageRef);
            }
          });
        },
        { rootMargin: '50px' }
      );
      observer.observe(imageRef);
    }

    return () => observer?.disconnect();
  }, [imageRef, imageSrc, src]);

  return <img ref={setImageRef} src={imageSrc || ''} alt={alt} />;
}
```

## Caching Strategy

### HTTP Caching Headers

```typescript
@Get('payments/:id')
getPayment(@Param('id') id: string, @Res() res: Response) {
  // Cache for 5 minutes, but allow stale while revalidate for 1 hour
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
  res.set('ETag', generateETag(payment));
  
  return payment;
}
```

### Request Deduplication

```typescript
@Injectable()
export class RequestDeduplicationService {
  private cache = new Map<string, Promise<any>>();

  async deduplicate<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = 1000
  ): Promise<T> {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const promise = fn().finally(() => {
      setTimeout(() => this.cache.delete(key), ttl);
    });

    this.cache.set(key, promise);
    return promise;
  }
}
```

## Memory Optimization

### Streaming Responses

```typescript
@Get('export/payments')
async exportPayments(@Res() res: Response) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="payments.csv"');

  const stream = fs.createReadStream('payments.csv');
  stream.pipe(res);
}
```

### Memory Leak Prevention

```typescript
@Injectable()
export class HealthCheckService implements OnModuleDestroy {
  private timers: NodeJS.Timeout[] = [];

  scheduleTask(callback: () => void, interval: number) {
    const timer = setInterval(callback, interval);
    this.timers.push(timer);
  }

  onModuleDestroy() {
    this.timers.forEach(timer => clearInterval(timer));
  }
}
```

## CPU Optimization

### Worker Threads

```typescript
import { Worker } from 'worker_threads';

@Injectable()
export class ComputeService {
  async heavyComputation(data: any[]) {
    return new Promise((resolve, reject) => {
      const worker = new Worker('./compute.worker.ts');
      
      worker.on('message', resolve);
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });

      worker.postMessage(data);
    });
  }
}
```

### Batch Processing

```typescript
@Injectable()
export class BatchProcessingService {
  async processBatch<T>(
    items: T[],
    processor: (item: T) => Promise<any>,
    batchSize: number = 100
  ) {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await Promise.all(batch.map(processor));
    }
  }
}
```

## Network Optimization

### API Gateway Caching

```yaml
# nginx configuration
location /api/payments {
  proxy_cache payments_cache;
  proxy_cache_valid 200 1m;
  proxy_cache_key "$scheme$request_method$host$request_uri";
  proxy_pass http://backend;
}
```

### Connection Pooling for External Services

```typescript
@Injectable()
export class StellarService {
  private server = new StellarSdk.Server(
    'https://horizon-testnet.stellar.org',
    {
      allowHttp: false,
      timeout: 30000
    }
  );

  // Reuse connection
  async getAccount(publicKey: string) {
    return this.server.loadAccount(publicKey);
  }
}
```

## Monitoring Performance

```typescript
@Injectable()
export class PerformanceMonitoringService {
  async monitorEndpoint(
    method: string,
    path: string,
    fn: () => Promise<any>
  ) {
    const start = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      
      this.recordMetric(method, path, duration, 'success');
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(method, path, duration, 'error');
      throw error;
    }
  }

  private recordMetric(
    method: string,
    path: string,
    duration: number,
    status: string
  ) {
    console.log(`${method} ${path} - ${duration.toFixed(2)}ms - ${status}`);
  }
}
```

## Benchmarking

```bash
# Use autocannon for load testing
autocannon -d 30 -c 10 http://localhost:3000/api/payments

# Use wrk for stress testing
wrk -t4 -c100 -d30s http://localhost:3000/api/payments

# Use clinic.js for profiling
clinic doctor -- node dist/main.js
```

## Best Practices

✅ **Do:**
- Profile before optimizing
- Monitor metrics
- Use indexing
- Implement caching
- Use pagination
- Compress responses
- Optimize images
- Use lazy loading
- Monitor memory

❌ **Don't:**
- Premature optimization
- Skip monitoring
- Ignore slow queries
- Cache everything
- Use N+1 queries
- Ignore bundle size
- Skip compression
- Hardcode values
- Forget cleanup

## Resources

- [Web Performance APIs](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
- [Node.js Performance Hooks](https://nodejs.org/api/perf_hooks.html)
- [Database Query Optimization](https://www.postgresql.org/docs/current/using-explain.html)
