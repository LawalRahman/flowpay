# Frequently Asked Questions (FAQ)

Common questions about FlowPay.

## General

### What is FlowPay?

FlowPay is an event-driven micropayment platform built on the Stellar blockchain. It enables users to create one-time payments, drip streams (recurring payments), and automated workflows using Stellar's payment infrastructure.

### What can I do with FlowPay?

- Create instant payments to other Stellar addresses
- Set up automated drip streams (e.g., weekly payments)
- Create workflows that trigger payments based on conditions
- Manage multiple payment schedules
- Track all transaction history

### Which blockchain does FlowPay use?

FlowPay uses the Stellar blockchain for all transactions. Stellar is a decentralized network designed for fast, low-cost payments.

## Technical

### Do I need to know Stellar?

No! FlowPay abstracts away Stellar complexity. You just need:
- A Stellar wallet address (starting with 'G')
- A small amount of XLM for transaction fees

### What wallet should I use?

Any wallet that supports Stellar testnet or public network:
- StellarChain.io
- Albedo
- Freighter
- LOBSTR

### How much does it cost?

- Platform fee: Free (MVP phase)
- Stellar network fee: ~0.00001 XLM per operation
- Typical payment cost: <0.001 XLM

### What is a drip?

A drip is an automated recurring payment. Example:
```
Send 10 XLM every week for 1 year
Total: 520 XLM
```

### What is a workflow?

A workflow is an automation rule that triggers actions. Example:
```
IF balance > 1000 XLM
THEN send 100 XLM to savings address
```

## Payments

### How long does a payment take?

Stellar payments typically complete in 3-5 seconds, though can take up to 30 seconds during network congestion.

### Can I cancel a payment?

- Pending payments: Yes (before Stellar confirms)
- Confirmed payments: No (blockchain is immutable)

### What if a payment fails?

You'll see the error immediately. No funds are transferred. You can retry the payment.

### Can I send to any address?

Yes! Any valid Stellar address. Just verify the address is correct before sending.

## Drips

### How do drips work?

1. You set up a drip (amount, frequency, duration)
2. FlowPay deploys a smart contract to Stellar Soroban
3. The contract automatically sends payments at intervals
4. You can pause/resume/cancel anytime

### Can I modify a drip after creating it?

Yes:
- Pause: Temporarily stop payments
- Resume: Restart after pause
- Cancel: Stop and remove drip

You cannot change amount or frequency after creation (create a new one instead).

### What's the difference between drips and scheduled payments?

- **Drips:** Automated via smart contract, decentralized
- **Scheduled:** Centralized, we handle the scheduling

Both accomplish recurring payments, different mechanisms.

## Workflows

### What can workflows do?

Common workflows:
- Auto-save (send 10% of balance weekly)
- Round-up payments
- Bill payment reminders
- Multi-stage disbursements

### Are workflows secure?

Yes! Workflows:
- Run only on Stellar blockchain
- Cannot access your private keys
- You retain full control
- Are reversible

### Can I test workflows before enabling?

Yes! In settings, you can run workflow simulations before activation.

## Security

### Is my money safe?

Your funds never leave your wallet. FlowPay:
- Never holds your funds
- Never has access to private keys
- Only facilitates transactions you authorize
- All transactions are on immutable blockchain

### What if I lose my wallet password?

If you lose wallet access, you lose access to your funds. There is no recovery (by design).

### Are my transactions private?

No - Stellar is a public blockchain. All transactions are visible:
- Accounts visible (addresses)
- Amounts visible
- Transaction history visible

This is the nature of blockchain.

### How do you protect user data?

- Passwords hashed with bcrypt (12 rounds)
- HTTPS for all connections
- Regular security audits
- No personal data stored (just Stellar address, email)

## Billing & Fees

### Is FlowPay free?

Yes, during the beta/MVP phase. Fees may be introduced later for advanced features.

### Why is my transaction so cheap?

Stellar is incredibly efficient:
- ~3-5 second finality
- Network costs ~0.00001 XLM per operation
- No intermediaries needed

### Are there any hidden fees?

No. You only pay Stellar network fees (which are shown before confirmation).

## Account

### How do I delete my account?

Visit Settings → Account → Delete Account. This will:
- Delete all personal data
- Stop all active drips
- Invalidate all workflows

Your Stellar wallet is not affected.

### Can I have multiple accounts?

Yes! Use different email addresses to create separate accounts.

### What if I forget my password?

Click "Forgot password" on login. We'll send reset link to your email.

## Troubleshooting

### Payment says "pending" forever

This shouldn't happen (usually 5-30 seconds). Try:
1. Wait another minute
2. Refresh the page
3. Check Stellar network status
4. Contact support if still pending

### Why can't I create a drip?

Possible reasons:
- Insufficient Soroban contract balance
- Wallet has minimum balance requirement
- Network is congested
- Contract deployment failed

Check logs or contact support.

### Why do I get rate limited?

FlowPay limits requests to:
- 100 per minute (API)
- 10 payments per minute
- 5 drips per minute

Wait a minute then retry.

## Feature Requests

### Can you add feature X?

We're always open to suggestions! Create an issue on GitHub or email feedback@flowpay.dev

### What's the roadmap?

High priority features:
- GraphQL API
- Webhook support
- Advanced analytics
- Multi-signature workflows
- Mobile app

## Support

### How do I get help?

1. Check this FAQ
2. Search GitHub issues
3. Post in discussions
4. Email support@flowpay.dev
5. Open an issue on GitHub

### What's your support response time?

- Critical issues: 1 hour
- Bugs: 24 hours
- Feature requests: Best effort

### Can you help with my specific transaction?

Contact support with:
- Transaction ID
- Your account email
- What went wrong
- Steps you took

## Contributing

### How can I contribute?

See CONTRIBUTING.md for guidelines:
- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation

### Do you accept PRs?

Yes! Please follow contribution guidelines and run tests before submitting.

### Can I translate FlowPay?

Yes! This is very helpful. Create an issue to coordinate translations.
