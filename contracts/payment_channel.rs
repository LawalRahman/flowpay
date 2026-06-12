#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, Symbol, Vec, Map, 
    symbol_short as sym, xdr::ToXdr, Bytes, BytesN, log
};

// ============================================================================
// Types & Data Structures
// ============================================================================

#[derive(Clone, Copy)]
#[contracttype]
pub enum DataKey {
    Channel(Address),      // Channel state by payer
    Nonce(Address),        // Nonce counter for replay protection
}

#[derive(Clone)]
#[contracttype]
pub struct PaymentChannel {
    pub payer: Address,
    pub recipient: Address,
    pub asset: Address,    // Token contract address
    pub balance: i128,     // Total balance in channel
    pub nonce: u64,        // Prevents replay attacks
    pub created_at: u64,
}

#[derive(Clone)]
#[contracttype]
pub struct PaymentAuthorization {
    pub amount: i128,
    pub nonce: u64,
    pub signature: BytesN<64>,
}

// ============================================================================
// Events
// ============================================================================

#[contracttype]
pub enum Event {
    ChannelCreated(Channel),
    PaymentAuthorized(PaymentAuth),
    PaymentClaimed(Claim),
    ChannelClosed(Close),
}

#[contracttype]
pub struct Channel {
    pub payer: Address,
    pub recipient: Address,
    pub asset: Address,
    pub amount: i128,
}

#[contracttype]
pub struct PaymentAuth {
    pub channel_id: Address,
    pub amount: i128,
    pub nonce: u64,
}

#[contracttype]
pub struct Claim {
    pub channel_id: Address,
    pub amount: i128,
    pub recipient: Address,
}

#[contracttype]
pub struct Close {
    pub channel_id: Address,
    pub final_balance: i128,
}

// ============================================================================
// Contract Implementation
// ============================================================================

#[contract]
pub struct PaymentChannelContract;

#[contractimpl]
impl PaymentChannelContract {
    /// Open a new payment channel
    /// 
    /// # Arguments
    /// * `payer` - Address funding the channel
    /// * `recipient` - Address receiving payments
    /// * `asset` - Token contract address
    /// * `amount` - Initial deposit amount
    pub fn initialize_channel(
        env: Env,
        payer: Address,
        recipient: Address,
        asset: Address,
        amount: i128,
    ) -> Address {
        payer.require_auth();

        // Validate inputs
        if amount <= 0 {
            panic!("Amount must be positive");
        }

        if payer == recipient {
            panic!("Payer and recipient cannot be the same");
        }

        // Transfer funds from payer to contract
        let token_client = soroban_sdk::token::Client::new(&env, &asset);
        token_client.transfer(&payer, &env.current_contract_address(), &amount);

        // Create channel
        let channel = PaymentChannel {
            payer: payer.clone(),
            recipient: recipient.clone(),
            asset: asset.clone(),
            balance: amount,
            nonce: 0,
            created_at: env.ledger().timestamp(),
        };

        // Store channel
        let channel_key = DataKey::Channel(payer.clone());
        env.storage().instance().set(&channel_key, &channel);

        // Initialize nonce
        let nonce_key = DataKey::Nonce(payer.clone());
        env.storage().instance().set(&nonce_key, &0u64);

        // Emit event
        env.events().publish(
            (sym!("channel_event"),),
            Event::ChannelCreated(Channel {
                payer: payer.clone(),
                recipient: recipient.clone(),
                asset,
                amount,
            }),
        );

        payer
    }

    /// Deposit additional funds into channel
    pub fn deposit(env: Env, payer: Address, amount: i128) {
        payer.require_auth();

        if amount <= 0 {
            panic!("Amount must be positive");
        }

        let channel_key = DataKey::Channel(payer.clone());
        let mut channel: PaymentChannel = env
            .storage()
            .instance()
            .get(&channel_key)
            .unwrap_or_else(|| panic!("Channel not found"));

        // Transfer funds
        let token_client = soroban_sdk::token::Client::new(&env, &channel.asset);
        token_client.transfer(&payer, &env.current_contract_address(), &amount);

        // Update balance
        channel.balance += amount;
        env.storage().instance().set(&channel_key, &channel);

        log!(&env, "deposit: {} deposited {} to channel", payer, amount);
    }

