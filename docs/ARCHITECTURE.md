# Architecture Documentation

## System Overview

FlowPay is a **fully decoupled full-stack micropayment platform** on Stellar with three independent layers:

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (React + Vite)               │
│                                                         │
│  - Authentication UI                                    │
│  - Wallet Connection (Freighter)                        │
│  - Workflow Builder                                     │
│  - Dashboard & Analytics                                │
│  - Transaction History                                  │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS/REST API
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Backend (NestJS + Stellar SDK)             │
│                                                         │
│  - Event Hook Processing                                │
│  - Workflow Evaluation Engine                           │
│  - Drip Execution Logic                                 │
│  - Payment Routing                                      │
│  - Stellar Transaction Signing                          │
│  - Database Persistence                                 │
└──────────────────────┬──────────────────────────────────┘
                       │ Stellar SDK
                       ▼
┌─────────────────────────────────────────────────────────┐
│         Smart Contracts (Soroban + Stellar)             │
│                                                         │
│  - Payment Pool Management                              │
│  - Drip Validation Rules                                │
│  - Workflow Integrity Checks                            │
│  - Asset Management                                     │
└─────────────────────────────────────────────────────────┘
                       │
                       ▼ Stellar Network
              ┌────────────────────┐
              │   User Wallets     │
              └────────────────────┘
```

## Data Flow

### Event-Triggered Workflow

```
1. External Event (Webhook)
   POST /hooks/lesson-completed
   {
     "userId": "123",
     "score": 92,
     "courseId": "react-basics"
   }

2. Backend Processing
   ├─ Validate Event
   ├─ Match Workflow Rules
   ├─ Evaluate Conditions
   └─ Execute Actions (Payment/Drip)

3. Stellar Transaction
   ├─ Build Transaction
   ├─ Sign with Backend Key
   ├─ Submit to Network
   └─ Wait for Confirmation

4. Frontend Update
   └─ React Query invalidates cache
      Dashboard refreshes with new transaction
```

### Drip Execution Flow

```
Workflow Triggered
      ↓
Find Associated Drips
      ↓
For Each Active Drip:
├─ Check Frequency (daily, weekly, etc.)
├─ Calculate Payment Amount
├─ Execute Stellar Transfer
└─ Record Transaction

Schedule Next Execution
```

## Module Responsibilities

### Frontend (React + Vite)

**Responsible for:**
- User interface rendering
- State management (React Query)
- API communication
- Wallet connection & signing UI
- Real-time updates via polling/WebSocket

**Key Components:**
- Authentication pages
- Workflow builder interface
- Dashboard with analytics
- Transaction history view
- Drip configuration UI

### Backend (NestJS)

**Responsible for:**
- API endpoint serving
- Business logic execution
- Event processing
- Workflow evaluation
- Stellar transaction signing
- Database persistence
- Cache management

**Key Modules:**
- `auth/` - JWT authentication
- `workflows/` - Workflow CRUD & execution
- `drips/` - Drip management & scheduling
- `payments/` - Stellar SDK integration

### Smart Contracts (Soroban)

**Responsible for:**
- Payment pool management
- Drip validation
- Workflow integrity
- On-chain asset management

**Key Contracts:**
- `payment_pool.rs` - Pool management
- `drip_distribution.rs` - Drip execution
- `workflow_validator.rs` - Validation logic

## Security Considerations

1. **API Security**
   - JWT authentication on all protected endpoints
   - Request validation with class-validator
   - CORS configuration for trusted domains
   - Rate limiting (to be implemented)

2. **Stellar Security**
   - Secret key stored in environment variables (never in code)
   - Transaction signing on backend only
   - XDR validation before submission
   - Network passphrase checking

3. **Smart Contract Security**
   - Soroban contract auditing (recommended before mainnet)
   - Transaction atomicity via Stellar protocol
   - No flash loan vulnerabilities (Stellar has 4-5 min blocks)

## Deployment Architecture

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Vercel     │      │  Railway     │      │    Neon      │
│  (Frontend)  │      │  (Backend)   │      │  (Database)  │
└──────────────┘      └──────────────┘      └──────────────┘
       │                     │                      │
       └─────────────────────┼──────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Stellar Network│
                    │   (Testnet)     │
                    └─────────────────┘
```

## Scalability Notes

- Frontend scales horizontally (CDN, static hosting)
- Backend can scale with NestJS clusters & load balancer
- Database: PostgreSQL with connection pooling
- Stellar handles unlimited transaction throughput
- Drip scheduling can be moved to separate worker queue (Bull/RabbitMQ)

## Future Enhancements

1. WebSocket support for real-time updates
2. GraphQL API layer
3. Multi-signature workflows
4. Advanced analytics dashboard
5. Mobile app integration
6. Mainnet deployment strategy
7. Governance & treasury contracts
