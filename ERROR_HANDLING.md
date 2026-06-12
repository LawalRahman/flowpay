# Error Handling Guide

Comprehensive error handling strategies for FlowPay.

## Error Categories

### Client Errors (4xx)

| Code | Meaning | Example |
|------|---------|---------|
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limited |

### Server Errors (5xx)

| Code | Meaning | Solution |
|------|---------|----------|
| 500 | Internal Error | Check logs, retry later |
| 502 | Bad Gateway | Upstream service down |
| 503 | Service Unavailable | Maintenance, retry with backoff |
| 504 | Gateway Timeout | Slow upstream, retry with backoff |

## Custom Error Classes

```typescript
// Base error
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
  }
}

// Validation error
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(422, 'VALIDATION_ERROR', message, details);
  }
}

// Not found error
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

// Authentication error
export class AuthenticationError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
  }
}

// Blockchain error
export class BlockchainError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(500, 'BLOCKCHAIN_ERROR', message, details);
  }
}

// Rate limit error
export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super(429, 'RATE_LIMITED', 'Too many requests', { retryAfter });
  }
}
```

## Error Handling Patterns

### Frontend Error Handling

```typescript
// React component
try {
  const payment = await api.createPayment(data);
  setSuccess('Payment created successfully');
} catch (error) {
  if (error instanceof ValidationError) {
    setErrors(error.details);
  } else if (error instanceof AuthenticationError) {
    redirectToLogin();
  } else if (error instanceof RateLimitError) {
    setTimeout(() => retry(), error.details.retryAfter * 1000);
  } else {
    setError('An unexpected error occurred');
    logError(error);
  }
}
```

### Backend Error Handler

```typescript
// NestJS global exception filter
import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let statusCode = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: any = undefined;

    if (exception instanceof AppError) {
      statusCode = exception.statusCode;
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof ValidationError) {
      statusCode = 422;
      code = 'VALIDATION_ERROR';
    }

    response.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
```

## Logging Errors

### Error Logging Pattern

```typescript
import { logger } from './logger';

async function processPayment(paymentId: string) {
  const startTime = Date.now();
  
  try {
    const payment = await getPayment(paymentId);
    await submitToBlockchain(payment);
    
    logger.info('Payment processed successfully', {
      paymentId,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    logger.error('Payment processing failed', {
      paymentId,
      error: error.message,
      stack: error.stack,
      duration: Date.now() - startTime,
    });
    
    // Send to error tracking
    Sentry.captureException(error, {
      tags: { paymentId },
    });
    
    throw error;
  }
}
```

## Retry Strategies

### Exponential Backoff

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options = { maxAttempts: 3, baseDelayMs: 100 }
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry client errors
      if (error.statusCode < 500) {
        throw error;
      }
      
      // Calculate delay: 100ms, 200ms, 400ms
      const delay = options.baseDelayMs * Math.pow(2, attempt - 1);
      
      logger.warn(`Retry attempt ${attempt} after ${delay}ms`, {
        error: error.message,
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Usage
const payment = await retryWithBackoff(
  () => submitPayment(paymentData),
  { maxAttempts: 5, baseDelayMs: 500 }
);
```

## Stellar-Specific Errors

### Transaction Errors

```typescript
async function handleTransactionError(error: any) {
  if (error.response?.status === 400) {
    const resultCode = error.response.data.extras.result_code;
    
    switch (resultCode) {
      case 'tx_insufficient_balance':
        throw new AppError(
          400,
          'INSUFFICIENT_BALANCE',
          'Account has insufficient balance for this transaction'
        );
      
      case 'tx_bad_seq':
        throw new AppError(
          400,
          'SEQUENCE_ERROR',
          'Account sequence number is out of sync'
        );
      
      case 'tx_too_late':
        throw new AppError(
          400,
          'TRANSACTION_EXPIRED',
          'Transaction deadline has passed'
        );
      
      default:
        throw new BlockchainError(`Transaction failed: ${resultCode}`);
    }
  }
  
  throw error;
}
```

## User-Facing Error Messages

### Error Messages

```typescript
// Map error codes to user-friendly messages
const errorMessages: Record<string, string> = {
  'VALIDATION_ERROR': 'Please check your input and try again',
  'UNAUTHORIZED': 'Please log in to continue',
  'NOT_FOUND': 'The requested resource was not found',
  'INSUFFICIENT_BALANCE': 'You have insufficient balance for this transaction',
  'INVALID_ADDRESS': 'The recipient address is not valid',
  'PAYMENT_FAILED': 'The payment failed. Please try again or contact support',
  'RATE_LIMITED': 'You are making requests too quickly. Please try again in a moment',
  'INTERNAL_ERROR': 'An unexpected error occurred. Please try again later',
};

// Component
function PaymentForm() {
  const [error, setError] = useState<string>();
  
  async function handleSubmit(data: PaymentData) {
    try {
      await api.createPayment(data);
    } catch (err) {
      const code = err.code || 'INTERNAL_ERROR';
      const message = errorMessages[code] || 'An error occurred';
      setError(message);
    }
  }
  
  return (
    <div>
      {error && <Alert severity="error">{error}</Alert>}
      <PaymentForm onSubmit={handleSubmit} />
    </div>
  );
}
```

## Error Monitoring

### Sentry Integration

```typescript
import * as Sentry from "@sentry/node";

// Initialize
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Capture errors
try {
  await processPayment();
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      component: 'payment-processor',
      operation: 'processPayment',
    },
    level: 'error',
  });
}

// Breadcrumbs for debugging
Sentry.addBreadcrumb({
  category: 'payment',
  message: 'Payment initiated',
  level: 'info',
  data: { paymentId },
});
```

## Testing Error Cases

```typescript
describe('PaymentService', () => {
  it('should handle insufficient balance error', async () => {
    // Mock insufficient balance response
    mockStellarServer.submitTransaction.mockRejectedValue({
      response: {
        status: 400,
        data: { extras: { result_code: 'tx_insufficient_balance' } },
      },
    });

    await expect(service.submitPayment(tx))
      .rejects.toThrow(AppError);
  });

  it('should retry on temporary network error', async () => {
    let attempts = 0;
    mockFn.mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Network error');
      }
      return { success: true };
    });

    const result = await retryWithBackoff(mockFn);
    expect(result.success).toBe(true);
    expect(attempts).toBe(3);
  });
});
```

## Error Handling Checklist

- [ ] All async operations wrapped in try/catch
- [ ] Custom error classes for different scenarios
- [ ] User-friendly error messages
- [ ] Proper HTTP status codes
- [ ] Error logging with context
- [ ] Retry logic for temporary failures
- [ ] Error tracking (Sentry)
- [ ] Error monitoring and alerting
- [ ] Tests covering error cases
- [ ] Documentation of error codes
