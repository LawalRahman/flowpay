# Monitoring & Observability

Complete monitoring and observability setup for FlowPay.

## Overview

Comprehensive monitoring ensures system health, performance, and reliability.

## Metrics Collection

### Application Metrics

```typescript
import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge, register } from 'prom-client';

@Injectable()
export class MetricsService {
  private requestCounter = new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status']
  });

  private requestDuration = new Histogram({
    name: 'http_request_duration_ms',
    help: 'HTTP request duration',
    labelNames: ['method', 'route']
  });

  private databaseConnections = new Gauge({
    name: 'db_connections_active',
    help: 'Active database connections'
  });

  recordRequest(method: string, route: string, status: number, duration: number) {
    this.requestCounter.labels(method, route, status).inc();
    this.requestDuration.labels(method, route).observe(duration);
  }

  setDatabaseConnections(count: number) {
    this.databaseConnections.set(count);
  }

  getMetrics() {
    return register.metrics();
  }
}
```

### Middleware

```typescript
@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      this.metricsService.recordRequest(
        req.method,
        req.route?.path || req.url,
        res.statusCode,
        duration
      );
    });

    next();
  }
}
```

## Logging

### Structured Logging

```typescript
import { Logger } from '@nestjs/common';
import * as winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

### Service Logging

```typescript
@Injectable()
export class PaymentsService {
  private logger = new Logger(PaymentsService.name);

  async create(userId: string, createPaymentDto: CreatePaymentDto) {
    this.logger.debug(`Creating payment for user ${userId}`);

    try {
      // Create payment
      this.logger.log(`Payment created: ${payment.id}`, PaymentsService.name);
      return payment;
    } catch (error) {
      this.logger.error(
        `Failed to create payment: ${error.message}`,
        error.stack,
        PaymentsService.name
      );
      throw error;
    }
  }
}
```

## Health Checks

### Liveness Probe

```typescript
@Controller('/health')
export class HealthController {
  constructor(private health: HealthCheckService) {}

  @Get('/live')
  @HealthCheck()
  checkLiveness() {
    return this.health.check([
      () => ({
        status: 'up',
        timestamp: new Date().toISOString()
      })
    ]);
  }
}
```

### Readiness Probe

```typescript
@Get('/ready')
@HealthCheck()
checkReadiness() {
  return this.health.check([
    () => this.database.ping(),
    () => this.stellar.checkConnection(),
    () => this.redis.ping()
  ]);
}
```

## Tracing

### Distributed Tracing

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('flowpay-service');

@Injectable()
export class PaymentsService {
  async create(userId: string, createPaymentDto: CreatePaymentDto) {
    const span = tracer.startSpan('createPayment');

    try {
      span.setAttributes({
        'userId': userId,
        'amount': createPaymentDto.amount
      });

      // Create payment
      span.addEvent('Payment created successfully');
      return payment;
    } catch (error) {
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }
}
```

## Alerting

### Alert Configuration

```yaml
# alerting-rules.yml
groups:
  - name: application
    rules:
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > 0.05
        for: 5m
        annotations:
          summary: High error rate detected

      - alert: SlowRequests
        expr: |
          histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m])) > 1000
        for: 10m
        annotations:
          summary: Slow requests detected

      - alert: DatabaseConnectionPoolExhausted
        expr: db_connections_active > 15
        for: 2m
        annotations:
          summary: Database connection pool exhausted
```

## Dashboards

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "FlowPay Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~'5..'}[5m])"
          }
        ]
      },
      {
        "title": "Response Time (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Active Database Connections",
        "targets": [
          {
            "expr": "db_connections_active"
          }
        ]
      }
    ]
  }
}
```

## Performance Monitoring

### Response Time Tracking

```typescript
@Injectable()
export class PerformanceService {
  private responseTimes: Map<string, number[]> = new Map();

  recordResponseTime(endpoint: string, duration: number) {
    if (!this.responseTimes.has(endpoint)) {
      this.responseTimes.set(endpoint, []);
    }
    this.responseTimes.get(endpoint)!.push(duration);
  }

  getPercentile(endpoint: string, percentile: number): number {
    const times = this.responseTimes.get(endpoint) || [];
    const sorted = times.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  getMetrics(endpoint: string) {
    const times = this.responseTimes.get(endpoint) || [];
    return {
      min: Math.min(...times),
      max: Math.max(...times),
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      p50: this.getPercentile(endpoint, 50),
      p95: this.getPercentile(endpoint, 95),
      p99: this.getPercentile(endpoint, 99)
    };
  }
}
```

## Error Tracking

### Error Aggregation

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1
});

@Injectable()
export class ErrorTrackingService {
  captureException(error: Error, context?: Record<string, any>) {
    Sentry.captureException(error, {
      contexts: {
        custom: context
      }
    });
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error') {
    Sentry.captureMessage(message, level);
  }
}
```

## Log Aggregation

### ELK Stack Integration

```typescript
import * as elasticsearch from '@elastic/elasticsearch';

@Injectable()
export class LogAggregationService {
  private client = new elasticsearch.Client({
    node: process.env.ELASTICSEARCH_URL
  });

  async logEvent(event: {
    timestamp: Date;
    level: string;
    service: string;
    message: string;
    context?: Record<string, any>;
  }) {
    await this.client.index({
      index: `logs-${new Date().toISOString().split('T')[0]}`,
      body: {
        ...event,
        '@timestamp': event.timestamp
      }
    });
  }
}
```

## Uptime Monitoring

### External Monitoring

```bash
# Synthetic monitoring
curl -X GET https://api.flowpay.stellar/health/live \
  --max-time 5 \
  --retry 1 \
  --fail-with-body

# Check payment endpoint
curl -X POST https://api.flowpay.stellar/payments \
  -H "Authorization: Bearer $TEST_TOKEN" \
  --max-time 10
```

## Best Practices

✅ **Do:**
- Monitor key metrics continuously
- Set up alerting for anomalies
- Log structured data
- Use distributed tracing
- Implement health checks
- Track error rates
- Monitor database performance

❌ **Don't:**
- Log sensitive data
- Ignore alert fatigue
- Store logs without retention
- Skip error tracking
- Ignore performance metrics
- Forget to monitor third-party services

## Tools

- **Prometheus** - Metrics collection
- **Grafana** - Dashboards
- **ELK Stack** - Log aggregation
- **Sentry** - Error tracking
- **New Relic** - APM
- **DataDog** - Full monitoring platform
- **CloudWatch** - AWS monitoring

## Resources

- [OpenTelemetry](https://opentelemetry.io/)
- [Prometheus](https://prometheus.io/)
- [Grafana](https://grafana.com/)
- [ELK Stack](https://www.elastic.co/elk-stack)
