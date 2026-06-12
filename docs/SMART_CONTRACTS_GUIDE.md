# Soroban Smart Contract System

FlowPay leverages Stellar's Soroban platform for on-chain micropayment processing, escrow management, merchant registry, and recurring payments. This document provides a comprehensive overview of the contract architecture and integration.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Frontend (TypeScript)                 │
│   - WalletConnect Component (Freighter/Stellar Wallet Support)  │
│   - ContractStatus / EventTimeline / TransactionHistory         │
│   - PaymentChannels / Escrow / Subscriptions UI                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (REST API)
┌─────────────────────────────────────────────────────────────────┐
│              NestJS Backend (TypeScript)                        │
│  - Controllers (Payments, Escrow, Merchant, Subscription)      │
│  - Service Layer (ContractExecutor, EventListener, Wallet)     │
│  - Stellar RPC Integration (Direct Soroban Calls)              │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (Stellar SDK)
┌─────────────────────────────────────────────────────────────────┐
│        Stellar Soroban Contracts (WebAssembly)                 │
│  - Payment Channel Contract (payment_channel.rs)                │
│  - Escrow Contract (escrow.rs)                                  │
│  - Merchant Registry Contract (merchant_registry.rs)            │
│  - Recurring Payment Contract (recurring_payment.rs)            │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (XDR / RPC)
┌─────────────────────────────────────────────────────────────────┐
│           Stellar Network (Testnet / Public)                    │
│  - Smart Contract Storage (Ledger State)                        │
│  - Transaction Settlement                                       │
│  - Event Logging (Soroban Event Streams)                        │
└─────────────────────────────────────────────────────────────────┘
```

## Smart Contracts

### 1. Payment Channel Contract

**Purpose:** Enable low-cost micropayment settlement with on-chain balance tracking.

**Key Features:**
- Initialize channels with initial deposit
- Replay-protected payment authorization (nonce-based)
- Recipient-initiated claim mechanism
- Refund capability for payer
- Channel closure and final settlement

**Public Methods:**
```rust
pub fn initialize_channel(
  env: Env,
  payer: Address,
  recipient: Address,
  asset: Address,
  amount: i128,
) -> bool

pub fn authorize_payment(
  env: Env,
  payer: Address,
  amount: i128,
  nonce: u64,
) -> bool

pub fn claim(
  env: Env,
  payer: Address,
  amount: i128,
) -> bool

pub fn refund(env: Env, payer: Address) -> bool

pub fn close(env: Env, payer: Address) -> bool

pub fn get_balance(env: Env, payer: Address) -> i128

pub fn get_channel(env: Env, payer: Address) -> PaymentChannel
```

**Events:**
- `ChannelCreated{payer, recipient, amount, timestamp}`
- `PaymentAuthorized{payer, amount, nonce, timestamp}`
- `PaymentClaimed{payer, amount, timestamp}`
- `ChannelClosed{payer, refundAmount, timestamp}`

**Storage:**
- `DataKey::Channel(payer)` → `PaymentChannel` struct
- `DataKey::Nonce(payer)` → `u64` (replay protection)

### 2. Escrow Contract

**Purpose:** Conditional release of funds with multi-party approval and time-locking.

**Key Features:**
- Multi-party approval mechanism (payer, payee, arbitrator)
- Time-locked release with expiration
- Auto-refund on expiration
- Approval tracking

**Public Methods:**
```rust
pub fn create_escrow(
  env: Env,
  payer: Address,
  payee: Address,
  arbitrator: Address,
  asset: Address,
  amount: i128,
  release_at: u64,
  expires_at: u64,
) -> u32

pub fn approve(env: Env, escrow_id: u32) -> bool

pub fn release(env: Env, escrow_id: u32) -> bool

pub fn cancel(env: Env, escrow_id: u32) -> bool

pub fn get_escrow(env: Env, id: u32) -> Escrow

pub fn get_escrow_count(env: Env) -> u32
```

**Events:**
- `EscrowCreated{id, payer, payee, amount, releaseAt, expiresAt}`
- `EscrowApproved{id, approvedAt}`
- `EscrowReleased{id, releasedAt}`
- `EscrowCancelled{id, refundedAt}`

**Storage:**
- `DataKey::Escrow(id)` → `Escrow` struct
- `DataKey::EscrowCount` → `u32`

### 3. Merchant Registry Contract

**Purpose:** Maintain merchant identity and fee structure on-chain with admin controls.

**Key Features:**
- Merchant registration and profile management
- Admin-controlled fee updates
- Merchant status management (Active/Inactive/Suspended)
- Volume tracking

**Public Methods:**
```rust
pub fn initialize(env: Env, admin: Address)

