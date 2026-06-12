#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, Symbol, Vec, 
    symbol_short as sym, log, Bytes
};

// ============================================================================
// Types & Data Structures
// ============================================================================

#[derive(Clone, Copy)]
#[contracttype]
pub enum DataKey {
    Merchant(Address),          // Merchant by address
    MerchantList,              // List of all merchants
    Admin,                     // Admin address
}

#[derive(Clone, Copy)]
#[contracttype]
pub enum MerchantStatus {
    Active,
    Inactive,
    Suspended,
}

#[derive(Clone)]
#[contracttype]
pub struct Merchant {
    pub merchant_id: Address,
    pub wallet_address: Address,
    pub name: Symbol,
    pub fee_percent: u32,      // Fee in basis points (1% = 100)
    pub status: MerchantStatus,
    pub registered_at: u64,
    pub total_volume: i128,    // Total transaction volume
    pub transaction_count: u64,
}

// ============================================================================
// Events
// ============================================================================

#[contracttype]
pub enum Event {
    MerchantRegistered(Registration),
    MerchantUpdated(Update),
    FeeUpdated(FeeChange),
    StatusChanged(StatusChange),
}

#[contracttype]
pub struct Registration {
    pub merchant_id: Address,
    pub wallet_address: Address,
    pub fee_percent: u32,
}

#[contracttype]
pub struct Update {
    pub merchant_id: Address,
    pub field: Symbol,
    pub timestamp: u64,
}

#[contracttype]
pub struct FeeChange {
    pub merchant_id: Address,
    pub old_fee: u32,
    pub new_fee: u32,
}

#[contracttype]
pub struct StatusChange {
    pub merchant_id: Address,
    pub new_status: MerchantStatus,
}

// ============================================================================
// Contract Implementation
// ============================================================================

#[contract]
pub struct MerchantRegistryContract;

#[contractimpl]
impl MerchantRegistryContract {
    /// Initialize contract with admin
    pub fn initialize(env: Env, admin: Address) {
        let admin_key = DataKey::Admin;
        
        // Check if already initialized
        if env.storage().instance().has(&admin_key) {
            panic!("Contract already initialized");
        }

        env.storage().instance().set(&admin_key, &admin);
        log!(&env, "merchant registry initialized with admin: {}", admin);
    }

    /// Register a new merchant
    pub fn register(
        env: Env,
        merchant_id: Address,
        wallet_address: Address,
        name: Symbol,
        fee_percent: u32,
    ) {
        merchant_id.require_auth();

        // Validation
        if fee_percent > 10000 {
            panic!("Fee percentage cannot exceed 100%");
        }

        if merchant_id == wallet_address {
            panic!("Merchant ID and wallet address cannot be the same");
        }

        // Check if already registered
        let merchant_key = DataKey::Merchant(merchant_id.clone());
        if env.storage().instance().has(&merchant_key) {
            panic!("Merchant already registered");
        }

        // Create merchant
        let merchant = Merchant {
            merchant_id: merchant_id.clone(),
            wallet_address: wallet_address.clone(),
            name,
            fee_percent,
            status: MerchantStatus::Active,
            registered_at: env.ledger().timestamp(),
            total_volume: 0,
            transaction_count: 0,
        };

        // Store merchant
        env.storage().instance().set(&merchant_key, &merchant);

        // Add to list
        let mut merchants: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::MerchantList)
            .unwrap_or_else(|| Vec::new(&env));
        merchants.push_back(merchant_id.clone());
        env.storage()
            .instance()
            .set(&DataKey::MerchantList, &merchants);

        // Emit event
        env.events().publish(
            (sym!("merchant_event"),),
            Event::MerchantRegistered(Registration {
                merchant_id,
                wallet_address,
                fee_percent,
            }),
        );

