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
    Subscription(u64),         // Subscription by ID
    SubscriptionCounter,       // Global counter
    UserSubscriptions(Address), // Subscriptions for user
}

#[derive(Clone, Copy)]
#[contracttype]
pub enum SubscriptionStatus {
    Active,
    Paused,
    Completed,
    Cancelled,
}

#[derive(Clone, Copy)]
#[contracttype]
pub enum Frequency {
    Daily,
    Weekly,
    Monthly,
    Quarterly,
    Yearly,
}

#[derive(Clone)]
#[contracttype]
pub struct Subscription {
    pub id: u64,
    pub subscriber: Address,
    pub merchant: Address,
    pub asset: Address,
    pub amount: i128,
    pub frequency: Frequency,
    pub status: SubscriptionStatus,
    pub created_at: u64,
    pub next_payment_at: u64,
    pub end_at: u64,
    pub cycles_completed: u64,
    pub total_paid: i128,
}

#[derive(Clone)]
#[contracttype]
pub struct PaymentExecution {
    pub subscription_id: u64,
    pub payment_amount: i128,
    pub executed_at: u64,
    pub next_payment_at: u64,
}

// ============================================================================
// Events
// ============================================================================

#[contracttype]
pub enum Event {
    SubscriptionCreated(Creation),
    PaymentExecuted(Payment),
    SubscriptionPaused(Pause),
    SubscriptionResumed(Resume),
    SubscriptionCancelled(Cancellation),
}

#[contracttype]
pub struct Creation {
    pub subscription_id: u64,
    pub merchant: Address,
    pub amount: i128,
    pub frequency: Frequency,
}

#[contracttype]
pub struct Payment {
    pub subscription_id: u64,
    pub amount: i128,
    pub merchant: Address,
}

#[contracttype]
pub struct Pause {
    pub subscription_id: u64,
}

#[contracttype]
pub struct Resume {
    pub subscription_id: u64,
}

#[contracttype]
pub struct Cancellation {
    pub subscription_id: u64,
    pub total_paid: i128,
}

// ============================================================================
// Helpers
// ============================================================================

fn get_interval_seconds(frequency: Frequency) -> u64 {
    match frequency {
        Frequency::Daily => 24 * 60 * 60,
        Frequency::Weekly => 7 * 24 * 60 * 60,
        Frequency::Monthly => 30 * 24 * 60 * 60,
        Frequency::Quarterly => 90 * 24 * 60 * 60,
        Frequency::Yearly => 365 * 24 * 60 * 60,
    }
}

// ============================================================================
// Contract Implementation
// ============================================================================

#[contract]
pub struct RecurringPaymentContract;

#[contractimpl]
impl RecurringPaymentContract {
    /// Create a new subscription
    pub fn create_subscription(
        env: Env,
        subscriber: Address,
        merchant: Address,
        asset: Address,
        amount: i128,
        frequency: Frequency,
        duration_seconds: u64,
    ) -> u64 {
        subscriber.require_auth();

        // Validation
        if amount <= 0 {
            panic!("Amount must be positive");
        }

        if subscriber == merchant {
            panic!("Subscriber and merchant cannot be the same");
        }

        if duration_seconds == 0 {
            panic!("Duration must be greater than 0");
        }

        // Get next subscription ID
        let counter_key = DataKey::SubscriptionCounter;
        let current_id: u64 = env
            .storage()
            .instance()
            .get(&counter_key)
            .unwrap_or(0);
        let subscription_id = current_id + 1;

        let current_time = env.ledger().timestamp();
        let interval = get_interval_seconds(frequency);

        // Create subscription
        let subscription = Subscription {
            id: subscription_id,
            subscriber: subscriber.clone(),
            merchant: merchant.clone(),
            asset,
            amount,
            frequency,
            status: SubscriptionStatus::Active,
            created_at: current_time,
            next_payment_at: current_time + interval,
            end_at: current_time + duration_seconds,
            cycles_completed: 0,
            total_paid: 0,
        };

        // Store subscription
        let sub_key = DataKey::Subscription(subscription_id);
        env.storage().instance().set(&sub_key, &subscription);

        // Update counter
        env.storage().instance().set(&counter_key, &subscription_id);

        // Add to user's subscriptions list
        let user_key = DataKey::UserSubscriptions(subscriber.clone());
        let mut user_subs: Vec<u64> = env
            .storage()
            .instance()
            .get(&user_key)
            .unwrap_or_else(|| Vec::new(&env));
        user_subs.push_back(subscription_id);
        env.storage().instance().set(&user_key, &user_subs);

        // Emit event
        env.events().publish(
            (sym!("sub_event"),),
            Event::SubscriptionCreated(Creation {
                subscription_id,
                merchant,
                amount,
                frequency,
            }),
        );

        log!(&env, "subscription created: id {} for {}", subscription_id, amount);
        subscription_id
    }

