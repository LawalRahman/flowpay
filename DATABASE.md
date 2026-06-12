# Database Schema & Design

Complete database schema documentation for FlowPay.

## Database Overview

FlowPay uses a relational database to store user data, payment records, drip streams, and workflow configurations. The schema is designed for:
- Data integrity through foreign key relationships
- Query efficiency with appropriate indexing
- Audit trails for compliance and debugging
- Scalability through proper normalization

## Supported Databases

- **Development:** SQLite (lightweight, file-based)
- **Production:** PostgreSQL (robust, production-ready)

## Entity Relationship Diagram

```
┌─────────────┐         ┌──────────────┐
│    User     │─────────│   Payment    │
├─────────────┤         ├──────────────┤
│ id (PK)     │         │ id (PK)      │
│ address     │         │ userId (FK)  │
│ email       │         │ to           │
│ name        │         │ amount       │
│ createdAt   │         │ status       │
│ updatedAt   │         │ txHash       │
└─────────────┘         │ createdAt    │
       │                └──────────────┘
       │
       ├─────────────────┬──────────────┐
       │                 │              │
   ┌───┴───┐        ┌────┴────┐   ┌───┴──────┐
   │  Drip │        │Workflow │   │Audit Log │
   ├───────┤        ├─────────┤   ├──────────┤
   │ id(PK)│        │ id (PK) │   │ id (PK)  │
   │userId │        │ userId  │   │ userId   │
   │to     │        │ name    │   │ action   │
   │amount │        │triggers │   │ resource │
   │interval       │ actions │   │ data     │
   │duration       │enabled  │   │ ipAddress
   │status │        │createdAt│   │createdAt │
   │contractId     │ updatedAt   │          │
   │createdAt   │   └─────────┘   └──────────┘
   │updatedAt  │
   └────────┘
```

## Core Tables

### users

Stores user account information and Stellar wallet addresses.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address VARCHAR(56) UNIQUE NOT NULL,  -- Stellar public key
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  passwordHash VARCHAR(255) NOT NULL,
  isActive BOOLEAN DEFAULT true,
  emailVerified BOOLEAN DEFAULT false,
  lastLogin TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_address (address),
  INDEX idx_email (email)
);
```

**Columns:**
- `id` - Unique user identifier (UUID)
- `address` - Stellar public key (56 chars, starting with 'G')
- `email` - User email address (unique, for authentication)
- `name` - User's display name (optional)
- `passwordHash` - Hashed password (bcrypt)
- `isActive` - Account status
- `emailVerified` - Email verification status
- `lastLogin` - Last authentication timestamp

### payments

Records all payment transactions between users.

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to VARCHAR(56) NOT NULL,  -- Recipient Stellar address
  amount BIGINT NOT NULL,   -- Amount in stroops (1 XLM = 10M stroops)
  asset VARCHAR(255) DEFAULT 'native',
  status VARCHAR(50) DEFAULT 'PENDING',  -- PENDING, COMPLETED, FAILED
  description VARCHAR(500),
  txHash VARCHAR(64),  -- Stellar transaction hash
  txLedger INT,
  errorMessage TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId (userId),
  INDEX idx_status (status),
  INDEX idx_txHash (txHash),
  INDEX idx_createdAt (createdAt)
);
```

**Columns:**
- `id` - Unique payment identifier
- `userId` - Payment creator (foreign key)
- `to` - Recipient's Stellar address
- `amount` - Amount in stroops (to support fractional values)
- `asset` - Asset code (default: 'native' for XLM)
- `status` - PENDING, COMPLETED, FAILED
- `description` - Optional payment memo/description
- `txHash` - Stellar transaction hash (populated after submission)
- `txLedger` - Ledger number where tx was finalized
- `errorMessage` - Error details if payment failed
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

**Status Flow:**
```
PENDING → COMPLETED (successful)
PENDING → FAILED (error occurred)
```

### drips

Stores streaming payment configurations (recurring, time-based payments).