    /// Authorize a micropayment
    /// 
    /// Must be called by recipient to claim payment
    pub fn authorize_payment(env: Env, payer: Address, amount: i128, nonce: u64) {
        let channel_key = DataKey::Channel(payer.clone());
        let mut channel: PaymentChannel = env
            .storage()
            .instance()
            .get(&channel_key)
            .unwrap_or_else(|| panic!("Channel not found"));

        // Verify nonce (replay protection)
        let nonce_key = DataKey::Nonce(payer.clone());
        let current_nonce: u64 = env
            .storage()
            .instance()
            .get(&nonce_key)
            .unwrap_or(0);

        if nonce != current_nonce {
            panic!("Invalid nonce");
        }

        // Verify funds
        if amount <= 0 || amount > channel.balance {
            panic!("Invalid payment amount");
        }

        // Update channel
        channel.nonce += 1;
        channel.balance -= amount;
        env.storage().instance().set(&channel_key, &channel);

        // Increment nonce
        env.storage().instance().set(&nonce_key, &(current_nonce + 1));

        // Emit event
        env.events().publish(
            (sym!("payment_event"),),
            Event::PaymentAuthorized(PaymentAuth {
                channel_id: payer.clone(),
                amount,
                nonce,
            }),
        );

        log!(&env, "payment authorized: {} authorized for {}", payer, amount);
    }

    /// Claim authorized payment
    pub fn claim(env: Env, payer: Address, amount: i128) -> i128 {
        let recipient: Address = env.invoker();

        let channel_key = DataKey::Channel(payer.clone());
        let mut channel: PaymentChannel = env
            .storage()
            .instance()
            .get(&channel_key)
            .unwrap_or_else(|| panic!("Channel not found"));

        // Verify recipient
        if channel.recipient != recipient {
            panic!("Unauthorized claim");
        }

        // Verify funds available
        if amount > channel.balance {
            panic!("Insufficient channel balance");
        }

        // Transfer funds to recipient
        let token_client = soroban_sdk::token::Client::new(&env, &channel.asset);
        token_client.transfer(&env.current_contract_address(), &recipient, &amount);

        // Update channel
        channel.balance -= amount;
        env.storage().instance().set(&channel_key, &channel);

        // Emit event
        env.events().publish(
            (sym!("claim_event"),),
            Event::PaymentClaimed(Claim {
                channel_id: payer.clone(),
                amount,
                recipient,
            }),
        );

        amount
    }

    /// Refund remaining balance to payer
    pub fn refund(env: Env, payer: Address) -> i128 {
        payer.require_auth();

        let channel_key = DataKey::Channel(payer.clone());
        let mut channel: PaymentChannel = env
            .storage()
            .instance()
            .get(&channel_key)
            .unwrap_or_else(|| panic!("Channel not found"));

        let refund_amount = channel.balance;

        if refund_amount > 0 {
            // Transfer remaining balance back to payer
            let token_client = soroban_sdk::token::Client::new(&env, &channel.asset);
            token_client.transfer(&env.current_contract_address(), &payer, &refund_amount);

            // Clear channel
            channel.balance = 0;
            env.storage().instance().set(&channel_key, &channel);
        }

        log!(&env, "refund: {} refunded {}", payer, refund_amount);
        refund_amount
    }

    /// Close channel and return remaining balance
    pub fn close(env: Env, payer: Address) -> i128 {
        payer.require_auth();

        let channel_key = DataKey::Channel(payer.clone());
        let channel: PaymentChannel = env
            .storage()
            .instance()
            .get(&channel_key)
            .unwrap_or_else(|| panic!("Channel not found"));

        let final_balance = channel.balance;

        // Emit event
        env.events().publish(
            (sym!("close_event"),),
            Event::ChannelClosed(Close {
                channel_id: payer.clone(),
                final_balance,
            }),
        );

        // Remove channel
        env.storage().instance().remove(&channel_key);
        env.storage()
            .instance()
            .remove(&DataKey::Nonce(payer.clone()));

        // Transfer remaining balance to payer
        if final_balance > 0 {
            let token_client = soroban_sdk::token::Client::new(&env, &channel.asset);
            token_client.transfer(&env.current_contract_address(), &payer, &final_balance);
        }

        log!(&env, "channel closed: {} with balance {}", payer, final_balance);
        final_balance
    }

    /// Get channel balance
    pub fn get_balance(env: Env, payer: Address) -> i128 {
        let channel_key = DataKey::Channel(payer);
        let channel: PaymentChannel = env
            .storage()
            .instance()
            .get(&channel_key)
            .unwrap_or_else(|| panic!("Channel not found"));

        channel.balance
    }

    /// Get channel details
    pub fn get_channel(env: Env, payer: Address) -> PaymentChannel {
        let channel_key = DataKey::Channel(payer);
        env.storage()
            .instance()
            .get(&channel_key)
            .unwrap_or_else(|| panic!("Channel not found"))
    }
}
