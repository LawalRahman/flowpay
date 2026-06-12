# Testing Guide

Comprehensive testing strategy and guidelines for FlowPay.

## Testing Philosophy

We follow a testing pyramid approach:
- **Unit Tests** (70%) - Fast, isolated component tests
- **Integration Tests** (20%) - Module interaction tests
- **End-to-End Tests** (10%) - Full user flow validation

## Running Tests

### All Tests
```bash
yarn test                 # Run all tests once
yarn test:watch          # Watch mode for continuous testing
yarn test:cov            # Generate coverage reports
yarn test:e2e            # Run end-to-end tests
```

### Frontend Tests
```bash
cd frontend
yarn test                 # Run React component tests
yarn test:watch          # Watch mode
yarn test:coverage       # Coverage report
```

### Backend Tests
```bash
cd backend
yarn test                 # Unit and integration tests
yarn test:watch          # Watch mode
yarn test:e2e            # End-to-end tests
yarn test:cov            # Coverage report with threshold
```

## Unit Tests

### Frontend Unit Tests

**Location:** `frontend/src/**/*.test.tsx`

**Test Hooks:**
```typescript
// useDrips.test.ts
import { renderHook, act } from '@testing-library/react';
import { useDrips } from './useDrips';

describe('useDrips', () => {
  it('should fetch drips on mount', async () => {
    const { result } = renderHook(() => useDrips());
    
    await act(async () => {
      // Wait for async operation
    });
    
    expect(result.current.drips).toBeDefined();
  });

  it('should handle error fetching drips', async () => {
    // Mock error scenario
    const { result } = renderHook(() => useDrips());
    expect(result.current.error).toBeNull();
  });
});
```

**Test Components:**
```typescript
// Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('should call onClick handler', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

### Backend Unit Tests

**Location:** `backend/src/**/*.spec.ts`

**Test Services:**
```typescript
// payments.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { StellarService } from '../stellar/stellar.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let stellarService: StellarService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: StellarService,
          useValue: {
            submitTransaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    stellarService = module.get<StellarService>(StellarService);
  });

  it('should create a payment', async () => {
    const payment = await service.create({
      to: 'GXXXXXXXXX',
      amount: 1000,
      userId: 'user123',
    });

    expect(payment).toBeDefined();
    expect(stellarService.submitTransaction).toHaveBeenCalled();
  });

  it('should validate payment amount', async () => {
    await expect(
      service.create({
        to: 'GXXXXXXXXX',
        amount: -100, // Invalid
        userId: 'user123',
      }),
    ).rejects.toThrow('Invalid amount');
  });
});
```

**Test Controllers:**
```typescript
// payments.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should return all payments', async () => {
    const expectedPayments = [{ id: '1', amount: 100 }];
    jest.spyOn(service, 'findAll').mockResolvedValue(expectedPayments);

    const result = await controller.findAll('user123');

    expect(result).toEqual(expectedPayments);
  });
});
```

## Integration Tests

### Backend Integration Tests

**Location:** `backend/src/**/*.integration.spec.ts`

**Database Integration:**
```typescript
// database.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { INestApplication } from '@nestjs/common';

describe('Database Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should save and retrieve user', async () => {
    const user = await app.get('UserRepository').save({
      address: 'GXXXXXXXXX',
      email: 'test@example.com',
    });

    const retrieved = await app.get('UserRepository').findOne(user.id);
    expect(retrieved).toEqual(user);
  });
});
```

### Stellar Integration Tests

**Location:** `backend/src/**/*.stellar.spec.ts`

```typescript
// stellar.integration.spec.ts
import { StellarService } from './stellar.service';

describe('Stellar Integration', () => {
  let service: StellarService;

  beforeAll(() => {
    service = new StellarService();
  });

  it('should connect to testnet', async () => {
    const connected = await service.isConnected();
    expect(connected).toBe(true);
  });

  it('should retrieve account info', async () => {
    const account = await service.getAccount('GXXXXXXXXX');
    expect(account).toHaveProperty('id');
    expect(account).toHaveProperty('sequenceNumber');
  });
});
```

## End-to-End Tests

### Frontend E2E Tests

**Tool:** Playwright or Cypress

**Location:** `frontend/e2e/**/*.spec.ts`

```typescript
// login.e2e.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should login with valid credentials', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('http://localhost:5173/dashboard');
  });

  it('should show error with invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'wrong');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('[role="alert"]')).toContainText('Invalid credentials');
  });
});
```

### Backend E2E Tests

**Location:** `backend/test/e2e/**/*.e2e-spec.ts`

```typescript
// payments.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Payments (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login to get token
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password' });

    token = loginRes.body.token;
  });

  it('POST /payments should create payment', () => {
    return request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        to: 'GXXXXXXXXX',
        amount: 1000,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.status).toBe('PENDING');
      });
  });

  it('GET /payments should list user payments', () => {
    return request(app.getHttpServer())
      .get('/payments')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

## Test Configuration

### Jest Configuration (Backend)

**jest.config.js:**
```javascript
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.module.ts',
    '!**/*.interface.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
```

### Vitest Configuration (Frontend)

**vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
  },
});
```

## Test Data & Mocking

### Mock Stellar Service

```typescript
export const mockStellarService = {
  submitTransaction: jest.fn().mockResolvedValue({
    hash: 'abc123',
    ledger: 100,
  }),
  getAccount: jest.fn().mockResolvedValue({
    id: 'GXXXXXXXXX',
    sequenceNumber: '1000',
  }),
  getBalance: jest.fn().mockResolvedValue({
    balance: '1000.00',
    assetCode: 'native',
  }),
};
```

### Test Fixtures

```typescript
export const testUser = {
  id: '123',
  address: 'GXXXXXXXXX',
  email: 'test@example.com',
  createdAt: new Date('2024-01-01'),
};

export const testPayment = {
  id: '456',
  userId: '123',
  to: 'GYYYYYYYYYY',
  amount: 1000,
  status: 'COMPLETED',
  txHash: 'abc123',
};
```

## Coverage Requirements

| Area | Minimum | Target |
|------|---------|--------|
| Statements | 50% | 80% |
| Branches | 50% | 75% |
| Functions | 50% | 80% |
| Lines | 50% | 80% |

## CI/CD Testing

Tests automatically run on:
- `git push` - Unit tests
- Pull requests - All tests
- Before merge - E2E tests
- Production deploy - Full test suite

## Debugging Tests

### VSCode Test Debugging

Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/jest/bin/jest.js",
  "args": ["--runInBand"],
  "console": "integratedTerminal"
}
```

### Running Single Test File
```bash
yarn test -- auth.spec.ts
yarn test -- payments.service.spec.ts
```

### Running Tests Matching Pattern
```bash
yarn test -- --testNamePattern="should create payment"
yarn test:watch -- --testNamePattern="Stellar"
```

## Best Practices

✅ **Do:**
- Write tests alongside code
- Use descriptive test names
- Mock external dependencies
- Keep tests independent
- Use test fixtures for common data
- Maintain >80% code coverage
- Test user interactions, not implementation details

❌ **Don't:**
- Write tests after code (when possible)
- Use vague test descriptions
- Make tests depend on each other
- Test third-party libraries
- Ignore test failures
- Test private implementation details
- Skip testing error scenarios

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright](https://playwright.dev/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
