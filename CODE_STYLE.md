# Code Style Guide

Coding standards and style guidelines for FlowPay.

## Naming Conventions

### Variables & Constants

```typescript
// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const DATABASE_TIMEOUT = 30000;

// Variables: camelCase
let paymentStatus = 'pending';
const userAddress = 'GXXXXXXXXX';

// Private properties: _camelCase or #property
class PaymentService {
  _cache = new Map();
  #secret = process.env.JWT_SECRET;
}

// Booleans: is/has/can prefix
const isActive = true;
const hasPermission = false;
const canRetry = true;
```

### Functions & Methods

```typescript
// Handlers: handle + What
function handlePaymentSubmit() {}
async function handleDripCreation() {}

// Getters: get + What
function getPaymentStatus(id: string) {}
function getUserPayments(userId: string) {}

// Setters: set + What
function setPaymentStatus(id: string, status: string) {}

// Predicates: is/has/can + What
function isValidAddress(address: string): boolean {}
function hasPermission(user: User, action: string): boolean {}
function canRetry(error: Error): boolean {}

// Async operations: handle + What + async
async function submitPayment() {}
async function executeWorkflow() {}
```

### Classes

```typescript
// Classes: PascalCase
class PaymentService {}
class UserController {}
class TransactionBuffer {}

// Enums: PascalCase, values UPPER_SNAKE_CASE
enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

enum TransactionType {
  PAYMENT = 'PAYMENT',
  DRIP_EXECUTED = 'DRIP_EXECUTED',
}
```

### Files & Folders

```
src/
├── auth/
│   ├── auth.module.ts          # Module files
│   ├── auth.controller.ts      # Controller files
│   ├── auth.service.ts         # Service files
│   └── dto/
│       └── login.dto.ts        # DTOs
├── database/
│   └── entities/
│       └── payment.entity.ts   # Entity files
└── utils/
    └── validators.ts           # Utility files
```

## TypeScript Guidelines

### Use Strict Types

```typescript
// ✅ Good: Explicit types
function getPayment(id: string): Promise<Payment | null> {
  // ...
}

// ❌ Bad: Using any
function getPayment(id: any): any {
  // ...
}

// ✅ Good: Interface for objects
interface User {
  id: string;
  email: string;
  address: string;
}

// ❌ Bad: Using object type
function getUser(id: string): object {
  // ...
}
```

### Union & Intersection Types

```typescript
// Use unions for variants
type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

// Use intersections for composition
type AdminUser = User & { role: 'admin'; permissions: string[] };

// Avoid nesting too deeply
// ✅ Good: Flat hierarchy
type Config = BaseConfig & AuthConfig & DatabaseConfig;

// ❌ Bad: Deep nesting
type Config = {
  auth: {
    jwt: {
      secret: string;
    };
  };
};
```

## Code Organization

### Function Order

Within a class or module:
1. Imports
2. Constants
3. Interfaces/Types
4. Class definition
5. Public methods
6. Private methods
7. Exports

```typescript
// Import
import { Payment } from './payment.entity';

// Constants
const MAX_RETRIES = 3;

// Interfaces
interface PaymentRequest {
  amount: number;
  to: string;
}

// Class
export class PaymentService {
  // Public methods
  public async createPayment(request: PaymentRequest) {
    // ...
  }

  // Private methods
  private async submitToBlockchain() {
    // ...
  }
}
```

## Comments & Documentation

### JSDoc Comments

```typescript
/**
 * Creates a new payment transaction.
 * 
 * @param {PaymentRequest} request - Payment details
 * @param {string} request.to - Recipient address
 * @param {number} request.amount - Amount in stroops
 * @returns {Promise<Payment>} Created payment
 * @throws {InvalidAddressError} If address format invalid
 * @example
 * const payment = await service.createPayment({
 *   to: 'GXXXXXXX',
 *   amount: 1000000
 * });
 */
public async createPayment(request: PaymentRequest): Promise<Payment> {
  // ...
}
```

### Inline Comments

