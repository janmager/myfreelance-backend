import Stripe from 'stripe';

// Initialize Stripe
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

// Configuration
export const STRIPE_CONFIG = {
  // Product IDs for different subscription tiers
  PRODUCTS: {
    premium: process.env.STRIPE_PREMIUM_PRICE_ID,
    gold: process.env.STRIPE_GOLD_PRICE_ID,
  },
  
  // Webhook secret for verifying webhook requests
  WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  
  // URLs for checkout success and cancel
  SUCCESS_URL: process.env.NEXT_PUBLIC_APP_URL + '/panel/profile/subscription?status=success',
  CANCEL_URL: process.env.NEXT_PUBLIC_APP_URL + '/panel/premium',
};

// Product configuration for different subscription tiers
export const getProductConfig = (productName) => {
  switch (productName) {
    case 'premium':
      return {
        name: 'Premium Plan',
        description: 'Unlock premium features with increased limits',
        price: 19.00,
        currency: 'PLN',
        priceId: STRIPE_CONFIG.PRODUCTS.premium,
        premiumLevel: 1,
        limits: {
          clients: 100,
          projects: 200,
          notes: 1000,
          contracts: 100,
          files_mb: 10000,
          links: 200,
          tasks: 500,
        }
      };
    case 'gold':
      return {
        name: 'Gold Plan',
        description: 'Maximum limits and exclusive features',
        price: 49.00,
        currency: 'PLN',
        priceId: STRIPE_CONFIG.PRODUCTS.gold,
        premiumLevel: 2,
        limits: {
          clients: 500,
          projects: 1000,
          notes: 5000,
          contracts: 500,
          files_mb: 50000,
          links: 1000,
          tasks: 2500,
        }
      };
    default:
      throw new Error(`Unknown product: ${productName}`);
  }
};

export default stripe;
