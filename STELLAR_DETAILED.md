# Stellar Integration Guide

Complete guide to integrating with the Stellar blockchain network.

## Stellar Network Overview

Stellar is a decentralized finance network enabling fast, low-cost payments and asset transfers.

**Networks:**
- **Testnet:** Development and testing
- **Public:** Production transactions with real value

## Setup

### Initialize Stellar SDK

**JavaScript:**
```typescript
import StellarSdk from 'stellar-sdk';

// Testnet
const server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
const net = StellarSdk.Networks.TESTNET_NETWORK_PASSPHRASE;

// Public network
const server = new StellarSdk.Server('https://horizon.stellar.org');
const net = StellarSdk.Networks.PUBLIC_NETWORK_PASSPHRASE;
```

### Account Management

#### Create Account

```typescript
// Generate keypair
const pair = StellarSdk.Keypair.random();
const publicKey = pair.publicKey();
const secret = pair.secret();

// Fund account (testnet only)
const response = await fetch(
  `https://friendbot.stellar.org?addr=${publicKey}`
);
```

#### Get Account Details

```typescript
const account = await server.loadAccount(publicKey);
console.log({
  balance: account.balances,
  sequenceNumber: account.sequence,
  flags: account.flags
});
```

#### Get Account Balances

```typescript
const account = await server.loadAccount(publicKey);
const balances = account.balances.map(balance => ({
  asset: balance.asset_code || 'XLM',
  amount: balance.balance,
  issuer: balance.asset_issuer
}));
```

## Payments

### Simple Payment

```typescript
async function sendPayment(
  senderSecret: string,
  receiverPublic: string,
  amount: string
) {
  const sender = StellarSdk.Keypair.fromSecret(senderSecret);
  const account = await server.loadAccount(sender.publicKey());
  
  const transaction = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: net
  })
    .addMemo(StellarSdk.Memo.text('Payment'))
    .addOperation(
      StellarSdk.Operation.payment({
        destination: receiverPublic,
        asset: StellarSdk.Asset.native(),
        amount: amount
      })
    )
    .setTimeout(180)
    .build();

  transaction.sign(sender);
  
  const result = await server.submitTransaction(transaction);
  return result.hash;
}
```

### Payment with Custom Asset

```typescript
const transaction = new StellarSdk.TransactionBuilder(account, {
  fee: StellarSdk.BASE_FEE,
  networkPassphrase: net
})
  .addOperation(
    StellarSdk.Operation.payment({
      destination: receiverPublic,
      asset: new StellarSdk.Asset(
        'USD',
        'GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTQSXUSMIQSTBE2IXGSP5FXBK'
      ),
      amount: '100.00'
    })
  )
  .setTimeout(180)
  .build();
```

### Batch Payments

```typescript
async function batchPayments(payments: Payment[]) {
  const results = [];
  
  for (const payment of payments) {
    try {
      const hash = await sendPayment(
        payment.senderSecret,
        payment.receiver,
        payment.amount
      );
      results.push({ status: 'success', hash });
    } catch (error) {
      results.push({ status: 'failed', error: error.message });
    }
  }
  
  return results;
}
```

## Trustlines

### Establish Trustline

```typescript
async function establishTrustline(
  accountSecret: string,
  assetCode: string,
  issuer: string
) {
  const account = StellarSdk.Keypair.fromSecret(accountSecret);
  const acct = await server.loadAccount(account.publicKey());
  
  const transaction = new StellarSdk.TransactionBuilder(acct, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: net
  })
    .addOperation(
      StellarSdk.Operation.changeTrust({
        asset: new StellarSdk.Asset(assetCode, issuer),
        limit: '922337203685.4775807'  // Max limit
      })
    )
    .setTimeout(180)
    .build();

  transaction.sign(account);
  return server.submitTransaction(transaction);
}
```

### Check Trustlines

```typescript
const account = await server.loadAccount(publicKey);
const trustlines = account.balances
  .filter(b => b.asset_code !== undefined)
  .map(b => ({
    asset: b.asset_code,
    issuer: b.asset_issuer,
    balance: b.balance,
    limit: b.limit
  }));
