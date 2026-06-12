# FlowPay Architecture

High-level system architecture and design documentation for FlowPay.

## System Overview

FlowPay is an event-driven micropayment platform built on Stellar blockchain. The system uses a modern monorepo structure with separate frontend and backend services, all orchestrated by Yarn workspaces.

```
┌─────────────────────────────────────────────────────┐
│              Frontend (React + Vite)                │
│  ┌───────────────────────────────────────────────┐  │
│  │  Pages: Dashboard, Drips, Workflows, etc.     │  │
│  │  Components: Reusable UI components           │  │
│  │  Services: API client, state management       │  │
│  │  Hooks: useDrips, useTransactions, etc.       │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
              ↑
              │ HTTP/REST
              ↓
┌─────────────────────────────────────────────────────┐
│          Backend API (NestJS + TypeORM)             │
│  ┌───────────────────────────────────────────────┐  │
│  │  Auth Module: JWT, Passport strategies       │  │
│  │  Payments Module: Stellar integration        │  │
│  │  Drips Module: Streaming payment logic       │  │
│  │  Workflows Module: Automation engine         │  │
│  │  Database: Prisma/TypeORM models            │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
              ↑
              │ SDK / RPC
              ↓
┌─────────────────────────────────────────────────────┐
│     Stellar Network (testnet/public)                │
│  ┌───────────────────────────────────────────────┐  │
│  │  Horizon API: Account info, transactions     │  │
│  │  Soroban: Smart contract execution           │  │
│  │  Ledger: Immutable transaction history       │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Project Structure

### Root Level
- `package.json` - Workspace configuration with yarn workspaces
- `yarn.lock` - Dependency pinning for reproducible builds
- `.npmrc` / `.yarnrc` - Package manager configuration
- `docs/` - Documentation files
- `contracts/` - Rust smart contracts for Soroban

### Frontend (`/frontend`)

**Tech Stack:**
- React 19.0.0 - UI framework
- TypeScript 5.3.0 - Static typing
- Vite 5.0.0 - Build tool (fast HMR)
- Tailwind CSS 3.4.0 - Utility-first styling
- @radix-ui - Unstyled component primitives
- TanStack Query - Server state management
- Stellar SDK 12.0.0 - Blockchain interaction

**Directory Structure:**
```
frontend/src/
├── main.tsx           # Entry point
├── App.tsx            # Root component
├── components/        # Reusable UI components
├── pages/             # Page components (Dashboard, Drips, etc.)
├── hooks/             # Custom React hooks
│   ├── useDrips       # Streaming payments hook
│   ├── useTransactions # Transaction history hook
│   └── useWorkflows   # Automation workflows hook
├── services/
│   ├── api.ts         # Axios HTTP client
│   └── index.ts       # Service exports
├── types/
│   └── index.ts       # TypeScript definitions
└── utils/
    └── format.ts      # Formatting utilities
