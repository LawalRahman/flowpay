# FlowPay Stellar Integration - Getting Started

This guide helps developers quickly set up the FlowPay Stellar contract-driven micropayment infrastructure locally.

## Quick Start (5 minutes)

### 1. Clone and Install

```bash
git clone https://github.com/your-org/flowpay-stellar.git
cd flowpay-stellar

# Install dependencies
npm install

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

### 2. Set Up Environment

```bash
# Copy environment template
cp .env.example .env

# For development, update these minimum values:
# - STELLAR_NETWORK=testnet
# - STELLAR_RPC_URL=https://soroban-testnet.stellar.org
# - Leave contract IDs for now (populated after deployment)
```

### 3. Start Local Services

```bash
# Terminal 1: Backend
cd backend
npm run start

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Database (optional, for event persistence)
docker run -d \
  --name flowpay-postgres \
  -e POSTGRES_USER=flowpay \
  -e POSTGRES_PASSWORD=flowpay_pass \
  -e POSTGRES_DB=flowpay_db \
  -p 5432:5432 \
  postgres:15
```

### 4. Access Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **API Docs:** http://localhost:3000/api/docs (Swagger)

## Detailed Setup

### Prerequisites

**System Requirements:**
- Node.js 18+ 
- Rust 1.75+
- Git
- Docker (optional, for database)

**Install Stellar Tools:**

```bash
# Install Soroban CLI
cargo install --locked soroban-cli

# Install Stellar CLI (optional)
cargo install --locked stellar-cli

# Verify installation
soroban --version
```

### Backend Setup

```bash
cd backend

# Install NestJS dependencies
npm install

# Set up TypeScript
npm run build

# Generate database migrations (if using PostgreSQL)
npm run migration:generate

# Run migrations
npm run migration:run

# Start development server
npm run start:dev
```

**Backend Structure:**
```
backend/
├── src/
│   ├── app.controller.ts          # Main app endpoints
│   ├── app.module.ts              # NestJS module
│   ├── stellar/                   # Stellar integration
│   │   ├── stellar.client.ts      # RPC client
│   │   ├── contract.executor.ts   # Contract operations
│   │   ├── event.listener.ts      # Event streaming
│   │   └── wallet.service.ts      # Wallet management
│   ├── payments/                  # Payment channel endpoints
│   ├── escrow/                    # Escrow endpoints
│   ├── merchant/                  # Merchant registry endpoints
│   └── subscriptions/             # Recurring payment endpoints
├── package.json
└── tsconfig.json
```

### Frontend Setup

```bash
cd frontend

# Install React dependencies
npm install

# Set up environment
cp .env.example .env.local

# Update REACT_APP_API_URL=http://localhost:3000

# Start development server
npm run dev

# Build for production
npm run build
```

**Frontend Structure:**
```
frontend/
├── src/
│   ├── components/                # React components
│   │   ├── WalletConnect.tsx      # Wallet integration
│   │   ├── ContractStatus.tsx     # Contract status display
│   │   ├── TransactionHistory.tsx # TX tracking
│   │   ├── EventTimeline.tsx      # Event visualization
│   │   ├── ChannelCard.tsx        # Channel display
│   │   └── index.ts               # Component exports
│   ├── pages/
│   │   ├── Contracts.tsx          # Main contracts page
│   │   ├── Dashboard.tsx
│   │   ├── Login.tsx
│   │   └── ...
│   ├── services/
│   │   └── api.ts                 # API client
│   └── types/
│       └── index.ts               # TypeScript types
├── vite.config.ts
└── tsconfig.json
```

### Contract Setup (Optional for Development)

**Build Contracts:**

```bash
cd contracts

# Build all contracts
cargo build --release --target wasm32-unknown-unknown

# Optimize WASM binaries
npm install -g wasm-opt

for contract in payment_channel escrow merchant_registry recurring_payment; do
  wasm-opt -O4 \
    target/wasm32-unknown-unknown/release/$contract.wasm \
    -o target/wasm32-unknown-unknown/release/${contract}_opt.wasm
done
```

**Deploy to Testnet:**

```bash
# Generate keypair
soroban keys generate flowpay --network testnet

# View public key
soroban keys ls --network testnet

# Fund account with testnet XLM
# https://laboratory.stellar.org/#account-creator?network=testnet

# Deploy Payment Channel contract
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/payment_channel_opt.wasm \
  --source-account flowpay \
  --network-passphrase "Test SDF Network ; September 2015" \
  --rpc-url https://soroban-testnet.stellar.org

# Record contract ID and update .env
# PAYMENT_CHANNEL_CONTRACT_ID=CABC...

# Deploy other contracts similarly
```

## Development Workflow

### 1. Create Payment Channel

**Frontend:**
```bash
1. Click "Connect Wallet"
2. Import test wallet or generate new
3. Fill in recipient address and amount
4. Click "Open Channel"
```

**API Request:**
```bash
curl -X POST http://localhost:3000/api/payments/open \
  -H "Content-Type: application/json" \
  -d '{
    "payerSecretKey": "SBBB...",
    "recipientAddress": "GA...",
    "assetAddress": "GA...",
    "amount": 1000000
  }'