pub fn register(
  env: Env,
  merchant_id: Symbol,
  wallet_address: Address,
  name: String,
  fee_percent: u32,
) -> bool

pub fn update(
  env: Env,
  merchant_id: Symbol,
  name: String,
  wallet_address: Address,
) -> bool

pub fn set_fee(
  env: Env,
  merchant_id: Symbol,
  new_fee_percent: u32,
) -> bool

pub fn set_status(
  env: Env,
  merchant_id: Symbol,
  new_status: MerchantStatus,
) -> bool

pub fn disable(env: Env, merchant_id: Symbol) -> bool

pub fn get_merchant(env: Env, id: Symbol) -> Merchant
pub fn get_fee(env: Env, id: Symbol) -> u32
pub fn get_status(env: Env, id: Symbol) -> MerchantStatus
pub fn list_merchants(env: Env) -> Vec<Symbol>
pub fn get_merchant_count(env: Env) -> u32
```

**Events:**
- `MerchantRegistered{merchantId, walletAddress, name, feePercent}`
- `MerchantUpdated{merchantId, updatedAt}`
- `FeeUpdated{merchantId, newFeePercent}`
- `StatusChanged{merchantId, newStatus}`

**Storage:**
- `DataKey::Merchant(id)` → `Merchant` struct
- `DataKey::Admin` → `Address`
- `DataKey::MerchantList` → `Vec<Symbol>`

### 4. Recurring Payment Contract

**Purpose:** Enable subscription-based recurring payments with flexible scheduling.

**Key Features:**
- Frequency-based payment scheduling
- Pause/resume capability
- Auto-completion on duration end
- Cycle tracking and payment history

**Public Methods:**
```rust
pub fn create_subscription(
  env: Env,
  subscriber: Address,
  merchant: Address,
  asset: Address,
  amount: i128,
  frequency: Frequency,
  duration_seconds: u64,
) -> u32

pub fn execute_cycle(env: Env, subscription_id: u32) -> bool

pub fn pause(env: Env, subscription_id: u32) -> bool
pub fn resume(env: Env, subscription_id: u32) -> bool
pub fn cancel(env: Env, subscription_id: u32) -> bool

pub fn get_subscription(env: Env, id: u32) -> Subscription
pub fn get_user_subscriptions(env: Env, user: Address) -> Vec<u32>
pub fn get_subscription_count(env: Env) -> u32
```

**Events:**
- `SubscriptionCreated{id, subscriber, merchant, amount, frequency, duration}`
- `PaymentExecuted{subscriptionId, cycleNumber, amount}`
- `SubscriptionPaused{id, pausedAt}`
- `SubscriptionResumed{id, resumedAt}`
- `SubscriptionCancelled{id, cancelledAt}`

**Storage:**
- `DataKey::Subscription(id)` → `Subscription` struct
- `DataKey::UserSubscriptions(user)` → `Vec<u32>`
- `DataKey::SubscriptionCount` → `u32`

## Backend Services

### StellarClientService

Provides direct Stellar/Soroban RPC interaction:

```typescript
class StellarClientService {
  async invokeContract(
    contractAddress: string,
    method: string,
    parameters: xdr.ScVal[],
    secretKey: string
  ): Promise<string> // Returns transaction hash

  async getContractState(
    contractAddress: string,
    key: xdr.ScVal
  ): Promise<xdr.ScVal>

  async streamContractEvents(
    contractAddress: string,
    startLedger: number
  ): AsyncGenerator<any>

  async submitTransaction(transaction: Transaction): Promise<TransactionResult>
}
```

### ContractExecutorService

High-level contract operation orchestration:

```typescript
class ContractExecutorService {
  // Payment Channel
  async openPaymentChannel(payerSecret, recipientAddress, assetAddress, amount)
  async authorizePayment(payerSecret, amount, nonce)
  async claimPayment(recipientSecret, payerAddress, amount)

  // Escrow
  async createEscrow(payerSecret, payeeAddress, arbitratorAddress, ...)
  async approveEscrow(arbitratorSecret, escrowId)
  async releaseEscrow(arbitratorSecret, escrowId)

  // Merchant
  async registerMerchant(merchantSecret, walletAddress, name, feePercent)
  async setMerchantFee(adminSecret, merchantAddress, newFeePercent)
  async getMerchantFee(merchantAddress)

  // Subscription
  async createSubscription(subscriberSecret, merchantAddress, ...)
  async executePaymentCycle(subscriptionId)