        log!(&env, "merchant registered: {} with fee {}%", merchant_id, fee_percent);
    }

    /// Update merchant information
    pub fn update(
        env: Env,
        merchant_id: Address,
        name: Symbol,
        wallet_address: Address,
    ) {
        merchant_id.require_auth();

        let merchant_key = DataKey::Merchant(merchant_id.clone());
        let mut merchant: Merchant = env
            .storage()
            .instance()
            .get(&merchant_key)
            .unwrap_or_else(|| panic!("Merchant not found"));

        // Update fields
        merchant.name = name;
        merchant.wallet_address = wallet_address;

        env.storage().instance().set(&merchant_key, &merchant);

        // Emit event
        env.events().publish(
            (sym!("update_event"),),
            Event::MerchantUpdated(Update {
                merchant_id,
                field: sym!("name_and_wallet"),
                timestamp: env.ledger().timestamp(),
            }),
        );

        log!(&env, "merchant updated: {}", merchant_id);
    }

    /// Update merchant fee (admin only)
    pub fn set_fee(env: Env, merchant_id: Address, new_fee_percent: u32) {
        // Verify admin
        let admin_key = DataKey::Admin;
        let admin: Address = env
            .storage()
            .instance()
            .get(&admin_key)
            .unwrap_or_else(|| panic!("Admin not found"));
        
        admin.require_auth();

        if new_fee_percent > 10000 {
            panic!("Fee percentage cannot exceed 100%");
        }

        let merchant_key = DataKey::Merchant(merchant_id.clone());
        let mut merchant: Merchant = env
            .storage()
            .instance()
            .get(&merchant_key)
            .unwrap_or_else(|| panic!("Merchant not found"));

        let old_fee = merchant.fee_percent;
        merchant.fee_percent = new_fee_percent;

        env.storage().instance().set(&merchant_key, &merchant);

        // Emit event
        env.events().publish(
            (sym!("fee_event"),),
            Event::FeeUpdated(FeeChange {
                merchant_id,
                old_fee,
                new_fee: new_fee_percent,
            }),
        );

        log!(
            &env,
            "merchant fee updated: {} from {}% to {}%",
            merchant_id,
            old_fee,
            new_fee_percent
        );
    }

    /// Change merchant status
    pub fn set_status(env: Env, merchant_id: Address, new_status: MerchantStatus) {
        // Verify admin
        let admin_key = DataKey::Admin;
        let admin: Address = env
            .storage()
            .instance()
            .get(&admin_key)
            .unwrap_or_else(|| panic!("Admin not found"));
        
        admin.require_auth();

        let merchant_key = DataKey::Merchant(merchant_id.clone());
        let mut merchant: Merchant = env
            .storage()
            .instance()
            .get(&merchant_key)
            .unwrap_or_else(|| panic!("Merchant not found"));

        merchant.status = new_status;

        env.storage().instance().set(&merchant_key, &merchant);

        // Emit event
        env.events().publish(
            (sym!("status_event"),),
            Event::StatusChanged(StatusChange {
                merchant_id,
                new_status,
            }),
        );

        log!(&env, "merchant status updated: {}", merchant_id);
    }

    /// Disable merchant (suspend)
    pub fn disable(env: Env, merchant_id: Address) {
        let admin_key = DataKey::Admin;
        let admin: Address = env
            .storage()
            .instance()
            .get(&admin_key)
            .unwrap_or_else(|| panic!("Admin not found"));
        
        admin.require_auth();

        let merchant_key = DataKey::Merchant(merchant_id.clone());
        let mut merchant: Merchant = env
            .storage()
            .instance()
            .get(&merchant_key)
            .unwrap_or_else(|| panic!("Merchant not found"));

        merchant.status = MerchantStatus::Suspended;

        env.storage().instance().set(&merchant_key, &merchant);

        // Emit event
        env.events().publish(
            (sym!("disable_event"),),
            Event::StatusChanged(StatusChange {
                merchant_id,
                new_status: MerchantStatus::Suspended,
            }),
        );

        log!(&env, "merchant disabled: {}", merchant_id);
    }

    /// Get merchant information
    pub fn get_merchant(env: Env, merchant_id: Address) -> Merchant {
        let merchant_key = DataKey::Merchant(merchant_id);
        env.storage()
            .instance()
            .get(&merchant_key)
            .unwrap_or_else(|| panic!("Merchant not found"))
    }

    /// Get merchant fee
    pub fn get_fee(env: Env, merchant_id: Address) -> u32 {
        let merchant_key = DataKey::Merchant(merchant_id);
        let merchant: Merchant = env
            .storage()
            .instance()
            .get(&merchant_key)
            .unwrap_or_else(|| panic!("Merchant not found"));

        merchant.fee_percent
    }

    /// Get merchant status
    pub fn get_status(env: Env, merchant_id: Address) -> MerchantStatus {
        let merchant_key = DataKey::Merchant(merchant_id);
        let merchant: Merchant = env
            .storage()
            .instance()
            .get(&merchant_key)
            .unwrap_or_else(|| panic!("Merchant not found"));

        merchant.status
    }

    /// Get all merchants
    pub fn list_merchants(env: Env) -> Vec<Address> {
        env.storage()
            .instance()
            .get(&DataKey::MerchantList)
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Get merchant count
    pub fn get_merchant_count(env: Env) -> u32 {
        let merchants: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::MerchantList)
            .unwrap_or_else(|| Vec::new(&env));

        merchants.len() as u32
    }
}
