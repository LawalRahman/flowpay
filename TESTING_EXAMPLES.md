# Testing Examples

Comprehensive testing examples and patterns.

## Unit Testing

### NestJS Service Tests

```typescript
describe('PaymentService', () => {
  let service: PaymentService;
  let paymentRepository: Repository<Payment>;
  let stellarService: StellarService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getRepositoryToken(Payment),
          useValue: {
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn()
          }
        },
        {
          provide: StellarService,
          useValue: {
            sendPayment: jest.fn()
          }
        }
      ]
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    paymentRepository = module.get<Repository<Payment>>(
      getRepositoryToken(Payment)
    );
    stellarService = module.get<StellarService>(StellarService);
  });

  it('should create payment', async () => {
    const createDto = {
      amount: 100,
      recipientId: 'recipient-1',
      description: 'Payment'
    };

    const payment = { id: '1', ...createDto, status: 'pending' };

    jest.spyOn(paymentRepository, 'save').mockResolvedValue(payment);

    const result = await service.create(createDto);

    expect(result).toEqual(payment);
    expect(paymentRepository.save).toHaveBeenCalledWith(
      expect.objectContaining(createDto)
    );
  });

  it('should handle payment failure', async () => {
    const createDto = {
      amount: 100,
      recipientId: 'invalid-recipient',
      description: 'Payment'
    };

    jest.spyOn(stellarService, 'sendPayment').mockRejectedValue(
      new Error('Invalid recipient')
    );

    await expect(service.processPayment(createDto)).rejects.toThrow(
      'Invalid recipient'
    );
  });
});
```

### React Component Tests

```typescript
describe('PaymentForm', () => {
  it('should render form fields', () => {
    render(<PaymentForm onSubmit={jest.fn()} />);

    expect(screen.getByLabelText('Amount')).toBeInTheDocument();
    expect(screen.getByLabelText('Recipient')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('should validate amount field', async () => {
    const { getByRole } = render(<PaymentForm onSubmit={jest.fn()} />);

    const amountInput = screen.getByLabelText('Amount') as HTMLInputElement;

    // Type invalid amount
    await userEvent.type(amountInput, '-100');
    await userEvent.click(getByRole('button', { name: /submit/i }));

    expect(screen.getByText(/amount must be positive/i)).toBeInTheDocument();
  });

  it('should submit form with valid data', async () => {
    const onSubmit = jest.fn();
    render(<PaymentForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Amount'), '100');
    await userEvent.type(screen.getByLabelText('Recipient'), 'user-123');
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      amount: '100',
      recipientId: 'user-123'
    });
  });
});
```

## Integration Testing

### API Tests

```typescript
describe('Payment API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /payments - should create payment', () => {
    return request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 100,
        recipientId: 'user-123',
        description: 'Test payment'
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.status).toBe('pending');
        expect(res.body.amount).toBe(100);
      });
  });

  it('GET /payments/:id - should retrieve payment', async () => {
    const payment = await createTestPayment();

    return request(app.getHttpServer())
      .get(`/payments/${payment.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(payment.id);
        expect(res.body.amount).toBe(payment.amount);
      });
  });

  it('GET /payments - should list payments', () => {
    return request(app.getHttpServer())
      .get('/payments')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });
});
```

## End-to-End Testing

### Playwright Tests

```typescript
import { test, expect } from '@playwright/test';

test.describe('Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Login")');
    await page.waitForNavigation();
  });

  test('should create payment', async ({ page }) => {
    await page.goto('http://localhost:5173/payments/new');

    // Fill form
    await page.fill('input[placeholder="Amount"]', '100');
    await page.fill('input[placeholder="Recipient"]', 'user-123');

    // Submit
    await page.click('button:has-text("Send Payment")');

    // Verify success
    await expect(
      page.locator('text=Payment sent successfully')
    ).toBeVisible();

    // Verify in list
    await page.goto('http://localhost:5173/payments');
    await expect(page.locator('text=100 XLM')).toBeVisible();
  });

  test('should show error for invalid recipient', async ({ page }) => {
    await page.goto('http://localhost:5173/payments/new');

    await page.fill('input[placeholder="Amount"]', '100');
    await page.fill('input[placeholder="Recipient"]', 'invalid');
    await page.click('button:has-text("Send Payment")');

    await expect(
      page.locator('text=Invalid recipient')
    ).toBeVisible();
  });

  test('should handle network error', async ({ page }) => {
    // Simulate network failure
    await page.context().setOffline(true);

    await page.goto('http://localhost:5173/payments/new');
    await page.fill('input[placeholder="Amount"]', '100');
    await page.fill('input[placeholder="Recipient"]', 'user-123');
    await page.click('button:has-text("Send Payment")');

    await expect(
      page.locator('text=Network error')
    ).toBeVisible();

    // Restore network
    await page.context().setOffline(false);
  });
});
```

## Mock Data

```typescript
// __mocks__/payment.factory.ts
import { faker } from '@faker-js/faker';

export function createPaymentMock(overrides?: Partial<Payment>): Payment {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    amount: faker.number.float({ min: 0.1, max: 1000 }),
    status: faker.helpers.arrayElement(['pending', 'completed', 'failed']),
    recipientId: faker.string.uuid(),
    description: faker.lorem.sentence(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides
  };
}

export function createUserMock(overrides?: Partial<User>): User {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    status: faker.helpers.arrayElement(['active', 'inactive']),
    createdAt: faker.date.past(),
    ...overrides
  };
}
```

## Coverage

```bash
# Generate coverage
jest --coverage

# Expected Coverage Goals
# ├── Statements: 80%+
# ├── Branches: 75%+
# ├── Functions: 80%+
# └── Lines: 80%+

# Generate HTML report
jest --coverage --collectCoverageFrom="src/**/*.ts"
open coverage/lcov-report/index.html
```

## Test Organization

```
src/
├── payment/
│   ├── payment.service.ts
│   ├── payment.service.spec.ts
│   ├── payment.controller.ts
│   ├── payment.controller.spec.ts
│   └── __mocks__/
│       └── payment.repository.mock.ts
├── payment.e2e.spec.ts
└── payment.integration.spec.ts
```

## Best Practices

✅ **Do:**
- Test behavior, not implementation
- Use descriptive test names
- Keep tests DRY
- Mock external services
- Test edge cases
- Maintain high coverage
- Run tests frequently
- Clean up after tests

❌ **Don't:**
- Test private methods
- Skip error cases
- Create flaky tests
- Mock too much
- Ignore coverage
- Test UI implementation
- Skip integration tests
- Leave skipped tests

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Playwright Testing](https://playwright.dev/docs/intro)
- [Testing Library Best Practices](https://testing-library.com/docs/)