```

## Multi-Signature Transactions

### Add Signer

```typescript
async function addSigner(
  accountSecret: string,
  signerPublic: string,
  weight: number
) {
  const account = StellarSdk.Keypair.fromSecret(accountSecret);
  const acct = await server.loadAccount(account.publicKey());
  
  const transaction = new StellarSdk.TransactionBuilder(acct, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: net
  })
    .addOperation(
      StellarSdk.Operation.setOptions({
        signer: {
          ed25519PublicKey: signerPublic,
          weight: weight
        }
      })
    )
    .setTimeout(180)
    .build();

  transaction.sign(account);
  return server.submitTransaction(transaction);
}
```

### Require Multiple Signatures

```typescript
async function setupMultisig(
  masterSecret: string,
  signers: { key: string, weight: number }[]
) {
  const master = StellarSdk.Keypair.fromSecret(masterSecret);
  const account = await server.loadAccount(master.publicKey());
  
  const builder = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: net
  });

  // Add signers
  for (const signer of signers) {
    builder.addOperation(
      StellarSdk.Operation.setOptions({
        signer: {
          ed25519PublicKey: signer.key,
          weight: signer.weight
        }
      })
    );
  }

  // Set thresholds
  builder.addOperation(
    StellarSdk.Operation.setOptions({
      masterWeight: 1,
      lowThreshold: 1,
      medThreshold: 2,
      highThreshold: 3
    })
  );

  const transaction = builder.setTimeout(180).build();
  transaction.sign(master);
  
  return server.submitTransaction(transaction);
}
```

## Transaction Management

### Monitor Transaction

```typescript
async function waitForTransaction(hash: string) {
  let attempts = 0;
  const maxAttempts = 30;

  while (attempts < maxAttempts) {
    try {
      const transaction = await server.transactions()
        .transaction(hash)
        .call();
      return transaction;
    } catch (error) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  throw new Error('Transaction not found');
}
```

### Get Transaction Details

```typescript
const transaction = await server.transactions()
  .transaction(hash)
  .call();

console.log({
  id: transaction.id,
  hash: transaction.hash,
  ledger: transaction.ledger,
  timestamp: transaction.created_at,
  fee: transaction.fee_charged,
  operations: transaction.operations()
});
```

### Get Transaction History

```typescript
const transactions = await server.transactions()
  .forAccount(publicKey)
  .limit(20)
  .order('desc')
  .call();

for (const tx of transactions.records) {
  console.log({
    date: tx.created_at,
    hash: tx.hash,
    source: tx.source_account,
    fee: tx.fee_charged
  });
}
```

## Soroban Smart Contracts

### Deploy Contract

```typescript
async function deployContract(
  wasmBytes: Buffer,
  contractName: string
) {
  const deployer = StellarSdk.Keypair.fromSecret(deploySk);
  const account = await server.loadAccount(deployer.publicKey());
  
  const installContractTx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: net
  })
    .addOperation(
      StellarSdk.Operation.installContractCode({
        code: wasmBytes
      })
    )
    .setTimeout(180)
    .build();

  installContractTx.sign(deployer);
  const response = await server.submitTransaction(installContractTx);
  
  return response;
}
```

### Invoke Contract

```typescript
async function invokeContract(
  contractId: string,
  method: string,
  params: any[]
) {
  const caller = StellarSdk.Keypair.fromSecret(callerSk);
  const account = await server.loadAccount(caller.publicKey());
  
  const invokeContractTx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: net
  })
    .addOperation(
      StellarSdk.Operation.invokeHostFunction({
        functions: [
          StellarSdk.xdr.HostFunction.hostFunctionTypeInvokeContract(
            new StellarSdk.xdr.InvokeContractArgs({
              contractAddress: StellarSdk.Address.fromString(contractId),
              functionName: method,
              args: params.map(p => StellarSdk.scVal.nativeToScVal(p))
            })
          )
        ],
        footprint: {}
      })
    )
    .setTimeout(180)
    .build();

  invokeContractTx.sign(caller);
  return server.submitTransaction(invokeContractTx);
}
```

## Error Handling

### Transaction Submission Errors

```typescript
try {
  const result = await server.submitTransaction(transaction);
} catch (error) {
  if (error instanceof StellarSdk.TransactionFailedError) {
    const resultCodes = error.response.extras.result_codes;
    console.error('Transaction failed:', resultCodes);
    
    if (resultCodes.transaction === 'tx_insufficient_balance') {
      console.error('Insufficient balance');
    } else if (resultCodes.transaction === 'tx_bad_seq') {
      console.error('Bad sequence number - account data stale');
    }
  }
}
```

## Best Practices

✅ **Do:**
- Use appropriate network (testnet for dev)
- Handle sequence number correctly
- Set reasonable timeouts (180-300 seconds)
- Validate addresses before sending
- Monitor transaction status
- Use appropriate fee levels
- Implement retry logic

❌ **Don't:**
- Hardcode secret keys
- Use production keys in testing
- Submit same transaction twice without checking
- Ignore transaction failures
- Use invalid asset codes
- Send to invalid addresses

## Testing with Friendbot

```typescript
async function fundTestAccount(publicKey: string) {
  const response = await fetch(
    `https://friendbot.stellar.org?addr=${publicKey}`
  );
  
  if (response.ok) {
    return await response.json();
  }
  
  throw new Error('Failed to fund test account');
}
```

## Monitoring

### Track Account Changes

```typescript
const stream = server.transactions()
  .forAccount(publicKey)
  .stream({
    onmessage: (transaction) => {
      console.log('New transaction:', transaction.hash);
    }
  });

// Stop streaming
stream();
```

## Resources

- [Stellar Docs](https://developers.stellar.org/)
- [Stellar SDK JS](https://github.com/StellarCN/py-stellar-base)
- [Horizon API](https://developers.stellar.org/api/introduction/)
- [Soroban Docs](https://soroban.stellar.org/)
