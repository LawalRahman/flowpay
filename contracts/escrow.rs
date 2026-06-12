#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, Symbol, Vec, 
    symbol_short as sym, log
};

// ============================================================================
// Types & Data Structures
// ============================================================================

#[derive(Clone, Copy)]
#[contracttype]
pub enum DataKey {
    Escrow(u64),           // Escrow by ID
    EscrowCounter,         // Global counter for escrow IDs
}

#[derive(Clone)]
#[contracttype]
pub enum EscrowStatus {
    Created,
    Approved,
    Released,
    Cancelled,
}

#[derive(Clone)]
#[contracttype]
pub struct Escrow {
    pub id: u64,
    pub payer: Address,
    pub payee: Address,
    pub arbitrator: Address,
    pub asset: Address,
    pub amount: i128,
    pub status: EscrowStatus,
    pub created_at: u64,
    pub release_at: u64,     // Earliest time escrow can be released
    pub expires_at: u64,     // Auto-refund after this time
    pub metadata: Symbol,    // Storage for additional data
}

// ============================================================================
// Events
// ============================================================================

#[contracttype]
pub enum Event {
    EscrowCreated(EscrowCreation),
    EscrowApproved(EscrowApproval),
    EscrowReleased(EscrowRelease),
    EscrowCancelled(EscrowCancellation),
}

#[contracttype]
pub struct EscrowCreation {
    pub escrow_id: u64,
    pub amount: i128,
    pub payee: Address,
}

#[contracttype]
pub struct EscrowApproval {
    pub escrow_id: u64,
    pub approved_by: Address,
}

#[contracttype]
pub struct EscrowRelease {
    pub escrow_id: u64,
    pub amount: i128,
    pub payee: Address,
}

#[contracttype]
pub struct EscrowCancellation {
    pub escrow_id: u64,
    pub amount: i128,
    pub payer: Address,
}

