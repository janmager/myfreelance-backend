-- Create user_subscriptions table for Lemon Squeezy subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
    subscription_id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    product_name VARCHAR(100) NOT NULL, -- 'premium' or 'gold'
    lemon_squeezy_variant_id TEXT,
    lemon_squeezy_checkout_id TEXT,
    lemon_squeezy_order_id TEXT,
    lemon_squeezy_subscription_id TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'cancelled', 'expired', 'paused'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_user_subscriptions_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES users(user_id) 
        ON DELETE CASCADE,
    
    -- Ensure one active subscription per user per product
    CONSTRAINT unique_user_product_active 
        UNIQUE (user_id, product_name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_lemon_squeezy_subscription_id ON user_subscriptions(lemon_squeezy_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_lemon_squeezy_checkout_id ON user_subscriptions(lemon_squeezy_checkout_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_created_at ON user_subscriptions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires_at ON user_subscriptions(expires_at);

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_user_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_subscriptions_updated_at();
