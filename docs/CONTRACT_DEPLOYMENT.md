# Stellar Smart Contract Deployment Guide

This guide covers deploying the FlowPay Soroban smart contracts to Stellar's testnet and mainnet.

## Prerequisites

1. **Rust Toolchain**
   ```bash
   rustup install stable
   rustup target add wasm32-unknown-unknown
   ```

2. **Stellar CLI**
   ```bash
   cargo install --locked stellar-cli
   ```

3. **Soroban CLI**
   ```bash
   cargo install --locked soroban-cli
   ```

4. **Node.js** (for backend services)
   ```bash
   node --version  # v18+
   ```

## Contract Compilation

### Build All Contracts

```bash
cd contracts

# Payment Channel Contract
cargo build --release --target wasm32-unknown-unknown \
  -p payment_channel

# Escrow Contract
cargo build --release --target wasm32-unknown-unknown \
  -p escrow

# Merchant Registry Contract
cargo build --release --target wasm32-unknown-unknown \
  -p merchant_registry

# Recurring Payment Contract
cargo build --release --target wasm32-unknown-unknown \
  -p recurring_payment
```

### Optimize WASM Binaries

```bash
# Install wasm-opt
npm install -g wasm-opt

# Optimize each contract
for contract in payment_channel escrow merchant_registry recurring_payment; do
  wasm-opt -O4 target/wasm32-unknown-unknown/release/$contract.wasm \
    -o target/wasm32-unknown-unknown/release/${contract}_opt.wasm
done
```

## Testnet Deployment

### 1. Set Up Testnet Account

```bash
# Generate keypair
soroban keys generate flowpay --network testnet

# Fund the account (use Stellar faucet)
# https://laboratory.stellar.org/#account-creator?network=testnet
```

### 2. Deploy Contracts

```bash
SOROBAN_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
RPC_URL="https://soroban-testnet.stellar.org"
ACCOUNT="flowpay"

# Payment Channel
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/payment_channel_opt.wasm \
  --source-account $ACCOUNT \
  --network-passphrase "$SOROBAN_NETWORK_PASSPHRASE" \
  --rpc-url $RPC_URL

# Escrow
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/escrow_opt.wasm \
  --source-account $ACCOUNT \
  --network-passphrase "$SOROBAN_NETWORK_PASSPHRASE" \
  --rpc-url $RPC_URL

# Merchant Registry
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/merchant_registry_opt.wasm \
  --source-account $ACCOUNT \
  --network-passphrase "$SOROBAN_NETWORK_PASSPHRASE" \
  --rpc-url $RPC_URL

# Recurring Payment
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/recurring_payment_opt.wasm \
  --source-account $ACCOUNT \
  --network-passphrase "$SOROBAN_NETWORK_PASSPHRASE" \
  --rpc-url $RPC_URL
```

### 3. Verify Deployment

```bash
# Check contract state on ledger
soroban contract info \
  --id CABC123... \
  --network-passphrase "$SOROBAN_NETWORK_PASSPHRASE" \
  --rpc-url $RPC_URL
```

## Configure Backend Services

### Backend Environment File (.env)

```env
# Stellar Network Configuration
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
SOROBAN_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# Contract Addresses (From Deployment Output)
PAYMENT_CHANNEL_CONTRACT_ID=CABC1234567890ABCDEF1234567890ABCDEF...
ESCROW_CONTRACT_ID=CABC1234567890ABCDEF1234567890ABCDEF...
MERCHANT_REGISTRY_CONTRACT_ID=CABC1234567890ABCDEF1234567890ABCDEF...
RECURRING_PAYMENT_CONTRACT_ID=CABC1234567890ABCDEF1234567890ABCDEF...

# Backend Admin Wallet
BACKEND_SECRET_KEY=SBBB...

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/flowpay

# API Configuration
API_PORT=3000
API_HOST=0.0.0.0
NODE_ENV=production

# Logging
LOG_LEVEL=info
```

### Initialize Merchant Registry

```bash
# After deploying merchant registry contract, initialize it
curl -X POST http://localhost:3000/api/merchant/init \
  -H "Content-Type: application/json" \
  -d '{
    "adminSecretKey": "SBBB..."
  }'
```

## Initialize Test Data

### Create Test Wallets

```bash
# Generate test wallets
soroban keys generate test-user-1 --network testnet
soroban keys generate test-user-2 --network testnet
soroban keys generate test-user-3 --network testnet

# Fund test wallets from faucet
# https://laboratory.stellar.org/#account-creator?network=testnet
```

### Seed Initial Data

```bash
# Backend will provide seed endpoint
curl -X POST http://localhost:3000/api/seed \
  -H "Content-Type: application/json" \
  -d '{
    "action": "seed-merchants"
  }'
```

## Mainnet Deployment

### 1. Prepare Mainnet Account

