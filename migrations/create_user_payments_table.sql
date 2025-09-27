-- Create user_payments table for Stripe payments
CREATE TABLE IF NOT EXISTS user_payments (
    payment_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    product_name VARCHAR(100) NOT NULL, -- 'premium' or 'gold'
    amount INTEGER NOT NULL, -- amount in cents
    currency VARCHAR(3) DEFAULT 'pln',
    status VARCHAR(50) NOT NULL, -- 'pending', 'succeeded', 'failed', 'canceled'
    payment_method VARCHAR(50), -- 'card', 'bank_transfer', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP,
    subscription_start_date TIMESTAMP,
    subscription_end_date TIMESTAMP,
    metadata JSONB,
    
    -- Foreign key constraint
    CONSTRAINT fk_user_payments_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES users(user_id) 
        ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_payments_user_id ON user_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_payments_stripe_payment_intent_id ON user_payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_user_payments_stripe_subscription_id ON user_payments(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_payments_status ON user_payments(status);
CREATE INDEX IF NOT EXISTS idx_user_payments_created_at ON user_payments(created_at);