```sql
CREATE TABLE drips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to VARCHAR(56) NOT NULL,  -- Recipient address
  amountPerInterval BIGINT NOT NULL,  -- Amount per drip (stroops)
  intervalSeconds INT NOT NULL,  -- Interval in seconds (e.g., 86400 = 1 day)
  durationSeconds INT,  -- Total duration (NULL = indefinite)
  startTime TIMESTAMP NOT NULL,
  endTime TIMESTAMP,
  status VARCHAR(50) DEFAULT 'SCHEDULED',  -- SCHEDULED, ACTIVE, PAUSED, COMPLETED
  totalAmount BIGINT,  -- Total amount to be dripped
  totalDripped BIGINT DEFAULT 0,  -- Amount already dripped
  description VARCHAR(500),
  sorobanContractId VARCHAR(255),  -- Soroban smart contract reference
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId (userId),
  INDEX idx_status (status),
  INDEX idx_startTime (startTime),
  INDEX idx_createdAt (createdAt)
);
```

**Columns:**
- `id` - Unique drip identifier
- `userId` - Drip creator
- `to` - Recipient address
- `amountPerInterval` - Amount sent per interval
- `intervalSeconds` - Time between drips (e.g., 3600 = hourly)
- `durationSeconds` - Total duration (NULL = infinite)
- `startTime` - When drip begins
- `endTime` - When drip ends (calculated from duration)
- `status` - SCHEDULED, ACTIVE, PAUSED, COMPLETED
- `totalAmount` - Total XLM to be distributed
- `totalDripped` - Already distributed amount
- `sorobanContractId` - Smart contract handling the drip

**Drip Calculation:**
```
numberOfDrips = durationSeconds / intervalSeconds
totalAmount = numberOfDrips × amountPerInterval
```

### workflows

Stores automation workflow configurations with triggers and actions.

```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  triggers JSONB NOT NULL,  -- Array of trigger conditions
  actions JSONB NOT NULL,   -- Array of actions to execute
  executionCount INT DEFAULT 0,
  lastExecutedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId (userId),
  INDEX idx_enabled (enabled),
  INDEX idx_createdAt (createdAt)
);
```

**Columns:**
- `id` - Unique workflow identifier
- `userId` - Workflow creator
- `name` - Workflow name
- `description` - Workflow description
- `enabled` - Active/inactive status
- `triggers` - JSON array of trigger conditions
- `actions` - JSON array of actions
- `executionCount` - Number of times executed
- `lastExecutedAt` - Last execution timestamp

**Trigger Example:**
```json
[
  {
    "type": "BALANCE_THRESHOLD",
    "value": 1000000,
    "comparison": "GREATER_THAN"
  }
]
```

**Action Example:**
```json
[
  {
    "type": "PAYMENT",
    "to": "GYYYYYYYYYY",
    "amount": 100000,
    "repeat": "MONTHLY"
  }
]
```

### transactions

Detailed transaction log for audit trail.

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  paymentId UUID REFERENCES payments(id) ON DELETE SET NULL,
  dripId UUID REFERENCES drips(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL,  -- PAYMENT, DRIP_EXECUTED, WORKFLOW_TRIGGER
  amount BIGINT,
  from_address VARCHAR(56),
  to_address VARCHAR(56),
  status VARCHAR(50),
  txHash VARCHAR(64),
  details JSONB,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId (userId),
  INDEX idx_type (type),
  INDEX idx_createdAt (createdAt)
);
```

### audit_logs

Comprehensive audit trail for security and compliance.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,  -- LOGIN, CREATE_PAYMENT, UPDATE_WORKFLOW, etc.
  resourceType VARCHAR(50),  -- USER, PAYMENT, DRIP, WORKFLOW
  resourceId UUID,
  changes JSONB,  -- Old and new values
  ipAddress INET,
  userAgent TEXT,
  success BOOLEAN DEFAULT true,
  errorMessage TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_userId (userId),
  INDEX idx_action (action),
  INDEX idx_createdAt (createdAt),
  INDEX idx_resourceId (resourceId)
);
```

## Indexes

### Query Performance Indexes

