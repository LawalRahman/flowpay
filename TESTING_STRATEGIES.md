# Advanced Testing Strategies

Comprehensive testing strategies for different layers of the application.

## Test Pyramid Breakdown

```
        /\
       /  \      E2E Tests (10%)
      /    \     Browser, full workflows
     /------\
    /        \   Integration Tests (20%)
   /          \  Database, APIs, services
  /            \
 /              \ Unit Tests (70%)
/________________\ Pure functions, isolated logic
```

## Unit Testing

### Component Tests

```typescript
import { render, screen } from '@testing-library/react';
import { PaymentForm } from './PaymentForm';

describe('PaymentForm', () => {
  it('should render form fields', () => {
    render(<PaymentForm />);
    
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/recipient/i)).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    const { getByRole } = render(<PaymentForm />);
    
    fireEvent.click(getByRole('button', { name: /submit/i }));
    
    expect(screen.getByText(/amount is required/i)).toBeInTheDocument();
  });

  it('should submit valid form', async () => {
    const onSubmit = jest.fn();
    render(<PaymentForm onSubmit={onSubmit} />);
    
    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByLabelText(/recipient/i), {
      target: { value: 'GXXXXXXX' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    
    expect(onSubmit).toHaveBeenCalledWith({
      amount: '100',
      recipient: 'GXXXXXXX',
    });
  });
});
```

### Service Tests

```typescript
describe('PaymentService', () => {
  let service: PaymentService;
  let mockDatabase: any;
  let mockBlockchain: any;

  beforeEach(() => {
    mockDatabase = {
      payments: { create: jest.fn() },
    };
    mockBlockchain = {
      submitTransaction: jest.fn(),
    };
    
    service = new PaymentService(mockDatabase, mockBlockchain);
  });

  it('should create payment record', async () => {
    mockDatabase.payments.create.mockResolvedValue({ id: '123' });

    const payment = await service.createPayment({
      amount: 1000,
      to: 'GXXXXXXX',
    });

    expect(payment.id).toBe('123');
    expect(mockDatabase.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1000 })
    );
  });

  it('should handle blockchain submission error', async () => {
    mockBlockchain.submitTransaction.mockRejectedValue(
      new Error('Network error')
    );

    await expect(service.submitPayment(paymentData))
      .rejects.toThrow('Network error');
  });
});
```

## Integration Testing

### Database Integration

```typescript
describe('PaymentRepository', () => {
  let db: any;

  beforeAll(async () => {
    db = await setupTestDatabase();
    await db.migrate();
  });

  afterEach(async () => {
    await db.clear();
  });

  afterAll(async () => {
    await db.close();
  });

  it('should save and retrieve payment', async () => {
    const payment = await db.payments.create({
      userId: 'user-123',
      amount: 1000,
      to: 'GXXXXXXX',
    });

    const retrieved = await db.payments.findById(payment.id);

    expect(retrieved).toEqual(payment);
  });

  it('should find payments by user', async () => {
    await db.payments.create({ userId: 'user-123', amount: 100 });
    await db.payments.create({ userId: 'user-123', amount: 200 });
    await db.payments.create({ userId: 'user-456', amount: 300 });

    const payments = await db.payments.findByUserId('user-123');

    expect(payments).toHaveLength(2);
  });
});
```

### API Integration

```typescript
import request from 'supertest';
import { app } from './app';

describe('POST /api/payments', () => {
  it('should create payment', async () => {
    const response = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 1000,
        to: 'GXXXXXXX',
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        status: 'pending',
      })
    );
  });

  it('should validate amount', async () => {
    const response = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: -100,
        to: 'GXXXXXXX',
      });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post('/api/payments')
      .send({
        amount: 1000,
        to: 'GXXXXXXX',
      });

    expect(response.status).toBe(401);
  });
});
```

## End-to-End Testing

### Playwright E2E Tests

```typescript
import { test, expect } from '@playwright/test';

test.describe('Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('[name="email"]', 'user@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
  });

  test('should complete payment', async ({ page }) => {
    // Navigate to payments
    await page.click('text=Payments');
    
    // Fill form
    await page.fill('[name="amount"]', '100');
    await page.fill('[name="recipient"]', 'GXXXXXXX');
    
    // Submit
    await page.click('button:has-text("Send Payment")');
    
    // Verify success
    await expect(page.locator('text=Payment sent successfully'))
      .toBeVisible();
  });

  test('should show validation errors', async ({ page }) => {
    await page.click('text=Payments');
    await page.click('button:has-text("Send Payment")');
    
    await expect(page.locator('text=Amount is required'))
      .toBeVisible();
  });
});
```

## Contract Testing

### API Contract Testing

```typescript
describe('PaymentAPI Contract', () => {
  it('should match schema', async () => {
    const response = await api.getPayment('123');

    expect(response).toEqual({
      id: expect.any(String),
      userId: expect.any(String),
      amount: expect.any(Number),
      to: expect.any(String),
      status: expect.stringMatching(/pending|confirmed|failed/),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });
});
```

## Performance Testing

### Load Testing

```typescript
import autocannon from 'autocannon';

const result = await autocannon({
  url: 'http://localhost:3000/api/payments',
  connections: 100,
  duration: 30,
  requests: [
    {
      method: 'POST',
      path: '/api/payments',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount: 1000,
        to: 'GXXXXXXX',
      }),
    },
  ],
});

console.log(`Throughput: ${result.throughput.average} req/s`);
console.log(`Latency p99: ${result.latency.p99}ms`);
```

## Test Coverage

### Coverage Goals

```
Statements:   > 80%
Branches:     > 75%
Functions:    > 80%
Lines:        > 80%
```

### Generate Coverage Report

```bash
npm test -- --coverage

# Output:
# ✓ app.controller.ts        95.5% (21/22)
# ✓ app.service.ts          92.3% (12/13)
# ✓ payments.service.ts     88.7% (31/35)
# ✓ auth.service.ts         85.2% (23/27)
# 
# Total: 90.2%
```

## Test Data

### Fixtures

```typescript
const testUsers = {
  admin: {
    id: 'admin-123',
    email: 'admin@example.com',
    role: 'admin',
  },
  user: {
    id: 'user-123',
    email: 'user@example.com',
    role: 'user',
  },
};

const testPayments = {
  pending: {
    id: 'payment-1',
    amount: 1000,
    status: 'pending',
  },
  confirmed: {
    id: 'payment-2',
    amount: 2000,
    status: 'confirmed',
  },
};
```

## Continuous Testing

### GitHub Actions

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      
      - run: npm install
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:coverage
      
      - uses: codecov/codecov-action@v3
```

## Testing Checklist

- [ ] Unit tests for all business logic (> 80% coverage)
- [ ] Integration tests for APIs
- [ ] E2E tests for critical user flows
- [ ] Performance tests
- [ ] Contract tests
- [ ] Error scenario tests
- [ ] Security tests
- [ ] Tests run on CI/CD
- [ ] Coverage reports tracked
- [ ] Flaky tests identified and fixed
