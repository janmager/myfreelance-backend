-- Migration to replace Lemon Squeezy with Stripe
-- This migration renames columns and updates the table structure

-- First, drop the existing indexes that reference Lemon Squeezy columns
DROP INDEX IF EXISTS idx_user_subscriptions_lemon_squeezy_subscription_id;
DROP INDEX IF EXISTS idx_user_subscriptions_lemon_squeezy_checkout_id;

-- Rename columns from Lemon Squeezy to Stripe
ALTER TABLE user_subscriptions 
  RENAME COLUMN lemon_squeezy_variant_id TO stripe_price_id;

ALTER TABLE user_subscriptions 
  RENAME COLUMN lemon_squeezy_checkout_id TO stripe_checkout_session_id;

ALTER TABLE user_subscriptions 
  RENAME COLUMN lemon_squeezy_order_id TO stripe_payment_intent_id;

ALTER TABLE user_subscriptions 
  RENAME COLUMN lemon_squeezy_subscription_id TO stripe_subscription_id;

-- Create new indexes for Stripe columns
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription_id ON user_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_checkout_session_id ON user_subscriptions(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_price_id ON user_subscriptions(stripe_price_id);

-- Add new columns for Stripe-specific data
ALTER TABLE user_subscriptions 
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

ALTER TABLE user_subscriptions 
  ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT;

ALTER TABLE user_subscriptions 
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP;

ALTER TABLE user_subscriptions 
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP;

-- Create index for customer ID
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer_id ON user_subscriptions(stripe_customer_id);

-- Update comment for the table
COMMENT ON TABLE user_subscriptions IS 'User subscriptions table for Stripe integration';
