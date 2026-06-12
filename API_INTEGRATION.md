# API Integration Guide

Complete guide to integrating FlowPay API with your applications.

## Quick Start

### Installation

**JavaScript/TypeScript:**
```bash
npm install @flowpay/sdk
# or
yarn add @flowpay/sdk
```

**Python:**
```bash
pip install flowpay-py
```

**Go:**
```bash
go get github.com/flowpay/flowpay-go
```

### Basic Usage

**JavaScript:**
```typescript
import { FlowPay } from '@flowpay/sdk';

const flowpay = new FlowPay({
  apiKey: 'pk_live_...',
  network: 'testnet' // or 'public'
});

// Create payment
const payment = await flowpay.payments.create({
  to: 'GYYYYYYYYYY',
  amount: 1000000,
  description: 'Order #123'
});

console.log(payment.id);
```

**Python:**
```python
from flowpay import FlowPay

flowpay = FlowPay(
    api_key='pk_live_...',
    network='testnet'
)

# Create payment
payment = flowpay.payments.create(
    to='GYYYYYYYYYY',
    amount=1000000,
    description='Order #123'
)

print(payment.id)
```

**Go:**
```go
package main

import "github.com/flowpay/flowpay-go"

func main() {
    client := flowpay.New("pk_live_...")
    
    payment, err := client.Payments.Create(context.Background(), &flowpay.CreatePaymentRequest{
        To: "GYYYYYYYYYY",
        Amount: 1000000,
    })
    if err != nil {
        panic(err)
    }
}
```

## Authentication

### API Keys

1. **Public Key** - Used for frontend/client-side requests
2. **Secret Key** - Used for backend/server-side requests

```bash
# Get your keys from dashboard
https://dashboard.flowpay.stellar/api-keys
```

### Using API Keys

**JavaScript:**
```typescript
import { FlowPay } from '@flowpay/sdk';

const flowpay = new FlowPay({
  publishableKey: 'pk_test_...',  // Frontend
  secretKey: 'sk_test_...',        // Backend only
  network: 'testnet'
});
```

**Environment Variables:**
```bash
FLOWPAY_PUBLISHABLE_KEY=pk_test_...
FLOWPAY_SECRET_KEY=sk_test_...
FLOWPAY_NETWORK=testnet
```

## Payments API

### Create Payment

```typescript
const payment = await flowpay.payments.create({
  to: 'GYYYYYYYYYY',
  amount: 1000000,
  asset: 'native',
  description: 'Payment for service',
  idempotencyKey: 'unique-key' // Prevent duplicates
});

// {
//   id: 'pay_123456',
//   status: 'PENDING',
//   to: 'GYYYYYYYYYY',
//   amount: 1000000,
//   txHash: null,
//   createdAt: '2024-01-01T00:00:00Z'
// }
```

### Get Payment

```typescript
const payment = await flowpay.payments.retrieve('pay_123456');
```

### List Payments

```typescript
const payments = await flowpay.payments.list({
  limit: 20,
  offset: 0,
  status: 'COMPLETED'
});

// {
//   data: [...],
//   hasMore: false,
//   total: 42
// }
```

### Cancel Payment

```typescript
await flowpay.payments.cancel('pay_123456');
```

## Drips API

### Create Drip

```typescript
const drip = await flowpay.drips.create({
  to: 'GYYYYYYYYYY',
  amountPerInterval: 100000,
  intervalSeconds: 86400,        // Daily
  durationSeconds: 2592000,      // 30 days
  description: 'Monthly subscription'
});

// {
//   id: 'drip_123456',
//   status: 'SCHEDULED',
//   amountPerInterval: 100000,
//   intervalSeconds: 86400,
//   sorobanContractId: 'CA...'
// }
```

### Get Drip

```typescript
const drip = await flowpay.drips.retrieve('drip_123456');
```

### Pause Drip

```typescript
await flowpay.drips.update('drip_123456', {
  status: 'PAUSED'
});
```

### Cancel Drip

```typescript
await flowpay.drips.cancel('drip_123456');
```

## Workflows API

### Create Workflow

```typescript
const workflow = await flowpay.workflows.create({
  name: 'Daily Savings',
  triggers: [
    {
      type: 'TIME',
      time: '09:00'  // 9 AM daily
    }
  ],
  actions: [
    {
      type: 'PAYMENT',
      to: 'GYYYYYYYYYY',
      amount: 100000
    }
  ]
});
```

### Enable/Disable Workflow

```typescript
await flowpay.workflows.update('workflow_123456', {
  enabled: false
});
```

### List Workflows

```typescript
const workflows = await flowpay.workflows.list();
```

## Webhooks

### Register Webhook

```typescript
const webhook = await flowpay.webhooks.create({
  url: 'https://yourapp.com/webhooks/flowpay',
  events: [
    'payment.completed',
    'payment.failed',
    'drip.executed'
  ]
});
```

### Handle Webhooks