// ============================================================================
// Contract Implementation
// ============================================================================

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    /// Create new escrow
    /// 
    /// # Arguments
    /// * `payer` - Address funding escrow
    /// * `payee` - Address receiving funds
    /// * `arbitrator` - Address who can approve release
    /// * `asset` - Token contract address
    /// * `amount` - Escrow amount
    /// * `release_at` - Timestamp for earliest release
    /// * `expires_at` - Timestamp for auto-refund
    pub fn create_escrow(
        env: Env,
        payer: Address,
        payee: Address,
        arbitrator: Address,
        asset: Address,
        amount: i128,
        release_at: u64,
        expires_at: u64,
    ) -> u64 {
        payer.require_auth();

        // Validation
        if amount <= 0 {
            panic!("Amount must be positive");
        }

        if payer == payee {
            panic!("Payer and payee cannot be the same");
        }

        let current_time = env.ledger().timestamp();

        if release_at < current_time {
            panic!("Release time must be in the future");
        }

        if expires_at <= release_at {
            panic!("Expiry must be after release time");
        }

        // Get next escrow ID
        let counter_key = DataKey::EscrowCounter;
        let current_id: u64 = env
            .storage()
            .instance()
            .get(&counter_key)
            .unwrap_or(0);
        let escrow_id = current_id + 1;

        // Transfer funds from payer to contract
        let token_client = soroban_sdk::token::Client::new(&env, &asset);
        token_client.transfer(&payer, &env.current_contract_address(), &amount);

        // Create escrow
        let escrow = Escrow {
            id: escrow_id,
            payer: payer.clone(),
            payee: payee.clone(),
            arbitrator: arbitrator.clone(),
            asset: asset.clone(),
            amount,
            status: EscrowStatus::Created,
            created_at: current_time,
            release_at,
            expires_at,
            metadata: sym!(""),
        };

        // Store escrow
        let escrow_key = DataKey::Escrow(escrow_id);
        env.storage().instance().set(&escrow_key, &escrow);

        // Update counter
        env.storage().instance().set(&counter_key, &escrow_id);

        // Emit event
        env.events().publish(
            (sym!("escrow_event"),),
            Event::EscrowCreated(EscrowCreation {
                escrow_id,
                amount,
                payee,
            }),
        );

        log!(&env, "escrow created: id {} for amount {}", escrow_id, amount);
        escrow_id
    }

    /// Approve escrow for release (arbitrator only)
    pub fn approve(env: Env, escrow_id: u64) {
        let escrow_key = DataKey::Escrow(escrow_id);
        let mut escrow: Escrow = env
            .storage()
            .instance()
            .get(&escrow_key)
            .unwrap_or_else(|| panic!("Escrow not found"));

        // Verify arbitrator
        let caller = env.invoker();
        if escrow.arbitrator != caller {
            panic!("Only arbitrator can approve");
        }

        // Verify status
        if !matches!(escrow.status, EscrowStatus::Created) {
            panic!("Escrow cannot be approved in current status");
        }

        // Update status
        escrow.status = EscrowStatus::Approved;
        env.storage().instance().set(&escrow_key, &escrow);

        // Emit event
        env.events().publish(
            (sym!("approval_event"),),
            Event::EscrowApproved(EscrowApproval {
                escrow_id,
                approved_by: caller,
            }),
        );

        log!(&env, "escrow approved: id {}", escrow_id);
    }

    /// Release funds to payee
    pub fn release(env: Env, escrow_id: u64) {
        let escrow_key = DataKey::Escrow(escrow_id);
        let mut escrow: Escrow = env
            .storage()
            .instance()
            .get(&escrow_key)
            .unwrap_or_else(|| panic!("Escrow not found"));

        let current_time = env.ledger().timestamp();

        // Verify status
        if !matches!(escrow.status, EscrowStatus::Approved) {
            panic!("Escrow must be approved before release");
        }

        // Verify release time
        if current_time < escrow.release_at {
            panic!("Cannot release before release time");
        }

        // Verify not expired
        if current_time > escrow.expires_at {
            panic!("Escrow has expired");
        }

        // Transfer funds to payee
        let token_client = soroban_sdk::token::Client::new(&env, &escrow.asset);
        token_client.transfer(&env.current_contract_address(), &escrow.payee, &escrow.amount);

        // Update status
        escrow.status = EscrowStatus::Released;
        env.storage().instance().set(&escrow_key, &escrow);

        // Emit event
        env.events().publish(
            (sym!("release_event"),),
            Event::EscrowReleased(EscrowRelease {
                escrow_id,
                amount: escrow.amount,
                payee: escrow.payee.clone(),
            }),
        );

        log!(&env, "escrow released: id {} amount {}", escrow_id, escrow.amount);
    }

    /// Cancel escrow and refund payer
    pub fn cancel(env: Env, escrow_id: u64) {
        let escrow_key = DataKey::Escrow(escrow_id);
        let mut escrow: Escrow = env
            .storage()
            .instance()
            .get(&escrow_key)
            .unwrap_or_else(|| panic!("Escrow not found"));

        let caller = env.invoker();

        // Only payer or arbitrator can cancel
        let can_cancel = escrow.payer == caller || escrow.arbitrator == caller;
        if !can_cancel {
            panic!("Unauthorized cancellation");
        }

        // Cannot cancel if already released
        if matches!(escrow.status, EscrowStatus::Released) {
            panic!("Cannot cancel released escrow");
        }

        // Check if expired (auto-refund)
        let current_time = env.ledger().timestamp();
        if current_time > escrow.expires_at && matches!(escrow.status, EscrowStatus::Created) {
            // Auto-refund after expiration
        }

        // Transfer funds back to payer
        let token_client = soroban_sdk::token::Client::new(&env, &escrow.asset);
        token_client.transfer(&env.current_contract_address(), &escrow.payer, &escrow.amount);

        // Update status
        escrow.status = EscrowStatus::Cancelled;
        env.storage().instance().set(&escrow_key, &escrow);

        // Emit event
        env.events().publish(
            (sym!("cancel_event"),),
            Event::EscrowCancelled(EscrowCancellation {
                escrow_id,
                amount: escrow.amount,
                payer: escrow.payer.clone(),
            }),
        );

        log!(&env, "escrow cancelled: id {}", escrow_id);
    }

    /// Get escrow details
    pub fn get_escrow(env: Env, escrow_id: u64) -> Escrow {
        let escrow_key = DataKey::Escrow(escrow_id);
        env.storage()
            .instance()
            .get(&escrow_key)
            .unwrap_or_else(|| panic!("Escrow not found"))
    }

    /// Get total number of escrows
    pub fn get_escrow_count(env: Env) -> u64 {
        let counter_key = DataKey::EscrowCounter;
        env.storage().instance().get(&counter_key).unwrap_or(0)
    }
}
