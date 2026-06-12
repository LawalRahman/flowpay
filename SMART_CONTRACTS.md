# Smart Contracts Development

Complete guide for Soroban smart contract development.

## Overview

Soroban is Stellar's smart contract platform enabling automated, trustless transactions.

## Setup

### Installation

```bash
# Install Soroban CLI
cargo install soroban-cli

# Verify installation
soroban --version
```

### Project Structure

```
contracts/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   ├── payment.rs
│   ├── drip.rs
│   └── workflow.rs
└── tests/
    ├── payment_tests.rs
    └── drip_tests.rs
```

## Payment Contract

```rust
// payment.rs
use soroban_sdk::{contract, contractimpl, contracttype, Env, Symbol, Vec};

#[contracttype]
pub enum DataKey {
    Payment(Symbol),
}

#[contract]
pub struct PaymentContract;

#[contracttype]
#[derive(Clone)]
pub struct Payment {
    pub to: Address,
    pub amount: i128,
    pub status: Symbol,
}

#[contractimpl]
impl PaymentContract {
    pub fn create_payment(
        env: Env,
        to: Address,
        amount: i128,
    ) -> Result<Symbol, Symbol> {
        if amount <= 0 {
            return Err(Symbol::new(&env, "invalid_amount"));
        }

        let payment = Payment {
            to: to.clone(),
            amount,
            status: Symbol::new(&env, "pending"),
        };

        let key = DataKey::Payment(Symbol::new(&env, "payment_1"));
        env.storage().instance().set(&key, &payment);

        Ok(Symbol::new(&env, "created"))
    }

    pub fn get_payment(env: Env) -> Result<Payment, Symbol> {
        let key = DataKey::Payment(Symbol::new(&env, "payment_1"));
        env.storage()
            .instance()
            .get(&key)
            .ok_or(Symbol::new(&env, "not_found"))
    }

    pub fn complete_payment(env: Env, status: Symbol) -> Result<Symbol, Symbol> {
        let key = DataKey::Payment(Symbol::new(&env, "payment_1"));
        
        if let Ok(mut payment) = env.storage().instance().get::<_, Payment>(&key) {
            payment.status = status;
            env.storage().instance().set(&key, &payment);
            Ok(Symbol::new(&env, "completed"))
        } else {
            Err(Symbol::new(&env, "payment_not_found"))
        }
    }
}
```

## Drip Contract

```rust
// drip.rs
use soroban_sdk::{contract, contractimpl, contracttype, Env, Address, Symbol};

#[contracttype]
#[derive(Clone)]
pub struct DripStream {
    pub sender: Address,
    pub receiver: Address,
    pub amount_per_interval: i128,
    pub interval_seconds: u64,
    pub total_distributed: i128,
}

#[contract]
pub struct DripContract;

#[contractimpl]
impl DripContract {
    pub fn create_drip(
        env: Env,
        sender: Address,
        receiver: Address,
        amount_per_interval: i128,
        interval_seconds: u64,
    ) -> Result<Symbol, Symbol> {
        sender.require_auth();

        let drip = DripStream {
            sender: sender.clone(),
            receiver,
            amount_per_interval,
            interval_seconds,
            total_distributed: 0,
        };

        // Store drip configuration
        Ok(Symbol::new(&env, "drip_created"))
    }

    pub fn distribute(env: Env, drip_id: Symbol) -> Result<Symbol, Symbol> {
        // Distribute tokens according to drip schedule
        Ok(Symbol::new(&env, "distributed"))
    }

    pub fn get_drip_info(env: Env, drip_id: Symbol) -> Result<DripStream, Symbol> {
        // Retrieve drip information
        Err(Symbol::new(&env, "not_implemented"))
    }
}
```

## Workflow Contract