```sql
-- User lookups
CREATE INDEX idx_users_address ON users(address);
CREATE INDEX idx_users_email ON users(email);

-- Payment queries
CREATE INDEX idx_payments_userId ON payments(userId);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_createdAt ON payments(createdAt);

-- Drip queries  
CREATE INDEX idx_drips_userId ON drips(userId);
CREATE INDEX idx_drips_status ON drips(status);
CREATE INDEX idx_drips_startTime ON drips(startTime);

-- Workflow queries
CREATE INDEX idx_workflows_userId ON workflows(userId);
CREATE INDEX idx_workflows_enabled ON workflows(enabled);

-- Composite indexes for common queries
CREATE INDEX idx_payments_userId_status ON payments(userId, status);
CREATE INDEX idx_drips_userId_status ON drips(userId, status);
```

## Constraints

### Business Rules

```sql
-- Amount validation
ALTER TABLE payments ADD CONSTRAINT check_positive_amount 
  CHECK (amount > 0);

ALTER TABLE drips ADD CONSTRAINT check_positive_interval 
  CHECK (amountPerInterval > 0 AND intervalSeconds > 0);

-- Date validations
ALTER TABLE drips ADD CONSTRAINT check_start_before_end 
  CHECK (endTime IS NULL OR startTime < endTime);

-- Unique addresses (user can't pay themselves)
-- Enforced at application level

-- User can't be deleted if they have active drips
-- Enforced by foreign key ON DELETE CASCADE with warnings
```

## Sample Queries

### User Payment History
```sql
SELECT p.*, u.name as recipient
FROM payments p
LEFT JOIN users u ON u.address = p.to
WHERE p.userId = $1
ORDER BY p.createdAt DESC
LIMIT 20;
```

### Active Drips for User
```sql
SELECT d.*
FROM drips d
WHERE d.userId = $1 
  AND d.status IN ('ACTIVE', 'SCHEDULED')
  AND (d.endTime IS NULL OR d.endTime > NOW())
ORDER BY d.startTime ASC;
```

### Total Spending by User
```sql
SELECT 
  userId,
  COUNT(*) as num_payments,
  SUM(amount) as total_spent,
  AVG(amount) as avg_amount
FROM payments
WHERE status = 'COMPLETED'
  AND createdAt >= NOW() - INTERVAL '30 days'
GROUP BY userId;
```

### Workflow Execution History
```sql
SELECT 
  w.id,
  w.name,
  COUNT(t.id) as total_executions,
  MAX(t.createdAt) as last_execution
FROM workflows w
LEFT JOIN transactions t ON t.type = 'WORKFLOW_TRIGGER'
WHERE w.userId = $1
GROUP BY w.id, w.name;
```

## Backup & Recovery

### Backup Strategy
- **Frequency:** Daily at 2 AM UTC
- **Retention:** 30 days for daily backups, 1 year for weekly
- **Location:** Encrypted cloud storage
- **Testing:** Weekly restore tests

### Recovery Procedures
1. Identify backup point
2. Restore to staging environment
3. Verify data integrity
4. Promote to production
5. Document incident

## Migration History

Track all schema changes with migrations:

```typescript
// Backend migration files: backend/src/migrations/
// Format: {timestamp}-{description}.ts

// Example:
// 1704067200000-initial-schema.ts
// 1704153600000-add-workflows.ts
// 1704240000000-add-audit-logs.ts
```

## Performance Optimization

### Query Optimization
- Always filter by `userId` first
- Use status indexes for filtering
- Limit result sets
- Use pagination for large datasets

### Database Tuning
```sql
-- Connection pooling (handled by TypeORM/Prisma)
-- Max connections: 20-40 per environment

-- Enable query statistics
EXPLAIN ANALYZE SELECT * FROM payments WHERE userId = $1;

-- Monitor slow queries
SET log_min_duration_statement = 1000;  -- Log queries > 1s
```

## Security

### Data Protection
- Passwords hashed with bcrypt (12 rounds)
- Sensitive data encrypted at rest
- All connections use SSL/TLS
- Regular security audits

### Access Control
- Row-level security for multi-tenant isolation
- Users can only access their own data
- Admin audit log review restricted

### Compliance
- GDPR: Data export, deletion capabilities
- Audit logs retained per regulations
- Immutable transaction records

## Future Enhancements

- [ ] Implement data archival for old records
- [ ] Add data replication for disaster recovery
- [ ] Implement sharding for scalability
- [ ] Add full-text search on descriptions
- [ ] Implement data warehouse for analytics