```bash
# Generate mainnet keypair
soroban keys generate flowpay-mainnet --network public

# Fund account with sufficient XLM (minimum 1 XLM)
# Send XLM to the generated public key
```

### 2. Deploy to Mainnet

```bash
SOROBAN_NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"
RPC_URL="https://soroban-mainnet.stellar.org"
ACCOUNT="flowpay-mainnet"

# Deploy Payment Channel
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/payment_channel_opt.wasm \
  --source-account $ACCOUNT \
  --network-passphrase "$SOROBAN_NETWORK_PASSPHRASE" \
  --rpc-url $RPC_URL

# Deploy other contracts similarly...
```

### 3. Update Production Configuration

Update `.env.production`:

```env
STELLAR_NETWORK=public
STELLAR_RPC_URL=https://soroban-mainnet.stellar.org
SOROBAN_NETWORK_PASSPHRASE=Public Global Stellar Network ; September 2015

# Mainnet contract addresses
PAYMENT_CHANNEL_CONTRACT_ID=CABC... (mainnet)
ESCROW_CONTRACT_ID=CABC... (mainnet)
# ... etc
```

## Contract Interaction Examples

### Using Soroban CLI

```bash
# Invoke contract function
soroban contract invoke \
  --id CABC123... \
  --source-account $ACCOUNT \
  --network-passphrase "$SOROBAN_NETWORK_PASSPHRASE" \
  --rpc-url $RPC_URL \
  -- \
  initialize_channel \
  --payer GA123... \
  --recipient GA456... \
  --asset GA789... \
  --amount 10000000

# Query contract state
soroban contract read \
  --id CABC123... \
  --key 'AAAAEgAAAAF5AAAAA2NoYQ=='
```

### Using Backend API

```bash
# Open Payment Channel
curl -X POST http://localhost:3000/api/payments/open \
  -H "Content-Type: application/json" \
  -d '{
    "payerSecretKey": "SBBB...",
    "recipientAddress": "GA123...",
    "assetAddress": "GA456...",
    "amount": 10000000
  }'

# Response
{
  "success": true,
  "transactionId": "abc123...",
  "message": "Payment channel opened successfully",
  "data": {
    "payer": "GA12****",
    "recipient": "GA34****",
    "amount": 10000000
  }
}
```

## Monitoring & Debugging

### Enable Event Streaming

```bash
# Backend automatically listens for contract events
# View logs:
tail -f logs/backend.log | grep EVENT
```

### Check Contract State

```bash
# Query balance
curl http://localhost:3000/api/payments/balance/GA123...

# Response
{
  "success": true,
  "payerAddress": "GA123...",
  "balance": 5000000
}
```

### Verify Transactions

```bash
# Check testnet transaction
https://testnet.steexp.com/tx/abc123...
# or
https://stellar.expert/explorer/testnet/tx/abc123...
```

## Troubleshooting

### Issue: Contract Deploy Fails with "InsufficientBalance"

**Solution:** Fund account with more XLM (≥2 XLM for testnet operations)

```bash
# Check account balance
curl https://horizon-testnet.stellar.org/accounts/GA123...
```

### Issue: Contract Invocation Timeout

**Solution:** Increase timeout or check RPC endpoint health

```bash
# Verify RPC endpoint
curl https://soroban-testnet.stellar.org/health
```

### Issue: Event Stream Empty

**Solution:** Verify event listener is configured and contract has emitted events

```bash
# Check EventListenerService logs
docker logs flowpay-backend | grep "startListening"
```

## Contract Upgrades

Soroban contracts are immutable once deployed. To upgrade:

1. Deploy new contract with updated code
2. Update contract address in `.env`
3. Migrate user state if necessary
4. Deprecate old contract

```bash
# Mark old contract as deprecated
curl -X POST http://localhost:3000/api/admin/deprecate-contract \
  -H "Content-Type: application/json" \
  -d '{
    "contractId": "CABC...",
    "replacementId": "CABC..."
  }'
```

## Security Checklist

- [ ] All contracts compiled with `--release` flag
- [ ] WASM binaries optimized with `wasm-opt`
- [ ] Contract addresses verified on blockchain explorer
- [ ] Backend secret key stored securely (not in Git)
- [ ] Test keys rotated before mainnet deployment
- [ ] Rate limiting enabled on API endpoints
- [ ] Event listener database indexed for queries
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery plan documented

## Performance Considerations

- **Transaction Fees:** ~100 stroops per operation on testnet
- **Ledger Entry Costs:** ~100 stroops per entry written
- **Event Storage:** ~1 KB per event on ledger
- **RPC Latency:** 2-5 seconds for finality
- **Contract Invocation Gas:** ~50,000-200,000 units depending on operation

## Next Steps

1. Test contracts locally using `soroban contract invoke` 
2. Deploy to testnet and validate all operations
3. Load test with high transaction volumes
4. Security audit of Rust code
5. Deploy to mainnet with proper governance process
