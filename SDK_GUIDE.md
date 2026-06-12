# API Client SDK

JavaScript/TypeScript SDK for FlowPay API.

## Installation

```bash
npm install @flowpay/sdk
# or
yarn add @flowpay/sdk
```

## Getting Started

```typescript
import { FlowPayClient } from '@flowpay/sdk';

const client = new FlowPayClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.flowpay.stellar',
  timeout: 30000
});

// Make API calls
const payments = await client.payments.list();
```

## Configuration

```typescript
interface ClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  logger?: Logger;
}

interface RetryPolicy {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatuses: number[];
}

const client = new FlowPayClient({
  apiKey: 'your-api-key',
  retryPolicy: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    retryableStatuses: [408, 429, 500, 502, 503, 504]
  }
});
```

## Payments

### List Payments

```typescript
// Get all payments
const payments = await client.payments.list();

// With pagination
const page = await client.payments.list({
  skip: 0,
  take: 20,
  sort: 'createdAt:desc'
});

// With filters
const filtered = await client.payments.list({
  status: 'completed',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31')
});
```

### Create Payment

```typescript
const payment = await client.payments.create({
  amount: 100,
  recipientId: 'user-123',
  description: 'Monthly subscription',
  metadata: {
    orderId: 'order-456',
    customField: 'value'
  }
});
```

### Get Payment

```typescript
const payment = await client.payments.get('payment-id');

console.log(payment.id);
console.log(payment.status);
console.log(payment.amount);
```

### Update Payment

```typescript
const updated = await client.payments.update('payment-id', {
  status: 'cancelled',
  metadata: {
    reason: 'User requested cancellation'
  }
});
```

## Workflows

### List Workflows

```typescript
const workflows = await client.workflows.list({
  status: 'active',
  type: 'drip'
});
```

### Create Workflow

```typescript
const workflow = await client.workflows.create({
  name: 'Monthly Subscription',
  description: 'Recurring monthly payment',
  type: 'drip',
  config: {
    frequency: 'monthly',
    amount: 50,
    startDate: new Date(),
    endDate: new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000)
  }
});
```

### Execute Workflow

```typescript
const result = await client.workflows.execute('workflow-id', {
  parameters: {
    recipientId: 'user-123',
    customAmount: 75
  }
});
```

## Authentication

### JWT Token

```typescript
const client = new FlowPayClient({
  apiKey: 'your-api-key'
});

// Token is automatically managed
// Refreshed when expired
```

### Custom Headers

```typescript
const client = new FlowPayClient({
  apiKey: 'your-api-key',
  headers: {
    'X-Custom-Header': 'value',
    'X-Request-ID': generateId()
  }
});
```

## Error Handling

```typescript
import {
  FlowPayError,
  ValidationError,
  AuthenticationError,
  RateLimitError
} from '@flowpay/sdk';

try {
  const payment = await client.payments.create({
    amount: 100,
    recipientId: 'user-123'
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.errors);
  } else if (error instanceof AuthenticationError) {
    console.error('Authentication failed');
  } else if (error instanceof RateLimitError) {
    console.error('Rate limited, retry after:', error.retryAfter);
  } else if (error instanceof FlowPayError) {
    console.error('API error:', error.message);
  }
}
```

## Streaming & Webhooks

### Listen for Events

```typescript
client.payments.on('payment.completed', (payment) => {
  console.log('Payment completed:', payment.id);
});

client.payments.on('payment.failed', (payment, error) => {
  console.error('Payment failed:', error);
});

client.workflows.on('workflow.executed', (result) => {
  console.log('Workflow executed:', result);
});
```

### Webhook Verification

```typescript
import { verifyWebhookSignature } from '@flowpay/sdk';

// In your webhook endpoint
export async function handleWebhook(req, res) {
  const signature = req.headers['x-flowpay-signature'];
  const payload = req.body;

  if (!verifyWebhookSignature(payload, signature, 'your-webhook-secret')) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process webhook
  console.log('Webhook verified:', payload);
  res.status(200).json({ ok: true });
}
```

## Batch Operations

