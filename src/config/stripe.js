import Stripe from 'stripe';

// Initialize Stripe
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

// Configuration
export const STRIPE_CONFIG = {
  // Webhook secret for verifying webhook requests
  WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
};

// Product configuration for different subscription tiers
export const getProductConfig = (productName) => {
  switch (productName) {
    case 'premium':
      return {
        name: 'Premium Plan',
        description: 'Unlock premium features with increased limits',
        premiumLevel: 1,
      };
    case 'gold':
      return {
        name: 'Gold Plan',
        description: 'Maximum limits and exclusive features',
        premiumLevel: 2,
      };
    default:
      throw new Error(`Unknown product: ${productName}`);
  }
};

export default stripe;