**Express.js Example:**
```javascript
const express = require('express');
const app = express();

app.post('/webhooks/flowpay', express.json(), (req, res) => {
  const { event, data } = req.body;
  
  switch(event) {
    case 'payment.completed':
      console.log('Payment completed:', data.paymentId);
      // Update your database
      break;
    case 'payment.failed':
      console.log('Payment failed:', data.error);
      // Handle failure
      break;
    case 'drip.executed':
      console.log('Drip executed:', data.dripId);
      // Log transaction
      break;
  }
  
  res.json({ success: true });
});
```

### Webhook Security

**Verify Signature:**
```typescript
import { FlowPay } from '@flowpay/sdk';

const isValid = FlowPay.verifyWebhookSignature(
  payload,
  signature,
  webhookSecret
);

if (!isValid) {
  throw new Error('Invalid signature');
}
```

## Error Handling

### Try/Catch Pattern

```typescript
try {
  const payment = await flowpay.payments.create({
    to: 'GYYYYYYYYYY',
    amount: 1000000
  });
} catch (error) {
  if (error.code === 'INVALID_ADDRESS') {
    console.error('Invalid Stellar address');
  } else if (error.code === 'INSUFFICIENT_BALANCE') {
    console.error('Insufficient balance');
  } else if (error.code === 'RATE_LIMIT_EXCEEDED') {
    console.error('Too many requests');
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "PAYMENT_FAILED",
    "message": "Payment processing failed",
    "details": {
      "reason": "Invalid recipient address"
    }
  },
  "statusCode": 400
}
```

## Testing

### Using Test Keys

```typescript
const flowpay = new FlowPay({
  apiKey: 'pk_test_...',
  network: 'testnet'
});
```

### Test Scenarios

**Successful Payment:**
```typescript
const payment = await flowpay.payments.create({
  to: 'GXXXTEST000000000000000000000',  // Test address
  amount: 100000
});
// Returns: status: 'COMPLETED'
```

**Failed Payment:**
```typescript
const payment = await flowpay.payments.create({
  to: 'GINVALID',
  amount: 100000
});
// Throws: INVALID_ADDRESS error
```

## Rate Limiting

FlowPay API has rate limits:

- **Free Plan:** 1,000 requests/hour
- **Professional:** 10,000 requests/hour
- **Enterprise:** Custom limits

**Check Rate Limit:**
```typescript
const response = await flowpay.payments.list();
console.log(response.headers['x-ratelimit-remaining']);
```

## Pagination

### Cursor-based Pagination

```typescript
const firstPage = await flowpay.payments.list({
  limit: 20
});

if (firstPage.hasMore) {
  const nextPage = await flowpay.payments.list({
    limit: 20,
    cursor: firstPage.nextCursor
  });
}
```

## Idempotency

### Prevent Duplicate Requests

```typescript
const payment = await flowpay.payments.create({
  to: 'GYYYYYYYYYY',
  amount: 1000000,
  idempotencyKey: 'order_123_payment'
});

// If request is retried with same idempotencyKey,
// returns same payment instead of creating duplicate
```

## Examples

### E-commerce Integration

```typescript
// User checkout
const order = {
  id: 'order_123',
  total: 5000000  // 0.5 XLM
};

const payment = await flowpay.payments.create({
  to: 'GMERCHANT_ADDRESS',
  amount: order.total,
  description: `Order ${order.id}`,
  idempotencyKey: order.id
});

if (payment.status === 'PENDING') {
  // Wait for completion
  const completed = await pollPaymentStatus(payment.id);
}
```

### Subscription Setup

```typescript
const subscription = await flowpay.drips.create({
  to: 'GSUPPORT_ADDRESS',
  amountPerInterval: 1000000,    // 0.1 XLM
  intervalSeconds: 2592000,       // Monthly
  durationSeconds: 31536000,      // 1 year
  description: 'Premium subscription'
});

// Automatically sends payment every 30 days for 1 year
```

### Automated Savings

```typescript
const workflow = await flowpay.workflows.create({
  name: 'Auto Savings',
  triggers: [
    {
      type: 'TIME',
      time: '08:00',  // Every day at 8 AM
      days: [1, 2, 3, 4, 5]  // Weekdays only
    }
  ],
  actions: [
    {
      type: 'DRIP',
      amount: 100000,
      to: 'GSAVINGS_ACCOUNT'
    }
  ]
});
```

## Best Practices

✅ **Do:**
- Use idempotency keys for create operations
- Verify webhook signatures
- Handle errors gracefully
- Use test keys during development
- Cache frequently accessed data
- Implement retry logic with exponential backoff
- Monitor rate limit headers

❌ **Don't:**
- Store secret keys in frontend code
- Expose API keys in version control
- Make synchronous blocking calls
- Ignore webhook events
- Use invalid Stellar addresses
- Retry failed payments without checking status

## API Client Libraries

- **JavaScript:** https://github.com/flowpay/flowpay-js
- **Python:** https://github.com/flowpay/flowpay-py
- **Go:** https://github.com/flowpay/flowpay-go
- **Java:** https://github.com/flowpay/flowpay-java
- **Ruby:** https://github.com/flowpay/flowpay-ruby

## Support

- **Documentation:** https://docs.flowpay.stellar
- **API Status:** https://status.flowpay.stellar
- **GitHub Issues:** https://github.com/flowpay/flowpay/issues
- **Email Support:** support@flowpay.stellar