```

### 2. Authorize Payment

**API Request:**
```bash
curl -X POST http://localhost:3000/api/payments/authorize \
  -H "Content-Type: application/json" \
  -d '{
    "payerSecretKey": "SBBB...",
    "amount": 100000,
    "nonce": 1
  }'
```

### 3. Claim Payment

**API Request:**
```bash
curl -X POST http://localhost:3000/api/payments/claim \
  -H "Content-Type: application/json" \
  -d '{
    "recipientSecretKey": "SBBB...",
    "payerAddress": "GA...",
    "amount": 100000
  }'
```

### 4. Monitor Events

**Real-time Event Stream:**
```bash
# Events automatically stream to frontend via EventTimeline component
# Backend logs all events to: logs/backend.log

tail -f logs/backend.log | grep EVENT
```

## Testing

### Unit Tests

```bash
# Backend tests
cd backend
npm run test

# Frontend tests
cd frontend
npm run test
```

### Integration Tests

```bash
# Test contract operations against testnet
cd backend
npm run test:integration

# Environment: STELLAR_NETWORK=testnet
```

### Manual Testing Checklist

- [ ] Wallet connection works
- [ ] Payment channel creation succeeds
- [ ] Payment authorization without replay (nonce protection)
- [ ] Payment claim settles correctly
- [ ] Event stream displays in timeline
- [ ] Transaction history shows all operations
- [ ] Error handling displays user-friendly messages
- [ ] Contract state queries return accurate data

## Troubleshooting

### Issue: "Contract not found" Error

**Solution:** Ensure contract IDs are set in .env and correspond to deployed contracts:

```bash
# Check contract exists on testnet
curl https://soroban-testnet.stellar.org/soroban/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "method": "getContractInfo",
    "params": {
      "contractId": "CABC..."
    }
  }'
```

### Issue: Backend Fails to Connect to RPC

**Solution:** Verify RPC endpoint and network passphrase:

```bash
# Test RPC health
curl https://soroban-testnet.stellar.org/health

# Verify network passphrase in .env
# Should be: "Test SDF Network ; September 2015" for testnet
```

### Issue: Frontend Cannot Connect to Backend

**Solution:** Check CORS and API endpoint:

```bash
# Verify backend is running
curl http://localhost:3000/api/payments/network-info

# Check CORS_ORIGIN in .env includes frontend URL
# CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

### Issue: Event Listener Not Working

**Solution:** Check database connection and event listener service:

```bash
# Verify PostgreSQL is running
docker ps | grep flowpay-postgres

# Check backend logs for EventListenerService startup
docker logs flowpay-backend | grep "EventListenerService"

# Manually start listening
curl -X POST http://localhost:3000/api/admin/start-event-listener
```

## Deployment

### Deploy to Testnet

1. Deploy contracts (see Contract Setup above)
2. Update .env with contract IDs
3. Start backend: `cd backend && npm run start`
4. Build frontend: `cd frontend && npm run build`
5. Deploy frontend to static host (Netlify, Vercel, etc.)

### Deploy to Mainnet

1. Create mainnet keypair: `soroban keys generate flowpay-mainnet --network public`
2. Fund with XLM (minimum 1 XLM per contract)
3. Deploy contracts with `--network-passphrase "Public Global Stellar Network ; September 2015"`
4. Update production .env with mainnet contract IDs
5. Deploy backend and frontend

## Documentation

- **Smart Contracts Guide:** [docs/SMART_CONTRACTS_GUIDE.md](docs/SMART_CONTRACTS_GUIDE.md)
- **Stellar Integration:** [docs/STELLAR_INTEGRATION.md](docs/STELLAR_INTEGRATION.md)
- **Contract Deployment:** [docs/CONTRACT_DEPLOYMENT.md](docs/CONTRACT_DEPLOYMENT.md)
- **Architecture:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **API Documentation:** http://localhost:3000/api/docs (Swagger UI)

## API Endpoints

### Payment Channel
- `POST /api/payments/open` - Create channel
- `POST /api/payments/authorize` - Authorize payment
- `POST /api/payments/claim` - Claim payment
- `GET /api/payments/balance/:payer` - Query balance
- `GET /api/payments/network-info` - Network status

### Escrow
- `POST /api/escrow/create` - Create escrow
- `POST /api/escrow/approve` - Approve release
- `POST /api/escrow/release` - Release funds

### Merchant
- `POST /api/merchant/register` - Register merchant
- `POST /api/merchant/set-fee` - Update fee
- `GET /api/merchant/fee/:address` - Query fee

### Subscription
- `POST /api/subscription/create` - Create subscription
- `POST /api/subscription/execute-cycle` - Execute payment
- `GET /api/subscription/:id` - Query subscription

## Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and test: `npm run test`
3. Commit with clear messages: `git commit -am "Add feature"`
4. Push to origin: `git push origin feature/my-feature`
5. Create pull request

## Support

- **Issues:** GitHub Issues
- **Discussions:** GitHub Discussions
- **Documentation:** [docs/](docs/)
- **Stellar Docs:** https://developers.stellar.org/

## License

MIT License - see LICENSE file for details