```rust
// workflow.rs
use soroban_sdk::{contract, contractimpl, contracttype, Env, Symbol, Vec};

#[contracttype]
#[derive(Clone)]
pub enum WorkflowState {
    Pending,
    Running,
    Completed,
    Failed,
}

#[contracttype]
#[derive(Clone)]
pub struct Workflow {
    pub id: Symbol,
    pub steps: Vec<Symbol>,
    pub state: WorkflowState,
}

#[contract]
pub struct WorkflowContract;

#[contractimpl]
impl WorkflowContract {
    pub fn create_workflow(
        env: Env,
        steps: Vec<Symbol>,
    ) -> Result<Symbol, Symbol> {
        let workflow = Workflow {
            id: Symbol::new(&env, "wf_1"),
            steps,
            state: WorkflowState::Pending,
        };

        Ok(Symbol::new(&env, "created"))
    }

    pub fn execute_workflow(env: Env, id: Symbol) -> Result<Symbol, Symbol> {
        // Execute workflow steps
        Ok(Symbol::new(&env, "executed"))
    }
}
```

## Testing

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{Env, Address, Symbol};

    #[test]
    fn test_create_payment() {
        let env = Env::default();
        let contract = PaymentContract;

        let to = Address::generate(&env);
        let result = contract.create_payment(env.clone(), to, 1000);

        assert!(result.is_ok());
    }

    #[test]
    fn test_invalid_amount() {
        let env = Env::default();
        let contract = PaymentContract;

        let to = Address::generate(&env);
        let result = contract.create_payment(env.clone(), to, 0);

        assert!(result.is_err());
    }

    #[test]
    fn test_get_payment() {
        let env = Env::default();
        let contract = PaymentContract;

        let to = Address::generate(&env);
        contract.create_payment(env.clone(), to.clone(), 1000).unwrap();

        let payment = contract.get_payment(env).unwrap();
        assert_eq!(payment.amount, 1000);
        assert_eq!(payment.status, Symbol::new(&env, "pending"));
    }

    #[test]
    fn test_complete_payment() {
        let env = Env::default();
        let contract = PaymentContract;

        let to = Address::generate(&env);
        contract.create_payment(env.clone(), to, 1000).unwrap();

        let result = contract.complete_payment(
            env.clone(),
            Symbol::new(&env, "completed")
        );

        assert!(result.is_ok());
    }
}
```

## Compilation

```bash
# Build contract
soroban contract build --manifest-path contracts/Cargo.toml

# Generate WASM
cargo build --target wasm32-unknown-unknown --release

# Verify WASM
soroban contract inspect --wasm contracts/target/wasm32-unknown-unknown/release/payment.wasm
```

## Deployment

```bash
# Testnet deployment
soroban contract deploy \
  --wasm contracts/target/wasm32-unknown-unknown/release/payment.wasm \
  --source my_account \
  --network testnet

# Mainnet deployment
soroban contract deploy \
  --wasm contracts/target/wasm32-unknown-unknown/release/payment.wasm \
  --source my_account \
  --network public
```

## Contract Invocation

```bash
# Invoke function
soroban contract invoke \
  --id CONTRACT_ID \
  --source my_account \
  --network testnet \
  -- \
  create_payment \
  --to ACCOUNT_ADDRESS \
  --amount 1000

# Read state
soroban contract read \
  --contract CONTRACT_ID \
  --network testnet
```

## Best Practices

✅ **Do:**
- Validate inputs
- Check authorization
- Use proper error handling
- Write comprehensive tests
- Document contract functions
- Audit contracts before deployment
- Use version control

❌ **Don't:**
- Skip input validation
- Forget authorization checks
- Use unwrap() in production code
- Deploy untested contracts
- Hardcode values
- Ignore security considerations
- Forget error cases

## Security Considerations

- Always verify authority
- Validate numeric operations
- Check for overflow/underflow
- Use proper types
- Test edge cases
- Follow Soroban security guidelines
- Get contracts audited

## Resources

- [Soroban Documentation](https://developers.stellar.org/docs/smart-contracts)
- [Soroban Examples](https://github.com/stellar/soroban-examples)
- [Rust Language](https://www.rust-lang.org/)
- [Security Best Practices](https://developers.stellar.org/docs/learn/best-practices/security)