  // Queries
  async getChannelBalance(payerAddress)
}
```

### EventListenerService

Real-time contract event streaming and indexing:

```typescript
class EventListenerService {
  async startListening()
  async stopListening()

  async getEventsByType(type: string): Promise<ContractEvent[]>
  async getEventsByContractId(contractId: string): Promise<ContractEvent[]>
  async getRecentEvents(limit: number): Promise<ContractEvent[]>
}
```

### WalletService

Wallet and keypair management:

```typescript
class WalletService {
  generateKeypair(): Keypair
  importWallet(secretKey: string): Keypair
  isValidPublicKey(publicKey: string): boolean
  isValidSecretKey(secretKey: string): boolean
  signMessage(message: string, secretKey: string): string
  verifySignature(message: string, signature: string, publicKey: string): boolean
}
```

## REST API Endpoints

### Payment Channel Endpoints

```http
POST /api/payments/open
Content-Type: application/json
{
  "payerSecretKey": "S...",
  "recipientAddress": "G...",
  "assetAddress": "G...",
  "amount": 1000
}

POST /api/payments/authorize
{
  "payerSecretKey": "S...",
  "amount": 100,
  "nonce": 1
}

POST /api/payments/claim
{
  "recipientSecretKey": "S...",
  "payerAddress": "G...",
  "amount": 100
}

GET /api/payments/balance/:payerAddress

GET /api/payments/network-info
```

### Escrow Endpoints

```http
POST /api/escrow/create
{
  "payerSecretKey": "S...",
  "payeeAddress": "G...",
  "arbitratorAddress": "G...",
  "assetAddress": "G...",
  "amount": 5000,
  "releaseAt": 1700000000,
  "expiresAt": 1700100000
}

POST /api/escrow/approve
{
  "arbitratorSecretKey": "S...",
  "escrowId": 1
}

POST /api/escrow/release
{
  "arbitratorSecretKey": "S...",
  "escrowId": 1
}
```

### Merchant Endpoints

```http
POST /api/merchant/register
{
  "merchantSecretKey": "S...",
  "walletAddress": "G...",
  "name": "Acme Merchants",
  "feePercent": 2.5
}

POST /api/merchant/set-fee
{
  "adminSecretKey": "S...",
  "merchantAddress": "G...",
  "newFeePercent": 3.0
}

GET /api/merchant/fee/:merchantAddress
```

### Subscription Endpoints

```http
POST /api/subscription/create
{
  "subscriberSecretKey": "S...",
  "merchantAddress": "G...",
  "assetAddress": "G...",
  "amount": 99,
  "frequency": "monthly",
  "durationDays": 365
}

POST /api/subscription/execute-cycle
{
  "subscriptionId": 1
}

GET /api/subscription/:subscriptionId
```

## Configuration

Environment variables required:

```bash
# Stellar Network
STELLAR_NETWORK=testnet  # or 'public'
STELLAR_RPC_URL=https://soroban-testnet.stellar.org

# Contract Addresses
PAYMENT_CHANNEL_CONTRACT_ID=CABC...
ESCROW_CONTRACT_ID=CABC...
MERCHANT_REGISTRY_CONTRACT_ID=CABC...
RECURRING_PAYMENT_CONTRACT_ID=CABC...

# Backend Wallet
BACKEND_SECRET_KEY=S...

# Test Wallets (Development)
TEST_WALLET_1_SECRET=S...
TEST_WALLET_2_SECRET=S...
TEST_WALLET_3_SECRET=S...
```

## Security Considerations

1. **Nonce-based Replay Protection**: Payment authorization uses nonce to prevent replay attacks
2. **Multi-party Authorization**: Escrow requires arbitrator approval for release
3. **Role-based Access**: Merchant registry enforces admin-only fee updates
4. **Time-locking**: Escrow enforces minimum time before release
5. **Secret Key Management**: Never expose secret keys in logs or responses

## Development & Testing

### Local Testing

```bash
# Build Rust contracts
cd contracts && cargo build --release

# Deploy to testnet
stellar contract deploy --wasm path/to/contract.wasm --network testnet

# Run backend
cd backend && npm run start

# Run frontend
cd frontend && npm run dev
```

### Test Wallets

Use `WalletService.createTestWallet()` for automated test wallet generation and funding.

### Event Monitoring

Enable `EventListenerService` to automatically index and stream contract events in real-time.

## Future Enhancements

- Freighter wallet integration for browser-based signing
- Multi-signature support for merchant operations
- Detailed analytics dashboard for payment flows
- Automated fee distribution and settlement
- Cross-contract composability patterns