```typescript
// Create multiple payments
const results = await client.payments.batch([
  { amount: 100, recipientId: 'user-1' },
  { amount: 200, recipientId: 'user-2' },
  { amount: 150, recipientId: 'user-3' }
]);

// Some may succeed, some may fail
results.forEach((result) => {
  if (result.success) {
    console.log('Payment created:', result.data.id);
  } else {
    console.error('Payment failed:', result.error);
  }
});
```

## TypeScript Support

```typescript
import {
  PaymentDTO,
  WorkflowDTO,
  CreatePaymentRequest,
  UpdatePaymentRequest
} from '@flowpay/sdk';

// Type-safe API calls
async function processPayment(request: CreatePaymentRequest): Promise<PaymentDTO> {
  return client.payments.create(request);
}

// Generic list method
async function getItems<T>(
  endpoint: string,
  options: ListOptions
): Promise<T[]> {
  return client.request<T[]>('GET', endpoint, { query: options });
}
```

## Middleware Support

```typescript
// Custom middleware
client.use((request, next) => {
  console.log('Request:', request.method, request.url);
  
  const response = next();
  
  console.log('Response:', response.status);
  return response;
});

// Logging middleware
client.use((request, next) => {
  const startTime = Date.now();
  const response = next();
  const duration = Date.now() - startTime;
  
  logger.info({
    method: request.method,
    url: request.url,
    status: response.status,
    duration
  });
  
  return response;
});
```

## Caching

```typescript
import { CacheStore, MemoryCacheStore } from '@flowpay/sdk';

const cache = new MemoryCacheStore({
  ttl: 5 * 60 * 1000 // 5 minutes
});

const client = new FlowPayClient({
  apiKey: 'your-api-key',
  cache
});

// Subsequent calls within TTL return cached data
const payments1 = await client.payments.list();
const payments2 = await client.payments.list(); // From cache
```

## Rate Limiting

The SDK automatically handles rate limiting with exponential backoff:

```typescript
const client = new FlowPayClient({
  apiKey: 'your-api-key',
  retryPolicy: {
    maxAttempts: 5,
    initialDelayMs: 100,
    maxDelayMs: 32000,
    backoffMultiplier: 2
  }
});

// Automatic retry with backoff
await client.payments.list();
```

## Testing

```typescript
import { MockFlowPayClient } from '@flowpay/sdk/testing';

const mockClient = new MockFlowPayClient();

mockClient.payments.mock('list', () => [
  { id: 'payment-1', amount: 100, status: 'completed' }
]);

const payments = await mockClient.payments.list();
// Returns mocked data
```

## Examples

### Complete Payment Flow

```typescript
async function completePaymentFlow() {
  const client = new FlowPayClient({
    apiKey: process.env.FLOWPAY_API_KEY
  });

  try {
    // 1. Create payment
    const payment = await client.payments.create({
      amount: 100,
      recipientId: 'user-123',
      description: 'Purchase'
    });

    console.log('Payment created:', payment.id);

    // 2. Wait for completion
    let finalPayment = payment;
    let attempts = 0;

    while (finalPayment.status === 'pending' && attempts < 30) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      finalPayment = await client.payments.get(payment.id);
      attempts++;
    }

    // 3. Handle result
    if (finalPayment.status === 'completed') {
      console.log('Payment successful!');
    } else {
      console.error('Payment failed:', finalPayment.status);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

## Best Practices

✅ **Do:**
- Use TypeScript
- Handle errors
- Implement retry logic
- Cache when appropriate
- Log API calls
- Validate inputs
- Use batch operations
- Close resources

❌ **Don't:**
- Hardcode API keys
- Ignore rate limits
- Skip error handling
- Cache sensitive data
- Make unbounded requests
- Modify response objects
- Leave connections open
- Retry indefinitely

## Resources

- [API Documentation](https://docs.flowpay.stellar)
- [GitHub Repository](https://github.com/flowpay/sdk-js)
- [Issue Tracker](https://github.com/flowpay/sdk-js/issues)
- [Community Support](https://discord.gg/flowpay)