```typescript
// ✅ Good: Explains why, not what
// Retry with exponential backoff to handle temporary Stellar network issues
await retryWithBackoff(() => submitTransaction(tx));

// ❌ Bad: Explains obvious code
// Set payment status to completed
payment.status = 'COMPLETED';
```

## Error Handling

```typescript
// ✅ Good: Specific error classes
class InvalidAddressError extends Error {
  constructor(address: string) {
    super(`Invalid Stellar address: ${address}`);
  }
}

// ✅ Good: Handle errors explicitly
try {
  await submitPayment();
} catch (error) {
  if (error instanceof InvalidAddressError) {
    // Handle specific error
  } else {
    // Handle generic error
  }
}

// ❌ Bad: Generic catch
try {
  await submitPayment();
} catch (error) {
  console.log('Error');
}
```

## Testing Guidelines

```typescript
// Test naming: describe + it format
describe('PaymentService', () => {
  it('should create payment with valid address', async () => {
    // Arrange
    const payment = { to: 'GXXXXXXX', amount: 1000 };

    // Act
    const result = await service.createPayment(payment);

    // Assert
    expect(result).toHaveProperty('id');
  });

  it('should throw error with invalid address', async () => {
    // Arrange
    const payment = { to: 'INVALID', amount: 1000 };

    // Act & Assert
    await expect(service.createPayment(payment))
      .rejects.toThrow(InvalidAddressError);
  });
});
```

## Import Organization

```typescript
// 1. External imports
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// 2. Internal imports
import { PaymentService } from './payment.service';
import { UserRepository } from '../database/repositories/user.repository';

// 3. Relative imports
import { Payment } from '../entities/payment.entity';
import { validateAddress } from '../utils/validators';
```

## Formatting

### Line Length

Max 100 characters per line for readability.

```typescript
// ✅ Good: Line < 100 chars
const result = processPayment(
  paymentId,
  userId,
  amount
);

// ❌ Bad: Line > 100 chars
const result = processPaymentWithRetry(paymentId, userId, amount, retryCount, backoffMs, onError, onSuccess);
```

### Indentation

- Use 2 spaces
- Never use tabs
- Use ESLint to enforce

### Async/Await

```typescript
// ✅ Good: Use async/await
async function getPayments(userId: string) {
  const payments = await db.query('SELECT * FROM payments WHERE userId = $1', [userId]);
  return payments;
}

// ❌ Bad: Use .then() chains
function getPayments(userId: string) {
  return db.query('SELECT * FROM payments WHERE userId = $1', [userId])
    .then(payments => payments);
}
```

## Linting & Formatting

### ESLint

```bash
# Fix linting errors
npm run lint -- --fix

# Check for issues
npm run lint
```

### Prettier

```bash
# Format code
npm run format

# Check formatting
npm run format:check
```

### Pre-commit Hooks

Run linting and tests before commits:

```bash
# Install Husky
npm install husky --save-dev
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint && npm run test"
```

## Common Patterns

### Optional Chaining

```typescript
// ✅ Good: Optional chaining
const email = user?.profile?.email;

// ❌ Bad: Deep checks
const email = user && user.profile && user.profile.email;
```

### Nullish Coalescing

```typescript
// ✅ Good: Use ?? for defaults
const timeout = config.timeout ?? 30000;

// ❌ Bad: Use || (fails with falsy values)
const timeout = config.timeout || 30000;
```

### Destructuring

```typescript
// ✅ Good: Destructure parameters
function createPayment({ to, amount }: PaymentRequest) {
  // ...
}

// ✅ Good: Destructure objects
const { id, status } = payment;

// ❌ Bad: Access nested properties repeatedly
function createPayment(request: PaymentRequest) {
  const to = request.to;
  const amount = request.amount;
}
```

## Review Checklist

Before submitting code:
- [ ] Follows naming conventions
- [ ] Has type annotations
- [ ] Has JSDoc for public methods
- [ ] Handles errors explicitly
- [ ] Passes ESLint
- [ ] Passes Prettier formatting
- [ ] Has tests
- [ ] No console.log statements
- [ ] No TODO comments
- [ ] Line length < 100 chars