    /// Execute payment cycle for subscription
    pub fn execute_cycle(env: Env, subscription_id: u64) -> PaymentExecution {
        let sub_key = DataKey::Subscription(subscription_id);
        let mut subscription: Subscription = env
            .storage()
            .instance()
            .get(&sub_key)
            .unwrap_or_else(|| panic!("Subscription not found"));

        let current_time = env.ledger().timestamp();

        // Verify active
        if !matches!(subscription.status, SubscriptionStatus::Active) {
            panic!("Subscription is not active");
        }

        // Verify payment is due
        if current_time < subscription.next_payment_at {
            panic!("Payment not yet due");
        }

        // Verify not expired
        if current_time > subscription.end_at {
            subscription.status = SubscriptionStatus::Completed;
            env.storage().instance().set(&sub_key, &subscription);
            panic!("Subscription has ended");
        }

        // Transfer payment
        let token_client = soroban_sdk::token::Client::new(&env, &subscription.asset);
        token_client.transfer(
            &subscription.subscriber,
            &subscription.merchant,
            &subscription.amount,
        );

        // Update subscription
        let interval = get_interval_seconds(subscription.frequency);
        subscription.next_payment_at = current_time + interval;
        subscription.cycles_completed += 1;
        subscription.total_paid += subscription.amount;

        env.storage().instance().set(&sub_key, &subscription);

        // Emit event
        env.events().publish(
            (sym!("payment_event"),),
            Event::PaymentExecuted(Payment {
                subscription_id,
                amount: subscription.amount,
                merchant: subscription.merchant.clone(),
            }),
        );

        log!(
            &env,
            "payment executed: subscription {} amount {}",
            subscription_id,
            subscription.amount
        );

        PaymentExecution {
            subscription_id,
            payment_amount: subscription.amount,
            executed_at: current_time,
            next_payment_at: subscription.next_payment_at,
        }
    }

    /// Pause subscription
    pub fn pause(env: Env, subscription_id: u64) {
        let sub_key = DataKey::Subscription(subscription_id);
        let mut subscription: Subscription = env
            .storage()
            .instance()
            .get(&sub_key)
            .unwrap_or_else(|| panic!("Subscription not found"));

        subscription.subscriber.require_auth();

        if !matches!(subscription.status, SubscriptionStatus::Active) {
            panic!("Only active subscriptions can be paused");
        }

        subscription.status = SubscriptionStatus::Paused;
        env.storage().instance().set(&sub_key, &subscription);

        // Emit event
        env.events().publish(
            (sym!("pause_event"),),
            Event::SubscriptionPaused(Pause { subscription_id }),
        );

        log!(&env, "subscription paused: id {}", subscription_id);
    }

    /// Resume paused subscription
    pub fn resume(env: Env, subscription_id: u64) {
        let sub_key = DataKey::Subscription(subscription_id);
        let mut subscription: Subscription = env
            .storage()
            .instance()
            .get(&sub_key)
            .unwrap_or_else(|| panic!("Subscription not found"));

        subscription.subscriber.require_auth();

        if !matches!(subscription.status, SubscriptionStatus::Paused) {
            panic!("Only paused subscriptions can be resumed");
        }

        subscription.status = SubscriptionStatus::Active;
        env.storage().instance().set(&sub_key, &subscription);

        // Emit event
        env.events().publish(
            (sym!("resume_event"),),
            Event::SubscriptionResumed(Resume { subscription_id }),
        );

        log!(&env, "subscription resumed: id {}", subscription_id);
    }

    /// Cancel subscription
    pub fn cancel(env: Env, subscription_id: u64) {
        let sub_key = DataKey::Subscription(subscription_id);
        let mut subscription: Subscription = env
            .storage()
            .instance()
            .get(&sub_key)
            .unwrap_or_else(|| panic!("Subscription not found"));

        subscription.subscriber.require_auth();

        if matches!(subscription.status, SubscriptionStatus::Cancelled) {
            panic!("Subscription already cancelled");
        }

        subscription.status = SubscriptionStatus::Cancelled;
        env.storage().instance().set(&sub_key, &subscription);

        // Emit event
        env.events().publish(
            (sym!("cancel_event"),),
            Event::SubscriptionCancelled(Cancellation {
                subscription_id,
                total_paid: subscription.total_paid,
            }),
        );

        log!(&env, "subscription cancelled: id {}", subscription_id);
    }

    /// Get subscription details
    pub fn get_subscription(env: Env, subscription_id: u64) -> Subscription {
        let sub_key = DataKey::Subscription(subscription_id);
        env.storage()
            .instance()
            .get(&sub_key)
            .unwrap_or_else(|| panic!("Subscription not found"))
    }

    /// Get user's subscriptions
    pub fn get_user_subscriptions(env: Env, user: Address) -> Vec<u64> {
        let user_key = DataKey::UserSubscriptions(user);
        env.storage()
            .instance()
            .get(&user_key)
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Get total subscriptions
    pub fn get_subscription_count(env: Env) -> u64 {
        let counter_key = DataKey::SubscriptionCounter;
        env.storage().instance().get(&counter_key).unwrap_or(0)
    }
}
