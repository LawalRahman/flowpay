# FlowPay Smart Contracts (Soroban)

This directory contains the Soroban smart contracts for FlowPay's payment pool management and workflow validation.

## Overview

The contracts are written in Rust and compiled to WebAssembly for deployment on the Stellar network.

## Key Contracts

### 1. Payment Pool Contract

Manages the central payment pool where funds are held and distributed.

```rust
// createDrip(workflow_id, amount, frequency, duration)
// updateDrip(drip_id, new_amount, new_frequency)
// executeDrip(drip_id)
// validateWorkflow(workflow_id)
```

### 2. Drip Distribution Contract

Handles continuous payment streams and scheduling.

```rust
// startDrip(user_address, amount, frequency)
// stopDrip(drip_id)
// getPendingPayments(user_address)
```

### 3. Workflow Validation Contract

Validates workflow conditions and triggers payment execution.

```rust
// validateConditions(workflow_id, event_data)
// executeWorkflow(workflow_id, recipient)
```

## Setup

### Prerequisites

- Rust 1.70+
- Stellar CLI
- Soroban CLI

### Installation

```bash
# Install Soroban CLI
cargo install soroban-cli --locked

# Build contracts
soroban contract build

# Deploy to testnet
soroban contract deploy --network testnet
```

## Testing

```bash
cargo test
```

## Deployment

```bash
# Testnet
soroban contract deploy --network testnet --source <your-account>

# Mainnet (production)
soroban contract deploy --network public --source <your-account>
```

## Contract Interfaces

See individual contract files for detailed interface definitions.
