# Stellar Integration Guide

Technical guide to Stellar blockchain integration in FlowPay.

## Stellar Basics

### Public Keys vs Secret Keys

```
Public Key (Account ID):  GXXXXXXXXX... (56 chars, starts with 'G')
Secret Key (Account):     SXX...       (hidden, derives public key)
```

**Never share secret keys!**

### XLM Unit

- 1 XLM = 10,000,000 stroops
- Store amounts as stroops (integers)
- Display as XLM (stroops / 10,000,000)

```typescript
// Stroops (internal)
const amountStroops = 1000000;

// XLM (display)
const amountXLM = amountStroops / 10000000;  // 0.1 XLM
```

## SDK Integration

### Initializing Stellar SDK

```typescript
import { Server, Networks } from 'stellar-sdk';

// Testnet
const server = new Server('https://horizon-testnet.stellar.org');
const networkPassphrase = Networks.TESTNET_NETWORK_PASSPHRASE;

// Mainnet (production)
const server = new Server('https://horizon.stellar.org');
const networkPassphrase = Networks.PUBLIC_NETWORK_PASSPHRASE;
```

### Creating Accounts

```typescript
import { Keypair } from 'stellar-sdk';

// Generate new keypair
const keypair = Keypair.random();
console.log('Public:', keypair.publicKey());
console.log('Secret:', keypair.secret());

// Load from existing secret
const keypair = Keypair.fromSecret('SXX...');
console.log('Public:', keypair.publicKey());
```

### Building Transactions

```typescript
import { TransactionBuilder, Operation, Asset, Memo } from 'stellar-sdk';

// Get account details
const account = await server.accounts()
  .accountId(publicKey)
  .call();

// Build payment transaction
const transaction = new TransactionBuilder(account, {
  fee: 100,
  networkPassphrase,
})
  .addOperation(Operation.payment({
    destination: recipientAddress,
    amount: '0.1',
    asset: Asset.native(),
  }))
  .addMemo(Memo.text('Payment description'))
  .setNetworkPassphrase(networkPassphrase)
  .setTimeout(30)
  .build();

// Sign transaction
transaction.sign(keypair);

// Get XDR (transaction envelope)
const xdr = transaction.toEnvelope().toXDR();
```

### Submitting Transactions

```typescript
// Submit to network
const result = await server.submitTransaction(transaction);

console.log('Transaction ID:', result.id);
console.log('Ledger:', result.ledger);
console.log('Hash:', result.hash);
```

## Common Operations

### Payment Operation

```typescript
const operation = Operation.payment({
  destination: 'GZXWVVNFBVWQ7GYXFXPV3YKWF52EFVVG3W4SXSQUWMQCYMRWQH5PZSF',
  amount: '100',
  asset: Asset.native(),  // XLM
});

// With custom asset
const operation = Operation.payment({
  destination: recipientAddress,
  amount: '100',
  asset: new Asset('USD', 'GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTHTSXVJI7YQHNT3I45NJ3MGA'),
});
```

### Account Merge

```typescript
// Merge accounts
const operation = Operation.accountMerge({
  destination: survivingAccount,
});
```

### Set Options

```typescript
// Update account options
const operation = Operation.setOptions({
  signer: {
    ed25519PublicKey: newSignerAddress,
    weight: 1,
  },
  masterWeight: 2,
  lowThreshold: 1,
  medThreshold: 2,
  highThreshold: 2,
});
```

## Soroban Smart Contracts

### Deploying Contracts

```typescript
import { asm } from 'soroban-client';

// Compile Rust to WASM
const wasmBuffer = fs.readFileSync('./contract.wasm');

// Deploy contract
const transaction = new TransactionBuilder(account, {
  fee: SorobanServer.BASE_FEE,
  networkPassphrase,
})
  .addOperation(Operation.invokeHostFunction({
    hostFunction: xdr.HostFunction.hostFunctionTypeInvokeContract([
      // contract deployment code
    ]),
  }))
  .build();
```

### Invoking Contracts

```typescript
// Call contract method
const transaction = new TransactionBuilder(account, {
  fee: SorobanServer.BASE_FEE,
  networkPassphrase,
})
  .addOperation(Operation.invokeHostFunction({
    hostFunction: xdr.HostFunction.hostFunctionTypeInvokeContract([
      contractId,
      'transfer',
      [from, to, amount],
    ]),
  }))
  .build();

// Simulate to get resource costs
const simulation = await sorobanServer.simulateTransaction(transaction);
```

## Monitoring Transactions

### Streaming Updates

```typescript
// Stream payments to account
server.payments()
  .forAccount(accountId)
  .stream({
    onmessage: (payment) => {
      console.log('Payment received:', payment);
    },
    onerror: (error) => {
      console.error('Stream error:', error);
    },
  });
```

### Checking Transaction Status

```typescript
// Check transaction by hash
const transaction = await server.transactions()
  .transaction(transactionHash)
  .call();

console.log('Status:', transaction.successful ? 'SUCCESS' : 'FAILED');
console.log('Result:', transaction.result_xdr);
```

## Error Handling

### Network Errors

```typescript
try {
  const result = await server.submitTransaction(transaction);
} catch (error) {
  if (error.response?.status === 400) {
    // Validation error
    console.error('Bad request:', error.response.data);
  } else if (error.response?.status === 503) {
    // Service unavailable (network down)
    console.error('Network unavailable');
  } else {
    // Other errors
    console.error('Error:', error);
  }
}
```

### Transaction Errors

```typescript
const result = await server.submitTransaction(transaction);

if (!result.successful) {
  console.error('Transaction failed');
  console.error('Result code:', result.result_code);
  console.error('Result XDR:', result.result_xdr);
  
  // Parse error
  const parsedResult = result.resultCode();
}
```

## Best Practices

### Verify Addresses

```typescript
import { StrKey } from 'stellar-sdk';

function isValidAddress(address: string): boolean {
  try {
    return StrKey.isValidEd25519PublicKey(address);
  } catch {
    return false;
  }
}

// Verify before using
if (!isValidAddress(recipientAddress)) {
  throw new Error('Invalid address');
}
```

### Timeout Handling

```typescript
// Set timeout for transaction submission
const tx = new TransactionBuilder(account, { timeout: 30 })
  .addOperation(...)
  .build();

// Try multiple times
const result = await retryWithBackoff(
  () => server.submitTransaction(tx),
  { maxAttempts: 3, backoffMs: 1000 }
);
```

### Fee Management

```typescript
// Get current base fee
const feeStats = await server.feeStats().call();
const baseFee = feeStats.last_ledger_base_fee;

// Calculate transaction fee
const numOperations = 2;
const transactionFee = (baseFee + 100) * numOperations;

const tx = new TransactionBuilder(account, {
  fee: transactionFee,
  ...
}).build();
```

## Testing on Testnet

### Get Testnet Funds

```typescript
// Fund account with test XLM
const response = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
const result = await response.json();
console.log('Funded with test XLM');
```

### Testnet Reset

The Stellar testnet resets approximately every quarter. All balances reset to 0.

## Production Checklist

- [ ] Use MAINNET network passphrase
- [ ] Use Horizon mainnet URL
- [ ] Use mainnet Soroban RPC URL
- [ ] No testnet account secrets in code
- [ ] Environment variables for secrets
- [ ] Error handling for all operations
- [ ] Transaction simulation before submission
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery procedures
- [ ] Rate limiting for API calls