```

**Key Features:**
- Type-safe API communication
- Real-time transaction updates
- Wallet integration with Stellar
- Drip scheduling UI
- Workflow automation dashboard

### Backend (`/backend`)

**Tech Stack:**
- NestJS 10.2.0 - Framework
- TypeScript 5.3.0 - Static typing
- Prisma 5.4.0 - ORM
- TypeORM 0.3.0 - Alternative ORM
- Passport.js - Authentication
- JWT - Token-based auth
- Stellar SDK 12.0.0 - Blockchain interaction

**Directory Structure:**
```
backend/src/
├── main.ts            # Entry point
├── app.module.ts      # Root module
├── app.controller.ts  # Health check
├── auth/
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   └── jwt.strategy.ts
├── payments/
│   ├── payments.module.ts
│   ├── stellar.service.ts
│   └── payments.controller.ts
├── drips/
│   ├── drips.module.ts
│   ├── drips.service.ts
│   └── drips.controller.ts
├── workflows/
│   ├── workflows.module.ts
│   ├── workflows.service.ts
│   └── workflows.controller.ts
├── database/
│   └── models.ts      # Entity definitions
└── common/            # Shared utilities
```

**API Endpoints:**
- `POST /auth/login` - User authentication
- `POST /auth/register` - User registration
- `GET /payments` - List payments
- `POST /payments` - Create payment
- `GET /drips` - List drip streams
- `POST /drips` - Create drip stream
- `GET /workflows` - List workflows
- `POST /workflows` - Create workflow

### Smart Contracts (`/contracts`)

**Rust Smart Contracts:**
- `drip_distribution.rs` - Streaming payment logic
- `payment_pool.rs` - Payment pool management
- `workflow_validator.rs` - Workflow validation

**Deployment Target:**
- Stellar Soroban network (testnet/public)

## Data Flow

### Payment Flow
1. User initiates payment via frontend
2. Frontend sends request to backend API
3. Backend validates request and user permissions
4. Backend calls Stellar SDK to create transaction
5. Transaction signed and submitted to Stellar network
6. Stellar network executes smart contract
7. Transaction confirmed on ledger
8. Backend updates database with transaction record
9. Frontend receives update and displays confirmation

### Drip (Streaming) Flow
1. User sets up drip schedule (amount, frequency, duration)
2. Frontend sends drip configuration to backend
3. Backend creates smart contract instance on Soroban
4. Smart contract automatically executes at intervals
5. Backend receives webhook/event notifications
6. Database updated with drip state
7. Frontend displays live drip status

### Workflow Automation Flow
1. User defines workflow rules (conditions, actions)
2. Backend stores workflow configuration
3. Workflow engine monitors for trigger conditions
4. When triggered, executes associated payment/drip
5. Events logged and displayed in audit trail

## Module Interactions

```
┌──────────────────────────────────────────────┐
│           Auth Module                         │
│  - JWT token generation                      │
│  - User authentication                       │
│  - Permission checks                         │
└──────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────┐
│      Payments Module                          │
│  - Payment creation/validation                │
│  - Stellar transaction building               │
│  - Transaction fee calculation                │
└──────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────┐
│    Stellar Service                            │
│  - SDK initialization                        │
│  - Account management                        │
│  - Transaction submission                    │
└──────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────┐
│      Drips Module                             │
│  - Drip scheduling                           │
│  - Smart contract interaction                │
│  - State management                          │
└──────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────┐
│    Workflows Module                           │
│  - Workflow engine                           │
│  - Rule evaluation                           │
│  - Action execution                          │
└──────────────────────────────────────────────┘
```

## Database Schema

### User Entity
- `id` - Primary key
- `address` - Stellar address (unique)
- `email` - User email
- `name` - Display name
- `createdAt` - Account creation timestamp
- `updatedAt` - Last update timestamp

### Payment Entity
- `id` - Primary key
- `userId` - Foreign key to User
- `to` - Recipient Stellar address
- `amount` - Payment amount (in stroops)
- `status` - PENDING, COMPLETED, FAILED
- `txHash` - Stellar transaction hash
- `createdAt` - Payment creation timestamp

### Drip Entity
- `id` - Primary key
- `userId` - Foreign key to User
- `to` - Recipient address
- `amountPerInterval` - Amount per drip
- `interval` - Interval in seconds
- `duration` - Total duration in seconds
- `startTime` - When drip begins
- `status` - ACTIVE, PAUSED, COMPLETED
- `smartContractId` - Soroban contract reference

### Workflow Entity
- `id` - Primary key
- `userId` - Foreign key to User
- `name` - Workflow name
- `triggers` - Array of trigger conditions
- `actions` - Array of actions to execute
- `enabled` - Active status
- `createdAt` - Creation timestamp

## Authentication & Security

### JWT Strategy
- Token includes user ID and address
- 24-hour expiration
- Refresh token mechanism
- Secure signing with HS256 algorithm

### Authorization
- Role-based access control (RBAC)
- User can only access own resources
- Admin endpoints protected
- Rate limiting on sensitive endpoints

### Smart Contract Security
- Contract code reviewed for vulnerabilities
- Soroban sandbox isolation
- Transaction validation before submission
- Multi-signature support planned

## Deployment Architecture

### Environment Separation
- **Development:** localhost services, testnet blockchain
- **Staging:** Docker containers, testnet blockchain
- **Production:** Cloud deployment, public blockchain

### CI/CD Pipeline
- GitHub Actions for testing and building
- Turbo for monorepo caching
- Docker for consistent environments
- Netlify for frontend hosting
- Cloud platform for backend API

### Monitoring & Logging
- Application logs to stdout
- Blockchain transaction tracking
- Error alerting
- Performance monitoring

## Scalability Considerations

### Horizontal Scaling
- Stateless API design
- Database connection pooling
- Caching layer (Redis) for frequent queries
- Load balancing across API instances

### Smart Contract Optimization
- Batch payment processing
- Gas optimization
- Contract caching strategies

## Dependencies & Integrations

### External Services
- **Stellar Horizon API** - Account and ledger queries
- **Stellar Soroban** - Smart contract execution
- **JWT Provider** - Token generation
- **Database** - PostgreSQL/SQLite

### Version Constraints
- Node.js 22.x
- Yarn 1.22.x
- TypeScript 5.3.x
- React 19.x

## Future Architecture Improvements

- [ ] Implement caching layer (Redis)
- [ ] Add event-driven microservices
- [ ] Implement message queue (RabbitMQ)
- [ ] Add GraphQL API layer
- [ ] Implement webhook system
- [ ] Add real-time WebSocket updates
- [ ] Implement audit logging system

## References

- [Stellar Documentation](https://developers.stellar.org/)
- [Soroban Documentation](https://soroban.stellar.org/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [React Documentation](https://react.dev/)
