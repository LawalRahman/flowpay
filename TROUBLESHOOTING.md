# Troubleshooting Guide

Common issues and solutions for FlowPay.

## Frontend Issues

### Build Errors

**Error:** `Cannot find module '@radix-ui/react-slot'`

**Solution:**
```bash
rm -rf node_modules yarn.lock
yarn install
```

### Payment Not Submitting

**Symptoms:** Button appears to freeze when submitting payment

**Solution:**
1. Check browser console for errors
2. Verify API URL is correct: `console.log(import.meta.env.VITE_API_URL)`
3. Check network tab in DevTools
4. Verify JWT token is valid
5. Check wallet has sufficient balance

### Drips Not Showing

**Symptoms:** Drips page shows empty list

**Solutions:**
- Check filters aren't hiding active drips
- Verify user is authenticated
- Check API connectivity
- Clear browser cache

## Backend Issues

### Database Connection Errors

**Error:** `connect ECONNREFUSED 127.0.0.1:5432`

**Solutions:**
```bash
# Check PostgreSQL is running
brew services list | grep postgres

# Start PostgreSQL
brew services start postgresql

# Or for Docker
docker start postgres-container
```

### JWT Token Errors

**Error:** `JsonWebTokenError: invalid token`

**Solutions:**
- Verify JWT_SECRET matches between frontend and backend
- Check token hasn't expired
- Ensure Authorization header format is correct: `Bearer {token}`

### Stellar Transaction Fails

**Error:** `Transaction submission failed`

**Solutions:**
```typescript
// Check account has sufficient balance
const account = await server.accounts().accountId(address).call();
console.log('Balance:', account.balances);

// Verify Stellar network connectivity
const server = new Server(STELLAR_SERVER_URL);
await server.root();  // Test connection

// Check transaction parameters
const transaction = await builder
  .addOperation(...)
  .build();

// Simulate transaction
const simulationResult = await server.simulateTransaction(transaction);
if (!simulationResult.isSuccessful()) {
  console.error(simulationResult.error);
}
```

## Deployment Issues

### Pod Stuck in CrashLoopBackOff

**Symptom:** Kubernetes pod keeps restarting

```bash
# Check logs
kubectl logs deployment/flowpay-api -n production

# Check events
kubectl describe pod <pod-name> -n production

# Common causes:
# - Missing environment variables
# - Database migration failed
# - Out of memory
# - Failed liveness probe
```

**Solutions:**
```bash
# Verify all env vars set
kubectl get secret flowpay-secrets -o yaml

# Check pod resources
kubectl top pod <pod-name> -n production

# Temporarily disable liveness probe for debugging
kubectl patch deployment flowpay-api -n production \
  --type json -p='[{"op": "remove", "path": "/spec/template/spec/containers/0/livenessProbe"}]'
```

### High Memory Usage

**Symptom:** `kubectl top nodes` shows high memory

**Solutions:**
```bash
# Find memory-heavy pods
kubectl top pods -n production | sort --reverse --key 3 --numeric

# Check for memory leaks
kubectl exec <pod-name> -- node --inspect

# Increase memory limits
kubectl set resources deployment/flowpay-api \
  --limits=memory=2Gi --requests=memory=1Gi
```

## Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| ECONNREFUSED | Service not running | Start service, check port |
| EADDRINUSE | Port already in use | Change PORT or kill process |
| ENOMEM | Out of memory | Increase memory limits |
| ETIMEDOUT | Network timeout | Check connectivity, increase timeout |
| ENOTFOUND | DNS resolution failed | Check hostname, DNS settings |

## Stellar-Specific Issues

### Sequence Number Out of Sync

```typescript
// Get current sequence number from Stellar
const account = await server.accounts().accountId(address).call();
const sequence = account.sequence;

// Use in transaction
const transaction = new TransactionBuilder(
  new Account(address, sequence),
  // ...
).build();
```

### Insufficient Base Reserve

**Error:** `base_reserve_mismatch`

**Solution:**
```typescript
// Stellar requires 2 XLM minimum balance
const minBalance = (2 + accountSubentries * 0.5) + 1;  // 1 XLM buffer
if (balance < minBalance) {
  throw new Error('Insufficient balance for transaction');
}
```

### Invalid Offer

**Error:** `offer_not_found`

**Solution:**
```typescript
// Check offer exists before using
const offers = await server.offers()
  .forAccount(address)
  .call();

const offer = offers.records.find(o => o.id === offerId);
if (!offer) {
  throw new Error('Offer not found');
}
```

## Performance Issues

### Slow Page Load

**Diagnosis:**
```bash
# Check with Lighthouse
npm run lighthouse

# Check network tab in DevTools
# Look for slow API calls
```

**Solutions:**
- Enable caching: `staleTime: 5 * 60 * 1000`
- Reduce bundle size: `npm run build:analyze`
- Optimize images: Use WebP format
- Lazy load: Use React.lazy()

### Slow API Response

**Diagnosis:**
```sql
-- Find slow queries
SELECT query, mean_time FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;

-- Explain query
EXPLAIN ANALYZE SELECT * FROM payments WHERE userId = $1;
```

**Solutions:**
- Add database indexes
- Use pagination
- Cache frequently accessed data
- Profile with APM tool

## Debugging Techniques

### Enable Debug Logging

```bash
# Frontend
VITE_DEBUG=true npm run dev

# Backend
DEBUG=flowpay:* npm run dev

# Database
DATABASE_DEBUG=true npm run dev
```

### Remote Debugging

```bash
# Backend with Node inspector
node --inspect src/main.ts

# Connect from DevTools
# chrome://inspect
```

### Database Queries

```typescript
// Log SQL queries
import { createConnection } from 'typeorm';

const connection = await createConnection({
  logging: true,
  logger: 'advanced-console',
});
```

## Health Checks

```bash
# API health
curl http://localhost:3000/health

# Database connectivity
npm run db:verify

# Stellar connectivity
npm run stellar:check

# Overall system health
npm run health-check
```

## Getting Help

1. Check this troubleshooting guide
2. Search GitHub issues
3. Check logs: `npm run logs`
4. Post in discussions
5. Create detailed bug report
