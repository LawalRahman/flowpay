# Monitoring & Logging Guide

Comprehensive monitoring and logging strategy for FlowPay.

## Logging Levels

```
TRACE   - Detailed debugging information
DEBUG   - Development debug messages
INFO    - General informational messages
WARN    - Warning messages, potentially harmful
ERROR   - Error messages
FATAL   - System is unusable
```

## Log Format

```
[2024-01-01T12:00:00.000Z] [INFO] [payment-service] Payment created: {id: "123", amount: 1000}
```

## Structured Logging

```typescript
import { Logger } from '@nestjs/common';

const logger = new Logger();

// Good: Structured logging
logger.log('Payment created', {
  paymentId: '123',
  amount: 1000,
  userId: 'user-456',
  timestamp: new Date().toISOString(),
});

// Bad: Unstructured logging
logger.log('Payment created with id 123 and amount 1000');
```

## Log Categories

### Application Logs

```typescript
// Startup
logger.log('Application started on port 3000');

// Configuration
logger.log('Database connected', { url: 'postgresql://...' });

// Shutdown
logger.log('Application shutting down gracefully');
```

### Business Logic Logs

```typescript
// Payment events
logger.log('Payment submitted', {
  paymentId: '123',
  to: 'GXXXXXXX',
  amount: 100000,
  timestamp: new Date().toISOString(),
});

logger.log('Payment confirmed', {
  paymentId: '123',
  txHash: 'abc123...',
  ledger: 12345,
  timestamp: new Date().toISOString(),
});

logger.error('Payment failed', {
  paymentId: '123',
  reason: 'Insufficient balance',
  error: error.message,
  timestamp: new Date().toISOString(),
});
```

### Security Logs

```typescript
// Authentication
logger.log('User login', {
  userId: 'user-123',
  ip: '192.168.1.1',
  timestamp: new Date().toISOString(),
});

logger.warn('Failed login attempt', {
  email: 'user@example.com',
  ip: '192.168.1.1',
  attempts: 3,
  timestamp: new Date().toISOString(),
});

// Authorization
logger.warn('Unauthorized access attempt', {
  userId: 'user-123',
  resource: 'payments',
  action: 'delete',
  timestamp: new Date().toISOString(),
});
```

### Performance Logs

```typescript
// Slow queries
const startTime = Date.now();
const payments = await getPayments(userId);
const duration = Date.now() - startTime;

if (duration > 1000) {
  logger.warn('Slow database query', {
    query: 'SELECT * FROM payments',
    duration: `${duration}ms`,
    threshold: '1000ms',
    userId,
  });
}
```

## Monitoring

### Key Metrics

```
Request Rate: requests per second
Error Rate: errors per second
Response Time: p50, p95, p99
Database Connections: active, idle
Memory Usage: current, max
CPU Usage: current, load
Payment Success Rate: success / total
Blockchain Confirmation Time: seconds to confirm
```

### Prometheus Metrics

```typescript
import { register, Counter, Histogram, Gauge } from 'prom-client';

// Counter: monotonically increasing
const paymentsTotal = new Counter({
  name: 'payments_total',
  help: 'Total payments processed',
  labelNames: ['status'],
});

// Histogram: distribution of values
const paymentDuration = new Histogram({
  name: 'payment_duration_seconds',
  help: 'Payment processing duration',
  buckets: [0.1, 0.5, 1, 2, 5],
});

// Gauge: value that can go up or down
const activePayments = new Gauge({
  name: 'payments_active',
  help: 'Active payments in progress',
});

// Usage
paymentsTotal.labels('success').inc();
paymentDuration.observe(processingTime);
activePayments.set(count);
```

## Alerts

### Alert Rules

```yaml
# Prometheus alert rules
groups:
  - name: flowpay
    rules:
      - alert: HighErrorRate
        expr: rate(errors_total[5m]) > 0.01
        for: 5m
        annotations:
          summary: "High error rate detected"
          
      - alert: SlowResponse
        expr: histogram_quantile(0.99, response_time_seconds) > 1
        for: 5m
        annotations:
          summary: "p99 response time > 1 second"
          
      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        annotations:
          summary: "PostgreSQL database is down"
```

## Dashboards

### Grafana Dashboard

```
Top Row:
- Requests/sec
- Error Rate
- p99 Response Time
- Active Users

Middle Row:
- Payment Success Rate
- Payment Duration
- Drip Executions
- Workflow Triggers

Bottom Row:
- Database Connections
- Memory Usage
- CPU Usage
- Disk I/O
```

## Log Aggregation

### ELK Stack Integration

```typescript
// Send logs to Elasticsearch
const transports = [
  new winston.transports.Console(),
  new WinstonElasticsearch({
    level: 'info',
    clientOpts: { node: 'http://elasticsearch:9200' },
    index: 'flowpay-logs',
  }),
];

const logger = winston.createLogger({
  transports,
});

logger.info('Payment created', {
  paymentId: '123',
  amount: 1000,
});
```

## Distributed Tracing

### OpenTelemetry Integration

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('flowpay-service');

async function createPayment(data: PaymentData) {
  const span = tracer.startSpan('createPayment', {
    attributes: {
      'payment.amount': data.amount,
      'payment.to': data.to,
    },
  });

  try {
    // Payment creation logic
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    throw error;
  } finally {
    span.end();
  }
}
```

## Error Tracking

### Sentry Integration

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // Sample 10% of transactions
});

// Automatic error capturing
app.use(Sentry.Handlers.errorHandler());

// Manual capturing
try {
  await processPayment();
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      operation: 'processPayment',
    },
    level: 'error',
  });
}
```

## Retention Policies

| Log Type | Retention | Storage |
|----------|-----------|---------|
| Application Logs | 30 days | Cloud Storage |
| Error Logs | 90 days | Cloud Storage |
| Audit Logs | 1 year | Database |
| Metrics | 1 year | Prometheus |

## Log Examples

### Payment Flow

```
[INFO] Payment creation started
  - User: user-123
  - Amount: 1000000 stroops
  - To: GXXXXXXX

[DEBUG] Stellar account fetched
  - Sequence: 12345
  - Balance: 1000000000 stroops

[DEBUG] Transaction built
  - Operations: 1
  - Fee: 100 stroops

[DEBUG] Transaction signed
  - Hash: abc123...

[INFO] Payment submitted to Stellar
  - TxHash: abc123...

[INFO] Payment confirmed
  - Ledger: 100000
  - ConfirmationTime: 5s
```

### Error Flow

```
[WARN] Payment submission failed
  - PaymentId: payment-123
  - Error: Insufficient balance
  - RetryAttempt: 1/3

[ERROR] Payment failed after 3 retries
  - PaymentId: payment-123
  - Error: Temporary network issue
  - Duration: 45s
  - Action: Queued for manual review
```

## Monitoring Checklist

- [ ] All important operations logged
- [ ] Error tracking configured (Sentry)
- [ ] Metrics exported (Prometheus)
- [ ] Dashboards created (Grafana)
- [ ] Alerts configured
- [ ] Log aggregation setup (ELK)
- [ ] Distributed tracing enabled
- [ ] Retention policies configured
- [ ] On-call rotation configured
- [ ] Incident response documented
